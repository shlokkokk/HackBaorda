'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import {
  BookOpen,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Code,
  X,
  PlusCircle,
} from 'lucide-react';

interface RunbookStep {
  name: string;
  command?: string;
  description?: string;
  required?: boolean;
}

interface Runbook {
  id: string;
  org_id: string;
  title: string;
  incident_type: string;
  steps: RunbookStep[];
  safe_to_automate: boolean;
  confidence_threshold: number;
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

export default function RunbooksPage() {
  const { getToken } = useAuth();
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIncidentType, setNewIncidentType] = useState('deployment-error');
  const [newSafeToAutomate, setNewSafeToAutomate] = useState(false);
  const [newConfidenceThreshold, setNewConfidenceThreshold] = useState(0.85);
  const [newSteps, setNewSteps] = useState<RunbookStep[]>([
    { name: 'Investigate system logs', description: 'Check logs for anomaly indicators' }
  ]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRunbooks();
  }, []);

  async function loadRunbooks() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.runbooks.list(token ?? undefined);
      setRunbooks((data.runbooks ?? []) as Runbook[]);
    } catch {
      // Demo runbooks fallback
      setRunbooks([
        {
          id: 'rb-1',
          org_id: '',
          title: 'Database CPU Spike Mitigation',
          incident_type: 'resource-exhaustion',
          safe_to_automate: true,
          confidence_threshold: 0.9,
          steps: [
            { name: 'List active DB queries', command: 'SELECT pid, query, state FROM pg_stat_activity ORDER BY query_start ASC;' },
            { name: 'Terminate long running transaction', command: 'SELECT pg_cancel_backend(pid);' },
            { name: 'Scale up DB read replica', description: 'Use AWS console or CLI to scale replica capacity' }
          ],
          created_at: new Date().toISOString()
        },
        {
          id: 'rb-2',
          org_id: '',
          title: 'API Gateway Timeout Recovery',
          incident_type: 'network-degradation',
          safe_to_automate: false,
          confidence_threshold: 0.8,
          steps: [
            { name: 'Check service route health', command: 'curl -I https://api.gateway.internal/health' },
            { name: 'Flush Gateway Redis cache', command: 'redis-cli -h cache.internal flushall' },
            { name: 'Restart Gateway service container', command: 'docker service update --force gateway' }
          ],
          created_at: new Date().toISOString()
        }
      ]);
    }
    setLoading(false);
  }

  async function createRunbook() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      await api.runbooks.create(
        {
          title: newTitle,
          incident_type: newIncidentType,
          steps: newSteps,
          safe_to_automate: newSafeToAutomate,
          confidence_threshold: newConfidenceThreshold,
        },
        token ?? undefined
      );
      setNewTitle('');
      setNewSteps([{ name: 'Investigate logs', description: '' }]);
      setShowCreate(false);
      loadRunbooks();
    } catch { /* ignore */ }
    setCreating(false);
  }

  async function deleteRunbook(id: string) {
    if (!confirm('Are you sure you want to delete this runbook?')) return;
    try {
      const token = await getToken();
      await api.runbooks.delete(id, token ?? undefined);
      loadRunbooks();
    } catch { /* ignore */ }
  }

  function addStepField() {
    setNewSteps([...newSteps, { name: '', description: '', command: '' }]);
  }

  function removeStepField(index: number) {
    const updated = [...newSteps];
    updated.splice(index, 1);
    setNewSteps(updated);
  }

  function updateStepField(index: number, key: keyof RunbookStep, val: string) {
    const updated = [...newSteps];
    updated[index] = { ...updated[index]!, [key]: val };
    setNewSteps(updated);
  }

  const filteredRunbooks = runbooks.filter((rb) =>
    rb.title.toLowerCase().includes(search.toLowerCase()) ||
    rb.incident_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-8 h-8 text-primary" />
            Runbook Library
          </h1>
          <p className="text-muted-foreground mt-1">Reusable step-by-step procedures and automation playbooks</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Runbook
        </button>
      </motion.div>

      {/* Search Bar */}
      <motion.div variants={item} className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search runbooks by title or incident type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </motion.div>

      {/* Runbooks Grid */}
      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-48 skeleton rounded-xl animate-pulse" />
          ))
        ) : filteredRunbooks.length === 0 ? (
          <div className="col-span-full text-center py-16 text-muted-foreground glass rounded-xl">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No runbooks found</p>
            <p className="text-sm">Create a runbook to help Sentinel resolve incidents automatically.</p>
          </div>
        ) : (
          filteredRunbooks.map((rb) => {
            const isExpanded = expandedId === rb.id;
            return (
              <motion.div
                key={rb.id}
                layout
                className={cn(
                  'rounded-xl glass border border-border/50 p-5 flex flex-col justify-between transition-all duration-300 hover:border-primary/30',
                  isExpanded && 'border-primary/50 glow-primary md:col-span-2'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-mono uppercase font-bold">
                        {rb.incident_type}
                      </span>
                      <h3 className="text-lg font-semibold mt-1">{rb.title}</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => deleteRunbook(rb.id)}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete Runbook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={cn(
                      'px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1.5',
                      rb.safe_to_automate
                        ? 'bg-success/15 text-success border border-success/20'
                        : 'bg-muted/80 text-muted-foreground border border-border'
                    )}>
                      {rb.safe_to_automate ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Safe to Automate
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5" />
                          Manual Execute
                        </>
                      )}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      Threshold: <strong className="text-foreground">{Math.round(rb.confidence_threshold * 100)}%</strong>
                    </span>
                  </div>

                  {/* Steps list */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-5 space-y-3 pt-4 border-t border-border/50 overflow-hidden"
                      >
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                          Steps & Automation Sequence
                        </h4>
                        <ol className="space-y-3">
                          {rb.steps.map((step, idx) => (
                            <li key={idx} className="flex gap-3 items-start text-sm">
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <p className="font-medium">{step.name}</p>
                                {step.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                                )}
                                {step.command && (
                                  <div className="flex items-center gap-2 mt-1.5 p-2 rounded bg-muted/70 font-mono text-xs border border-border/40 select-all">
                                    <Code className="w-3.5 h-3.5 text-primary shrink-0" />
                                    <span className="truncate">{step.command}</span>
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-5 pt-3 border-t border-border/20 flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">
                    {rb.steps.length} {rb.steps.length === 1 ? 'step' : 'steps'} configured
                  </span>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : rb.id)}
                    className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                  >
                    {isExpanded ? 'Collapse Details' : 'Expand Steps'}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-card rounded-xl border border-border/50 overflow-hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  Create Automation Runbook
                </h3>
                <button
                  onClick={() => setShowCreate(false)}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Runbook Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Restart Kubernetes Pod on Outage"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Incident Trigger Type</label>
                    <select
                      value={newIncidentType}
                      onChange={(e) => setNewIncidentType(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none"
                    >
                      <option value="deployment-error">Deployment Error</option>
                      <option value="resource-exhaustion">Resource Exhaustion</option>
                      <option value="network-degradation">Network Degradation</option>
                      <option value="db-lock">Database Lock/Timeout</option>
                      <option value="ssl-expiry">SSL Cert Expiry</option>
                      <option value="security-alert">Security Violation</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 p-4 rounded-lg bg-muted/30 border border-border/50">
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={newSafeToAutomate}
                      onChange={(e) => setNewSafeToAutomate(e.target.checked)}
                      className="rounded border-border bg-muted/50 text-primary focus:ring-primary w-4 h-4"
                    />
                    <span>Safe to execute automatically (AI Mode 3)</span>
                  </label>

                  <div className="flex-1 min-w-[200px] flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Confidence Threshold</span>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={newConfidenceThreshold}
                      onChange={(e) => setNewConfidenceThreshold(parseFloat(e.target.value))}
                      className="w-full accent-primary bg-muted/50"
                    />
                    <span className="text-sm font-bold font-mono w-10 text-right">
                      {Math.round(newConfidenceThreshold * 100)}%
                    </span>
                  </div>
                </div>

                {/* Steps Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Steps Setup
                    </label>
                    <button
                      onClick={addStepField}
                      className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Add Step
                    </button>
                  </div>

                  <div className="space-y-3">
                    {newSteps.map((step, idx) => (
                      <div key={idx} className="relative p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
                        <button
                          onClick={() => removeStepField(idx)}
                          className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/15 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            placeholder="Step name (e.g. Check pods health)"
                            value={step.name}
                            onChange={(e) => updateStepField(idx, 'name', e.target.value)}
                            className="bg-transparent text-sm font-semibold focus:outline-none border-b border-border/50 hover:border-primary/50 focus:border-primary w-full max-w-md pb-0.5"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7">
                          <input
                            type="text"
                            placeholder="Optional description"
                            value={step.description ?? ''}
                            onChange={(e) => updateStepField(idx, 'description', e.target.value)}
                            className="px-2.5 py-1.5 rounded bg-muted/30 border border-border/40 text-xs focus:outline-none focus:border-primary"
                          />
                          <input
                            type="text"
                            placeholder="Command to run (e.g. kubectl get pods)"
                            value={step.command ?? ''}
                            onChange={(e) => updateStepField(idx, 'command', e.target.value)}
                            className="px-2.5 py-1.5 rounded bg-muted/30 border border-border/40 font-mono text-xs focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end gap-3 bg-muted/20">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 rounded-lg text-sm border border-border/50 hover:bg-muted text-muted-foreground font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRunbook}
                  disabled={creating || !newTitle.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {creating ? 'Saving...' : 'Save Runbook'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
