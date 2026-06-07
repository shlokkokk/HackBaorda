import { NextRequest, NextResponse } from 'next/server';
import { isScenarioActive } from '@/lib/demo-state';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (isScenarioActive('gateway_overload')) {
    return NextResponse.json(
      { error: 'Gateway Error', message: 'Connection pool exhausted' },
      { status: 503 }
    );
  }

  if (isScenarioActive('payment_timeout')) {
    await new Promise((resolve) => setTimeout(resolve, 8_000));
    return NextResponse.json(
      {
        error: 'Gateway Timeout',
        message: 'Upstream payments service did not respond within 30s',
        route: '/payments',
        status: 504,
      },
      { status: 504 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const amount = (body as { amount?: number }).amount ?? 0;

  return NextResponse.json({
    status: 'success',
    transaction_id: `txn_${Date.now()}`,
    amount,
    currency: 'USD',
    processor: 'stripe',
    latency_ms: Math.floor(Math.random() * 120) + 40,
    timestamp: new Date().toISOString(),
  });
}

export async function GET() {
  if (isScenarioActive('gateway_overload') || isScenarioActive('payment_timeout')) {
    const status = isScenarioActive('payment_timeout') ? 504 : 503;
    return NextResponse.json(
      { status: 'degraded', pool_utilization: '100%', active_connections: 200, max_connections: 200 },
      { status }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    pool_utilization: '34%',
    active_connections: 68,
    max_connections: 200,
    p99_latency_ms: 142,
  });
}
