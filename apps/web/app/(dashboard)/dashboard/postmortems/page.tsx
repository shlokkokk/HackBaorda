'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import {
  FileText,
  Search,
  BookOpen,
  Calendar,
  ChevronRight,
  Printer,
  X,
} from 'lucide-react';
import type { Severity, IncidentSource } from '@chronicle/shared';

interface IncidentDetails {
  title: string;
  severity: Severity;
  source: IncidentSource;
  created_at: string;
  resolved_at: string | null;
}

interface Postmortem {
  id: string;
  incident_id: string;
  org_id: string;
  content: string;
  review_status: 'draft' | 'in_review' | 'published';
  created_at: string;
  incidents?: IncidentDetails;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1 },
};

const STATUS_LABELS = {
  draft: { label: 'Draft', color: 'bg-muted text-muted-foreground border-border' },
  in_review: { label: 'In Review', color: 'bg-warning/10 text-warning border-warning/20' },
  published: { label: 'Published', color: 'bg-success/10 text-success border-success/20' },
};

// Simple custom Markdown rendering to avoid dependency issue
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n');

  const parseInline = (text: string) => {
    const boldRegex = /(\*\*.*?\*\*)/g;
    const parts = text.split(boldRegex);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-foreground">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
      {lines.map((line, idx) => {
        if (line.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-foreground pt-4 border-b border-border/50 pb-2">
              {parseInline(line.substring(2))}
            </h1>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-xl font-semibold text-foreground pt-3 border-b border-border/20 pb-1">
              {parseInline(line.substring(3))}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-lg font-medium text-foreground pt-2">
              {parseInline(line.substring(4))}
            </h3>
          );
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1">
              <li>{parseInline(line.substring(2))}</li>
            </ul>
          );
        }
        if (line.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-4 border-primary bg-muted/30 px-4 py-2 italic my-2 rounded-r">
              {parseInline(line.substring(2))}
            </blockquote>
          );
        }
        if (line.trim() === '') {
          return <div key={idx} className="h-2" />;
        }
        return <p key={idx}>{parseInline(line)}</p>;
      })}
    </div>
  );
}

export default function PostmortemsPage() {
  const { getToken } = useAuth();
  const [postmortems, setPostmortems] = useState<Postmortem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activePm, setActivePm] = useState<Postmortem | null>(null);

  useEffect(() => {
    loadPostmortems();
  }, []);

  async function loadPostmortems() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.postmortems.list(token ?? undefined);
      setPostmortems((data.postmortems ?? []) as Postmortem[]);
    } catch {
      setPostmortems([]);
    }
    setLoading(false);
  }

  async function updateStatus(id: string, nextStatus: Postmortem['review_status']) {
    try {
      const token = await getToken();
      await api.postmortems.update(id, { review_status: nextStatus }, token ?? undefined);
      if (activePm && activePm.id === id) {
        setActivePm({ ...activePm, review_status: nextStatus });
      }
      loadPostmortems();
    } catch { /* ignore */ }
  }

  const filteredPms = postmortems.filter((pm) =>
    (pm.incidents?.title ?? '').toLowerCase().includes(search.toLowerCase()) ||
    pm.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-8 h-8 text-primary" />
            Postmortem Archives
          </h1>
          <p className="text-muted-foreground mt-1">Post-incident reports, timelines, learnings, and mitigation actions</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div variants={item} className="flex gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 flex-1">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search postmortems..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </motion.div>

      {/* Postmortems List */}
      <motion.div variants={item} className="space-y-3 stagger-children">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 skeleton rounded-xl animate-pulse" />
          ))
        ) : filteredPms.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground glass rounded-xl">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No postmortems archived</p>
            <p className="text-sm font-light mt-1">Postmortems are automatically drafted by Chronicle AI when you resolve incidents.</p>
          </div>
        ) : (
          filteredPms.map((pm) => {
            const inc = pm.incidents;
            const statusConfig = STATUS_LABELS[pm.review_status];

            return (
              <motion.div
                key={pm.id}
                whileHover={{ x: 4 }}
                onClick={() => setActivePm(pm)}
                className="flex items-center justify-between p-4 rounded-xl glass border border-border/50 cursor-pointer transition-all duration-200 hover:bg-accent/50 group"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {inc?.title ?? 'Incident Postmortem Report'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(pm.created_at).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-[10px] border font-medium',
                        statusConfig.color
                      )}>
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>

      {/* Detail Slideover Modal */}
      <AnimatePresence>
        {activePm && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-3xl h-full bg-card border-l border-border/50 flex flex-col justify-between shadow-2xl relative"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-muted-foreground">Postmortem Document</span>
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[10px] border font-semibold',
                      STATUS_LABELS[activePm.review_status].color
                    )}>
                      {STATUS_LABELS[activePm.review_status].label}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mt-1">
                    {activePm.incidents?.title ?? 'Postmortem Details'}
                  </h3>
                </div>
                <button
                  onClick={() => setActivePm(null)}
                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Operations bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Change Status:</span>
                    <select
                      value={activePm.review_status}
                      onChange={(e) => updateStatus(activePm.id, e.target.value as Postmortem['review_status'])}
                      className="px-2.5 py-1.5 rounded bg-card border border-border/50 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="draft">Draft</option>
                      <option value="in_review">In Review</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/95 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print / Export PDF
                  </button>
                </div>

                {/* Rendered Postmortem */}
                <article className="prose prose-invert max-w-none bg-muted/10 border border-border/30 rounded-xl p-6 shadow-inner print:bg-white print:text-black">
                  <SimpleMarkdown content={activePm.content} />
                </article>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end bg-muted/20 print:hidden">
                <button
                  onClick={() => setActivePm(null)}
                  className="px-4 py-2 rounded-lg text-sm bg-muted text-muted-foreground font-medium hover:bg-muted/80 transition-colors"
                >
                  Close Archive
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
