import type { Page } from "@playwright/test";

const places = [
  {
    id: "1001", contentTypeId: "14", city: "창원", name: "경남도립미술관", address: "경상남도 창원시 의창구",
    summary: "실내 전시를 둘러볼 수 있는 문화 공간입니다.", image: "https://wave.test/museum.svg",
    mapX: "128.691", mapY: "35.238", score: 100, confidence: 88, knownFields: 4, unknownFields: 1, negativeFields: 0,
    checkedAt: "2026-08-26T02:00:00.000Z", features: ["휠체어 출입", "장애인 화장실", "주차"],
    details: ["접근로: 주출입구까지 평탄한 접근로가 있습니다."], source: "무장애 여행정보 · 국문 관광정보",
  },
  {
    id: "1002", contentTypeId: "12", city: "창원", name: "용지호수공원", address: "경상남도 창원시 성산구",
    summary: "호수 주변을 따라 산책할 수 있는 도심 공원입니다.", image: "",
    mapX: "128.683", mapY: "35.229", score: 75, confidence: 65, knownFields: 3, unknownFields: 2, negativeFields: 0,
    checkedAt: "2026-08-26T02:00:00.000Z", features: ["접근로", "주차"],
    details: ["화장실 위치는 방문 전 확인이 필요합니다."], source: "무장애 여행정보 · 국문 관광정보",
  },
];

const statuses = [
  { id: "barrierfree", name: "무장애 여행정보", role: "접근로·화장실·주차", state: "live", count: 2, note: "공식 정보 확인" },
  { id: "tour", name: "국문 관광정보", role: "관광지 위치·주소", state: "live", count: 2, note: "공식 정보 확인" },
];

const plan = {
  mode: "live", generatedAt: "2026-08-26T02:00:00.000Z", baseYm: "202608", places,
  course: null, audio: null, photo: null, crowd: { rate: 24, baseYmd: "20260826", place: "경남도립미술관" },
  stops: places.map((place) => ({
    id: place.id, contentTypeId: place.contentTypeId, mapX: place.mapX, mapY: place.mapY,
    title: place.name, note: place.summary, source: place.source, evidenceState: "verified",
  })),
  statuses,
};

const route = {
  configured: true,
  alternatives: [{
    id: "car-fast", label: "추천 자동차 경로", provider: "Kakao Mobility", mode: "car",
    totalTime: 25, payment: 0, paymentType: "toll", totalWalk: 0, transfers: 0, totalDistance: 8800, configured: true,
    segments: [{ type: "car", name: "추천 자동차 경로", minutes: 25 }],
    geometry: [{ lat: 35.227, lng: 128.681 }, { lat: 35.238, lng: 128.691 }],
  }, {
    id: "car-calm", label: "여유 자동차 경로", provider: "Kakao Mobility", mode: "car",
    totalTime: 40, payment: 0, paymentType: "toll", totalWalk: 0, transfers: 0, totalDistance: 10100, configured: true,
    segments: [{ type: "car", name: "여유 자동차 경로", minutes: 40 }],
    geometry: [{ lat: 35.227, lng: 128.681 }, { lat: 35.232, lng: 128.686 }, { lat: 35.238, lng: 128.691 }],
  }],
  providers: [{ id: "kakao", name: "자동차 길찾기", role: "실제 도로 경로", configured: true, state: "connected" }],
  context: { nearbyStops: [], arrivals: [], korail: [], catalog: { trainCities: 0, expressTerminals: 0, intercityTerminals: 0 }, datasets: [] },
};

const weather = {
  region: "창원", updatedAt: "2026-08-26T02:00:00.000Z", source: "기상 정보",
  current: { temperature: 27, apparent: 29, code: 1, label: "대체로 맑음", wind: 2, precipitation: 0, isDay: true },
  days: [{ date: "2026-08-26", code: 1, label: "대체로 맑음", max: 30, min: 23, rainProbability: 10, rain: 0, snow: 0, uv: 6, advice: [] }],
  advice: [],
};

const transparentSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="800" height="520" fill="#d6edf5"/><path d="M0 350 Q200 250 400 350 T800 350 V520 H0Z" fill="#087aa5"/></svg>';

export async function mockPublicShellApi(page: Page) {
  await page.route("**/api/auth/get-session", (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "application/json",
    body: "null",
  }));
  await page.route("**/api/community/posts?limit=2", (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ posts: [], page: 1, hasMore: false }),
  }));
  await page.route("https://upload.wikimedia.org/**", (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: transparentSvg,
  }));
}

export async function mockPlannerApi(page: Page, options: { failPlan?: boolean; slowPlan?: boolean; explorationOnly?: boolean; plannerView?: "guided" | "overview" } = {}) {
  let enrichmentRequestCount = 0;
  await page.addInitScript((plannerView) => {
    window.localStorage.setItem("wave-planner-stage-view-v1", plannerView);
  }, options.plannerView || "overview");
  await page.route(/https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/, (requestRoute) => requestRoute.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: transparentSvg,
  }));
  await page.route("**/api/**", async (requestRoute) => {
    const request = requestRoute.request();
    const url = new URL(request.url());
    const action = url.searchParams.get("action");
    if (url.pathname === "/api/wave" && action === "plan") {
      if (options.slowPlan) await new Promise((resolve) => setTimeout(resolve, 650));
      if (options.failPlan) return requestRoute.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "여행 정보를 잠시 확인할 수 없습니다." }) });
      const responsePlan = options.explorationOnly ? {
        ...plan,
        places: [],
        stops: [],
        explorationPlaces: places.map((place, index) => ({
          ...place,
          score: index === 0 ? 0 : null,
          knownFields: index === 0 ? 3 : 0,
          features: ["상세 편의정보 확인 필요"],
          details: ["제공된 편의정보가 제한적이므로 방문 전 시설 운영기관에 확인해 주세요."],
        })),
      } : plan;
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(responsePlan) });
    }
    if (url.pathname === "/api/wave" && action === "spot-photo") {
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ image: "", status: "empty" }) });
    }
    if (url.pathname === "/api/wave" && action === "crowd") {
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ crowd: plan.crowd }) });
    }
    if (url.pathname === "/api/wave" && action === "enrich") {
      enrichmentRequestCount += 1;
      return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ generatedAt: plan.generatedAt, visitor: { total: 0, byType: {}, startYmd: "", endYmd: "" }, demand: [], camping: [], pet: [], wellness: [], medical: [], language: [], awards: [], water: [], rests: [], events: [], lodging: [], statuses: [] }) });
    }
    if (url.pathname === "/api/route") return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(route) });
    if (url.pathname === "/api/weather") return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(weather) });
    if (url.pathname === "/api/health") return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ checkedAt: plan.generatedAt, keys: [] }) });
    if (url.pathname === "/api/map-config") return requestRoute.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ kakaoMapKey: "" }) });
    if (url.pathname === "/api/auth/get-session") return requestRoute.fulfill({ status: 200, contentType: "application/json", body: "null" });
    return requestRoute.fallback();
  });
  await page.route("https://wave.test/museum.svg", (requestRoute) => requestRoute.fulfill({ status: 200, contentType: "image/svg+xml", body: transparentSvg }));
  return { enrichmentRequestCount: () => enrichmentRequestCount };
}
