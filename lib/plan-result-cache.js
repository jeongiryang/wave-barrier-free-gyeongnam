export const PLAN_RESULT_CACHE_KEY = 'wave-plan-result-cache-v1';
const MAX_ENTRIES = 12;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function entries(storage) {
  try {
    const value = JSON.parse(storage.getItem(PLAN_RESULT_CACHE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    const now = Date.now();
    return value.filter(item => item && typeof item.signature === 'string' && typeof item.checkedAt === 'string'
      && typeof item.savedAt === 'number' && now - item.savedAt <= MAX_AGE && item.plan && typeof item.plan === 'object').slice(0, MAX_ENTRIES);
  } catch { return []; }
}

export function readPlanResultCache(storage, signature) {
  return entries(storage).find(item => item.signature === signature) || null;
}

export function writePlanResultCache(storage, signature, plan) {
  const places = [...(Array.isArray(plan?.places) ? plan.places : []), ...(Array.isArray(plan?.explorationPlaces) ? plan.explorationPlaces : [])];
  const useful = places.length > 0 && Array.isArray(plan?.statuses) && plan.statuses.some(status => status?.state === 'live' || status?.partial === true);
  if (!useful) return false;
  const item = { signature, checkedAt: typeof plan.generatedAt === 'string' ? plan.generatedAt : new Date().toISOString(), savedAt: Date.now(), source: '한국관광공사 관광정보', mode: plan.mode, plan };
  try {
    storage.setItem(PLAN_RESULT_CACHE_KEY, JSON.stringify([item, ...entries(storage).filter(entry => entry.signature !== signature)].slice(0, MAX_ENTRIES)));
    return true;
  } catch { return false; }
}
