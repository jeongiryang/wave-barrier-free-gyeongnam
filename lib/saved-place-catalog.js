import { supportedPlacePoint } from "./map-coordinates.js";

export const SAVED_PLACE_CATALOG_KEY = "wave-saved-place-catalog-v1";
export const SAVED_PLACE_CATALOG_MAX_ITEMS = 24;

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function imageUrl(value) {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    return url.protocol === "https:" ? url.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
}

function boundedNumber(value, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback;
}

export function sanitizeSavedPlaceSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = text(value.id, 120);
  const name = text(value.name, 120);
  if (!id || !name) return null;
  return {
    id,
    name,
    contentTypeId: ["12", "14", "15", "25", "28", "32", "38", "39"].includes(value.contentTypeId) ? value.contentTypeId : "",
    city: text(value.city, 30),
    address: text(value.address, 180),
    image: imageUrl(value.image),
    score: typeof value.score === "number" && Number.isFinite(value.score)
      ? boundedNumber(value.score)
      : null,
    knownFields: boundedNumber(value.knownFields),
    // Only public destination coordinates, never the user's current location.
    mapX: Number.isFinite(Number(value.mapX)) && Number(value.mapX) >= 124 && Number(value.mapX) <= 132 ? String(value.mapX) : "",
    mapY: Number.isFinite(Number(value.mapY)) && Number(value.mapY) >= 33 && Number(value.mapY) <= 39 ? String(value.mapY) : "",
    source: text(value.source, 160),
  };
}

export function sanitizeSavedPlaceCatalog(value) {
  if (!Array.isArray(value)) return [];
  const ids = new Set();
  return value.map(sanitizeSavedPlaceSnapshot).filter((place) => {
    if (!place || ids.has(place.id)) return false;
    ids.add(place.id);
    return true;
  }).slice(0, SAVED_PLACE_CATALOG_MAX_ITEMS);
}

export function mergeSavedPlaceCatalog(current, places) {
  return sanitizeSavedPlaceCatalog([
    ...(Array.isArray(places) ? places : []),
    ...sanitizeSavedPlaceCatalog(current),
  ]);
}

export function removeSavedPlaceSnapshot(current, id) {
  return sanitizeSavedPlaceCatalog(current).filter((place) => place.id !== id);
}

function snapshotAsPlace(place) {
  return {
    ...place,
    summary: "",
    mapX: place.mapX || "",
    mapY: place.mapY || "",
    confidence: 0,
    unknownFields: 0,
    negativeFields: 0,
    features: [],
    details: [],
  };
}

export function resolveSavedPlaces(savedIds, activePlaces, catalog) {
  const activeById = new Map();
  const locationsById = new Map();
  for (const place of Array.isArray(activePlaces) ? activePlaces : []) {
    const previous = activeById.get(place.id);
    const previousTime = Date.parse(previous?.checkedAt), nextTime = Date.parse(place.checkedAt);
    // A delayed saved-ID refresh must not overwrite a newer search record.
    // Keep a newer failure/negative record too; confirmed facilities do not
    // outrank more recent evidence just because they look more reassuring.
    if (!previous || !Number.isFinite(previousTime) || (Number.isFinite(nextTime) && nextTime >= previousTime)) activeById.set(place.id, place);
    if (supportedPlacePoint(place.mapX, place.mapY)) {
      const located = locationsById.get(place.id), locatedTime = Date.parse(located?.checkedAt);
      if (!located || !Number.isFinite(locatedTime) || (Number.isFinite(nextTime) && nextTime >= locatedTime)) locationsById.set(place.id, place);
    }
  }
  const catalogById = new Map(sanitizeSavedPlaceCatalog(catalog).map((place) => [place.id, place]));
  return (Array.isArray(savedIds) ? savedIds : []).map((id) => {
    const active = activeById.get(id), stored = catalogById.get(id);
    if (!active) return stored ? snapshotAsPlace(stored) : null;
    // An explicit ID-bound location recheck can repair an incomplete active
    // recommendation without replacing its facility evidence or visit order.
    const location = stored && supportedPlacePoint(stored.mapX, stored.mapY) ? stored : locationsById.get(id);
    return !supportedPlacePoint(active.mapX, active.mapY) && location
      ? { ...active, mapX: location.mapX, mapY: location.mapY } : active;
  }).filter(Boolean);
}
