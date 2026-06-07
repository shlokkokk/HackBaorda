'use client';

import { cn } from '../../lib/utils';

export function LiveBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-success',
        className
      )}
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
      Live
    </span>
  );
}
