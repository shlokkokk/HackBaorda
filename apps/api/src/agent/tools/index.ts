// ═══════════════════════════════════════════════════════════
// Agent Tool Registry — All 10 tools as LangChain tools
// ═══════════════════════════════════════════════════════════

import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { searchMemories, writeMemory } from '../../services/mem0.js';
import { searchSimilarIncidents, storeIncidentEmbedding } from '../../services/embeddings.js';
import { getSLAStatus } from '../../services/sla.js';
import { sendSlackMessage } from '../../services/slack.js';
import { getSupabase } from '../../db/client.js';
import { SEVERITY_CONFIG, STATUS_TRANSITIONS } from '@sentinel/shared';
import { POSTMORTEM_PROMPT } from '../prompts/system.js';
import type { Incident } from '@sentinel/shared';

export function createAgentTools(orgId: string, incident: Incident) {
  // ─── Tool 1: Search Memory ─────────────────────────
  const searchMemoryTool = tool(
    async ({ query, limit }) => {
      const memories = await searchMemories(query, orgId, limit);
      const pgResults = await searchSimilarIncidents(query, orgId, limit);

      const combined = [
        ...memories.map((m) => `[Mem0 Score: ${(m.score * 100).toFixed(0)}%] ${m.memory}`),
        ...pgResults.map((r) => `[pgvector Score: ${((r.similarity ?? 0) * 100).toFixed(0)}%] ${r.title} — Root cause: ${r.root_cause ?? 'Unknown'}, Fix: ${r.resolution ?? 'Unknown'}`),
      ];

      return combined.length > 0
        ? `Found ${combined.length} similar incidents:\n\n${combined.join('\n\n')}`
        : 'No similar past incidents found in memory.';
    },
    {
      name: 'search_memory',
      description: 'Search for similar past incidents in memory. Uses both Mem0 and pgvector for comprehensive results.',
      schema: z.object({
        query: z.string().describe('Natural language description of the current incident'),
        limit: z.number().default(5).describe('Max number of results'),
      }),
    }
  );

  // ─── Tool 2: Score Severity ────────────────────────
  const scoreSeverityTool = tool(
    async ({ title, description, affected_services }) => {
      const factors: string[] = [];
      let score = 3; // Start at P3

      // Service criticality
      const criticalServices = ['payments', 'auth', 'database', 'api', 'gateway'];
      const affectedCritical = affected_services.filter((s) =>
        criticalServices.some((cs) => s.toLowerCase().includes(cs))
      );
      if (affectedCritical.length > 0) {
        score = Math.min(score, 1);
        factors.push(`Critical service affected: ${affectedCritical.join(', ')}`);
      }

      // Keyword analysis
      const text = `${title} ${description}`.toLowerCase();
      if (text.includes('outage') || text.includes('down') || text.includes('unavailable')) {
        score = Math.min(score, 0);
        factors.push('Keywords indicate total outage');
      }
      if (text.includes('degraded') || text.includes('slow') || text.includes('timeout')) {
        score = Math.min(score, 2);
        factors.push('Keywords indicate degradation');
      }
      if (text.includes('security') || text.includes('breach') || text.includes('unauthorized')) {
        score = Math.min(score, 0);
        factors.push('Security incident — auto-escalate to P0');
      }

      // Time of day factor
      const hour = new Date().getHours();
      if (hour >= 9 && hour <= 17) {
        factors.push('Business hours — higher user impact');
      }

      const severity = `P${score}` as keyof typeof SEVERITY_CONFIG;
      const config = SEVERITY_CONFIG[severity];

      return JSON.stringify({
        severity,
        reasoning: factors.join('; '),
        label: config.label,
        description: config.description,
      });
    },
    {
      name: 'score_severity',
      description: 'Dynamically score incident severity based on impact analysis.',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        affected_services: z.array(z.string()),
      }),
    }
  );

  // ─── Tool 3: Suggest Fix ──────────────────────────
  const suggestFixTool = tool(
    async ({ symptoms }) => {
      const query = `${incident.title} ${symptoms.join(' ')}`;
      const memories = await searchMemories(query, orgId, 3);
      const pgResults = await searchSimilarIncidents(query, orgId, 3);

      if (memories.length === 0 && pgResults.length === 0) {
        return JSON.stringify({
          mode: 'manual',
          message: 'No similar past incidents found. Manual investigation recommended.',
          confidence: 0,
          steps: [],
        });
      }

      const topMemory = memories[0];
      const topPg = pgResults[0];
      const bestScore = Math.max(topMemory?.score ?? 0, topPg?.similarity ?? 0);

      let mode: string;
      if (bestScore > 0.85) mode = 'auto_available';
      else if (bestScore > 0.70) mode = 'suggest';
      else mode = 'manual';

      const fix = topMemory?.metadata?.effective_fix ?? topPg?.resolution ?? 'No fix found';
      const commands = topMemory?.metadata?.commands_used ?? [];

      return JSON.stringify({
        mode,
        confidence: bestScore,
        message: `Based on ${memories.length + pgResults.length} similar incident(s)`,
        fix_description: fix,
        commands,
        steps: commands.map((cmd: string, i: number) => ({
          order: i + 1,
          description: cmd,
          command: cmd,
          is_destructive: cmd.includes('delete') || cmd.includes('drop') || cmd.includes('rm'),
        })),
        source_incident: topMemory?.metadata?.incident_id ?? topPg?.id ?? null,
      });
    },
    {
      name: 'suggest_fix',
      description: 'Suggest a fix based on similar past incidents. Returns confidence score and steps.',
      schema: z.object({
        symptoms: z.array(z.string()).describe('Current symptoms observed'),
      }),
    }
  );

  // ─── Tool 4: Escalate Incident ────────────────────
  const escalateTool = tool(
    async ({ reason, escalate_to }) => {
      const supabase = getSupabase();

      // Find on-call user
      const { data: onCallUsers } = await supabase
        .from('users')
        .select('*')
        .eq('org_id', orgId)
        .eq('on_call', true);

      const target = onCallUsers?.[0];

      if (target) {
        await supabase
          .from('incidents')
          .update({ assignee_id: target.id })
          .eq('id', incident.id);
      }

      return JSON.stringify({
        escalated: true,
        reason,
        escalated_to: target ? `${target.name} (${target.email})` : escalate_to,
        notification_sent: !!target,
      });
    },
    {
      name: 'escalate_incident',
      description: 'Escalate incident to on-call engineer.',
      schema: z.object({
        reason: z.string().describe('Why this needs escalation'),
        escalate_to: z.string().default('on-call').describe('Who to escalate to'),
      }),
    }
  );

  // ─── Tool 5: Generate Postmortem ──────────────────
  const generatePostmortemTool = tool(
    async () => {
      const supabase = getSupabase();

      const content = POSTMORTEM_PROMPT
        .replace('[Title]', incident.title)
        .replace('{{DATE}}', new Date().toISOString());

      const { data } = await supabase
        .from('postmortems')
        .insert({
          incident_id: incident.id,
          org_id: orgId,
          content,
          review_status: 'draft',
        })
        .select()
        .single();

      return JSON.stringify({
        generated: true,
        postmortem_id: data?.id ?? null,
        status: 'draft',
        message: 'Postmortem draft generated. Review and publish when ready.',
      });
    },
    {
      name: 'generate_postmortem',
      description: 'Generate a structured postmortem document for the current incident.',
      schema: z.object({}),
    }
  );

  // ─── Tool 6: Notify Slack ─────────────────────────
  const notifySlackTool = tool(
    async ({ channel, message }) => {
      const sent = await sendSlackMessage(channel, message);
      return JSON.stringify({ sent, channel });
    },
    {
      name: 'notify_slack',
      description: 'Send a notification message to a Slack channel.',
      schema: z.object({
        channel: z.string().default('incidents'),
        message: z.string().describe('Message to send'),
      }),
    }
  );

  // ─── Tool 7: Update Status ────────────────────────
  const updateStatusTool = tool(
    async ({ status, notes }) => {
      const currentStatus = incident.status;
      const allowed = STATUS_TRANSITIONS[currentStatus as keyof typeof STATUS_TRANSITIONS];
      if (!allowed?.includes(status as typeof allowed[number])) {
        return JSON.stringify({
          updated: false,
          error: `Cannot transition from ${currentStatus} to ${status}`,
        });
      }

      const supabase = getSupabase();
      const updates: Record<string, unknown> = { status };
      if (status === 'resolved') {
        updates['resolved_at'] = new Date().toISOString();
      }

      await supabase.from('incidents').update(updates).eq('id', incident.id);

      return JSON.stringify({ updated: true, from: currentStatus, to: status, notes });
    },
    {
      name: 'update_status',
      description: 'Update the incident status following the state machine.',
      schema: z.object({
        status: z.string().describe('New status: investigating, mitigating, resolved, postmortem'),
        notes: z.string().default('').describe('Optional notes about the status change'),
      }),
    }
  );

  // ─── Tool 8: Write Memory ─────────────────────────
  const writeMemoryTool = tool(
    async ({ root_cause, resolution, lessons_learned }) => {
      const content = `Incident: ${incident.title}. Root cause: ${root_cause}. Fix: ${resolution}. Lessons: ${lessons_learned}. Services: ${incident.affected_services.join(', ')}. Severity: ${incident.severity}. Source: ${incident.source}.`;

      const memoryId = await writeMemory(orgId, content, {
        incident_id: incident.id,
        title: incident.title,
        affected_services: incident.affected_services,
        root_cause,
        effective_fix: resolution,
        severity: incident.severity,
        source: incident.source,
        tags: incident.tags,
        lessons_learned,
        root_cause_category: '',
        symptoms: [],
        commands_used: [],
        time_to_detect_mins: 0,
        time_to_resolve_mins: 0,
        sla_breached: false,
        postmortem_id: null,
        detection_sources: [incident.source],
      });

      // Also store embedding for pgvector search
      await storeIncidentEmbedding(incident.id, content);

      // Update incident with memory reference
      if (memoryId) {
        const supabase = getSupabase();
        await supabase
          .from('incidents')
          .update({
            mem0_memory_ids: [...incident.mem0_memory_ids, memoryId],
          })
          .eq('id', incident.id);
      }

      return JSON.stringify({
        written: true,
        memory_id: memoryId,
        message: 'Learnings stored in memory. Will be used for future similar incidents.',
      });
    },
    {
      name: 'write_memory',
      description: 'Store learnings from a resolved incident into persistent memory.',
      schema: z.object({
        root_cause: z.string().describe('What caused the incident'),
        resolution: z.string().describe('How it was fixed'),
        lessons_learned: z.string().describe('Key takeaways for the future'),
      }),
    }
  );

  // ─── Tool 9: Check SLA ────────────────────────────
  const checkSLATool = tool(
    async () => {
      if (!incident.sla_breach_at) {
        return JSON.stringify({ sla_configured: false, message: 'No SLA configured for this incident' });
      }

      const status = getSLAStatus(new Date(incident.sla_breach_at));
      return JSON.stringify({
        sla_configured: true,
        ...status,
        severity: incident.severity,
        message: status.breached
          ? `⚠️ SLA BREACHED! Response time exceeded for ${incident.severity} incident.`
          : `SLA: ${status.remaining_formatted} remaining (${Math.round(status.percentage)}%)`,
      });
    },
    {
      name: 'check_sla',
      description: 'Check the SLA status and remaining time for the current incident.',
      schema: z.object({}),
    }
  );

  // ─── Tool 10: Verify Fix ─────────────────────────
  const verifyFixTool = tool(
    async ({ health_endpoint }) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(health_endpoint, {
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const isHealthy = response.ok;
        const body = await response.text().catch(() => '');

        return JSON.stringify({
          verified: true,
          healthy: isHealthy,
          status_code: response.status,
          response_body: body.substring(0, 500),
          message: isHealthy
            ? '✅ Service is healthy! Fix confirmed.'
            : `⚠️ Service still unhealthy (HTTP ${response.status}). Fix may not have worked.`,
        });
      } catch (err) {
        return JSON.stringify({
          verified: true,
          healthy: false,
          error: String(err),
          message: '❌ Could not reach health endpoint. Service may still be down.',
        });
      }
    },
    {
      name: 'verify_fix',
      description: 'Poll a health endpoint to verify if a fix was successful.',
      schema: z.object({
        health_endpoint: z.string().describe('URL of the health check endpoint to verify'),
      }),
    }
  );

  return [
    searchMemoryTool,
    scoreSeverityTool,
    suggestFixTool,
    escalateTool,
    generatePostmortemTool,
    notifySlackTool,
    updateStatusTool,
    writeMemoryTool,
    checkSLATool,
    verifyFixTool,
  ];
}
