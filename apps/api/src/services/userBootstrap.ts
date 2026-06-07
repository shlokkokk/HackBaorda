// ═══════════════════════════════════════════════════════════
// User Bootstrap — Ensure Clerk users are linked to an org
// Works without Clerk webhooks (common in local dev)
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { initializeIngestionHealth } from './ingestionHealth.js';

const log = logger.child({ service: 'user-bootstrap' });

/**
 * Ensure a Clerk user exists in Supabase and is linked to an organization.
 * Returns the org_id for the user.
 */
export async function ensureUserProvisioned(
  userId: string,
  profile?: { email?: string | null; name?: string | null }
): Promise<string> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('users')
    .select('org_id, email, name')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.org_id) {
    return existing.org_id;
  }

  // Resolve or create an organization
  const { data: orgs } = await supabase
    .from('orgs')
    .select('id, name')
    .order('created_at', { ascending: true })
    .limit(1);

  let orgId = orgs?.[0]?.id;

  if (!orgId) {
    const { data: newOrg, error } = await supabase
      .from('orgs')
      .insert({ name: 'Sentinel DevOps' })
      .select()
      .single();

    if (error || !newOrg) {
      throw new Error('Failed to create default organization');
    }

    orgId = newOrg.id;
    await initializeIngestionHealth(orgId);
    log.info({ orgId }, 'Created default org during user bootstrap');
  }

  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: userId,
      org_id: orgId,
      email: profile?.email ?? existing?.email ?? null,
      name: profile?.name ?? existing?.name ?? null,
      role: 'admin',
    },
    { onConflict: 'id' }
  );

  if (upsertError) {
    log.error({ upsertError, userId }, 'Failed to upsert user during bootstrap');
    throw new Error('Failed to provision user');
  }

  log.info({ userId, orgId }, 'Provisioned user with organization');
  return orgId;
}
