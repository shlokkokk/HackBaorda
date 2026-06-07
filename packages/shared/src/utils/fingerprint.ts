// ═══════════════════════════════════════════════════════════
// Deduplication Fingerprint Generator
// ═══════════════════════════════════════════════════════════

/**
 * Generate a deduplication fingerprint for an incident.
 * Same fingerprint within a 10-minute window = merge into existing incident.
 *
 * Format: `{service}:{type}:{10min_window}`
 */
export function generateFingerprint(incident: {
  title?: string;
  description?: string;
  affected_services?: string[];
}): string {
  const service = incident.affected_services?.[0] ?? 'unknown';

  const text = `${incident.title ?? ''} ${incident.description ?? ''}`.toLowerCase();

  let type = 'generic';
  if (text.includes('timeout')) type = 'timeout';
  else if (text.includes('500') || text.includes('internal server error')) type = 'http_500';
  else if (text.includes('connection') || text.includes('refused')) type = 'connection';
  else if (text.includes('memory') || text.includes('oom')) type = 'memory';
  else if (text.includes('cpu') || text.includes('load')) type = 'cpu';
  else if (text.includes('disk') || text.includes('storage')) type = 'disk';
  else if (text.includes('ssl') || text.includes('certificate')) type = 'ssl';
  else if (text.includes('dns')) type = 'dns';
  else if (text.includes('rate limit') || text.includes('throttl')) type = 'rate_limit';
  else if (text.includes('auth') || text.includes('unauthorized')) type = 'auth';

  // 10-minute window: floor to nearest 10 minutes
  const window = Math.floor(Date.now() / (1000 * 60 * 10));

  return `${service}:${type}:${window}`;
}

/**
 * Check if two fingerprints are from the same dedup window.
 * Used for cross-source correlation.
 */
export function fingerprintsMatch(a: string, b: string): boolean {
  return a === b;
}

/**
 * Extract the service name from a fingerprint.
 */
export function extractServiceFromFingerprint(fingerprint: string): string {
  return fingerprint.split(':')[0] ?? 'unknown';
}
