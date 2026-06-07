import { NextRequest, NextResponse } from 'next/server';
import { isScenarioActive } from '@/lib/demo-state';
import { PRODUCTS } from '@/lib/products';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.toLowerCase() ?? '';

  if (isScenarioActive('search_slow')) {
    await new Promise((resolve) => setTimeout(resolve, 12_000));
  } else {
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  if (isScenarioActive('gateway_overload')) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const results = PRODUCTS.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
  );

  return NextResponse.json({
    query: q,
    count: results.length,
    latency_ms: isScenarioActive('search_slow') ? 12_000 : 80,
    warning: isScenarioActive('search_slow')
      ? 'Full table scan detected — missing index on description field'
      : undefined,
    results,
  });
}
