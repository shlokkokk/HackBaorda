'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { cn, timeAgo, formatDate } from '../../../../../lib/utils';
import {
  ArrowLeft, Send, Bot, User, Clock,
  Brain, Loader2,
  AlertCircle, Search, Wrench, CheckCircle2, BookOpen,
  Shield, Bug, Globe, MessageSquare, Github, Terminal
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

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
import { SEVERITY_CONFIG, STATUS_CONFIG, SOURCE_CONFIG, STATUS_TRANSITIONS } from '@chronicle/shared';
import type { Incident, IncidentStatus, AgentInteraction } from '@chronicle/shared';

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [interactions, setInteractions] = useState<AgentInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadIncident();
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [interactions, agentResponse]);

  async function loadIncident() {
    try {
      const token = await getToken();
      const data = await api.incidents.get(id, token ?? undefined);
      setIncident(data.incident as Incident);
      setInteractions((data.interactions ?? []) as AgentInteraction[]);
    } catch {
      setIncident(null);
    }
    setLoading(false);
  }

  async function sendQuery() {
    if (!query.trim() || agentLoading || !incident) return;
    const q = query;
    setQuery('');
    setAgentLoading(true);
    setAgentResponse(null);

    // Add user message immediately
    const userInteraction: AgentInteraction = {
      id: `temp-${Date.now()}`, incident_id: incident.id,
      query: q, response: '', tools_used: [], memories_retrieved: [],
      created_at: new Date().toISOString(),
    };
    setInteractions((prev) => [...prev, userInteraction]);

    try {
      const token = await getToken();
      const data = await api.agent.query(
        { incident_id: incident.id, query: q },
        token ?? undefined
      );
      // Add agent response
      const agentInteraction: AgentInteraction = {
        id: `agent-${Date.now()}`, incident_id: incident.id,
        query: q, response: data.response, tools_used: data.tools_used,
        memories_retrieved: data.memories_retrieved as AgentInteraction['memories_retrieved'],
        created_at: new Date().toISOString(),
      };
      setInteractions((prev) => {
        const withoutTemp = prev.filter((i) => i.id !== userInteraction.id);
        return [...withoutTemp, agentInteraction];
      });
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not reach Chronicle API. Is the backend running on port 3001?';
      const errorInteraction: AgentInteraction = {
        id: `err-${Date.now()}`,
        incident_id: incident.id,
        query: q,
        response: `⚠️ **Agent error:** ${message}\n\nIf this says "Organization ID required", sign out and back in, or run \`pnpm setup:agent\` then restart \`pnpm dev\`.`,
        tools_used: [],
        memories_retrieved: [],
        created_at: new Date().toISOString(),
      };
      setInteractions((prev) => {
        const withoutTemp = prev.filter((i) => i.id !== userInteraction.id);
        return [...withoutTemp, errorInteraction];
      });
    }
    setAgentLoading(false);
  }

  async function updateStatus(newStatus: IncidentStatus) {
    if (!incident) return;
    try {
      const token = await getToken();
      const data = await api.incidents.update(
        incident.id,
        { status: newStatus },
        token ?? undefined
      );
      setIncident(data.incident as Incident);
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 skeleton rounded" />
        <div className="h-32 skeleton rounded-xl" />
        <div className="h-64 skeleton rounded-xl" />
      </div>
    );
  }

  if (!incident) return <div>Incident not found</div>;

  const sevConfig = SEVERITY_CONFIG[incident.severity];
  const statusConfig = STATUS_CONFIG[incident.status];
  const sourceConfig = SOURCE_CONFIG[incident.source];
  const allowedTransitions = STATUS_TRANSITIONS[incident.status] ?? [];

  // SLA calculation
  let slaRemaining = '';
  let slaPercentage = 100;
  let slaCritical = false;
  if (incident.sla_breach_at) {
    const remaining = new Date(incident.sla_breach_at).getTime() - Date.now();
    const mins = Math.max(0, Math.floor(remaining / 60000));
    slaRemaining = mins > 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
    slaCritical = mins < 10;
    slaPercentage = Math.max(0, Math.min(100, (remaining / (60 * 60 * 1000)) * 100));
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <Link href="/dashboard/incidents" className="p-2 rounded-lg hover:bg-accent transition-colors mt-1">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center flex-wrap gap-2.5 mb-3">
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold border" 
              style={{ backgroundColor: sevConfig.bgColor, color: sevConfig.textColor, borderColor: 'currentColor' }}
            >
              {incident.severity}
            </span>
            <span 
              className="px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5" 
              style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor, borderColor: 'currentColor' }}
            >
              {(() => {
                const StatusIcon = STATUS_ICONS[incident.status] || AlertCircle;
                return <StatusIcon className="w-3.5 h-3.5" />;
              })()}
              {statusConfig.label}
            </span>
            <span 
              className="px-3 py-1 rounded-full text-xs font-medium border border-border/60 bg-muted/30 text-muted-foreground flex items-center gap-1.5"
            >
              {(() => {
                const SourceIcon = SOURCE_ICONS[incident.source] || Terminal;
                return <SourceIcon className="w-3.5 h-3.5" />;
              })()}
              {sourceConfig.label}
            </span>
          </div>
          <h1 className="text-2xl font-bold">{incident.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Created {timeAgo(incident.created_at)} • {incident.affected_services.join(', ') || 'No services tagged'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details + Agent Chat */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {incident.description && (
            <div className="rounded-xl glass p-5">
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-3 last:mb-0" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                    li: ({ node, ...props }) => <li className="list-disc pl-0.5 leading-relaxed" {...props} />,
                  }}
                >
                  {incident.description}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* Status Actions */}
          {allowedTransitions.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Transition to:</span>
              {allowedTransitions.map((status) => {
                const config = STATUS_CONFIG[status];
                const StatusIcon = STATUS_ICONS[status] || AlertCircle;
                return (
                  <button
                    key={status}
                    onClick={() => updateStatus(status)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold border border-border/50 hover:bg-accent transition-colors flex items-center gap-1.5 shadow-sm"
                    style={{ color: config.textColor }}
                  >
                    <StatusIcon className="w-3.5 h-3.5" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Agent Chat */}
          <div className="rounded-xl glass overflow-hidden">
            <div className="px-5 py-3 border-b border-border/50 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              <h3 className="text-sm font-semibold">Chronicle AI</h3>
              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Brain className="w-3 h-3" /> Memory-enabled
              </span>
            </div>

            {/* Chat Messages */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4">
              {interactions.length === 0 && !agentLoading && (
                <div className="text-center py-12 text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Ask Chronicle AI about this incident</p>
                  <p className="text-xs mt-1">I can search past incidents, suggest fixes, and check SLA</p>
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {[
                      'What caused similar issues before?',
                      'Suggest a fix',
                      'Check SLA status',
                      'Score the severity',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setQuery(suggestion); }}
                        className="px-3 py-1.5 rounded-full text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {interactions.map((interaction) => (
                <div key={interaction.id} className="space-y-3">
                  {/* User Message */}
                  <div className="flex items-start gap-3 justify-end">
                    <div className="max-w-[80%] px-4 py-2.5 rounded-xl rounded-tr-sm bg-primary/15 text-sm">
                      {interaction.query}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  {/* Agent Response */}
                  {interaction.response && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="max-w-[80%] px-4 py-2.5 rounded-xl rounded-tl-sm bg-muted/50 text-sm">
                        <div className="max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({ node, ...props }) => <h1 className="text-lg font-extrabold text-foreground mt-4 mb-2 first:mt-0" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-base font-bold text-foreground mt-3.5 mb-1.5 first:mt-0" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0" {...props} />,
                              p: ({ node, ...props }) => <p className="text-sm text-muted-foreground leading-relaxed mb-3 last:mb-0" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc pl-5 space-y-1.5 my-3 text-sm text-muted-foreground" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-5 space-y-1.5 my-3 text-sm text-muted-foreground" {...props} />,
                              li: ({ node, ...props }) => <li className="pl-0.5 leading-relaxed" {...props} />,
                              code: ({ node, ...props }) => (
                                <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs text-primary font-semibold" {...props} />
                              ),
                              pre: ({ node, ...props }) => (
                                <pre className="p-3.5 my-3 rounded-lg bg-black/45 border border-border/40 font-mono text-xs overflow-x-auto text-primary-foreground leading-relaxed shadow-inner" {...props} />
                              ),
                              strong: ({ node, ...props }) => <strong className="font-bold text-foreground" {...props} />,
                              em: ({ node, ...props }) => <em className="italic text-muted-foreground/90" {...props} />,
                              a: ({ node, ...props }) => <a className="text-primary hover:underline font-semibold transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary/50 bg-muted/20 pl-4 py-2 italic my-3 text-muted-foreground rounded-r" {...props} />,
                            }}
                          >
                            {interaction.response}
                          </ReactMarkdown>
                        </div>
                        {interaction.tools_used.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {interaction.tools_used.map((tool) => (
                              <span key={tool} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary">
                                {tool}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {agentLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="px-4 py-3 rounded-xl rounded-tl-sm bg-muted/50">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Querying Groq (usually 3–10s)...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-border/50">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendQuery()}
                  placeholder="Ask Chronicle AI..."
                  className="flex-1 px-4 py-2.5 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={sendQuery}
                  disabled={!query.trim() || agentLoading}
                  className="p-2.5 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4">
          {/* SLA Countdown */}
          {incident.sla_breach_at && incident.status !== 'resolved' && incident.status !== 'postmortem' && (
            <div className={cn(
              'rounded-xl glass p-5',
              slaCritical && 'glow-destructive sla-critical'
            )}>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Clock className={cn('w-4 h-4', slaCritical ? 'text-severity-p0' : 'text-warning')} />
                SLA Countdown
              </h3>
              <p className={cn(
                'text-3xl font-bold font-mono',
                slaCritical ? 'text-severity-p0' : 'text-warning'
              )}>
                {slaRemaining}
              </p>
              <div className="mt-3 h-2 bg-muted/50 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-1000', slaCritical ? 'bg-severity-p0' : 'bg-warning')}
                  style={{ width: `${slaPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Details */}
          <div className="rounded-xl glass p-5 space-y-4">
            <h3 className="text-sm font-semibold">Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Source</span>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border border-border bg-muted/30">
                  {(() => {
                    const SourceIcon = SOURCE_ICONS[incident.source] || Terminal;
                    return <SourceIcon className="w-3.5 h-3.5" />;
                  })()}
                  {sourceConfig.label}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Services</span>
                <span>{incident.affected_services.join(', ') || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{formatDate(incident.created_at)}</span>
              </div>
              {incident.resolved_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Resolved</span>
                  <span>{formatDate(incident.resolved_at)}</span>
                </div>
              )}
              {incident.tags.length > 0 && (
                <div>
                  <span className="text-muted-foreground block mb-1">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {incident.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-muted/50 text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Memory Panel */}
          <div className="rounded-xl glass p-5">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Linked Memories
            </h3>
            {incident.mem0_memory_ids.length === 0 ? (
              <p className="text-xs text-muted-foreground">No memories linked yet. Resolve the incident to store learnings.</p>
            ) : (
              <div className="space-y-2">
                {incident.mem0_memory_ids.map((memId) => (
                  <div key={memId} className="px-3 py-2 rounded-lg bg-purple-500/10 text-xs text-purple-300">
                    Memory: {memId.substring(0, 12)}...
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
