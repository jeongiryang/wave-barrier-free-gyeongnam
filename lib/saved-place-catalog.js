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
    contentTypeId: "",
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
  const activeById = new Map((Array.isArray(activePlaces) ? activePlaces : []).map((place) => [place.id, place]));
  const catalogById = new Map(sanitizeSavedPlaceCatalog(catalog).map((place) => [place.id, place]));
  return (Array.isArray(savedIds) ? savedIds : []).map((id) => (
    activeById.get(id) || (catalogById.has(id) ? snapshotAsPlace(catalogById.get(id)) : null)
  )).filter(Boolean);
}
