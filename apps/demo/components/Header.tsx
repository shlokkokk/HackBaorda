'use client';

import Link from 'next/link';
import { ShoppingBag, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  active?: 'home' | 'checkout' | 'demo';
}

export function Header({ active = 'home' }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 glass border-b border-border/50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-lg">
            🛒
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">ShopFlow</span>
            <span className="ml-2 hidden rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary sm:inline">
              demo
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={cn(
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === 'home' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Store
          </Link>
          <Link
            href="/checkout"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === 'checkout' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            Checkout
          </Link>
          <Link
            href="/demo"
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              active === 'demo'
                ? 'bg-accent/20 text-accent'
                : 'text-muted-foreground hover:text-accent'
            )}
          >
            <Zap className="h-4 w-4" />
            Chaos Panel
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <span>Search products...</span>
          </div>
        </div>
      </div>
    </header>
  );
}
