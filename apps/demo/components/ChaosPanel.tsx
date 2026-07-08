'use client';

import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Power,
  RefreshCw,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChaosScenario } from '@/lib/demo-state';

interface ScenarioMeta {
  label: string;
  description: string;
  chronicleSource: string;
  seededIncident: string;
  severity: string;
}

interface ChaosState {
  scenarios: Record<ChaosScenario, boolean>;
  lastTriggered: Partial<Record<ChaosScenario, string>>;
  triggerCount: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  P0: 'bg-red-600',
  P1: 'bg-red-500',
  P2: 'bg-amber-500',
  P3: 'bg-blue-500',
};

export function ChaosPanel() {
  const [state, setState] = useState<ChaosState | null>(null);
  const [meta, setMeta] = useState<Record<ChaosScenario, ScenarioMeta> | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chronicleMsg, setChronicleMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/chaos');
    const data = await res.json();
    setState(data.state);
    setMeta(data.scenarios);
  }, []);

  useEffect(() => {
    load().catch(() => setError('Failed to load chaos state'));
  }, [load]);

  async function toggle(scenario: ChaosScenario) {
    setLoading(scenario);
    setError(null);
    try {
      const res = await fetch('/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', scenario }),
      });
      const data = await res.json();
      setState(data.state);
      if (data.chronicle?.ok) {
        setChronicleMsg(data.message ?? 'Chronicle updated');
      } else if (data.chronicle?.error) {
        setError(data.chronicle.error);
      }
    } catch {
      setError('Failed to toggle scenario');
    }
    setLoading(null);
  }

  async function resetAll() {
    setLoading('reset');
    try {
      const res = await fetch('/api/chaos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      setState(data.state);
    } catch {
      setError('Failed to reset');
    }
    setLoading(null);
  }

  const activeCount = state ? Object.values(state.scenarios).filter(Boolean).length : 0;

  if (!state || !meta) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Zap className="h-6 w-6 text-accent" />
            Chaos Engineering Panel
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trigger failure scenarios that flow into Chronicle via webhooks and monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={resetAll}
            disabled={loading === 'reset'}
            className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset All
          </button>
        </div>
      </div>

      {chronicleMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          {chronicleMsg} — check <a href={`${process.env.NEXT_PUBLIC_CHRONICLE_DASHBOARD_URL ?? 'http://localhost:3000'}/dashboard/incidents`} className="underline" target="_blank" rel="noreferrer">Chronicle dashboard</a>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          {error}
          <span className="text-xs opacity-80">— run: pnpm setup:demo</span>
        </div>
      )}

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            activeCount > 0 ? 'bg-destructive/20 text-destructive' : 'bg-success/20 text-success'
          )}
        >
          {activeCount > 0 ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-medium">
            {activeCount === 0 ? 'No active failures' : `${activeCount} failure scenario${activeCount > 1 ? 's' : ''} active`}
          </p>
          <p className="text-xs text-muted-foreground">
            {state.triggerCount} total triggers this session · UptimeRobot polls /api/health every 5 min
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.keys(meta) as ChaosScenario[]).map((key) => {
          const m = meta[key];
          const active = state.scenarios[key];
          const isLoading = loading === key;

          return (
            <motion.div
              key={key}
              layout
              className={cn(
                'relative overflow-hidden rounded-xl border p-5 transition-colors',
                active
                  ? 'border-destructive/50 bg-destructive/5'
                  : 'border-border bg-card hover:border-primary/30'
              )}
            >
              <AnimatePresence>
                {active && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase text-destructive"
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
                    Live
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold text-white', SEVERITY_COLORS[m.severity])}>
                      {m.severity}
                    </span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {m.chronicleSource}
                    </span>
                  </div>
                  <h3 className="font-semibold">{m.label}</h3>
                </div>
              </div>

              <p className="mb-3 text-sm text-muted-foreground">{m.description}</p>

              <p className="mb-4 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Matches seeded incident:</span>{' '}
                {m.seededIncident}
              </p>

              <button
                onClick={() => toggle(key)}
                disabled={isLoading}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all',
                  active
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  isLoading && 'opacity-60'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {active ? 'Deactivate' : 'Activate'} Scenario
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
        <h3 className="mb-2 font-semibold">Demo Flow Guide</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li>1. Activate a scenario above (e.g. <strong className="text-foreground">Payment Gateway Timeout</strong>)</li>
          <li>2. Visit the Store or Checkout page to trigger the failure live</li>
          <li>3. Watch Chronicle dashboard ingest the alert via Sentry, UptimeRobot, or agent</li>
          <li>4. Use the AI co-pilot — it searches Mem0 for matching past incidents from seed data</li>
          <li>5. Deactivate the scenario and use <strong className="text-foreground">verify_fix</strong> on /api/health</li>
        </ol>
      </div>
    </div>
  );
}
