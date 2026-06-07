'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn, timeAgo } from '../../../../lib/utils';
import {
  Cpu,
  RefreshCw,
  Server,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Terminal,
  Zap,
  Globe,
  CircleDot,
} from 'lucide-react';

interface Host {
  id: string;
  org_id: string;
  hostname: string;
  host_id: string;
  platform: string;
  arch: string;
  ip_addresses: string[];
  agent_version: string;
  status: 'healthy' | 'degraded' | 'down' | 'stale';
  last_heartbeat_at: string;
  collectors_active: string[];
  collectors_failed: string[];
  baseline_status: 'learning' | 'ready' | 'stale';
  baseline_age_hours: number;
  circuit_breaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  discovered_services: Array<{ name: string; type: string; port?: number; status: string }>;
  created_at: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

const STATUS_CONFIGS = {
  healthy: { label: 'Healthy', color: 'text-success bg-success/10 border-success/20', dot: 'bg-success' },
  degraded: { label: 'Degraded', color: 'text-warning bg-warning/10 border-warning/20', dot: 'bg-warning' },
  stale: { label: 'Stale', color: 'text-muted-foreground bg-muted border-border', dot: 'bg-muted-foreground' },
  down: { label: 'Offline', color: 'text-destructive bg-destructive/10 border-destructive/20', dot: 'bg-destructive' },
};

export default function AgentsFleetPage() {
  const { getToken } = useAuth();
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHosts();
  }, []);

  async function loadHosts() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.agent.hosts(token ?? undefined);
      setHosts((data.hosts ?? []) as Host[]);
    } catch {
      setHosts([]);
    }
    setLoading(false);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Cpu className="w-8 h-8 text-primary" />
            Agent Fleet
          </h1>
          <p className="text-muted-foreground mt-1">Infrastructure monitoring agents, health status, and collectors</p>
        </div>
        <button
          onClick={loadHosts}
          disabled={loading}
          className="p-2.5 rounded-lg border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh Fleet Status"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Hosts', value: hosts.length, color: 'text-primary' },
          { label: 'Healthy Agents', value: hosts.filter((h) => h.status === 'healthy').length, color: 'text-success' },
          { label: 'Unhealthy / Degraded', value: hosts.filter((h) => h.status !== 'healthy').length, color: 'text-warning' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl glass p-5">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{card.label}</p>
            <p className={cn('text-3xl font-bold mt-1.5', card.color)}>
              {loading ? '—' : card.value}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Fleet List */}
      <motion.div variants={item} className="space-y-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-64 skeleton rounded-xl animate-pulse" />
          ))
        ) : hosts.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground glass rounded-xl">
            <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No agents connected</p>
            <p className="text-sm font-light mt-1">Follow setup instructions to install Sentinel Agent on your servers.</p>
          </div>
        ) : (
          hosts.map((host) => {
            const statusConfig = STATUS_CONFIGS[host.status] ?? STATUS_CONFIGS.stale;
            return (
              <div
                key={host.id}
                className="rounded-xl glass border border-border/50 overflow-hidden p-6 space-y-6 hover:border-primary/20 transition-colors"
              >
                {/* Top Info */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary mt-1">
                      <Server className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                        {host.hostname}
                        <span className={cn(
                          'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border'
                        )}>
                          {host.host_id}
                        </span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        OS: {host.platform} ({host.arch}) • Agent: {host.agent_version}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border',
                      statusConfig.color
                    )}>
                      <span className={cn('w-2 h-2 rounded-full', statusConfig.dot)} />
                      {statusConfig.label}
                    </span>

                    <span className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 border',
                      host.circuit_breaker === 'CLOSED'
                        ? 'bg-success/5 text-success border-success/20'
                        : host.circuit_breaker === 'OPEN'
                          ? 'bg-destructive/10 text-destructive border-destructive/20 animate-pulse'
                          : 'bg-warning/10 text-warning border-warning/20'
                    )}>
                      <Zap className="w-3.5 h-3.5" />
                      Circuit Breaker: {host.circuit_breaker}
                    </span>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left: Collectors */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-primary" />
                      Metric Collectors
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {host.collectors_active.map((collector) => (
                        <span
                          key={collector}
                          className="px-2 py-1 rounded bg-success/10 text-success text-xs font-medium border border-success/10 flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {collector}
                        </span>
                      ))}
                      {host.collectors_failed.map((collector) => (
                        <span
                          key={collector}
                          className="px-2 py-1 rounded bg-destructive/10 text-destructive text-xs font-medium border border-destructive/10 flex items-center gap-1 animate-pulse"
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {collector} (Failed)
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Middle: Baseline Info */}
                  <div className="space-y-2 text-sm">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CircleDot className="w-4 h-4 text-warning" />
                      Baseline Learning status
                    </h4>
                    <div className="space-y-1.5 mt-1 text-muted-foreground text-xs">
                      <p>
                        Status: <strong className="text-foreground capitalize">{host.baseline_status}</strong>
                      </p>
                      <p>
                        Learned Horizon: <strong className="text-foreground">{host.baseline_age_hours.toFixed(1)} hrs</strong>
                      </p>
                      <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden mt-1 border border-border/30">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.min(100, (host.baseline_age_hours / 24) * 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] italic">Fully accurate baseline requires 24 hours of seasonal data.</p>
                    </div>
                  </div>

                  {/* Right: Discovered Services */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Terminal className="w-4 h-4 text-purple-400" />
                      Auto-Discovered Services
                    </h4>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {host.discovered_services.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">No active services detected</p>
                      ) : (
                        host.discovered_services.map((srv, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 rounded bg-muted/30 border border-border/30 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{srv.name}</p>
                              <p className="text-[10px] text-muted-foreground">
                                {srv.type} {srv.port ? `• Port ${srv.port}` : ''}
                              </p>
                            </div>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-success/20 text-success uppercase font-semibold scale-90">
                              {srv.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/20 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      IPs: {host.ip_addresses.join(', ')}
                    </span>
                  </div>
                  <span>Heartbeat: {timeAgo(host.last_heartbeat_at)}</span>
                </div>
              </div>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
