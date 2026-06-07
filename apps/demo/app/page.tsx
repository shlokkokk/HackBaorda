'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Search, ShoppingCart } from 'lucide-react';
import { Header } from '@/components/Header';
import { HealthBadge } from '@/components/HealthBadge';
import { PRODUCTS } from '@/lib/products';
import { cn } from '@/lib/utils';

export default function StorePage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<typeof PRODUCTS | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchMs, setSearchMs] = useState<number | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchWarning(null);
    const start = Date.now();
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearchMs(data.latency_ms ?? Date.now() - start);
      setSearchWarning(data.warning ?? null);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }

  return (
    <div className="min-h-screen">
      <Header active="home" />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-10 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <HealthBadge />
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
              Welcome to <span className="gradient-text">ShopFlow</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              A realistic e-commerce platform wired for Sentinel incident demos. Browse products, test checkout, or open the Chaos Panel.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ShoppingCart className="h-4 w-4" />
                Go to Checkout
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-5 py-2.5 text-sm font-semibold text-accent hover:bg-accent/20"
              >
                Open Chaos Panel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </section>

        <section className="mb-10">
          <form onSubmit={handleSearch} className="mx-auto flex max-w-lg gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products (try activating Slow Search scenario)..."
                className="w-full rounded-lg border border-border bg-secondary py-2.5 pl-10 pr-4 text-sm outline-none ring-primary focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-secondary px-4 py-2.5 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </button>
          </form>
          {searchMs !== null && (
            <p className={cn('mt-2 text-center text-xs', searchMs > 5000 ? 'text-destructive' : 'text-muted-foreground')}>
              Search completed in {searchMs}ms
              {searchWarning && ` — ${searchWarning}`}
            </p>
          )}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(results ?? PRODUCTS).map((product, i) => (
            <motion.article
              key={product.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="mb-4 flex h-24 items-center justify-center rounded-lg bg-secondary text-5xl">
                {product.image}
              </div>
              {product.badge && (
                <span className="mb-2 inline-block rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {product.badge}
                </span>
              )}
              <p className="text-xs text-muted-foreground">{product.category}</p>
              <h3 className="font-semibold">{product.name}</h3>
              <p className="mt-1 text-lg font-bold text-primary">${product.price.toFixed(2)}</p>
              <Link
                href="/checkout"
                className="mt-4 block w-full rounded-lg border border-border py-2 text-center text-sm font-medium transition-colors group-hover:border-primary group-hover:bg-primary/10"
              >
                Add to Cart
              </Link>
            </motion.article>
          ))}
        </section>
      </main>
    </div>
  );
}
