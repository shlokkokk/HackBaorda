// ═══════════════════════════════════════════════════════════
// UUID validation helpers
// ═══════════════════════════════════════════════════════════

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Placeholder values that must never be sent to the database as org_id */
export const INVALID_ORG_ID_PLACEHOLDERS = new Set([
  'your_org_uuid_here',
  'your_org_uuid_here_get_from_db',
  'your-org-uuid',
  'org-demo-123',
  'replace_me',
  'changeme',
]);

export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value.trim());
}

export function isValidOrgId(value: string | undefined | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (INVALID_ORG_ID_PLACEHOLDERS.has(trimmed)) return false;
  return isValidUuid(trimmed);
}

export function orgIdValidationError(value: string | undefined | null): string | null {
  if (!value?.trim()) {
    return 'org_id is required. Run: pnpm setup:agent';
  }
  if (INVALID_ORG_ID_PLACEHOLDERS.has(value.trim())) {
    return `org_id is still set to placeholder "${value}". Run: pnpm setup:agent`;
  }
  if (!isValidUuid(value)) {
    return `org_id must be a valid UUID, got "${value}". Run: pnpm setup:agent`;
  }
  return null;
}
