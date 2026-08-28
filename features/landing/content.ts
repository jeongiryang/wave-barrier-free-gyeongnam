export type LandingRegion = { name: string; story: string; x: number; y: number };
export type RegionPhoto = { id: string; title: string; image: string; location: string; photographer: string; month: string };
export type LandingTranslate = (key: string, fallback: string) => string;

/**
 * Wikimedia 경상남도 행정지도(600×433) 위에 표시할 시·군 대표 위치.
 * lib/gyeongnam-regions.js의 대표 위경도 분포를 지도 좌표계에 맞춰 정규화했다.
 * 지도와 마커는 LandingRegionStory의 동일한 600:433 캔버스를 기준으로 렌더한다.
 */
export const landingRegions: LandingRegion[] = [
  { name: "거창", story: "수승대와 산골 무대", x: 22, y: 14 },
  { name: "합천", story: "황매산과 영화 이야기", x: 37, y: 24 },
  { name: "창녕", story: "우포늪과 낙동강 유채", x: 57, y: 25 },
  { name: "밀양", story: "영남루와 아리랑", x: 73, y: 29 },
  { name: "양산", story: "통도사와 천성산", x: 90, y: 43 },
  { name: "함양", story: "지리산과 산삼", x: 11, y: 28 },
  { name: "산청", story: "동의보감촌과 약초", x: 20, y: 36 },
  { name: "의령", story: "홍의장군의 의병 정신", x: 43, y: 44 },
  { name: "함안", story: "아라가야와 낙화놀이", x: 52, y: 48 },
  { name: "김해", story: "가야 왕도와 분청도자", x: 82, y: 52 },
  { name: "창원", story: "진해 벚꽃과 해양공원", x: 68, y: 57 },
  { name: "하동", story: "섬진강과 천년 야생차", x: 12, y: 65 },
  { name: "진주", story: "남강을 밝히는 유등", x: 34, y: 56 },
  { name: "사천", story: "바다 위로 오르는 항공", x: 31, y: 71 },
  { name: "고성", story: "공룡 발자국과 당항포", x: 47, y: 73 },
  { name: "남해", story: "다랭이마을과 독일마을", x: 21, y: 84 },
  { name: "통영", story: "한려수도와 이순신", x: 54, y: 83 },
  { name: "거제", story: "바람의 언덕과 섬꽃", x: 65, y: 81 },
];

export const landingValues = [
  { number: "01", title: "조건을 먼저", copy: "휠체어, 걷기 부담, 영유아, 임산부, 시청각 지원처럼 여행자의 실제 조건에서 출발합니다." },
  { number: "02", title: "근거를 함께", copy: "관광지 사진만 보여주지 않고 접근로·화장실·승강기와 데이터 기준 시점을 함께 표시합니다." },
  { number: "03", title: "이동까지 연결", copy: "관광지를 고르는 데서 끝내지 않고 시간·요금·환승·도보를 비교해 하루의 이동을 설계합니다." },
];
