import { NextRequest, NextResponse } from 'next/server';
import {
  getDemoState,
  resetAllScenarios,
  setScenario,
  toggleScenario,
  type ChaosScenario,
  SCENARIO_META,
} from '@/lib/demo-state';
import { notifySentinel } from '@/lib/sentinel-notify';

export const dynamic = 'force-dynamic';

const VALID_SCENARIOS = Object.keys(SCENARIO_META) as ChaosScenario[];

export async function GET() {
  return NextResponse.json({
    state: getDemoState(),
    scenarios: SCENARIO_META,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    action?: 'toggle' | 'set' | 'reset';
    scenario?: ChaosScenario;
    active?: boolean;
  };

  if (body.action === 'reset') {
    const prev = getDemoState();
    const state = resetAllScenarios();
    const results = await Promise.all(
      (Object.keys(prev.scenarios) as ChaosScenario[])
        .filter((s) => prev.scenarios[s])
        .map((s) => notifySentinel(s, false))
    );
    return NextResponse.json({ state, sentinel: results });
  }

  if (!body.scenario || !VALID_SCENARIOS.includes(body.scenario)) {
    return NextResponse.json({ error: 'Invalid scenario' }, { status: 400 });
  }

  let active: boolean;
  if (body.action === 'set' && typeof body.active === 'boolean') {
    setScenario(body.scenario, body.active);
    active = body.active;
  } else {
    const state = toggleScenario(body.scenario);
    active = state.scenarios[body.scenario];
  }

  const sentinel = await notifySentinel(body.scenario, active);

  return NextResponse.json({
    state: getDemoState(),
    sentinel,
    message: sentinel.ok
      ? active
        ? `Incident created in Sentinel dashboard`
        : `Incident resolved in Sentinel dashboard`
      : sentinel.error,
  });
}
