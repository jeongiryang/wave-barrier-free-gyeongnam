import type { AccessIconName } from "../../components/AccessIcons";
import type { RoutePoint } from "../routing/types";
import type { ApiStatus, TransportMode, TransportProviderState } from "./types";

export const transportStateLabel: Record<TransportProviderState, string> = {
  connected: "운행정보 확인",
  ready: "이용 가능",
  error: "잠시 지연",
  missing: "준비 중",
  checking: "확인 중",
};

export const transportModes: Array<{ id: TransportMode; label: string; description: string }> = [
  { id: "all", label: "전체", description: "가능한 이동수단 비교" },
  { id: "car", label: "자동차", description: "도로 경로와 예상 시간" },
  { id: "rail", label: "기차·철도", description: "열차·도시철도 운행정보" },
  { id: "bus", label: "시내버스", description: "정류장·도착 예정" },
  { id: "regional", label: "고속·시외", description: "터미널·도착 정보" },
  { id: "mobility", label: "기타 이동", description: "항공·선박·공유 이동" },
];

export const transportDatasetMeta: Record<string, { mode: TransportMode; description: string }> = {
  "bus-stop": { mode: "bus", description: "목적지 좌표 주변의 시내버스 정류장을 조회합니다." },
  "bus-route": { mode: "bus", description: "선택한 도시의 시내버스 노선 정보를 확인합니다." },
  "bus-location": { mode: "bus", description: "노선을 선택하면 운행 중인 버스 위치를 확인할 수 있습니다." },
  "bus-arrival": { mode: "bus", description: "가장 가까운 정류장의 버스 도착 예정 시간을 조회합니다." },
  subway: { mode: "rail", description: "도시철도 역·노선 운행정보를 조회합니다." },
  "express-arrival": { mode: "regional", description: "고속버스 도착과 터미널 정보를 확인합니다." },
  train: { mode: "rail", description: "TAGO 열차 도시 코드와 철도 데이터 제공 범위를 확인합니다." },
  express: { mode: "regional", description: "전국 고속버스 터미널 목록을 조회합니다." },
  intercity: { mode: "regional", description: "전국 시외버스 터미널 목록을 조회합니다." },
  air: { mode: "mobility", description: "국내 항공 운항정보 기능의 연결 상태를 확인합니다." },
  ship: { mode: "mobility", description: "국내 여객선 운항정보 기능의 연결 상태를 확인합니다." },
  carshare: { mode: "mobility", description: "카셰어링 제공 지역과 차량 정보를 확인합니다." },
  pm: { mode: "mobility", description: "공유 퍼스널모빌리티 제공 현황을 확인합니다." },
  "korail-plan": { mode: "rail", description: "한국철도공사 여객열차 운행계획을 조회합니다." },
};

export const officialBookingLinks = [
  { id: "korail", modes: ["all", "rail"], label: "코레일 승차권", detail: "KTX·일반열차 공식 예매", href: "https://www.korail.com/" },
  { id: "kobus", modes: ["all", "regional"], label: "고속버스 통합예매", detail: "전국고속버스운송사업조합", href: "https://www.kobus.co.kr/main.do" },
  { id: "bustago", modes: ["all", "regional"], label: "버스타고 시외버스", detail: "전국 시외버스 공식 예매", href: "https://www.bustago.or.kr/newweb/kr/index.do" },
] as const;

export const departurePresets: Array<{ id: string; name: string; detail: string; point: RoutePoint }> = [
  { id: "changwon", name: "창원중앙역", detail: "KTX·시내버스 환승", point: { lat: 35.2422, lng: 128.6982 } },
  { id: "masan", name: "마산역", detail: "KTX·시외 이동", point: { lat: 35.2361, lng: 128.5771 } },
  { id: "jinju", name: "진주역", detail: "서부 경남 출발", point: { lat: 35.1516, lng: 128.1180 } },
  { id: "gimhae", name: "김해공항", detail: "항공·경전철 환승", point: { lat: 35.1795, lng: 128.9382 } },
  { id: "tongyeong", name: "통영종합버스터미널", detail: "통영 시내 출발", point: { lat: 34.8680, lng: 128.4155 } },
];

export const profiles: Array<{ id: string; icon: AccessIconName; label: string; short: string }> = [
  { id: "wheel", icon: "wheel", label: "휠체어 이용", short: "주차·접근로·승강기" },
  { id: "senior", icon: "senior", label: "걷기 불편", short: "짧은 동선·휴게 우선" },
  { id: "baby", icon: "baby", label: "영유아 동반", short: "유모차·수유실" },
  { id: "pregnant", icon: "pregnant", label: "임산부", short: "화장실·승강기 우선" },
  { id: "visual", icon: "visual", label: "시각 정보 지원", short: "점자·음성 안내" },
  { id: "hearing", icon: "hearing", label: "청각 정보 지원", short: "수어·영상 안내" },
];

export const regions = [
  "경남 전체", "창원", "진주", "통영", "사천", "김해", "밀양", "거제", "양산",
  "의령", "함안", "창녕", "고성", "남해", "하동", "산청", "함양", "거창", "합천",
];

export const themes = [
  { id: "nature", label: "자연·휴양", description: "공원·정원·자연 명소" },
  { id: "history", label: "역사·문화", description: "박물관·전시·문화 공간" },
  { id: "leisure", label: "레포츠", description: "체험·야외 활동" },
  { id: "food", label: "음식", description: "지역 음식·식당" },
];

export const apiMeta = [
  { id: "barrierfree", name: "무장애 여행정보", role: "주차·접근로·휠체어·화장실 등 상세 편의정보" },
  { id: "tour", name: "국문 관광정보", role: "관광지 좌표·이미지·주소와 지역 기반 검색" },
  { id: "audio", name: "관광지 오디오 가이드", role: "관광 해설 음원과 청각 지원용 전체 대본" },
  { id: "durunubi", name: "두루누비 정보", role: "걷기 코스 거리·시간·난이도와 여행자 정보" },
  { id: "hub", name: "기초지자체 중심 관광지", role: "지역 안에서 연결성이 높은 중심 관광지 순위" },
  { id: "photo", name: "관광사진 정보", role: "지역·축제 키워드 기반 관광사진과 촬영 출처" },
  { id: "related", name: "관광지별 연관 관광지", role: "함께 방문하기 좋은 관광·음식·숙박 후보" },
  { id: "crowd", name: "관광지 집중률 예측", role: "향후 30일 혼잡도와 회피 근거" },
];

export const richCatalog = [
  { id: "events", label: "축제·행사", icon: "✦", description: "지금 열리는 지역 이야기" },
  { id: "lodging", label: "숙박", icon: "⌂", description: "지역별 머물 곳" },
  { id: "wellness", label: "웰니스", icon: "◌", description: "자연·치유·명상" },
  { id: "camping", label: "캠핑", icon: "△", description: "야영장·휴양" },
  { id: "pet", label: "반려동물", icon: "♧", description: "동반 가능 여행" },
  { id: "water", label: "물과 여행", icon: "≈", description: "댐·하천·수변" },
  { id: "medical", label: "의료관광", icon: "+", description: "의료·회복" },
  { id: "awards", label: "수상 사진", icon: "▣", description: "공모전 시선" },
  { id: "language", label: "글로벌", icon: "文", description: "선택 언어 관광" },
  { id: "rests", label: "테마휴게소", icon: "↗", description: "고속도로 여행" },
] as const;

export const readyStatuses: ApiStatus[] = apiMeta.map((item) => ({
  ...item,
  state: "ready",
  count: 0,
  note: "승인 완료 · 검색 시 호출",
}));
