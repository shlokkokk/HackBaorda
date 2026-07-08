// ═══════════════════════════════════════════════════════════
// Deduplication Service — Fingerprint-based incident merging
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';
import { generateFingerprint } from '@chronicle/shared';
import type { CreateIncidentInput, Incident } from '@chronicle/shared';

const log = logger.child({ service: 'deduplication' });

/**
 * Check if a similar incident already exists within the dedup window.
 * If yes, merge into existing. If no, return null (create new).
 */
export async function checkDuplicate(
  orgId: string,
  input: CreateIncidentInput
): Promise<Incident | null> {
  const fingerprint = input.fingerprint ?? generateFingerprint({
    title: input.title,
    description: input.description,
    affected_services: input.affected_services,
  });

  const supabase = getSupabase();

  // Look for existing incident with same fingerprint in last 10 minutes
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: existing } = await supabase
    .from('incidents')
    .select('*')
    .eq('org_id', orgId)
    .eq('fingerprint', fingerprint)
    .gte('created_at', tenMinsAgo)
    .in('status', ['open', 'investigating', 'mitigating'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    log.info({
      existingId: existing.id,
      newSource: input.source,
      fingerprint,
    }, 'Duplicate detected — merging into existing incident');

    // Merge: add source to merged_from array
    const mergedFrom = [...(existing.merged_from ?? [])];
    const sourceTag = `${input.source}:${input.source_id ?? 'unknown'}`;
    if (!mergedFrom.includes(sourceTag)) {
      mergedFrom.push(sourceTag);
    }

    // Update existing incident with merged info
    await supabase
      .from('incidents')
      .update({
        merged_from: mergedFrom,
        description: existing.description
          ? `${existing.description}\n\n---\n**Also reported by ${input.source}:** ${input.description ?? input.title}`
          : input.description,
      })
      .eq('id', existing.id);

    return existing as Incident;
  }

  return null;
}

/**
 * Generate and attach a fingerprint to an incident input.
 */
export function attachFingerprint(input: CreateIncidentInput): CreateIncidentInput {
  if (!input.fingerprint) {
    input.fingerprint = generateFingerprint({
      title: input.title,
      description: input.description,
      affected_services: input.affected_services,
    });
  }
  return input;
}
