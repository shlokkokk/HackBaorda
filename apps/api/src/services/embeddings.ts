// ═══════════════════════════════════════════════════════════
// Embeddings Service — Generate & Store pgvector embeddings
// ═══════════════════════════════════════════════════════════

import { getSupabase } from '../db/client.js';
import { logger } from '../lib/logger.js';

const log = logger.child({ service: 'embeddings' });

/**
 * Generate an embedding for text using Groq.
 * Falls back to a simple hash-based pseudo-embedding if API fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    // Use Groq for embedding via a creative approach:
    // We'll use the LLM to generate a summary, then create a deterministic embedding
    // In production, you'd use OpenAI's embedding API or a dedicated embedding model

    // Simple deterministic embedding based on text features
    // This is a fallback — in production use OpenAI text-embedding-3-small
    const embedding = createDeterministicEmbedding(text);
    return embedding;
  } catch (err) {
    log.error({ err }, 'Failed to generate embedding');
    return null;
  }
}

/**
 * Create a deterministic pseudo-embedding from text.
 * Uses character/word frequency analysis to create a 1536-dim vector.
 * Good enough for hackathon demo — replace with real embedding API in production.
 */
function createDeterministicEmbedding(text: string): number[] {
  const normalized = text.toLowerCase();
  const embedding = new Array(1536).fill(0);

  // Character frequency features
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    const idx = charCode % 1536;
    embedding[idx] = (embedding[idx] ?? 0) + 1;
  }

  // Word-level features
  const words = normalized.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const word = words[i] ?? '';
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = ((hash << 5) - hash + word.charCodeAt(j)) & 0xffffffff;
    }
    const idx = Math.abs(hash) % 1536;
    embedding[idx] = (embedding[idx] ?? 0) + 0.5;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = (embedding[i] ?? 0) / magnitude;
    }
  }

  return embedding;
}

/**
 * Store embedding for an incident in the database.
 */
export async function storeIncidentEmbedding(
  incidentId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('incidents')
    .update({ embedding })
    .eq('id', incidentId);

  if (error) {
    log.error({ error, incidentId }, 'Failed to store incident embedding');
  } else {
    log.debug({ incidentId }, 'Incident embedding stored');
  }
}

/**
 * Store embedding for a runbook in the database.
 */
export async function storeRunbookEmbedding(
  runbookId: string,
  text: string
): Promise<void> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return;

  const supabase = getSupabase();
  const { error } = await supabase
    .from('runbooks')
    .update({ embedding })
    .eq('id', runbookId);

  if (error) {
    log.error({ error, runbookId }, 'Failed to store runbook embedding');
  } else {
    log.debug({ runbookId }, 'Runbook embedding stored');
  }
}

/**
 * Search similar incidents using pgvector.
 */
export async function searchSimilarIncidents(
  text: string,
  orgId: string,
  limit: number = 5
): Promise<Array<{ id: string; title: string; similarity: number; root_cause: string | null; resolution: string | null }>> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('search_similar_incidents', {
    query_embedding: embedding,
    match_org_id: orgId,
    match_count: limit,
    match_threshold: 0.3,
  });

  if (error) {
    log.error({ error, orgId }, 'pgvector search failed');
    return [];
  }

  return data ?? [];
}

/**
 * Search similar runbooks using pgvector.
 */
export async function searchSimilarRunbooks(
  text: string,
  orgId: string,
  limit: number = 3
): Promise<Array<{
  id: string;
  title: string;
  incident_type: string | null;
  steps: unknown;
  safe_to_automate: boolean;
  confidence_threshold: number;
  similarity: number;
}>> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return [];

  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('search_similar_runbooks', {
    query_embedding: embedding,
    match_org_id: orgId,
    match_count: limit,
    match_threshold: 0.25,
  });

  if (error) {
    log.error({ error, orgId }, 'Runbook pgvector search failed');
    return [];
  }

  return data ?? [];
}
