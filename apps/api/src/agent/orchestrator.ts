// ═══════════════════════════════════════════════════════════
// Agent Orchestrator — Fast Groq responses with parallel prefetch
// ═══════════════════════════════════════════════════════════

import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { getSupabase } from '../db/client.js';
import { searchMemories } from '../services/mem0.js';
import { searchSimilarIncidents } from '../services/embeddings.js';
import { getSLAStatus } from '../services/sla.js';
import { SYSTEM_PROMPT } from './prompts/system.js';
import type { AgentResponse, Incident, MemoryResult } from '@sentinel/shared';

const log = logger.child({ service: 'agent-orchestrator' });

let llm: ChatGroq | null = null;

function getLLM(): ChatGroq {
  if (!llm) {
    llm = new ChatGroq({
      apiKey: config.groq.apiKey,
      model: config.groq.model,
      temperature: 0.2,
      maxTokens: 1024,
    });
    log.info({ model: config.groq.model }, 'Groq LLM initialized');
  }
  return llm;
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text: string }).text);
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function formatMemoryContext(
  memories: MemoryResult[],
  pgResults: Awaited<ReturnType<typeof searchSimilarIncidents>>
): string {
  const lines: string[] = [];

  for (const m of memories) {
    lines.push(`- [Mem0 ${(m.score * 100).toFixed(0)}%] ${m.memory}`);
  }
  for (const r of pgResults) {
    lines.push(
      `- [Past incident ${((r.similarity ?? 0) * 100).toFixed(0)}%] ${r.title} | Root: ${r.root_cause ?? 'unknown'} | Fix: ${r.resolution ?? 'unknown'}`
    );
  }

  return lines.length > 0 ? lines.join('\n') : 'No similar past incidents in memory yet.';
}

function buildSystemPrompt(incident: Incident, memoryBlock: string, slaBlock: string): string {
  return (
    SYSTEM_PROMPT.replace('{{INCIDENT_ID}}', incident.id)
      .replace('{{INCIDENT_TITLE}}', incident.title)
      .replace('{{INCIDENT_DESCRIPTION}}', incident.description ?? 'No description')
      .replace('{{INCIDENT_SEVERITY}}', incident.severity)
      .replace('{{INCIDENT_STATUS}}', incident.status)
      .replace('{{INCIDENT_SOURCE}}', incident.source)
      .replace('{{AFFECTED_SERVICES}}', incident.affected_services.join(', ') || 'Unknown')
      .replace('{{CREATED_AT}}', incident.created_at) +
    `\n\n## Pre-loaded Context (already fetched — answer directly, do NOT request more data)\n` +
    `### Similar past incidents\n${memoryBlock}\n\n` +
    `### SLA status\n${slaBlock}\n\n` +
    `Respond in under 200 words unless the user asks for detail. Be specific and actionable.`
  );
}

/**
 * Run the agent — one Groq call with memory/SLA prefetched in parallel (~3-8s total).
 */
export async function runAgent(
  incident: Incident,
  query: string,
  orgId: string
): Promise<AgentResponse> {
  const startTime = Date.now();
  log.info({ incidentId: incident.id, query: query.substring(0, 80) }, 'Agent invoked');

  try {
    const searchQuery = `${incident.title} ${query}`;

    const prefetchStart = Date.now();
    const [memories, pgResults] = await Promise.all([
      searchMemories(searchQuery, orgId, 3),
      searchSimilarIncidents(searchQuery, orgId, 3),
    ]);
    log.debug({ prefetchMs: Date.now() - prefetchStart }, 'Memory prefetch done');

    const slaBlock = incident.sla_breach_at
      ? JSON.stringify(getSLAStatus(new Date(incident.sla_breach_at)))
      : 'No SLA deadline set';

    const memoryBlock = formatMemoryContext(memories, pgResults);
    const systemText = buildSystemPrompt(incident, memoryBlock, slaBlock);

    const groqStart = Date.now();
    const model = getLLM();
    const response = await model.invoke([
      new SystemMessage(systemText),
      new HumanMessage(query),
    ]);
    log.debug({ groqMs: Date.now() - groqStart }, 'Groq response received');

    const responseText =
      extractTextContent(response.content) ||
      'I could not generate a response. Please try a shorter question.';

    const toolsUsed = memories.length > 0 || pgResults.length > 0 ? ['search_memory'] : [];

    // Log interaction without blocking the HTTP response
    void getSupabase()
      .from('agent_interactions')
      .insert({
        incident_id: incident.id,
        query,
        response: responseText,
        tools_used: toolsUsed,
        memories_retrieved: memories,
      })
      .then(({ error }) => {
        if (error) log.warn({ error }, 'Failed to log agent interaction');
      });

    const duration = Date.now() - startTime;
    log.info({ incidentId: incident.id, duration: `${duration}ms`, toolsUsed }, 'Agent done');

    return {
      response: responseText,
      tools_used: toolsUsed,
      memories_retrieved: memories,
      suggested_severity: null,
      suggested_fix: null,
    };
  } catch (err) {
    log.error({ err, incidentId: incident.id }, 'Agent execution failed');
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    return {
      response: `**Agent error:** ${errMsg}\n\nCheck that \`GROQ_API_KEY\` is valid in \`apps/api/.env\` and restart the API.`,
      tools_used: [],
      memories_retrieved: [],
      suggested_severity: null,
      suggested_fix: null,
    };
  }
}

/**
 * Auto-triage on new incidents — runs in background, uses same fast path.
 */
export async function autoTriageIncident(incident: Incident, orgId: string): Promise<void> {
  log.info({ incidentId: incident.id }, 'Auto-triaging new incident');

  const query = `New ${incident.severity} incident from ${incident.source}: "${incident.title}".
Affected: ${incident.affected_services.join(', ') || 'unknown'}.
Give a 3-bullet triage: similar past incidents, recommended fix, SLA urgency.`;

  const response = await runAgent(incident, query, orgId);

  try {
    const { sendIncidentSlackAlert } = await import('../services/slack.js');
    const slackTs = await sendIncidentSlackAlert('incidents', incident, response.response);
    if (slackTs) {
      await getSupabase()
        .from('incidents')
        .update({ slack_thread_ts: slackTs })
        .eq('id', incident.id);
    }
  } catch (err) {
    log.warn({ err }, 'Slack alert during auto-triage failed (non-fatal)');
  }
}
