// ═══════════════════════════════════════════════════════════
// Clerk Webhook Handler — User Sync
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';
import { initializeIngestionHealth } from '../../services/ingestionHealth.js';

const log = logger.child({ source: 'clerk' });

export async function handleClerkWebhook(
  rawBody: string,
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const payload = JSON.parse(rawBody);
    const eventType = payload.type;
    const data = payload.data;

    log.info({ eventType, userId: data?.id }, 'Clerk webhook received');

    const supabase = getSupabase();

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const email = data.email_addresses?.[0]?.email_address ?? null;
      const name = `${data.first_name ?? ''} ${data.last_name ?? ''}`.trim() || null;

      const { data: existingUser } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', data.id)
        .maybeSingle();

      let orgId = existingUser?.org_id as string | undefined;

      if (!orgId && eventType === 'user.created') {
        const orgName = name ? `${name}'s Workspace` : email ? `${email.split('@')[0]}'s Workspace` : 'Chronicle Workspace';
        const { data: org, error: orgError } = await supabase
          .from('orgs')
          .insert({ name: orgName })
          .select()
          .single();

        if (orgError || !org) {
          log.error({ orgError }, 'Failed to create org for new user');
        } else {
          orgId = org.id;
          await initializeIngestionHealth(org.id);
          log.info({ orgId: org.id, orgName }, 'Auto-provisioned organization for new user');
        }
      }

      await supabase
        .from('users')
        .upsert({
          id: data.id,
          email,
          name,
          ...(orgId ? { org_id: orgId, role: 'admin' } : {}),
        }, { onConflict: 'id', ignoreDuplicates: false });

      log.info({ userId: data.id, email, orgId }, `User ${eventType === 'user.created' ? 'created' : 'updated'}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    log.error({ err }, 'Failed to process Clerk webhook');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}
