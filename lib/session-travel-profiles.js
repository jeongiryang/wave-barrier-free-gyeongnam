import { resolveFacilityKeys } from './facility-selection.js';
export const SESSION_PROFILES_KEY = 'wave-session-facilities-v1';
let memory = [];
/** The historical storage key is retained; grouped values are expanded on reading. */
export function currentProfileIds(value) { return resolveFacilityKeys({ profiles: value }); }
export function readSessionProfiles(storage) { try { const raw = storage?.getItem(SESSION_PROFILES_KEY); return raw ? currentProfileIds(JSON.parse(raw)) : [...memory]; } catch { return [...memory]; } }
export function saveSessionProfiles(storage, selected) { memory = currentProfileIds(selected); try { storage.setItem(SESSION_PROFILES_KEY, JSON.stringify(memory)); return true; } catch { return false; } }
