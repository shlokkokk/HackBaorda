// ═══════════════════════════════════════════════════════════
// Clerk Webhook Handler — User Sync
// ═══════════════════════════════════════════════════════════

import type { Request, Response } from 'express';
import { getSupabase } from '../../db/client.js';
import { logger } from '../../lib/logger.js';

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

      await supabase
        .from('users')
        .upsert({
          id: data.id,
          email,
          name,
        }, { onConflict: 'id', ignoreDuplicates: false });

      log.info({ userId: data.id, email }, `User ${eventType === 'user.created' ? 'created' : 'updated'}`);
    }

    res.json({ status: 'ok' });
  } catch (err) {
    log.error({ err }, 'Failed to process Clerk webhook');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}
