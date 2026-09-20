export const nearbyCategories = [
  { id: "food", label: "음식점", icon: "🍴", code: "FD6" },
  { id: "stay", label: "숙박", icon: "🛏", code: "AD5" },
  { id: "attraction", label: "관광명소", icon: "✦", code: "AT4" },
  { id: "bus", label: "버스", icon: "▣", keyword: "버스정류장" },
  { id: "subway", label: "지하철", icon: "▤", code: "SW8" },
  { id: "parking", label: "주차장", icon: "P", code: "PK6" },
  { id: "pharmacy", label: "약국", icon: "✚", code: "PM9" },
  { id: "hospital", label: "병원", icon: "H", code: "HP8" },
  { id: "bank", label: "은행·ATM", icon: "₩", code: "BK9" },
  { id: "cafe", label: "카페", icon: "☕", code: "CE7" },
  { id: "store", label: "편의점", icon: "24", code: "CS2" },
  { id: "mart", label: "대형마트", icon: "▦", code: "MT1" },
  { id: "fuel", label: "주유·충전", icon: "⛽", code: "OL7" },
  { id: "culture", label: "문화시설", icon: "▥", code: "CT1" },
] as const;

/**
 * 편의시설 레이어의 근거 구분.
 *
 * - `place-search`: 카카오 장소 검색(브라우저 SDK). 지도 중심 기준으로 찾는다.
 * - `official`: 공공데이터 제공처를 서버 경유로 조회한 결과.
 *
 * 두 갈래는 화면에서 섞지 않는다. 근거의 성격이 다르기 때문이다.
 *
 * - `derived`: 새 조회를 하지 않고 **이미 받아온 장소 목록**(`MapPlace.accessibility`)에서
 *   조건에 맞는 곳만 걸러 마커로 그린다. 스펙 20(안내견 동반)이 이 갈래를 쓴다.
 */
export type FacilityLayerSource = "official" | "place-search" | "derived";

export type FacilityLayer = {
  id: string;
  /** 화면 문구. 시설 이름으로만 쓴다. */
  label: string;
  source: FacilityLayerSource;
  /** place-search 전용. nearbyCategories 의 코드를 그대로 쓴다. */
  code?: string;
  /** official 전용. /api/wave 의 action 값. */
  action?: string;
  /** 조회는 성공했지만 현재 표시할 확인 결과가 없을 때 쓰는 정직한 문구. */
  emptyLabel?: string;
  /** derived 전용. 장소의 `accessibility` 배열에서 `state === "confirmed"`인 항목을 찾을 key. */
  derivedKey?: string;
  /** 마커·범례에서 색이 아닌 글자로 종류를 알리는 짧은 기호. */
  glyph: string;
};

/**
 * 카카오 장소 검색 레이어. 코드는 `nearbyCategories`의 것을 그대로 쓴다.
 * 이 작업에서 새 카테고리 코드를 만들지 않는다.
 */
export const placeSearchFacilityLayers: readonly FacilityLayer[] = [
  { id: "food", label: "음식점", source: "place-search", code: "FD6", glyph: "식" },
  { id: "cafe", label: "카페", source: "place-search", code: "CE7", glyph: "카" },
  { id: "store", label: "편의점", source: "place-search", code: "CS2", glyph: "편" },
  { id: "pharmacy", label: "약국", source: "place-search", code: "PM9", glyph: "약" },
  { id: "hospital", label: "병원", source: "place-search", code: "HP8", glyph: "병" },
  { id: "subway", label: "지하철역", source: "place-search", code: "SW8", glyph: "역" },
];

/**
 * 공식 데이터 레이어 등록 지점.
 *
 * 저상버스는 새 제공처를 만들지 않고 기존 TAGO 도착정보 action을 재사용한다.
 * 차량유형이 현재 도착 응답에서 명시된 경우만 표시하므로 노선 전체의 상시 운행을
 * 주장하지 않는다. 주차장·화장실 등 다른 제공처는 별도 검증 전까지 등록하지 않는다.
 *
 * 후속 명세(21·33·45)가 레이어를 붙이는 방법은 두 줄이다.
 *
 * 1. 각 명세가 `server/tourism/`에 제공처 모듈을 더하고
 *    `server/tourism/handler.ts`에 자기 action 분기를 추가한다.
 * 2. 아래 배열에 `{ id, label, source: "official", action: "<그 action>", glyph }`
 *    한 줄을 더한다. 그러면 패널 버튼, 4개 상한, 칩, 실패·재시도, 마커 60개
 *    상한, 지도 렌더링이 그대로 따라온다. 화면 코드를 고칠 필요가 없다.
 *
 * 공식 레이어를 부르는 클라이언트 경로는 `features/routing/useFacilityLayers.ts`의
 * `source === "official"` 갈래에 있다. 거기에 `optionalPlannerJson` 호출과
 * `SERVER_BUDGET_MS`/`CLIENT_BUDGET_MS` 항목을 함께 채우면 된다.
 */
export const officialFacilityLayers: readonly FacilityLayer[] = [
  {
    id: "low-floor-bus-arrival",
    label: "현재 확인된 저상버스",
    source: "official",
    action: "return-transport",
    glyph: "저",
    emptyLabel: "가까운 정류장에서 현재 확인된 저상버스 도착정보가 없어요.",
  },
];

/**
 * 이미 조회한 장소 목록에서 파생하는 레이어(스펙 20). 새 서버 호출이나 새
 * 제공처를 더하지 않는다. `helpdog`는 `KorWithService2/detailWithTour2`가
 * 이미 주는 필드이고 `FACILITIES`·`profileFields`에 이미 연동돼 있다.
 */
export const derivedFacilityLayers: readonly FacilityLayer[] = [
  { id: "helpdog-confirmed", label: "안내견 동반이 확인된 곳", source: "derived", derivedKey: "helpdog", glyph: "견" },
  // 스펙 14: `braileblock`도 `KorWithService2/detailWithTour2`가 이미 주는
  // 필드이고 `FACILITIES`·`profileFields`에 이미 연동돼 있다. 새 서버 호출을
  // 만들지 않고 이미 받아온 장소 목록에서만 파생한다.
  { id: "braileblock-confirmed", label: "점자블록이 확인된 곳", source: "derived", derivedKey: "braileblock", glyph: "점" },
];

export const facilityLayers: readonly FacilityLayer[] = [
  ...placeSearchFacilityLayers,
  ...officialFacilityLayers,
  ...derivedFacilityLayers,
];

/** 한 번에 켤 수 있는 레이어 수. 5번째는 켜진 것을 끄지 않고 안내만 한다. */
export const FACILITY_LAYER_LIMIT = 4;

/** 지도에 한 번에 그리는 마커 총량. 초과분은 그리지 않고 알린다. */
export const FACILITY_MARKER_CAP = 60;

export const overlayLayers = [
  { id: "TRAFFIC", label: "교통정보", icon: "🚦" },
  { id: "BICYCLE", label: "자전거", icon: "🚲" },
  { id: "TERRAIN", label: "지형도", icon: "⛰" },
  { id: "USE_DISTRICT", label: "지적편집도", icon: "◇" },
] as const;
