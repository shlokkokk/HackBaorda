'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function usePolling(
  fetcher: () => Promise<void>,
  intervalMs = 10_000,
  enabled = true
) {
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function run() {
      try {
        await fetcherRef.current();
      } catch {
        /* handled by fetcher */
      }
    }

    run();
    const id = setInterval(() => {
      if (!cancelled) run();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs, enabled, tick]);

  return { refresh };
}
