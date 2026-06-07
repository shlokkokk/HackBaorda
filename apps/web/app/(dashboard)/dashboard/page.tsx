'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api } from '../../../lib/api';
import { usePolling } from '../../../lib/hooks/use-polling';
import { ErrorBanner } from '../../../components/ui/error-banner';
import { LiveBadge } from '../../../components/ui/live-badge';
import {
  AlertTriangle, Clock, Shield, TrendingDown, Activity, Zap,
  ArrowUpRight, Bug, Globe, MessageSquare, Github, Terminal,
} from 'lucide-react';
import Link from 'next/link';
import { cn, timeAgo } from '../../../lib/utils';
import type { IngestionHealth, Incident } from '@sentinel/shared';
import { ALL_SOURCES } from '@sentinel/shared';

interface OverviewStats {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  mttr_minutes: number;
  sla_breaches: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
}

const SOURCE_ICONS: Record<string, typeof Shield> = {
  'sentinel-agent': Shield,
  sentry: Bug,
  uptimerobot: Globe,
  slack: MessageSquare,
  github: Github,
  manual: Terminal,
};

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [ingestionHealth, setIngestionHealth] = useState<IngestionHealth[]>([]);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [statsData, healthData, incidentsData] = await Promise.all([
        api.analytics.overview(token) as Promise<OverviewStats>,
        api.ingestion.health(token) as Promise<{ sources: IngestionHealth[] }>,
        api.incidents.list({ limit: '5' }, token),
      ]);
      setStats(statsData);
      setIngestionHealth(healthData.sources ?? []);
      setRecentIncidents((incidentsData.incidents ?? []) as Incident[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API unreachable');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  const { refresh } = usePolling(load, 10_000);

  const statCards = [
    { label: 'Open', value: stats?.open_incidents ?? 0, icon: AlertTriangle, color: 'text-red-400' },
    { label: 'MTTR', value: `${stats?.mttr_minutes ?? 0}m`, icon: Clock, color: 'text-blue-400' },
    { label: 'Resolved', value: stats?.resolved_incidents ?? 0, icon: Shield, color: 'text-emerald-400' },
    { label: 'SLA Breaches', value: stats?.sla_breaches ?? 0, icon: TrendingDown, color: 'text-amber-400' },
  ];

  const healthBySource = Object.fromEntries(ingestionHealth.map((h) => [h.source, h]));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Command Center</h1>
            <LiveBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Live data · auto-refreshes every 10s</p>
        </div>
        <a
          href="http://localhost:3002/demo"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 sm:block"
        >
          Open Demo Chaos Panel →
        </a>
      </div>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                <p className={cn('mt-1 text-3xl font-bold tabular-nums', s.color)}>
                  {loading ? '—' : s.value}
                </p>
              </div>
              <s.icon className={cn('h-5 w-5 opacity-60', s.color)} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" />
            Recent Incidents
          </h2>
          {recentIncidents.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No incidents yet — activate a scenario at{' '}
              <a href="http://localhost:3002/demo" className="text-primary hover:underline">localhost:3002/demo</a>
            </p>
          ) : (
            <div className="space-y-2">
              {recentIncidents.map((inc) => (
                <Link
                  key={inc.id}
                  href={`/dashboard/incidents/${inc.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <span className="truncate text-sm font-medium">{inc.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(inc.created_at)}</span>
                </Link>
              ))}
            </div>
          )}
          <Link href="/dashboard/incidents" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
            <Zap className="h-4 w-4 text-amber-400" />
            Quick Actions
          </h2>
          <div className="space-y-1">
            {[
              { label: 'All Incidents', href: '/dashboard/incidents' },
              { label: 'Analytics', href: '/dashboard/analytics' },
              { label: 'Runbooks', href: '/dashboard/runbooks' },
              { label: 'Demo Chaos Panel', href: 'http://localhost:3002/demo', external: true },
            ].map((a) => (
              <Link
                key={a.label}
                href={a.href}
                target={'external' in a ? '_blank' : undefined}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent/50"
              >
                {a.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-emerald-400" />
          Ingestion Sources
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {ALL_SOURCES.map((source) => {
            const h = healthBySource[source];
            const Icon = SOURCE_ICONS[source] ?? Terminal;
            const status = h?.status ?? 'stale';
            const dot =
              status === 'healthy' ? 'bg-emerald-500' : status === 'stale' ? 'bg-amber-500' : 'bg-red-500';
            return (
              <div key={source} className="rounded-xl border border-border/60 bg-secondary/30 p-4 text-center">
                <Icon className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium capitalize">{source.replace('-', ' ')}</p>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />
                  <span className="text-[10px] text-muted-foreground">
                    {h ? timeAgo(h.last_ping_at) : 'No data'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
