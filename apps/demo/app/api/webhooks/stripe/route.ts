import { NextRequest, NextResponse } from 'next/server';
import { isScenarioActive } from '@/lib/demo-state';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const payload = await req.text();

  if (isScenarioActive('stripe_webhook_fail')) {
    return NextResponse.json(
      {
        error: 'Webhook signature verification failed',
        message: 'No signatures found matching the expected signature for payload',
        failure_rate: '100%',
      },
      { status: 400 }
    );
  }

  let event: { type?: string; id?: string };
  try {
    event = JSON.parse(payload) as { type?: string; id?: string };
  } catch {
    event = { type: 'unknown' };
  }

  return NextResponse.json({
    received: true,
    event_id: event.id ?? `evt_${Date.now()}`,
    event_type: event.type ?? 'payment_intent.succeeded',
    timestamp: new Date().toISOString(),
  });
}
