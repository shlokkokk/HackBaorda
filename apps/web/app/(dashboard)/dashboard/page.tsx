'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { api } from '../../../lib/api';
import {
  AlertTriangle,
  Clock,
  Shield,
  TrendingDown,
  Activity,
  Brain,
  Zap,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';
import { cn, timeAgo } from '../../../lib/utils';
import type { IngestionHealth } from '@sentinel/shared';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

interface OverviewStats {
  total_incidents: number;
  open_incidents: number;
  resolved_incidents: number;
  mttr_minutes: number;
  sla_breaches: number;
  by_severity: Record<string, number>;
  by_source: Record<string, number>;
}

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [ingestionHealth, setIngestionHealth] = useState<IngestionHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [statsData, healthData] = await Promise.all([
          api.analytics.overview(token ?? undefined) as Promise<OverviewStats>,
          api.ingestion.health(token ?? undefined) as Promise<{ sources: IngestionHealth[] }>
        ]);
        setStats(statsData);
        setIngestionHealth(healthData.sources);
      } catch {
        // Use demo data if API fails
        setStats({
          total_incidents: 47,
          open_incidents: 3,
          resolved_incidents: 44,
          mttr_minutes: 23,
          sla_breaches: 2,
          by_severity: { P0: 2, P1: 8, P2: 15, P3: 17, P4: 5 },
          by_source: { 'sentinel-agent': 18, sentry: 12, uptimerobot: 9, manual: 5, slack: 3 },
        });
        setIngestionHealth([
          { id: '1', org_id: '1', source: 'sentinel-agent', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 18, created_at: '' },
          { id: '2', org_id: '1', source: 'sentry', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 12, created_at: '' },
          { id: '3', org_id: '1', source: 'uptimerobot', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 9, created_at: '' },
          { id: '4', org_id: '1', source: 'slack', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 3, created_at: '' },
          { id: '5', org_id: '1', source: 'github', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
          { id: '6', org_id: '1', source: 'manual', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 5, created_at: '' },
        ]);
      }
      setLoading(false);
    }
    load();
  }, [getToken]);

  const statCards = [
    {
      label: 'Open Incidents',
      value: stats?.open_incidents ?? 0,
      icon: AlertTriangle,
      color: 'text-severity-p1',
      bgColor: 'bg-severity-p1/10',
      glowColor: stats?.open_incidents && stats.open_incidents > 0 ? 'glow-destructive' : '',
    },
    {
      label: 'MTTR',
      value: `${stats?.mttr_minutes ?? 0}m`,
      icon: Clock,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      glowColor: '',
    },
    {
      label: 'Resolved',
      value: stats?.resolved_incidents ?? 0,
      icon: Shield,
      color: 'text-success',
      bgColor: 'bg-success/10',
      glowColor: 'glow-success',
    },
    {
      label: 'SLA Breaches',
      value: stats?.sla_breaches ?? 0,
      icon: TrendingDown,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      glowColor: '',
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* ─── Header ──────────────────────────────── */}
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight">
          Command Center
        </h1>
        <p className="text-muted-foreground mt-1">
          Real-time overview of your incident response operations
        </p>
      </motion.div>

      {/* ─── Stat Cards ──────────────────────────── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.02, y: -2 }}
            className={cn(
              'relative overflow-hidden rounded-xl p-5 glass transition-all duration-300',
              stat.glowColor
            )}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{stat.label}</p>
                <p className={cn('text-3xl font-bold mt-1 animate-count-up', stat.color)}>
                  {loading ? (
                    <span className="inline-block w-16 h-8 skeleton rounded" />
                  ) : (
                    stat.value
                  )}
                </p>
              </div>
              <div className={cn('p-2.5 rounded-lg', stat.bgColor)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
            </div>
            {/* Decorative gradient */}
            <div className={cn('absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5', stat.bgColor)} />
          </motion.div>
        ))}
      </motion.div>

      {/* ─── Quick Actions + Recent Activity ────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Breakdown */}
        <motion.div variants={item} className="lg:col-span-2 rounded-xl glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Severity Distribution
          </h2>
          <div className="space-y-3">
            {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((severity) => {
              const count = stats?.by_severity[severity] ?? 0;
              const total = stats?.total_incidents ?? 1;
              const percentage = total > 0 ? (count / total) * 100 : 0;
              const colors: Record<string, string> = {
                P0: 'bg-severity-p0', P1: 'bg-severity-p1',
                P2: 'bg-severity-p2', P3: 'bg-severity-p3', P4: 'bg-severity-p4',
              };
              return (
                <div key={severity} className="flex items-center gap-3">
                  <span className="w-8 text-sm font-mono font-bold text-muted-foreground">{severity}</span>
                  <div className="flex-1 h-6 bg-muted/50 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={cn('h-full rounded-full', colors[severity])}
                    />
                  </div>
                  <span className="w-10 text-sm text-muted-foreground text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={item} className="rounded-xl glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            Quick Actions
          </h2>
          <div className="space-y-2">
            {[
              { label: 'Report Incident', href: '/dashboard/incidents?action=create', icon: AlertTriangle, color: 'text-severity-p1' },
              { label: 'View All Incidents', href: '/dashboard/incidents', icon: Shield, color: 'text-primary' },
              { label: 'Agent Memory', href: '/dashboard/analytics', icon: Brain, color: 'text-purple-400' },
              { label: 'Postmortems', href: '/dashboard/postmortems', icon: ArrowUpRight, color: 'text-success' },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/80 transition-all duration-200 group"
              >
                <action.icon className={cn('w-4 h-4', action.color)} />
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ─── Ingestion Health ────────────────────── */}
      <motion.div variants={item} className="rounded-xl glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-success" />
          Source Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(() => {
            const SOURCE_INFO: Record<string, { name: string; icon: string; color: string; textColor: string }> = {
              'sentinel-agent': { name: 'Sentinel Agent', icon: '🛡️', color: 'bg-source-agent/20', textColor: 'text-source-agent' },
              sentry: { name: 'Sentry', icon: '🐛', color: 'bg-source-sentry/20', textColor: 'text-source-sentry' },
              uptimerobot: { name: 'UptimeRobot', icon: '🟢', color: 'bg-source-uptimerobot/20', textColor: 'text-source-uptimerobot' },
              slack: { name: 'Slack Bot', icon: '💬', color: 'bg-source-slack/20', textColor: 'text-source-slack' },
              github: { name: 'GitHub', icon: '🐙', color: 'bg-muted/50', textColor: 'text-muted-foreground' },
              manual: { name: 'Manual Form', icon: '✍️', color: 'bg-muted/50', textColor: 'text-muted-foreground' },
            };

            const defaultHealth: IngestionHealth[] = [
              { id: '1', org_id: '', source: 'sentinel-agent', status: 'stale', last_ping_at: new Date(0).toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
              { id: '2', org_id: '', source: 'sentry', status: 'stale', last_ping_at: new Date(0).toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
              { id: '3', org_id: '', source: 'uptimerobot', status: 'stale', last_ping_at: new Date(0).toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
              { id: '4', org_id: '', source: 'slack', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
              { id: '5', org_id: '', source: 'github', status: 'stale', last_ping_at: new Date(0).toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
              { id: '6', org_id: '', source: 'manual', status: 'healthy', last_ping_at: new Date().toISOString(), last_incident_at: null, total_incidents: 0, created_at: '' },
            ];

            const statusColors = {
              healthy: 'bg-success',
              stale: 'bg-warning',
              down: 'bg-destructive',
            };

            const getStatusText = (sh: IngestionHealth) => {
              if (sh.status === 'down') return 'Offline';
              if (sh.source === 'manual') return 'Always Available';
              if (sh.source === 'slack' && sh.status === 'healthy') return 'Connected';
              
              const lastPingTime = new Date(sh.last_ping_at).getTime();
              if (lastPingTime === 0 || isNaN(lastPingTime)) return 'Never Active';
              
              return `Active: ${timeAgo(sh.last_ping_at)}`;
            };

            return defaultHealth.map((def) => {
              const current = ingestionHealth.find((h) => h.source === def.source) || def;
              const info = SOURCE_INFO[current.source] ?? SOURCE_INFO.manual ?? { name: 'Manual Form', icon: '✍️', color: 'bg-muted/50', textColor: 'text-muted-foreground' };

              return (
                <div
                  key={current.source}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-lg border border-border/50 transition-all duration-200 hover:border-border',
                    info.color
                  )}
                >
                  <span className="text-xl">{info.icon}</span>
                  <span className="text-xs font-medium text-center">{info.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', statusColors[current.status] || 'bg-muted')} />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">
                      {getStatusText(current)}
                    </span>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </motion.div>
    </motion.div>
  );
}
