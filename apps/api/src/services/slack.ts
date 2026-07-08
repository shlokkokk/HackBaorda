// ═══════════════════════════════════════════════════════════
// Slack Service — Bolt SDK Integration
// ═══════════════════════════════════════════════════════════

import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { Incident } from '@chronicle/shared';
import { SEVERITY_CONFIG, SOURCE_CONFIG } from '@chronicle/shared';

const log = logger.child({ service: 'slack' });

/**
 * Send a rich Block Kit message to Slack.
 */
export async function sendSlackMessage(
  channel: string,
  text: string,
  blocks?: Record<string, unknown>[],
  threadTs?: string
): Promise<string | null> {
  if (!config.slack.botToken) {
    log.warn('Slack not configured — skipping message');
    return null;
  }

  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.slack.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        text,
        blocks,
        thread_ts: threadTs,
      }),
    });

    const data = await response.json() as { ok: boolean; error?: string; ts?: string };
    if (!data.ok) {
      if (data.error === 'channel_not_found' && channel !== 'general' && channel !== '#general') {
        log.warn({ channel }, 'Slack channel not found, falling back to general');
        return sendSlackMessage('general', text, blocks, threadTs);
      }
      log.error({ error: data.error, channel }, 'Slack message failed');
      return null;
    }

    log.info({ channel, ts: data.ts }, 'Slack message sent');
    return data.ts ?? null;
  } catch (err) {
    log.error({ err, channel }, 'Failed to send Slack message');
    return null;
  }
}

/**
 * Send an incident alert as a rich Slack Block Kit message.
 */
export async function sendIncidentSlackAlert(
  channel: string,
  incident: Incident,
  agentResponse?: string
): Promise<string | null> {
  const severity = SEVERITY_CONFIG[incident.severity];
  const source = SOURCE_CONFIG[incident.source];

  const blocks: Record<string, unknown>[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${severity.icon} ${incident.severity} Incident`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${incident.title}*\n${incident.description?.substring(0, 200) ?? 'No description'}`,
      },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Source:* ${source.icon} ${source.label}` },
        { type: 'mrkdwn', text: `*Status:* ${incident.status}` },
        { type: 'mrkdwn', text: `*Services:* ${incident.affected_services.join(', ') || 'Unknown'}` },
        { type: 'mrkdwn', text: `*Created:* <!date^${Math.floor(new Date(incident.created_at).getTime() / 1000)}^{date_short} {time}|${incident.created_at}>` },
      ],
    },
  ];

  if (agentResponse) {
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🤖 *Chronicle AI:*\n${agentResponse.substring(0, 500)}`,
        },
      }
    );
  }

  blocks.push(
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔍 View in Dashboard', emoji: true },
          url: `${config.appUrl}/dashboard/incidents/${incident.id}`,
          action_id: 'view_incident',
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '✅ Acknowledge', emoji: true },
          action_id: 'ack_incident',
          value: incident.id,
          style: 'primary',
        },
      ],
    }
  );

  return sendSlackMessage(
    channel,
    `${severity.icon} [${incident.severity}] ${incident.title}`,
    blocks
  );
}
