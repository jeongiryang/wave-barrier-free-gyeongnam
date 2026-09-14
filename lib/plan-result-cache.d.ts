export const PLAN_RESULT_CACHE_KEY: string;
export type CachedPlanResult = { signature: string; checkedAt: string; savedAt: number; source: string; mode: string; plan: unknown };
export function readPlanResultCache(storage: Storage, signature: string): CachedPlanResult | null;
export function writePlanResultCache(storage: Storage, signature: string, plan: unknown): boolean;
