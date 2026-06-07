'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { api } from '../../../../lib/api';
import { cn } from '../../../../lib/utils';
import {
  Users,
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  Slack,
  Mail,
  UserCheck,
  RefreshCw,
} from 'lucide-react';

interface User {
  id: string;
  org_id: string;
  name: string;
  email: string;
  role: 'admin' | 'responder' | 'viewer';
  slack_user_id?: string;
  on_call: boolean;
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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OnCallPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const token = await getToken();
      const data = await api.users.list(token ?? undefined);
      setUsers((data.users ?? []) as User[]);
    } catch {
      setUsers([]);
    }
    setLoading(false);
  }

  async function toggleOnCall(userId: string, currentStatus: boolean) {
    setUpdatingId(userId);
    try {
      const token = await getToken();
      const response = await api.users.update(userId, { on_call: !currentStatus }, token ?? undefined) as { user: User };
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, on_call: response.user.on_call } : u))
      );
    } catch {
      /* keep UI unchanged on failure */
    }
    setUpdatingId(null);
  }

  const onCallUsers = users.filter((u) => u.on_call);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-primary" />
            On-Call Schedules
          </h1>
          <p className="text-muted-foreground mt-1">Incident escalation routing, primary responders, and active shifts</p>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="p-2.5 rounded-lg border border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          title="Refresh On-Call Roster"
        >
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </motion.div>

      {/* Active On-Call Status Block */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl glass border border-border/50 p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-success animate-ping shrink-0" />
              Active Incident Responder
            </h2>
            {onCallUsers.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive mt-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-sm font-bold">No Responder On-Call!</p>
                  <p className="text-xs">Incidents will have no auto-assignee. Toggle a user on-call below immediately.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 mt-3">
                {onCallUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/15">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-success/10 text-success flex items-center justify-center font-bold text-sm shrink-0">
                        {(u.name ?? u.email ?? 'US').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-bold text-foreground">{u.name ?? 'Unnamed Responder'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5" />
                          {u.email}
                        </p>
                      </div>
                    </div>

                    {u.slack_user_id && (
                      <span className="px-3 py-1 rounded-full bg-slate-900 border border-border text-xs flex items-center gap-1.5 text-muted-foreground">
                        <Slack className="w-3.5 h-3.5 text-orange-400" />
                        Linked Slack
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-6 text-xs text-muted-foreground border-t border-border/20 pt-4 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            Automatic rotation shifts trigger on Mondays at 08:00 AM local time.
          </div>
        </div>

        {/* Shift Details side panel */}
        <div className="rounded-xl glass border border-border/50 p-6 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Active Rotation Schedule
          </h3>
          <div className="space-y-3">
            {DAYS.map((day, idx) => {
              // Simple mock scheduling logic
              const assignee = users[idx % (users.length || 1)];
              return (
                <div key={day} className="flex items-center justify-between text-xs py-1.5 border-b border-border/20 last:border-b-0">
                  <span className="font-medium text-muted-foreground">{day}</span>
                  <span className="font-semibold text-foreground">{assignee ? assignee.name : 'Unassigned'}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Responder Fleet Toggling */}
      <motion.div variants={item} className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Responder Fleet Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 skeleton rounded-xl animate-pulse" />
            ))
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className={cn(
                  'p-5 rounded-xl glass border border-border/50 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-primary/20',
                  user.on_call && 'border-success/30 glow-success'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{user.name ?? 'Unnamed Responder'}</h3>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-mono uppercase font-bold">
                      {user.role}
                    </span>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs shrink-0 select-none">
                    {(user.name ?? user.email ?? 'US').substring(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="border-t border-border/20 pt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {user.on_call ? 'Currently On Duty' : 'Off Duty'}
                  </span>

                  <button
                    disabled={updatingId !== null}
                    onClick={() => toggleOnCall(user.id, user.on_call)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border',
                      user.on_call
                        ? 'bg-success/10 text-success border-success/30 hover:bg-success/15'
                        : 'bg-muted hover:bg-accent text-foreground border-border'
                    )}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    {updatingId === user.id ? 'Saving...' : user.on_call ? 'Take Off-Call' : 'Go On-Call'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
