// ═══════════════════════════════════════════════════════════
// Slack Webhook Handler — Slash Commands + Event Subscriptions
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { config } from '../../lib/config.js';
import { runAgent } from '../../agent/orchestrator.js';
import { sendSlackMessage } from '../../services/slack.js';
import { getIngestionHealth } from '../../services/ingestionHealth.js';
import { calculateBreachAt, getOrgSLAConfig } from '../../services/sla.js';
import { eventBus } from '../../services/events.js';
import { generateFingerprint } from '@sentinel/shared';
import type { Incident, IncidentStatus } from '@sentinel/shared';

const log = logger.child({ source: 'slack-webhook' });

export async function handleSlackWebhook(req: Request, res: Response): Promise<void> {
  // Parse raw body if it is a Buffer
  let payload = req.body;
  if (Buffer.isBuffer(req.body)) {
    const raw = req.body.toString('utf8');
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('application/x-www-form-urlencoded')) {
      payload = Object.fromEntries(new URLSearchParams(raw));
    } else {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = {};
      }
    }
  }

  // Check Slack URL verification challenge
  if (payload.type === 'url_verification') {
    log.info('Slack URL verification challenge received');
    res.status(200).send(payload.challenge);
    return;
  }

  // ─── 1. EVENT CALLBACKS (e.g. Thread replies) ─────────
  if (payload.type === 'event_callback') {
    const event = payload.event;
    if (!event) {
      res.status(200).json({ status: 'ok' });
      return;
    }

    log.debug({ eventType: event.type, subtype: event.subtype }, 'Slack event callback received');

    // Handle message event in thread replies (excluding bot's own replies)
    if (event.type === 'message' && event.thread_ts && !event.bot_id && event.subtype !== 'bot_message') {
      const threadTs = event.thread_ts;
      const userMessage = event.text;
      const channel = event.channel;

      log.info({ threadTs, channel }, 'Slack thread reply detected');

      const supabase = getSupabase();
      // Look up incident by slack_thread_ts
      const { data: incident } = await supabase
        .from('incidents')
        .select('*')
        .eq('slack_thread_ts', threadTs)
        .limit(1)
        .maybeSingle();

      if (incident) {
        log.info({ incidentId: incident.id }, 'Found matching incident for thread reply. Running AI Agent...');
        
        // Respond 200 immediately to Slack to prevent timeout retries
        res.status(200).json({ status: 'processing' });

        try {
          // Run the agent loop
          const agentResponse = await runAgent(incident as Incident, userMessage, incident.org_id);
          
          // Reply in the same thread
          await sendSlackMessage(channel, agentResponse.response, undefined, threadTs);
        } catch (err) {
          log.error({ err, incidentId: incident.id }, 'Failed to process thread reply agent query');
        }
        return;
      }
    }

    res.status(200).json({ status: 'ignored' });
    return;
  }

  // ─── 2. SLASH COMMANDS ──────────────────────────────────
  // Slack slash commands are sent as x-www-form-urlencoded, so we read from payload directly
  const commandText = payload.text as string | undefined;
  const commandName = payload.command as string | undefined;
  const teamId = payload.team_id as string | undefined;
  const channelId = payload.channel_id as string | undefined;
  const userId = payload.user_id as string | undefined;

  log.info({ commandName, commandText, teamId }, 'Slack slash command received');

  if (!teamId) {
    res.status(200).json({ text: '❌ Slack Team ID missing in request.' });
    return;
  }

  const supabase = getSupabase();

  // Find org by slack_workspace_id
  const { data: org } = await supabase
    .from('orgs')
    .select('*')
    .eq('slack_workspace_id', teamId)
    .limit(1)
    .maybeSingle();

  if (!org) {
    res.status(200).json({
      text: `⚠️ This Slack workspace is not linked to any Sentinel organization.\nGo to Sentinel settings and configure Slack Workspace ID: \`${teamId}\`.`
    });
    return;
  }

  const args = commandText ? commandText.trim().split(/\s+/) : [];
  const action = args[0]?.toLowerCase() ?? 'help';

  try {
    switch (action) {
      case 'new': {
        const title = args.slice(1).join(' ');
        if (!title) {
          res.status(200).json({ text: '❌ Please specify a title: `/sentinel new [Incident Title]`' });
          return;
        }

        const severity = 'P3';
        const slaConfig = await getOrgSLAConfig(org.id);
        const breachAt = calculateBreachAt(new Date(), severity, slaConfig);
        const fingerprint = generateFingerprint({ title, description: 'Created via Slack' });

        const { data: incident, error } = await supabase
          .from('incidents')
          .insert({
            org_id: org.id,
            title,
            description: `Reported via Slack by user <@${userId}> in channel <#${channelId}>.`,
            severity,
            status: 'open',
            source: 'slack',
            source_id: userId,
            tags: ['slack', 'manual-report'],
            fingerprint,
            sla_breach_at: breachAt.toISOString()
          })
          .select()
          .single();

        if (error || !incident) {
          throw error || new Error('Failed to create incident');
        }

        // Emit created event for auto-triage & Slack alerts
        eventBus.emitEvent('incident.created', { incident: incident as Incident, orgId: org.id });

        res.status(200).json({
          response_type: 'in_channel',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Manual Incident Created via Slack*:\n*Title:* ${title}\n*Severity:* ${severity}\n*Status:* open`
              }
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🔍 View in Dashboard' },
                  url: `${config.appUrl}/dashboard/incidents/${incident.id}`
                }
              ]
            }
          ]
        });
        return;
      }

      case 'status': {
        const { data: incidents, error } = await supabase
          .from('incidents')
          .select('*')
          .eq('org_id', org.id)
          .in('status', ['open', 'investigating', 'mitigating'])
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (!incidents || incidents.length === 0) {
          res.status(200).json({ text: '🟢 *No active incidents!* All systems healthy.' });
          return;
        }

        const blocks: any[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🚨 *Active Open Incidents (${incidents.length})*:`
            }
          },
          { type: 'divider' }
        ];

        incidents.forEach((inc) => {
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*${inc.severity}* • *${inc.title}*\nStatus: \`${inc.status}\` • Affected Services: ${inc.affected_services.join(', ') || 'none'}\nID: \`${inc.id}\``
            },
            accessory: {
              type: 'button',
              text: { type: 'plain_text', text: 'View' },
              url: `${config.appUrl}/dashboard/incidents/${inc.id}`
            }
          });
        });

        res.status(200).json({ response_type: 'ephemeral', blocks });
        return;
      }

      case 'resolve': {
        const idSearch = args[1];
        if (!idSearch) {
          res.status(200).json({ text: '❌ Please specify the incident ID: `/sentinel resolve [Incident ID]`' });
          return;
        }

        // Search full UUID or prefix
        let queryBuilder = supabase.from('incidents').select('*').eq('org_id', org.id);
        if (idSearch.length === 36) {
          queryBuilder = queryBuilder.eq('id', idSearch);
        } else {
          queryBuilder = queryBuilder.like('id', `${idSearch}%`);
        }

        const { data: incident, error } = await queryBuilder.limit(1).maybeSingle();
        if (error || !incident) {
          res.status(200).json({ text: `❌ Active incident matching ID prefix \`${idSearch}\` not found.` });
          return;
        }

        if (incident.status === 'resolved' || incident.status === 'postmortem') {
          res.status(200).json({ text: `ℹ️ Incident \`${incident.title}\` is already resolved.` });
          return;
        }

        const { data: updated, error: updateError } = await supabase
          .from('incidents')
          .update({
            status: 'resolved' as IncidentStatus,
            resolved_at: new Date().toISOString(),
            resolution: `Resolved via Slack by user <@${userId}>.`
          })
          .eq('id', incident.id)
          .select()
          .single();

        if (updateError || !updated) throw updateError || new Error('Failed to resolve');

        // Emit resolved event for memory extraction & postmortem draft
        eventBus.emitEvent('incident.resolved', { incident: updated as Incident, orgId: org.id });

        res.status(200).json({
          response_type: 'in_channel',
          text: `✅ Resolved incident: *${incident.title}* (ID: \`${incident.id}\`). Learnings added to AI memory.`
        });
        return;
      }

      case 'sources': {
        const health = await getIngestionHealth(org.id);

        const blocks: any[] = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🔌 *Ingestion Health Status Overview*:`
            }
          },
          { type: 'divider' }
        ];

        health.forEach((src) => {
          const statusIndicator = src.status === 'healthy' ? '🟢' : src.status === 'stale' ? '🟡' : '🔴';
          const lastPing = src.last_ping_at ? new Date(src.last_ping_at).toLocaleString() : 'Never';
          blocks.push({
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${statusIndicator} *${src.source}* — *${src.status}*\nLast Ping: \`${lastPing}\` • Incidents: \`${src.total_incidents}\``
            }
          });
        });

        res.status(200).json({ response_type: 'ephemeral', blocks });
        return;
      }

      default: {
        res.status(200).json({
          text: `ℹ️ *Sentinel AI Slash Commands Usage*:\n` +
                `• \`/sentinel new [Title]\` — Programmatically report a new incident\n` +
                `• \`/sentinel status\` — List all active open incidents\n` +
                `• \`/sentinel resolve [Incident ID]\` — Mark active incident resolved\n` +
                `• \`/sentinel sources\` — Output all monitored ingestion channel healths\n` +
                `• \`/sentinel help\` — Display this instructions helper list`
        });
        return;
      }
    }
  } catch (err) {
    log.error({ err }, 'Slack command handling error occurred');
    res.status(200).json({ text: '❌ An error occurred processing the Slack request.' });
  }
}
