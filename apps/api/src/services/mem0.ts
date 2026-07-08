// ═══════════════════════════════════════════════════════════
// Mem0 Client — AI Memory Layer
// ═══════════════════════════════════════════════════════════

import './polyfill.js';
import MemoryClient from 'mem0ai';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { withTimeout } from '../lib/timeout.js';
import type { MemoryResult, MemoryMetadata } from '@chronicle/shared';

const MEM0_TIMEOUT_MS = 4_000;

const log = logger.child({ service: 'mem0' });

let mem0Client: MemoryClient | null = null;

function getMem0(): MemoryClient {
  if (!mem0Client) {
    mem0Client = new MemoryClient({ apiKey: config.mem0.apiKey });
    log.info('Mem0 client initialized');
  }
  return mem0Client;
}

/**
 * Search memories for similar past incidents.
 */
export async function searchMemories(
  query: string,
  orgId: string,
  limit: number = 5
): Promise<MemoryResult[]> {
  try {
    const client = getMem0();
    const results = await withTimeout(
      client.search(query, { user_id: `org_${orgId}`, limit }),
      MEM0_TIMEOUT_MS,
      []
    );

    return ((results ?? []) as any[]).map((r) => ({
      id: String(r['id'] ?? ''),
      memory: String(r['memory'] ?? ''),
      score: Number(r['score'] ?? 0),
      metadata: (r['metadata'] ?? {}) as MemoryMetadata,
    }));
  } catch (err) {
    log.error({ err, orgId }, 'Failed to search Mem0 memories');
    return [];
  }
}

/**
 * Write learnings from a resolved incident to Mem0.
 */
export async function writeMemory(
  orgId: string,
  content: string,
  metadata: Partial<MemoryMetadata>
): Promise<string | null> {
  try {
    const client = getMem0();
    const result = await client.add(content, {
      user_id: `org_${orgId}`,
      metadata,
    });

    const memoryId = (result as any)?.['id'] as string ?? null;
    log.info({ orgId, memoryId }, 'Memory written to Mem0');
    return memoryId;
  } catch (err) {
    log.error({ err, orgId }, 'Failed to write memory to Mem0');
    return null;
  }
}

/**
 * Get all memories for an org (for stats/visualization).
 */
export async function getAllMemories(orgId: string): Promise<MemoryResult[]> {
  try {
    const client = getMem0();
    const results = await client.getAll({ user_id: `org_${orgId}` });
    return ((results ?? []) as any[]).map((r) => ({
      id: String(r['id'] ?? ''),
      memory: String(r['memory'] ?? ''),
      score: 1,
      metadata: (r['metadata'] ?? {}) as MemoryMetadata,
    }));
  } catch (err) {
    log.error({ err, orgId }, 'Failed to get all memories');
    return [];
  }
}
