import { readTripValue, TRIP_IDENTITY_KEY, assertTripStorageOwner, tripStorageFailed } from './current-trip-storage.js';
import { cleanIdentity } from './trip-identity.js';

export const NARU_WORKSPACES_KEY = 'wave-naru-workspaces-v1';
export const NARU_MAX_WORKSPACES = 10;
export const NARU_MAX_MESSAGES = 30;
const empty = Object.freeze([]);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const tripId = value => cleanIdentity({ version: 1, id: value })?.id || '';
const workspaceId = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value) ? value : '';

function text(value, max) {
  if (typeof value !== 'string') return '';
  // Only human-readable text is archived. Attachment payloads and serialized
  // coordinates do not become durable merely because they arrived in a string.
  return value.replace(/data:[^\s)\]]+/gi, '[첨부 제외]')
    .replace(/[A-Za-z0-9+/=_-]{160,}/g, '[첨부 제외]')
    .replace(/(?:["']?(?:latitude|longitude|lat|lng|mapX|mapY)["']?\s*[:=]\s*)-?\d+(?:\.\d+)?/gi, '[위치 제외]')
    .replace(/\b-?\d{1,3}\.\d{3,}\s*[,/]\s*-?\d{1,3}\.\d{3,}\b/g, '[위치 제외]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max).trim();
}

export function sanitizeNaruWorkspace(value) {
  if (!record(value) || !workspaceId(value.id) || !tripId(value.tripId)
    || typeof value.updatedAt !== 'string' || !Number.isFinite(Date.parse(value.updatedAt)) || !Array.isArray(value.messages)) return null;
  const messages = value.messages.flatMap(message => {
    if (!record(message) || !['user', 'assistant'].includes(message.role)) return [];
    const content = text(message.text, 4000);
    return content ? [Object.freeze({ role: message.role, text: content, ...(['local-vision', 'photo-input'].includes(message.source) ? { source: message.source } : {}) })] : [];
  }).slice(-NARU_MAX_MESSAGES);
  return Object.freeze({ id: value.id, tripId: value.tripId, ...(workspaceId(value.bookId) ? { bookId: value.bookId } : {}), title: text(value.title, 100) || '나루와 여행 준비',
    updatedAt: new Date(value.updatedAt).toISOString(), messages: Object.freeze(messages), input: text(value.input, 2000) });
}

function load(storage) {
  let raw;
  try { raw = storage.getItem(NARU_WORKSPACES_KEY); } catch { return { ok: false, error: 'unavailable', workspaces: empty }; }
  if (raw === null) return { ok: true, raw, workspaces: empty };
  if (typeof raw !== 'string' || raw.length > 1_500_000) return { ok: false, error: 'corrupt', workspaces: empty };
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { ok: false, error: 'corrupt', workspaces: empty }; }
  if (!record(parsed) || !Number.isInteger(parsed.version)) return { ok: false, error: 'corrupt', workspaces: empty };
  if (parsed.version !== 1) return { ok: false, error: 'version', workspaces: empty };
  if (!Array.isArray(parsed.workspaces) || parsed.workspaces.length > NARU_MAX_WORKSPACES) return { ok: false, error: 'corrupt', workspaces: empty };
  const workspaces = parsed.workspaces.map(sanitizeNaruWorkspace);
  if (workspaces.some(item => !item) || new Set(workspaces.map(item => item.id)).size !== workspaces.length) return { ok: false, error: 'corrupt', workspaces: empty };
  return { ok: true, raw, workspaces: Object.freeze(workspaces.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))) };
}

export function readNaruWorkspaces(storage) {
  const result = load(storage);
  return result.ok ? { ok: true, workspaces: result.workspaces } : result;
}

function currentTrip(storage) {
  return cleanIdentity(JSON.parse(readTripValue(storage, TRIP_IDENTITY_KEY) || 'null'))?.id || '';
}

function write(storage, loaded, workspaces) {
  try {
    // A failed read is never interpreted as an empty archive. Compare again so
    // a newer archive cannot be overwritten by a stale mutation.
    if (storage.getItem(NARU_WORKSPACES_KEY) !== loaded.raw) return { ok: false, error: 'conflict' };
    storage.setItem(NARU_WORKSPACES_KEY, JSON.stringify({ version: 1, workspaces }));
    return { ok: true, workspaces: Object.freeze(workspaces) };
  } catch { return { ok: false, error: 'write-failed' }; }
}

// Call only for the user's explicit save action; no autosave or network work.
export function saveNaruWorkspace(storage, input, now = new Date().toISOString()) {
  if (!record(input) || !tripId(input.tripId)) return { ok: false, error: 'invalid' };
  const workspace = sanitizeNaruWorkspace({ ...input, id: input.id ?? `naru-${input.tripId}`, updatedAt: now });
  if (!workspace) return { ok: false, error: 'invalid' };
  const loaded = load(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  const existing = loaded.workspaces.find(item => item.id === workspace.id);
  if (existing && existing.tripId !== workspace.tripId) return { ok: false, error: 'trip-changed' };
  try { assertTripStorageOwner(storage); if (tripStorageFailed(storage)) return { ok: false, error: 'trip-changed' }; }
  catch { return { ok: false, error: 'trip-changed' }; }
  try { if (currentTrip(storage) !== workspace.tripId) return { ok: false, error: 'trip-changed' }; }
  catch { return { ok: false, error: 'unavailable' }; }
  if (!existing && loaded.workspaces.length >= NARU_MAX_WORKSPACES) return { ok: false, error: 'limit' };
  const workspaces = [workspace, ...loaded.workspaces.filter(item => item.id !== workspace.id)];
  const result = write(storage, loaded, workspaces);
  return result.ok ? { ...result, workspace } : result;
}

export function removeNaruWorkspace(storage, id) {
  if (!workspaceId(id)) return { ok: false, error: 'invalid' };
  const loaded = load(storage);
  if (!loaded.ok) return { ok: false, error: loaded.error };
  if (!loaded.workspaces.some(item => item.id === id)) return { ok: true, workspaces: loaded.workspaces };
  return write(storage, loaded, loaded.workspaces.filter(item => item.id !== id));
}
