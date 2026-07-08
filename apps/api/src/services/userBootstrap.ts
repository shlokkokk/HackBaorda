// ═══════════════════════════════════════════════════════════
// User Bootstrap — Ensure Clerk users are linked to an org
// Works without Clerk webhooks (common in local dev)
// ═══════════════════════════════════════════════════════════

import { createClerkClient } from '@clerk/backend';
import { getSupabase } from '../db/client.js';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { initializeIngestionHealth } from './ingestionHealth.js';

const log = logger.child({ service: 'user-bootstrap' });
const clerkClient = createClerkClient({ secretKey: config.clerk.secretKey });

async function loadClerkProfile(userId: string): Promise<{ email: string | null; name: string | null }> {
  try {
    const clerkUser = await clerkClient.users.getUser(userId);
    const nameFromParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim();

    return {
      email: clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? null,
      name: clerkUser.fullName ?? (nameFromParts || clerkUser.username || null),
    };
  } catch (err) {
    log.warn({ err, userId }, 'Failed to load Clerk profile during user bootstrap');
    return { email: null, name: null };
  }
}

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
    .select('org_id, email, name, role')
    .eq('id', userId)
    .maybeSingle();

  if (existing?.org_id && existing?.name && existing?.email) {
    return existing.org_id;
  }

  const clerkProfile = await loadClerkProfile(userId);
  const resolvedProfile = {
    email: profile?.email ?? clerkProfile.email ?? existing?.email ?? null,
    name: profile?.name ?? clerkProfile.name ?? existing?.name ?? null,
  };

  // Resolve or create an organization
  let orgId = existing?.org_id ?? undefined;

  if (!orgId) {
    const { data: orgs } = await supabase
      .from('orgs')
      .select('id, name')
      .order('created_at', { ascending: true })
      .limit(1);

    orgId = orgs?.[0]?.id;

    if (!orgId) {
      const { data: newOrg, error } = await supabase
        .from('orgs')
        .insert({ name: resolvedProfile.name ? `${resolvedProfile.name}'s Workspace` : 'Chronicle DevOps' })
        .select()
        .single();

      if (error || !newOrg) {
        throw new Error('Failed to create default organization');
      }

      orgId = newOrg.id;
      await initializeIngestionHealth(orgId);
      log.info({ orgId }, 'Created default org during user bootstrap');
    }
  }

  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: userId,
      org_id: orgId,
      email: resolvedProfile.email,
      name: resolvedProfile.name,
      role: existing?.role ?? 'admin',
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
