// ═══════════════════════════════════════════════════════════
// Ingestion Health Service — Track source status
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { INGESTION_STALENESS, ALL_SOURCES, isValidOrgId } from '@chronicle/shared';
import type { IncidentSource, IngestionHealth } from '@chronicle/shared';

const log = logger.child({ service: 'ingestion-health' });

/**
 * Record a ping from an ingestion source.
 * Called whenever a webhook is received from any source.
 */
export async function recordSourcePing(
  orgId: string,
  source: IncidentSource,
  isIncident: boolean = false
): Promise<void> {
  if (!isValidOrgId(orgId)) {
    log.warn({ orgId, source }, 'Skipping source ping — invalid org_id');
    return;
  }

  const supabase = getSupabase();

  const updates: Record<string, unknown> = {
    status: 'healthy',
    last_ping_at: new Date().toISOString(),
  };

  if (isIncident) {
    updates['last_incident_at'] = new Date().toISOString();
  }

  const { error } = await supabase
    .from('ingestion_health')
    .upsert(
      {
        org_id: orgId,
        source,
        ...updates,
        total_incidents: isIncident ? 1 : 0,
      },
      { onConflict: 'org_id,source' }
    );

  if (isIncident) {
    // Increment total_incidents
    try {
      await supabase.rpc('increment_ingestion_count', {
        p_org_id: orgId,
        p_source: source,
      });
    } catch {
      // RPC might not exist yet, fallback
      log.debug('increment_ingestion_count RPC not available');
    }
  }

  if (error) {
    log.error({ error, orgId, source }, 'Failed to record source ping');
  }
}

/**
 * Get health status of all ingestion sources for an org.
 */
export async function getIngestionHealth(
  orgId: string
): Promise<IngestionHealth[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ingestion_health')
    .select('*')
    .eq('org_id', orgId);

  if (error) {
    log.error({ error, orgId }, 'Failed to fetch ingestion health');
    return [];
  }

  const now = Date.now();
  const healthData = data ?? [];

  // Check staleness for each source
  return healthData.map((item) => {
    const lastPing = new Date(item.last_ping_at).getTime();
    const staleness = INGESTION_STALENESS[item.source as IncidentSource] ?? Infinity;
    const isStale = (now - lastPing) > staleness;

    return {
      ...item,
      status: isStale ? 'stale' : item.status,
    } as IngestionHealth;
  });
}

/**
 * Initialize ingestion health entries for a new org.
 */
export async function initializeIngestionHealth(orgId: string): Promise<void> {
  const supabase = getSupabase();

  const entries = ALL_SOURCES.map((source) => ({
    org_id: orgId,
    source,
    status: source === 'manual' ? 'healthy' : 'stale',
    last_ping_at: new Date().toISOString(),
    total_incidents: 0,
  }));

  await supabase
    .from('ingestion_health')
    .upsert(entries, { onConflict: 'org_id,source' });

  log.info({ orgId }, 'Initialized ingestion health entries');
}
