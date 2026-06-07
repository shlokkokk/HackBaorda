'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn, timeAgo } from '../../../../lib/utils';
import Link from 'next/link';
import {
  AlertTriangle, Search, Plus, Clock, ArrowUpRight,
  Shield,
} from 'lucide-react';
import { SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG } from '@sentinel/shared';
import type { Incident, Severity } from '@sentinel/shared';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { y: 10, opacity: 0 }, show: { y: 0, opacity: 1 } };

export default function IncidentsPage() {
  const { getToken } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newSeverity, setNewSeverity] = useState<Severity>('P3');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, severityFilter, search]);

  async function loadIncidents() {
    setLoading(true);
    try {
      const token = await getToken();
      const params: Record<string, string> = {};
      if (statusFilter) params['status'] = statusFilter;
      if (severityFilter) params['severity'] = severityFilter;
      if (search) params['search'] = search;
      const data = await api.incidents.list(params, token ?? undefined);
      setIncidents((data.incidents ?? []) as Incident[]);
    } catch {
      // Demo data
      setIncidents([
        { id: '1', org_id: '', title: 'API Gateway timeout on /payments', severity: 'P1', status: 'investigating', source: 'sentinel-agent', affected_services: ['payments-api'], created_at: new Date(Date.now() - 300000).toISOString(), tags: ['auto-detected'], description: null, assignee_id: null, root_cause: null, resolution: null, sla_breach_at: new Date(Date.now() + 3300000).toISOString(), resolved_at: null, mem0_memory_ids: [], embedding: null, source_id: null, fingerprint: null, merged_from: [] },
        { id: '2', org_id: '', title: 'Sentry: Unhandled ReferenceError in checkout flow', severity: 'P2', status: 'open', source: 'sentry', affected_services: ['checkout-ui'], created_at: new Date(Date.now() - 1200000).toISOString(), tags: ['sentry', 'error'], description: null, assignee_id: null, root_cause: null, resolution: null, sla_breach_at: new Date(Date.now() + 13200000).toISOString(), resolved_at: null, mem0_memory_ids: [], embedding: null, source_id: null, fingerprint: null, merged_from: [] },
        { id: '3', org_id: '', title: 'Database connection pool exhausted', severity: 'P0', status: 'mitigating', source: 'sentinel-agent', affected_services: ['postgres-primary'], created_at: new Date(Date.now() - 600000).toISOString(), tags: ['auto-detected', 'sigma-4'], description: null, assignee_id: null, root_cause: null, resolution: null, sla_breach_at: new Date(Date.now() + 300000).toISOString(), resolved_at: null, mem0_memory_ids: [], embedding: null, source_id: null, fingerprint: null, merged_from: [] },
      ]);
    }
    setLoading(false);
  }

  async function createIncident() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.incidents.create({ title: newTitle, severity: newSeverity }, token ?? undefined);
      setNewTitle('');
      setShowCreate(false);
      loadIncidents();
    } catch { /* ignore */ }
    setCreating(false);
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-severity-p1" />
            Incidents
          </h1>
          <p className="text-muted-foreground mt-1">{incidents.length} total incidents</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Report Incident
        </button>
      </motion.div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl glass p-6 space-y-4">
              <input
                type="text"
                placeholder="What happened? e.g. API returning 500 errors on /checkout"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                autoFocus
              />
              <div className="flex items-center gap-3">
                <select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value as Severity)}
                  className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
                >
                  {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((s) => (
                    <option key={s} value={s}>{SEVERITY_CONFIG[s].icon} {SEVERITY_CONFIG[s].label}</option>
                  ))}
                </select>
                <button
                  onClick={createIncident}
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.div variants={item} className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search incidents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
        >
          <option value="">All Status</option>
          {(['open', 'investigating', 'mitigating', 'resolved', 'postmortem'] as const).map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>
          ))}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm"
        >
          <option value="">All Severity</option>
          {(['P0', 'P1', 'P2', 'P3', 'P4'] as const).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </motion.div>

      {/* Incident List */}
      <motion.div variants={item} className="space-y-3 stagger-children">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl" />
          ))
        ) : incidents.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No incidents found</p>
            <p className="text-sm">All clear! 🎉</p>
          </div>
        ) : (
          incidents.map((incident) => {
            const sevConfig = SEVERITY_CONFIG[incident.severity];
            const statusConfig = STATUS_CONFIG[incident.status];
            const sourceConfig = SOURCE_CONFIG[incident.source];

            return (
              <Link key={incident.id} href={`/dashboard/incidents/${incident.id}`}>
                <motion.div
                  whileHover={{ x: 4, scale: 1.005 }}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl glass border-l-4 cursor-pointer transition-all duration-200 hover:bg-accent/50',
                    `border-l-[${sevConfig.color}]`
                  )}
                  style={{ borderLeftColor: sevConfig.color }}
                >
                  {/* Severity */}
                  <div
                    className="px-2.5 py-1 rounded-md text-xs font-bold shrink-0"
                    style={{ backgroundColor: sevConfig.bgColor, color: sevConfig.textColor }}
                  >
                    {incident.severity}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{incident.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span>{sourceConfig.icon}</span>
                        {sourceConfig.label}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        {incident.affected_services[0] ?? 'Unknown service'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {timeAgo(incident.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    className="px-2.5 py-1 rounded-md text-xs font-medium shrink-0"
                    style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor }}
                  >
                    {statusConfig.icon} {statusConfig.label}
                  </div>

                  <ArrowUpRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </motion.div>
              </Link>
            );
          })
        )}
      </motion.div>
    </motion.div>
  );
}
