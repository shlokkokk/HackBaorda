import { NextRequest, NextResponse } from 'next/server';
import {
  getDemoState,
  resetAllScenarios,
  setScenario,
  toggleScenario,
  type ChaosScenario,
  SCENARIO_META,
} from '@/lib/demo-state';

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
    return NextResponse.json({ state: resetAllScenarios() });
  }

  if (!body.scenario || !VALID_SCENARIOS.includes(body.scenario)) {
    return NextResponse.json({ error: 'Invalid scenario' }, { status: 400 });
  }

  if (body.action === 'set' && typeof body.active === 'boolean') {
    return NextResponse.json({ state: setScenario(body.scenario, body.active) });
  }

  return NextResponse.json({ state: toggleScenario(body.scenario) });
}
