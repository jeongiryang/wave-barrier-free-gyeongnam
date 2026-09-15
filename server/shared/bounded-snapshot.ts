import { withinBudget } from '../../lib/request-budget.js';

type Snapshot<T> = { value: T; checkedAt: string; expires: number };

export function createBoundedSnapshotCache(maxEntries = 100, maxPending = 50) {
  const cache = new Map<string, Snapshot<unknown>>();
  const pending = new Map<string, Promise<Snapshot<unknown> | null>>();
  async function get<T>(key: string, ttl: number, remaining: () => number, work: () => Promise<T | null>): Promise<Snapshot<T> | null> {
    const stored = cache.get(key);
    if (stored && stored.expires > Date.now()) return stored as Snapshot<T>;
    if (remaining() <= 0) return null;
    const existing = pending.get(key);
    if (existing) return withinBudget(existing, remaining(), () => null) as Promise<Snapshot<T> | null>;
    if (pending.size >= maxPending) return null;
    const request = withinBudget(work(), remaining(), () => null).then(result => {
      if (result === null) return null;
      const value = { value: result, checkedAt: new Date().toISOString(), expires: Date.now() + ttl };
      if (cache.size >= maxEntries) cache.delete(cache.keys().next().value!);
      cache.set(key, value);
      return value;
    }).finally(() => pending.delete(key));
    pending.set(key, request as Promise<Snapshot<unknown> | null>);
    return request;
  }
  return { get, clear: () => { cache.clear(); pending.clear(); }, sizes: () => ({ cached: cache.size, pending: pending.size }) };
}
