import { useEffect, useState } from 'react';

/**
 * Current time (epoch ms) as React state, refreshed on an interval.
 * Keeps render functions pure and makes relative labels ("in 5 min", "Overdue") stay fresh.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
}
