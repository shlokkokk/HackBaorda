// ═══════════════════════════════════════════════════════════
// Agent Orchestrator — LangChain.js ReAct Agent with Groq
// ═══════════════════════════════════════════════════════════

import { ChatGroq } from '@langchain/groq';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { getSupabase } from '../db/client.js';
import { createAgentTools } from './tools/index.js';
import { SYSTEM_PROMPT } from './prompts/system.js';
import type { AgentResponse, Incident, MemoryResult } from '@sentinel/shared';

const log = logger.child({ service: 'agent-orchestrator' });

let llm: ChatGroq | null = null;

function getLLM(): ChatGroq {
  if (!llm) {
    llm = new ChatGroq({
      apiKey: config.groq.apiKey,
      modelName: config.groq.model,
      temperature: 0.3,
      maxTokens: 4096,
    });
    log.info({ model: config.groq.model }, 'Groq LLM initialized');
  }
  return llm;
}

/**
 * Run the agent for a given incident and query.
 * This is the main entry point for agent interactions.
 */
export async function runAgent(
  incident: Incident,
  query: string,
  orgId: string
): Promise<AgentResponse> {
  const startTime = Date.now();
  log.info({ incidentId: incident.id, query: query.substring(0, 100) }, 'Agent invoked');

  try {
    const model = getLLM();
    const tools = createAgentTools(orgId, incident);

    // Build the context-rich prompt
    const systemMessage = SYSTEM_PROMPT
      .replace('{{INCIDENT_ID}}', incident.id)
      .replace('{{INCIDENT_TITLE}}', incident.title)
      .replace('{{INCIDENT_DESCRIPTION}}', incident.description ?? 'No description')
      .replace('{{INCIDENT_SEVERITY}}', incident.severity)
      .replace('{{INCIDENT_STATUS}}', incident.status)
      .replace('{{INCIDENT_SOURCE}}', incident.source)
      .replace('{{AFFECTED_SERVICES}}', incident.affected_services.join(', ') || 'Unknown')
      .replace('{{CREATED_AT}}', incident.created_at);

    // Use the model with tools directly (Groq supports tool calling)
    const modelWithTools = model.bindTools(tools);

    const messages = [
      { role: 'system' as const, content: systemMessage },
      { role: 'user' as const, content: query },
    ];

    const response = await modelWithTools.invoke(messages);

    const toolsUsed: string[] = [];
    const memoriesRetrieved: MemoryResult[] = [];

    // Extract response content
    const responseText = typeof response.content === 'string'
      ? response.content
      : JSON.stringify(response.content);

    // Log the interaction to DB
    const supabase = getSupabase();
    await supabase
      .from('agent_interactions')
      .insert({
        incident_id: incident.id,
        query,
        response: responseText,
        tools_used: toolsUsed,
        memories_retrieved: memoriesRetrieved,
      });

    const duration = Date.now() - startTime;
    log.info({
      incidentId: incident.id,
      toolsUsed,
      duration: `${duration}ms`,
    }, 'Agent response generated');

    return {
      response: responseText,
      tools_used: toolsUsed,
      memories_retrieved: memoriesRetrieved,
      suggested_severity: null,
      suggested_fix: null,
    };
  } catch (err) {
    log.error({ err, incidentId: incident.id }, 'Agent execution failed');

    // Fallback response
    return {
      response: `I encountered an error analyzing this incident. Here's what I know:\n\n**Incident:** ${incident.title}\n**Severity:** ${incident.severity}\n**Source:** ${incident.source}\n\nPlease investigate manually and I'll learn from the resolution.`,
      tools_used: [],
      memories_retrieved: [],
      suggested_severity: null,
      suggested_fix: null,
    };
  }
}

/**
 * Auto-trigger agent when a new incident is created.
 */
export async function autoTriageIncident(incident: Incident, orgId: string): Promise<void> {
  log.info({ incidentId: incident.id }, 'Auto-triaging new incident');

  const query = `A new ${incident.severity} incident has been reported: "${incident.title}". 
Source: ${incident.source}. 
Affected services: ${incident.affected_services.join(', ') || 'Unknown'}.
Description: ${incident.description ?? 'No description provided.'}

Please:
1. Search memory for similar past incidents
2. Score the severity based on impact analysis
3. Suggest a fix if similar incidents have been resolved before
4. Check the SLA status
5. Provide a concise triage response`;

  const response = await runAgent(incident, query, orgId);

  // If Slack is configured, post the response
  const { sendIncidentSlackAlert } = await import('../services/slack.js');
  // Use a default channel or the org's configured channel
  const slackTs = await sendIncidentSlackAlert('incidents', incident, response.response);
  if (slackTs) {
    const supabase = getSupabase();
    await supabase
      .from('incidents')
      .update({ slack_thread_ts: slackTs })
      .eq('id', incident.id);
  }
}
