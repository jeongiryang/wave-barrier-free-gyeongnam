import { sanitizeTripBreaks, sanitizeStopPurposes } from "../trip-comfort.js";
import { boundedTripEnd, validTripDate } from "../trip-dates.js";
import { selectedThemes } from "../planner-criteria.js";
import { sanitizeVisitDurations } from "../visit-durations.js";
import { sanitizeFixedVisits, sanitizeDayDeadlines } from "../trip-time-constraints.js";

export const TRAVEL_REGIONS = ["창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산", "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천"];
export class TravelError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export const travelText = (value, limit) => typeof value === "string" ? value.replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, limit) : "";
export const validTravelId = value => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);

/** Explicit allowlist: never forward a saved Place object, coordinates or API snapshot. */
export function accountTripPayload(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TravelError("저장할 여행을 확인해 주세요.");
  const region = value.region;
  if (!TRAVEL_REGIONS.includes(region)) throw new TravelError("경남 여행 지역을 선택해 주세요.");
  const travelStart = value.travelStart, travelEnd = value.travelEnd;
  if (!validTripDate(travelStart) || !validTripDate(travelEnd) || boundedTripEnd(travelStart, travelEnd) !== travelEnd) throw new TravelError("여행 날짜는 시작일부터 최대 7일로 선택해 주세요.");
  const ids = value.placeIds;
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 12 || ids.some(id => typeof id !== "string" || !/^\d{1,20}$/.test(id)) || new Set(ids).size !== ids.length) throw new TravelError("공식 여행지를 1~12곳 선택해 주세요.");
  const scheduleAssignments = Object.fromEntries(ids.map(id => {
    const day = value.scheduleAssignments?.[id] || travelStart;
    if (!validTripDate(day) || day < travelStart || day > travelEnd) throw new TravelError("여행 기간 밖 장소의 방문 날짜를 확인해 주세요.");
    return [id, day];
  }));
  const title = travelText(value.title, 80);
  return { version: 1, title: title || `${region} 여행`, region, travelStart, travelEnd,
    dayStartTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(value.dayStartTime || "") ? value.dayStartTime : "10:00",
    themes: selectedThemes(value.themes), placeIds: ids, scheduleAssignments,
    visitMinutesByPlaceId: sanitizeVisitDurations(value.visitMinutesByPlaceId, ids),
    fixedVisits: sanitizeFixedVisits(value.fixedVisits, ids),
    dayDeadlines: sanitizeDayDeadlines(value.dayDeadlines),
    breakMinutesByPlaceId: sanitizeTripBreaks(value.breakMinutesByPlaceId, ids),
    restPurposeByPlaceId: sanitizeStopPurposes(value.restPurposeByPlaceId, ids),
    status: value.status === "visited" ? "visited" : "planned", note: travelText(value.note, 1200) };
}

export function bookToAccountTrip(book) {
  return accountTripPayload({ ...book, placeIds: book.places.map(place => place.id) });
}

export async function inviteHash(token) {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) throw new TravelError("초대 링크가 올바르지 않습니다.", 404);
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
}

export function newInviteToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, "0")).join(""); }
