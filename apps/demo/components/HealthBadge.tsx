'use client';

import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function HealthBadge() {
  const [status, setStatus] = useState<'ok' | 'down' | 'loading'>('loading');

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/health');
        setStatus(res.ok ? 'ok' : 'down');
      } catch {
        setStatus('down');
      }
    }
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium',
        status === 'ok' && 'border-success/30 bg-success/10 text-success',
        status === 'down' && 'border-destructive/30 bg-destructive/10 text-destructive animate-pulse',
        status === 'loading' && 'border-border bg-secondary text-muted-foreground'
      )}
    >
      <Activity className="h-3 w-3" />
      {status === 'loading' ? 'Checking...' : status === 'ok' ? 'All systems operational' : 'Service degraded'}
    </div>
  );
}
