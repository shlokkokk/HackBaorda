'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard, AlertTriangle, BarChart3, BookOpen, FileText,
  Settings, Shield, Users, Cpu, ExternalLink,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Incidents', href: '/dashboard/incidents', icon: AlertTriangle },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Runbooks', href: '/dashboard/runbooks', icon: BookOpen },
  { name: 'Postmortems', href: '/dashboard/postmortems', icon: FileText },
  { name: 'Agent Fleet', href: '/dashboard/agents', icon: Cpu },
  { name: 'On-Call', href: '/dashboard/on-call', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border/60 bg-card/95">
        <div className="flex h-14 items-center gap-2.5 border-b border-border/60 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-base font-bold tracking-tight">Sentinel</span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary/12 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}

          <a
            href={`${process.env.NEXT_PUBLIC_DEMO_URL ?? 'http://localhost:3002'}/demo`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center gap-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10"
          >
            <ExternalLink className="h-4 w-4" />
            Demo Chaos Panel
          </a>
        </nav>

        <div className="border-t border-border/60 p-3">
          <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
            <UserButton afterSignOutUrl="/sign-in" />
            <span className="text-xs text-muted-foreground">Account</span>
          </div>
        </div>
      </aside>

      <main className="ml-60 min-h-screen flex-1">
        <div className="mx-auto max-w-6xl p-6">{children}</div>
      </main>
    </div>
  );
}
