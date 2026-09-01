export const TRAVEL_BOOK_STORAGE_KEY = "wave-travel-book-v1";
export const TRAVEL_BOOK_MAX_ITEMS = 20;
export const TRAVEL_BOOK_MAX_PLACES = 12;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function text(value, max) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function date(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return "";
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value ? value : "";
}

function time(value) {
  return typeof value === "string" && TIME_PATTERN.test(value) ? value : "10:00";
}

function iso(value, fallback = "") {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return fallback;
  return new Date(value).toISOString();
}

function imageUrl(value) {
  try {
    const url = new URL(typeof value === "string" ? value : "");
    return url.protocol === "https:" ? url.toString().slice(0, 500) : "";
  } catch {
    return "";
  }
}

function hash(value) {
  let result = 5381;
  for (let index = 0; index < value.length; index += 1) result = ((result << 5) + result) ^ value.charCodeAt(index);
  return (result >>> 0).toString(36);
}

function sanitizePlace(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = text(value.id, 120);
  const name = text(value.name, 120);
  if (!id || !name) return null;
  const score = typeof value.score === "number" && Number.isFinite(value.score)
    ? Math.max(0, Math.min(100, Math.round(value.score)))
    : null;
  return {
    id,
    name,
    city: text(value.city, 30),
    address: text(value.address, 180),
    image: imageUrl(value.image),
    score,
    knownFields: typeof value.knownFields === "number" && Number.isFinite(value.knownFields)
      ? Math.max(0, Math.min(100, Math.round(value.knownFields)))
      : 0,
    source: text(value.source, 160),
  };
}

function sanitizeAssignments(value, places, fallbackDate, lastDate) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return Object.fromEntries(places.map((place) => [place.id, fallbackDate]));
  const knownIds = new Set(places.map((place) => place.id));
  return Object.fromEntries(places.map((place) => {
    const assigned = knownIds.has(place.id) ? date(value[place.id]) : "";
    return [place.id, assigned && assigned >= fallbackDate && assigned <= lastDate ? assigned : fallbackDate];
  }));
}

export function sanitizeTravelBook(value, fallbackNow = new Date().toISOString()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const places = Array.isArray(value.places)
    ? value.places.map(sanitizePlace).filter(Boolean).slice(0, TRAVEL_BOOK_MAX_PLACES)
    : [];
  if (!places.length) return null;
  const travelStart = date(value.travelStart);
  const requestedEnd = date(value.travelEnd);
  if (!travelStart) return null;
  const travelEnd = requestedEnd && requestedEnd >= travelStart ? requestedEnd : travelStart;
  const region = text(value.region, 30) || places[0].city || "경남";
  const fingerprint = text(value.fingerprint, 80) || hash(`${travelStart}|${travelEnd}|${places.map((place) => place.id).sort().join("|")}`);
  const createdAt = iso(value.createdAt, iso(fallbackNow, new Date(0).toISOString()));
  const updatedAt = iso(value.updatedAt, createdAt);
  return {
    id: text(value.id, 100) || `book-${fingerprint}`,
    fingerprint,
    title: text(value.title, 80) || `${region} ${places.length}곳 여행`,
    region,
    theme: text(value.theme, 40),
    profiles: Array.isArray(value.profiles) ? [...new Set(value.profiles.map((item) => text(item, 40)).filter(Boolean))].slice(0, 8) : [],
    travelStart,
    travelEnd,
    dayStartTime: time(value.dayStartTime),
    createdAt,
    updatedAt,
    status: value.status === "visited" ? "visited" : "planned",
    note: text(value.note, 1200),
    places,
    scheduleAssignments: sanitizeAssignments(value.scheduleAssignments, places, travelStart, travelEnd),
  };
}

export function sanitizeTravelBooks(value) {
  if (!Array.isArray(value)) return [];
  const fingerprints = new Set();
  return value.map((item) => sanitizeTravelBook(item)).filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).filter((item) => {
    if (!item || fingerprints.has(item.fingerprint)) return false;
    fingerprints.add(item.fingerprint);
    return true;
  }).slice(0, TRAVEL_BOOK_MAX_ITEMS);
}

export function createTravelBookSnapshot(input, now = new Date().toISOString()) {
  const places = Array.isArray(input?.places) ? input.places.map(sanitizePlace).filter(Boolean).slice(0, TRAVEL_BOOK_MAX_PLACES) : [];
  return sanitizeTravelBook({ ...input, createdAt: now, updatedAt: now, places }, now);
}

export function upsertTravelBook(current, input, now = new Date().toISOString()) {
  const books = sanitizeTravelBooks(current);
  const incoming = sanitizeTravelBook(input, now);
  if (!incoming) return books;
  const previous = books.find((book) => book.fingerprint === incoming.fingerprint);
  const next = previous
    ? { ...incoming, id: previous.id, createdAt: previous.createdAt, status: previous.status, note: previous.note, updatedAt: iso(now, incoming.updatedAt) }
    : { ...incoming, updatedAt: iso(now, incoming.updatedAt) };
  return sanitizeTravelBooks([next, ...books.filter((book) => book.fingerprint !== incoming.fingerprint)]);
}

export function patchTravelBook(current, id, patch, now = new Date().toISOString()) {
  return sanitizeTravelBooks(sanitizeTravelBooks(current).map((book) => {
    if (book.id !== id) return book;
    return {
      ...book,
      status: patch?.status === "visited" ? "visited" : patch?.status === "planned" ? "planned" : book.status,
      note: Object.hasOwn(patch || {}, "note") ? patch.note : book.note,
      title: Object.hasOwn(patch || {}, "title") ? patch.title : book.title,
      updatedAt: now,
    };
  }));
}

export function removeTravelBook(current, id) {
  return sanitizeTravelBooks(current).filter((book) => book.id !== id);
}

export function buildTravelBookPlannerHref(book) {
  const safe = sanitizeTravelBook(book);
  if (!safe) return "/planner";
  const query = new URLSearchParams({ region: safe.region, travelStart: safe.travelStart, travelEnd: safe.travelEnd, from: "travel-book" });
  return `/planner?${query.toString()}`;
}

export function travelBookRestorePayload(book) {
  const safe = sanitizeTravelBook(book);
  if (!safe) return null;
  return {
    savedPlaceIds: safe.places.map((place) => place.id),
    schedule: {
      travelStart: safe.travelStart,
      travelEnd: safe.travelEnd,
      dayStartTime: safe.dayStartTime,
      scheduleAssignments: safe.scheduleAssignments,
    },
    href: buildTravelBookPlannerHref(safe),
  };
}
