'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import { BarChart3, TrendingDown, Brain, Activity, Clock } from 'lucide-react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { y: 20, opacity: 0 }, show: { y: 0, opacity: 1 } };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function AnalyticsPage() {
  const { getToken } = useAuth();
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [heatmap, setHeatmap] = useState<number[][]>([]);
  const [mttrTrend, setMttrTrend] = useState<Array<{ date: string; mttr_minutes: number }>>([]);
  const [memoryStats, setMemoryStats] = useState<{ total_memories: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const [ov, hm, mt, ms] = await Promise.all([
          api.analytics.overview(token ?? undefined),
          api.analytics.heatmap(token ?? undefined),
          api.analytics.mttrTrend(token ?? undefined),
          api.agent.memoryStats(token ?? undefined),
        ]);
        setOverview(ov);
        setHeatmap(hm.heatmap ?? []);
        setMttrTrend((mt.trend ?? []) as Array<{ date: string; mttr_minutes: number }>);
        setMemoryStats(ms as { total_memories: number });
      } catch {
        // Demo data
        setOverview({ mttr_minutes: 23, sla_breaches: 2, total_incidents: 47 });
        setHeatmap(Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => Math.floor(Math.random() * 5))));
        setMttrTrend([
          { date: '2024-01-01', mttr_minutes: 45 },
          { date: '2024-01-05', mttr_minutes: 38 },
          { date: '2024-01-10', mttr_minutes: 32 },
          { date: '2024-01-15', mttr_minutes: 28 },
          { date: '2024-01-20', mttr_minutes: 22 },
          { date: '2024-01-25', mttr_minutes: 18 },
        ]);
        setMemoryStats({ total_memories: 42 });
      }
      setLoading(false);
    }
    load();
  }, [getToken]);

  const maxHeat = Math.max(...heatmap.flat(), 1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <motion.div variants={item}>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-primary" />
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Insights into your incident response performance</p>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Average MTTR', value: `${(overview?.mttr_minutes as number) ?? 0}m`, icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'SLA Compliance', value: `${100 - ((overview?.sla_breaches as number) ?? 0)}%`, icon: TrendingDown, color: 'text-success', bg: 'bg-success/10' },
          { label: 'Agent Memories', value: memoryStats?.total_memories ?? 0, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map((stat) => (
          <motion.div key={stat.label} whileHover={{ scale: 1.02 }} className="rounded-xl glass p-5">
            <div className="flex items-center gap-3">
              <div className={cn('p-2.5 rounded-lg', stat.bg)}>
                <stat.icon className={cn('w-5 h-5', stat.color)} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={cn('text-2xl font-bold', stat.color)}>{loading ? '—' : stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* MTTR Trend */}
      <motion.div variants={item} className="rounded-xl glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-success" />
          MTTR Trend (Last 30 Days)
        </h2>
        {mttrTrend.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Not enough data yet</p>
        ) : (
          <div className="h-48 flex items-end gap-1">
            {mttrTrend.map((point, i) => {
              const maxMttr = Math.max(...mttrTrend.map((p) => p.mttr_minutes), 1);
              const height = (point.mttr_minutes / maxMttr) * 100;
              return (
                <motion.div
                  key={point.date}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className="flex-1 bg-primary/30 rounded-t-md hover:bg-primary/50 transition-colors cursor-pointer group relative"
                >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-popover text-xs whitespace-nowrap border border-border">
                    {point.mttr_minutes}m • {point.date}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Incident Heatmap */}
      <motion.div variants={item} className="rounded-xl glass p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-warning" />
          Incident Heatmap (Day × Hour)
        </h2>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex gap-1 mb-1 ml-12">
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="flex-1 text-[10px] text-muted-foreground text-center">
                  {h % 3 === 0 ? `${h}:00` : ''}
                </div>
              ))}
            </div>
            {/* Grid */}
            {heatmap.map((row, day) => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <span className="w-10 text-xs text-muted-foreground text-right pr-2">
                  {DAYS[day]}
                </span>
                {row.map((count, hour) => {
                  const intensity = maxHeat > 0 ? count / maxHeat : 0;
                  return (
                    <div
                      key={hour}
                      className="flex-1 h-6 rounded-sm transition-colors cursor-pointer group relative"
                      style={{
                        backgroundColor: intensity === 0
                          ? 'hsl(var(--muted) / 0.3)'
                          : `rgba(239, 68, 68, ${0.1 + intensity * 0.8})`,
                      }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity px-2 py-1 rounded bg-popover text-xs whitespace-nowrap border border-border z-10">
                        {count} incidents • {DAYS[day]} {hour}:00
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
