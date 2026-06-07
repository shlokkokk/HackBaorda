// ═══════════════════════════════════════════════════════════
// Incident Event Listeners — Auto-Triage + Memory Auto-Extraction
// ═══════════════════════════════════════════════════════════

import { eventBus } from '../services/events.js';
import { autoTriageIncident } from './orchestrator.js';
import { writeMemory } from '../services/mem0.js';
import { storeIncidentEmbedding } from '../services/embeddings.js';
import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { POSTMORTEM_PROMPT } from './prompts/system.js';

const log = logger.child({ service: 'incident-listeners' });

export function initializeListeners() {
  log.info('Initializing incident event listeners...');

  // ─── AUTO-TRIAGE ON CREATED ───────────────────────
  eventBus.onEvent('incident.created', async ({ incident, orgId }) => {
    try {
      log.info({ incidentId: incident.id }, 'Event incident.created received — starting auto-triage');
      
      // Store initial vector embedding
      await storeIncidentEmbedding(incident.id, `${incident.title} ${incident.description ?? ''}`);
      
      // Execute the AI Agent triage loop (search memory, score, suggest fix, notify Slack)
      await autoTriageIncident(incident, orgId);
    } catch (err) {
      log.error({ err, incidentId: incident.id }, 'Error auto-triaging incident on created event');
    }
  });

  // ─── AUTO-EXTRACT MEMORY ON RESOLVED ──────────────
  eventBus.onEvent('incident.resolved', async ({ incident, orgId }) => {
    try {
      log.info({ incidentId: incident.id }, 'Event incident.resolved received — extracting learnings');
      const supabase = getSupabase();

      // Fetch latest incident details to capture user-supplied root cause and resolution
      const { data: latestIncident, error: fetchErr } = await supabase
        .from('incidents')
        .select('*')
        .eq('id', incident.id)
        .single();

      if (fetchErr || !latestIncident) {
        log.error({ fetchErr, incidentId: incident.id }, 'Failed to fetch latest incident details for resolution learning');
        return;
      }

      const rootCause = latestIncident.root_cause ?? 'No root cause specified';
      const resolution = latestIncident.resolution ?? 'No resolution specified';

      // Formulate natural language representation of incident learning
      const content = `Incident: "${latestIncident.title}". Affected services: ${latestIncident.affected_services.join(', ') || 'none'}. Root cause: ${rootCause}. Resolution: ${resolution}.`;

      const timeToResolve = latestIncident.resolved_at && latestIncident.created_at
        ? Math.round((new Date(latestIncident.resolved_at).getTime() - new Date(latestIncident.created_at).getTime()) / (1000 * 60))
        : 0;

      // Write learning context to Mem0
      const memoryId = await writeMemory(orgId, content, {
        incident_id: latestIncident.id,
        title: latestIncident.title,
        affected_services: latestIncident.affected_services,
        root_cause: rootCause,
        effective_fix: resolution,
        time_to_resolve_mins: timeToResolve,
        severity: latestIncident.severity,
        source: latestIncident.source,
      });

      if (memoryId) {
        // Update DB entry with stored memory reference
        const currentMemories = latestIncident.mem0_memory_ids ?? [];
        if (!currentMemories.includes(memoryId)) {
          await supabase
            .from('incidents')
            .update({
              mem0_memory_ids: [...currentMemories, memoryId]
            })
            .eq('id', latestIncident.id);
        }

        // Generate updated embedding with the resolution and root cause
        await storeIncidentEmbedding(latestIncident.id, `${content} Root Cause: ${rootCause}. Resolution: ${resolution}.`);
        log.info({ incidentId: latestIncident.id, memoryId }, 'Incident memory successfully written to Mem0');
      }

      // ─── DRAFT POSTMORTEM ───────────────────────────
      // Check if a postmortem draft already exists for this incident
      const { data: existingPostmortem } = await supabase
        .from('postmortems')
        .select('id')
        .eq('incident_id', latestIncident.id)
        .single();

      if (!existingPostmortem) {
        const pmContent = POSTMORTEM_PROMPT
          .replace('[Title]', latestIncident.title)
          .replace('{{DATE}}', new Date().toISOString());

        await supabase
          .from('postmortems')
          .insert({
            incident_id: latestIncident.id,
            org_id: orgId,
            content: pmContent,
            review_status: 'draft',
          });
        log.info({ incidentId: latestIncident.id }, 'Auto-generated draft postmortem for resolved incident');
      }

    } catch (err) {
      log.error({ err, incidentId: incident.id }, 'Error running resolution processes');
    }
  });
}
