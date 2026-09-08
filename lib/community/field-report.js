export const ACCESSIBILITY_REPORT_FIELDS = [
  { id: "entrance", label: "출입 경로" },
  { id: "elevator", label: "엘리베이터" },
  { id: "toilet", label: "장애인 화장실" },
  { id: "parking", label: "장애인 주차" },
  { id: "seating", label: "휴식 좌석" },
  { id: "visual", label: "시각 안내" },
  { id: "hearing", label: "청각 안내" },
];

export const ACCESSIBILITY_REPORT_STATUSES = [
  { id: "confirmed", label: "확인됨" },
  { id: "changed", label: "공식 정보와 달라짐" },
  { id: "not_checked", label: "확인하지 못함" },
];

const fieldIds = new Set(ACCESSIBILITY_REPORT_FIELDS.map((item) => item.id));
const statusIds = new Set(ACCESSIBILITY_REPORT_STATUSES.map((item) => item.id));
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function clean(value, max) {
  return String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

export function validCommunityDate(value) {
  const date = clean(value, 10);
  if (!DATE_PATTERN.test(date)) return "";
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date ? "" : date;
}

/** Korea-based service date; independent of the server's UTC timezone. */
export function communityToday(now = Date.now()) {
  return new Date(Number(now) + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function normalizeAccessibilityReports(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const field = clean(item.field, 24);
    const status = clean(item.status, 24);
    if (!fieldIds.has(field) || !statusIds.has(status) || seen.has(field)) return [];
    seen.add(field);
    return [{ field, status, note: clean(item.note, 160) }];
  }).slice(0, ACCESSIBILITY_REPORT_FIELDS.length);
}

export function normalizeJournalPlaces(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const id = clean(item.id, 100);
    const name = clean(item.name, 120);
    if (!id || !name || seen.has(id)) return [];
    seen.add(id);
    return [{ id, name, day: validCommunityDate(item.day) }];
  }).slice(0, 6);
}

export function buildTravelJournalHref({ places, region, visitDate }) {
  const journalPlaces = normalizeJournalPlaces(places);
  if (!journalPlaces.length) return "/community/new";
  const params = new URLSearchParams({
    draft: "journal",
    category: "review",
    region: clean(region, 20),
    visitDate: validCommunityDate(visitDate),
    placeId: journalPlaces[0].id,
    placeName: journalPlaces[0].name,
    journal: JSON.stringify(journalPlaces),
  });
  return `/community/new?${params}`;
}

export function parseTravelJournalDraft(params) {
  if (!(params instanceof URLSearchParams) || params.get("draft") !== "journal") return null;
  const raw = params.get("journal") || "";
  if (!raw || raw.length > 4000) return null;
  try {
    const journalPlaces = normalizeJournalPlaces(JSON.parse(raw));
    if (!journalPlaces.length) return null;
    return {
      journalPlaces,
      placeId: journalPlaces[0].id,
      placeName: journalPlaces[0].name,
      visitDate: validCommunityDate(params.get("visitDate")),
    };
  } catch {
    return null;
  }
}
