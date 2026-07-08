import type { ChaosScenario } from './demo-state';
import { SCENARIO_META } from './demo-state';

const API_URL = process.env.CHRONICLE_API_URL ?? 'http://localhost:3001';
const ORG_ID = process.env.CHRONICLE_ORG_ID ?? '';
const WEBHOOK_SECRET = process.env.CHRONICLE_WEBHOOK_SECRET ?? '';

export async function notifyChronicle(
  scenario: ChaosScenario,
  active: boolean
): Promise<{ ok: boolean; incidentId?: string; error?: string }> {
  if (!ORG_ID || !WEBHOOK_SECRET) {
    return {
      ok: false,
      error: 'Demo app not linked to Chronicle. Run: pnpm setup:demo',
    };
  }

  const meta = SCENARIO_META[scenario];

  try {
    const url = new URL(`${API_URL}/api/webhooks/demo`);
    url.searchParams.set('org_id', ORG_ID);
    url.searchParams.set('secret', WEBHOOK_SECRET);

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scenario,
        active,
        label: meta.label,
        severity: meta.severity,
        chronicle_source: meta.chronicleSource,
      }),
    });

    const data = (await res.json()) as { incident_id?: string; error?: string; status?: string };

    if (!res.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }

    return { ok: true, incidentId: data.incident_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
