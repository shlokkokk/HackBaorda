// ═══════════════════════════════════════════════════════════
// Notifications Service — Email via Resend
// ═══════════════════════════════════════════════════════════

import { Resend } from 'resend';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import type { Incident } from '@chronicle/shared';
import { SEVERITY_CONFIG } from '@chronicle/shared';

const log = logger.child({ service: 'notifications' });

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!config.resend.apiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(config.resend.apiKey);
    log.info('Resend client initialized');
  }
  return resendClient;
}

/**
 * Send incident alert email to on-call engineer.
 */
export async function sendIncidentEmail(
  to: string,
  incident: Incident
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    log.warn('Resend not configured — skipping email');
    return false;
  }

  try {
    const severityConfig = SEVERITY_CONFIG[incident.severity];

    await resend.emails.send({
      from: 'Chronicle <alerts@chronicle.app>',
      to,
      subject: `${severityConfig.icon} [${incident.severity}] ${incident.title}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fafafa; padding: 24px; border-radius: 12px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
            <span style="font-size: 24px;">${severityConfig.icon}</span>
            <h1 style="margin: 0; font-size: 20px; color: ${severityConfig.color};">${incident.severity} Incident</h1>
          </div>
          <h2 style="margin: 0 0 12px; font-size: 18px;">${incident.title}</h2>
          <p style="color: #a3a3a3; line-height: 1.6;">${incident.description ?? 'No description provided.'}</p>
          <div style="margin-top: 16px; padding: 12px; background: #171717; border-radius: 8px;">
            <p style="margin: 0; color: #a3a3a3; font-size: 14px;">
              <strong>Source:</strong> ${incident.source}<br/>
              <strong>Services:</strong> ${incident.affected_services.join(', ') || 'Unknown'}<br/>
              <strong>Status:</strong> ${incident.status}
            </p>
          </div>
          <a href="${config.appUrl}/incidents/${incident.id}" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
            View in Chronicle →
          </a>
        </div>
      `,
    });

    log.info({ to, incidentId: incident.id }, 'Incident email sent');
    return true;
  } catch (err) {
    log.error({ err, to }, 'Failed to send incident email');
    return false;
  }
}
