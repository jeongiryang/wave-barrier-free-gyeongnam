import { emptyTrip, FACILITIES_KEY, GUIDANCE_KEY, REGION_KEY, THEMES_KEY } from "../../../lib/current-trip-storage.js";
import { replaceTripWithBackup } from "../../../lib/trip-import.js";

const previewPlaces = [
  { id: "9900000101", name: "[시연] 카페산청요", address: "경남 로컬 시연 주소 1 · 실제 장소가 아닙니다", image: "https://tong.visitkorea.or.kr/cms/resource/62/2833262_image2_1.png", mapX: "127.873", mapY: "35.416" },
  { id: "9900000102", name: "[시연] 타짜오리하우스 본점", address: "경남 로컬 시연 주소 2 · 실제 장소가 아닙니다", image: "https://tong.visitkorea.or.kr/cms/resource/76/2843576_image2_1.JPG", mapX: "127.881", mapY: "35.405" },
  { id: "9900000103", name: "[시연] 산청특리지석묘군", address: "경남 로컬 시연 주소 3 · 실제 장소가 아닙니다", image: "https://tong.visitkorea.or.kr/cms/resource/47/3589147_image2_1.jpg", mapX: "127.895", mapY: "35.398" },
  { id: "9900000104", name: "[시연] 지리산바우덕이", address: "경남 로컬 시연 주소 4 · 실제 장소가 아닙니다", image: "https://tong.visitkorea.or.kr/cms/resource/17/2832617_image2_1.png", mapX: "127.906", mapY: "35.391" },
  { id: "9900000105", name: "[시연] 산청 남사리 이씨고가", address: "경남 로컬 시연 주소 5 · 실제 장소가 아닙니다", image: "https://tong.visitkorea.or.kr/cms/resource/93/3537993_image2_1.jpg", mapX: "127.917", mapY: "35.384" },
].map((place) => ({ ...place, city: "산청", contentTypeId: "12", score: null, source: "로컬 화면 시연 데이터 · 실제 관광정보 아님" }));

export function installLocalItineraryPreview() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;
  const query = new URLSearchParams(window.location.search);
  if (query.get("reference") !== "1" || window.sessionStorage.getItem("wave-reference-itinerary-preview") === "ready") return;
  const ids = previewPlaces.map((place) => place.id);
  const date = "2026-10-05";
  replaceTripWithBackup(window.localStorage, {
    ...emptyTrip("경남 전체", date, date), [REGION_KEY]: "경남 전체",
    [THEMES_KEY]: JSON.stringify(["nature", "history"]), [FACILITIES_KEY]: "[]", [GUIDANCE_KEY]: "{}",
    "wave-saved-places": JSON.stringify(ids), "wave-saved-place-catalog-v1": JSON.stringify(previewPlaces),
    "wave-trip-order-v1": JSON.stringify({ mode: "manual", ids }),
    "wave-trip-schedule-v1": JSON.stringify({
      travelStart: date, travelEnd: date, dayStartTime: "12:30", travelMode: "transit",
      scheduleAssignments: Object.fromEntries(ids.map((id) => [id, date])),
      visitMinutesByPlaceId: Object.fromEntries(ids.map((id, index) => [id, [75, 75, 90, 75, 90][index]])),
      fixedVisits: {}, dayDeadlines: {}, comfort: { maxWalkMinutes: null, breakEveryMinutes: null, breakMinutes: 15 },
      breakMinutesByPlaceId: {}, restPurposeByPlaceId: {},
    }),
  });
  window.sessionStorage.setItem("wave-reference-itinerary-preview", "ready");
}
