'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import {
  Settings,
  Shield,
  Slack,
  Key,
  Copy,
  Check,
  Save,
  Clock,
} from 'lucide-react';

interface Org {
  id: string;
  name: string;
  slack_workspace_id: string | null;
  webhook_secret: string;
  sla_config: Record<string, number>;
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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export default function SettingsPage() {
  const { getToken } = useAuth();
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'general' | 'sla' | 'integrations'>('general');

  // Form states
  const [name, setName] = useState('');
  const [slackId, setSlackId] = useState('');
  const [slaConfig, setSlaConfig] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.orgs.current(token ?? undefined) as { org: Org };
      if (data?.org) {
        setOrg(data.org);
        setName(data.org.name);
        setSlackId(data.org.slack_workspace_id ?? '');
        setSlaConfig(data.org.sla_config ?? {});
      }
    } catch {
      setOrg(null);
    }
    setLoading(false);
  }

  async function handleSave() {
    if (!org) return;
    setSaving(true);
    try {
      const token = await getToken();
      const response = await api.orgs.update(
        org.id,
        {
          name,
          slack_workspace_id: slackId.trim() || null,
          sla_config: slaConfig,
        },
        token ?? undefined
      ) as { org: Org };
      if (response?.org) {
        setOrg(response.org);
        alert('Settings saved successfully!');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save settings');
    }
    setSaving(false);
  }

  function handleSlaChange(sev: string, val: number) {
    setSlaConfig((prev) => ({ ...prev, [sev]: val }));
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded animate-pulse" />
        <div className="h-64 skeleton rounded-xl animate-pulse" />
      </div>
    );
  }

  const integrationWebhooks = [
    { name: 'UptimeRobot Alert Ingest', path: '/api/webhooks/uptimerobot', description: 'Trigger alerts on site down detection.' },
    { name: 'Sentry Issues Webhook', path: '/api/webhooks/sentry', description: 'Deduplicate codebase exceptions.' },
    { name: 'GitHub Issues Webhook', path: '/api/webhooks/github', description: 'Create incidents from labeled issues.' },
    { name: 'Sentinel Monitoring Agent API', path: '/api/webhooks/ingest', description: 'Accept host metric heartbeats and alerts.' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" />
            Workspace Settings
          </h1>
          <p className="text-muted-foreground mt-1">Configure SLA compliance targets, webhook endpoints, and details</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex border-b border-border/50 gap-6">
        {[
          { id: 'general', label: 'General', icon: Shield },
          { id: 'sla', label: 'SLA Policies', icon: Clock },
          { id: 'integrations', label: 'Webhook Integrations', icon: Key },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              'pb-3.5 text-sm font-semibold flex items-center gap-2 transition-all relative border-b-2 border-transparent',
              activeTab === tab.id
                ? 'text-primary border-primary font-bold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </motion.div>

      {/* Tab Panels */}
      <motion.div variants={item} className="rounded-xl glass border border-border/50 p-6 space-y-6">
        {/* PANEL: General */}
        {activeTab === 'general' && (
          <div className="space-y-5">
            <h3 className="text-base font-bold text-foreground">Workspace Profile</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Organization Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Slack className="w-4 h-4 text-orange-400 shrink-0" />
                  Slack Workspace ID (Bolt)
                </label>
                <input
                  type="text"
                  placeholder="e.g. T06A9283B"
                  value={slackId}
                  onChange={(e) => setSlackId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-muted/40 border border-border/50 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* PANEL: SLA */}
        {activeTab === 'sla' && (
          <div className="space-y-5">
            <div className="flex items-start justify-between border-b border-border/20 pb-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Escalation SLA Targets</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define resolution deadline target (in minutes) for incidents based on their severity.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { sev: 'P0', label: 'P0 Outage SLA', desc: 'Critical services down. Auto-escalated.', color: 'text-severity-p0' },
                { sev: 'P1', label: 'P1 Severity SLA', desc: 'Core platform degradation.', color: 'text-severity-p1' },
                { sev: 'P2', label: 'P2 Severity SLA', desc: 'Non-critical system failures.', color: 'text-severity-p2' },
                { sev: 'P3', label: 'P3 Severity SLA', desc: 'Minor bugs / low impact items.', color: 'text-severity-p3' },
                { sev: 'P4', label: 'P4 Severity SLA', desc: 'General queries / cosmetic.', color: 'text-severity-p4' },
              ].map((sla) => (
                <div key={sla.sev} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/20 border border-border/30">
                  <div>
                    <h4 className={cn('text-sm font-bold', sla.color)}>{sla.label}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">{sla.desc}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={slaConfig[sla.sev] ?? 0}
                      onChange={(e) => handleSlaChange(sla.sev, parseInt(e.target.value) || 0)}
                      className="w-24 px-2 py-1.5 text-center font-mono rounded bg-card border border-border text-sm focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs font-medium text-muted-foreground w-16">
                      minutes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PANEL: Integrations */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-foreground">Ingestion Webhooks</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send webhook events from your metrics provider to these endpoints. Secure all requests using your Webhook Secret.
              </p>
            </div>

            {/* Secret key */}
            {org?.webhook_secret && (
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20 space-y-1">
                <span className="text-xs font-semibold text-warning">Org Ingestion Signature Secret</span>
                <div className="flex items-center justify-between gap-3 mt-1">
                  <span className="font-mono text-xs select-all break-all text-muted-foreground bg-slate-950 p-2 rounded flex-1">
                    {org.webhook_secret}
                  </span>
                  <button
                    onClick={() => copyToClipboard(org.webhook_secret, 'secret')}
                    className="p-2 border border-border/50 hover:bg-muted text-muted-foreground rounded transition-colors shrink-0"
                  >
                    {copiedKey === 'secret' ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground italic mt-1">
                  Verify request signature using SHA256 HMAC (Slack, Sentry) or pass this in `X-Webhook-Secret` header.
                </p>
              </div>
            )}

            {/* Webhook URLs list */}
            <div className="space-y-4">
              {integrationWebhooks.map((hook) => {
                const fullUrl = `${API_URL}${hook.path}`;
                return (
                  <div key={hook.name} className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">{hook.name}</span>
                      <span className="text-[10px] text-muted-foreground bg-card border border-border/50 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        POST
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{hook.description}</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        readOnly
                        value={fullUrl}
                        className="w-full px-3 py-1.5 rounded bg-slate-950 font-mono text-xs text-primary/80 border border-border/30 select-all focus:outline-none"
                      />
                      <button
                        onClick={() => copyToClipboard(fullUrl, hook.name)}
                        className="p-1.5 border border-border/50 hover:bg-muted text-muted-foreground rounded transition-colors shrink-0"
                      >
                        {copiedKey === hook.name ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
