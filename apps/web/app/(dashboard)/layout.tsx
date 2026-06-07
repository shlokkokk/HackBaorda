'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  AlertTriangle,
  BarChart3,
  BookOpen,
  FileText,
  Settings,
  Shield,
  Activity,
  Users,
  Cpu,
  Command,
  Search,
} from 'lucide-react';
import { useState } from 'react';

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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex bg-background">
      {/* ─── Sidebar ──────────────────────────────── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 glass-strong',
          isSidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-border/50">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {isSidebarOpen && (
            <span className="text-lg font-bold gradient-text animate-fade-in">
              Sentinel
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto stagger-children">
          {navigation.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-accent/80 hover:text-accent-foreground',
                  isActive
                    ? 'bg-primary/15 text-primary glow-primary'
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-primary')} />
                {isSidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Ingestion Status Indicator */}
        <div className="px-3 pb-3">
          <div className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 border border-success/20',
            !isSidebarOpen && 'justify-center'
          )}>
            <Activity className="w-4 h-4 text-success animate-pulse" />
            {isSidebarOpen && (
              <span className="text-xs text-success font-medium">System Online</span>
            )}
          </div>
        </div>

        {/* User */}
        <div className="border-t border-border/50 px-4 py-3 flex items-center gap-3">
          <UserButton afterSignOutUrl="/sign-in" />
          {isSidebarOpen && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium truncate">My Account</p>
              <p className="text-xs text-muted-foreground truncate">Admin</p>
            </div>
          )}
        </div>
      </aside>

      {/* ─── Main Content ─────────────────────────── */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          isSidebarOpen ? 'ml-64' : 'ml-20'
        )}
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-40 h-16 flex items-center justify-between px-6 glass-strong border-b border-border/50">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Toggle sidebar"
          >
            <Command className="w-5 h-5 text-muted-foreground" />
          </button>

          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-muted-foreground w-64">
              <Search className="w-4 h-4" />
              <span>Search incidents... ⌘K</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
