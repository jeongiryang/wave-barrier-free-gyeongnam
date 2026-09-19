import { parkingDistanceMeters } from './parking-alternatives.js';

export const RESTROOM_EVIDENCE_STATES = ['confirmed', 'partially_confirmed', 'user_reported', 'needs_confirmation', 'unavailable', 'unknown'];
const text = (value, max = 200) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const safePhone = value => /^[0-9+()\-\s]{7,30}$/.test(text(value, 30)) ? text(value, 30) : '';
const point = value => value && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude)) && Number(value.latitude) >= 33 && Number(value.latitude) <= 39 && Number(value.longitude) >= 124 && Number(value.longitude) <= 132 ? { latitude: Number(value.latitude), longitude: Number(value.longitude) } : null;
const state = value => RESTROOM_EVIDENCE_STATES.includes(value) ? value : 'unknown';
const addressKey = value => text(value).toLowerCase().replace(/[\s(),.-]/g, '');

export function normalizeRestroomAlternative(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = text(value.id, 80), name = text(value.name, 120), address = text(value.address), destination = point(value.destination);
  const sources = Array.isArray(value.sources) ? value.sources.flatMap(source => {
    if (!source || typeof source !== 'object' || !['official', 'community'].includes(source.type)) return [];
    const provider = text(source.provider, 120), referenceDate = text(source.referenceDate, 10), reportedAt = text(source.reportedAt, 30);
    return provider ? [{ type: source.type, provider, ...(referenceDate ? { referenceDate } : {}), ...(reportedAt ? { reportedAt } : {}) }] : [];
  }).slice(0, 4) : [];
  const official = sources.find(source => source.type === 'official' && /^\d{4}-\d{2}-\d{2}$/.test(source.referenceDate || ''));
  const evidence = Object.fromEntries(['accessibleToilet', 'entranceStep', 'entranceDoor', 'grabBars', 'turningSpace', 'sinkAccess', 'elevatorRequired', 'emergencyBell'].map(key => [key, state(value.evidence?.[key])]));
  if (!id || !name || !address || !/^(경상남도|경남)\s/.test(address) || !destination || !official || evidence.accessibleToilet !== 'confirmed' || (!text(value.openingHours, 120) && !safePhone(value.phoneNumber))) return null;
  return { id, name, ...(text(value.floor, 30) ? { floor: text(value.floor, 30) } : {}), address, ...(text(value.openingHours, 120) ? { openingHours: text(value.openingHours, 120) } : {}), ...(safePhone(value.phoneNumber) ? { phoneNumber: safePhone(value.phoneNumber) } : {}), evidence, sources, destination };
}

export function rankRestroomAlternatives(values, origin, limit = 3) {
  const start = point(origin); if (!start || !Array.isArray(values)) return [];
  const seenIds = new Set(), seenAddresses = new Set();
  return values.flatMap(value => {
    const item = normalizeRestroomAlternative(value); if (!item) return [];
    const address = addressKey(item.address); if (seenIds.has(item.id) || seenAddresses.has(address)) return [];
    seenIds.add(item.id); seenAddresses.add(address);
    return [{ ...item, distanceFromPlaceMeters: parkingDistanceMeters(start, item.destination) }];
  }).sort((a, b) => a.distanceFromPlaceMeters - b.distanceFromPlaceMeters || Date.parse(b.sources.find(source => source.type === 'official')?.referenceDate || '') - Date.parse(a.sources.find(source => source.type === 'official')?.referenceDate || '') || a.name.localeCompare(b.name, 'ko')).slice(0, Math.max(0, Math.min(3, limit)));
}
