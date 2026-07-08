'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { api } from '../../../../lib/api';
import { timeAgo } from '../../../../lib/utils';
import { usePolling } from '../../../../lib/hooks/use-polling';
import { ErrorBanner } from '../../../../components/ui/error-banner';
import { EmptyState } from '../../../../components/ui/empty-state';
import { LiveBadge } from '../../../../components/ui/live-badge';
import Link from 'next/link';
import {
  AlertTriangle, Search, Plus, Clock, ArrowUpRight,
  AlertCircle, Wrench, CheckCircle2, BookOpen,
  Shield, Bug, Globe, MessageSquare, Github, Terminal
} from 'lucide-react';
import { SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG } from '@chronicle/shared';
import type { Incident, Severity } from '@chronicle/shared';

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  open: AlertCircle,
  investigating: Search,
  mitigating: Wrench,
  resolved: CheckCircle2,
  postmortem: BookOpen,
};

const SOURCE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'chronicle-agent': Shield,
  sentry: Bug,
  uptimerobot: Globe,
  slack: MessageSquare,
  github: Github,
  manual: Terminal,
};

export default function IncidentsPage() {
  const { getToken } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<Severity>('P3');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadIncidents = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        setError('Not signed in');
        return;
      }
      const params: Record<string, string> = {};
      if (statusFilter) params['status'] = statusFilter;
      if (severityFilter) params['severity'] = severityFilter;
      if (debouncedSearch) params['search'] = debouncedSearch;
      const data = await api.incidents.list(params, token);
      setIncidents((data.incidents ?? []) as Incident[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'API unreachable — is port 3001 running?');
    } finally {
      setLoading(false);
    }
  }, [getToken, statusFilter, severityFilter, debouncedSearch]);

  const { refresh } = usePolling(loadIncidents, 8_000);

  async function createIncident() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.incidents.create({ title: newTitle, severity: newSeverity }, token ?? undefined);
      setNewTitle('');
      setShowCreate(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    }
    setCreating(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Incidents</h1>
            <LiveBadge />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? 'Loading…' : `${incidents.length} incidents · refreshes every 8s`}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Report Incident
        </button>
      </div>

      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {showCreate && (
        <div className="card p-5 space-y-4">
          <input
            type="text"
            placeholder="What happened?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-field"
            autoFocus
          />
          <div className="flex gap-3">
            <select
              value={newSeverity}
              onChange={(e) => setNewSeverity(e.target.value as Severity)}
              className="input-field w-auto"
            >
              {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((s) => (
                <option key={s} value={s}>{s} — {SEVERITY_CONFIG[s].label}</option>
              ))}
            </select>
            <button
              onClick={createIncident}
              disabled={creating || !newTitle.trim()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="input-field flex min-w-[200px] flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Status</option>
          {(['open', 'investigating', 'mitigating', 'resolved', 'postmortem'] as const).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="input-field w-auto">
          <option value="">All Severity</option>
          {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[72px] skeleton rounded-xl" />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No incidents yet"
          description="Trigger failures from the ShopFlow demo, or report one manually."
          action={
            <a
              href={`${process.env.NEXT_PUBLIC_DEMO_URL ?? 'http://localhost:3002'}/demo`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Open Chaos Panel →
            </a>
          }
        />
      ) : (
        <div className="space-y-2">
          {incidents.map((incident) => {
            const sev = SEVERITY_CONFIG[incident.severity];
            const status = STATUS_CONFIG[incident.status];
            const source = SOURCE_CONFIG[incident.source];
            return (
              <Link key={incident.id} href={`/dashboard/incidents/${incident.id}`} className="group block">
                <div
                  className="card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 transition-all duration-300 hover:scale-[1.005] hover:shadow-md relative overflow-hidden"
                  style={{ borderLeftWidth: 4, borderLeftColor: sev.color }}
                >
                  <div className="flex flex-1 items-start sm:items-center gap-3.5 min-w-0">
                    <span
                      className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider border font-mono uppercase"
                      style={{ backgroundColor: sev.bgColor, color: sev.textColor, borderColor: 'currentColor' }}
                    >
                      {incident.severity}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-sm font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {incident.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/40 border border-border/40 text-[10px] font-medium">
                          {(() => {
                            const SourceIcon = SOURCE_ICONS[incident.source] || Terminal;
                            return <SourceIcon className="h-3 w-3" />;
                          })()}
                          {source.label}
                        </span>
                        <span className="text-border/80">•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 opacity-60" />
                          {timeAgo(incident.created_at)}
                        </span>
                        {incident.affected_services?.length > 0 && (
                          <>
                            <span className="text-border/80">•</span>
                            <span className="truncate max-w-[200px] text-[10px] font-mono bg-muted/20 px-1.5 py-0.5 rounded border border-border/10">
                              {incident.affected_services.join(', ')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold border flex items-center gap-1.5 shadow-sm"
                      style={{ backgroundColor: status.bgColor, color: status.textColor, borderColor: 'currentColor' }}
                    >
                      {(() => {
                        const StatusIcon = STATUS_ICONS[incident.status] || AlertCircle;
                        return <StatusIcon className="h-3.5 w-3.5" />;
                      })()}
                      {status.label}
                    </span>
                    <div className="p-1 rounded-lg bg-muted/30 border border-border/20 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
