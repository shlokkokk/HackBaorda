// ═══════════════════════════════════════════════════════════
// Organization ID validation for webhooks and ingestion
// ═══════════════════════════════════════════════════════════

import { orgIdValidationError } from '@sentinel/shared';
import { getSupabase } from '../db/client.js';
import { logger } from './logger.js';

const log = logger.child({ service: 'org-validation' });

export function getOrgIdValidationError(orgId: string | undefined | null): string | null {
  return orgIdValidationError(orgId);
}

/**
 * Validate org_id format and optionally verify the org exists in the database.
 */
export async function validateOrgIdForIngestion(
  orgId: string | undefined | null,
  options: { verifyExists?: boolean } = { verifyExists: true }
): Promise<{ ok: true; orgId: string } | { ok: false; status: number; error: string }> {
  const formatError = orgIdValidationError(orgId);
  if (formatError) {
    return { ok: false, status: 400, error: formatError };
  }

  const validOrgId = orgId!.trim();

  if (!options.verifyExists) {
    return { ok: true, orgId: validOrgId };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('orgs')
    .select('id')
    .eq('id', validOrgId)
    .maybeSingle();

  if (error) {
    log.error({ error, orgId: validOrgId }, 'Failed to verify org exists');
    return { ok: false, status: 500, error: 'Failed to verify organization' };
  }

  if (!data) {
    return {
      ok: false,
      status: 404,
      error: `Organization not found for id "${validOrgId}". Sign up at the dashboard first, then run: pnpm setup:agent`,
    };
  }

  return { ok: true, orgId: validOrgId };
}
