import { NextResponse } from 'next/server';
import { isScenarioActive } from '@/lib/demo-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  const down = isScenarioActive('health_down') || isScenarioActive('gateway_overload');

  if (down) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'shopflow-api',
        error: 'Service unavailable — gateway connection pool exhausted',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'ok',
    service: 'shopflow-api',
    version: '2.4.1',
    uptime_seconds: Math.floor(process.uptime()),
    checks: {
      database: 'ok',
      redis: 'ok',
      payments: 'ok',
      search: 'ok',
    },
    timestamp: new Date().toISOString(),
  });
}
