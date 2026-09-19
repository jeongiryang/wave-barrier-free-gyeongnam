/**
 * 전동휠체어 충전 장소 대체 안내(스펙 15의 "대체 설계").
 *
 * 0단계 검증: 공공데이터포털에서 "전국전동휠체어급속충전기표준데이터"
 * (data.go.kr/data/15034533) 등 관련 데이터셋을 확인했으나, 이 개발 환경에는
 * 공공데이터포털 API 키가 없어 실제 호출로 경상남도 표본을 확인할 수 없었다.
 * 그래서 필드명·표본 건수를 추측하지 않고 설치 장소 목록도 코드에 두지 않는다.
 * 대신 경남 18개 시군의 "공식 안내 페이지" 링크만 정적으로 둔다.
 *
 * 각 URL은 구현 시점(2026-09-19)에 실제로 접속 가능함을 확인했다. 가능한
 * 경우 장애인 전동보장구·충전기 관련 안내 페이지를 우선했고(1순위), 없으면
 * 장애인복지 관련 페이지(2순위), 그것도 없으면 시군 공식 누리집 메인(3순위)을
 * 사용했다. `pageKind`에 어느 순위인지 남긴다.
 *
 * 이 파일은 순수 데이터만 담는다. 네트워크·저장소·위치 API를 참조하지 않는다.
 */

/** @typedef {{ region: string; name: string; url: string; pageKind: 1 | 2 | 3; verifiedAt: string }} OfficialLink */

/** @type {readonly OfficialLink[]} */
export const POWERCHAIR_CHARGING_OFFICIAL_LINKS = Object.freeze([
  { region: "창원", name: "창원시 장애인 복지시책(전동휠체어 충전기 설치 현황 포함)", url: "https://www.changwon.go.kr/depart/contents.do?mId=0506020600", pageKind: 1, verifiedAt: "2026-09-19" },
  { region: "진주", name: "진주시 장애인복지", url: "https://www.jinju.go.kr/00134/00614/00681.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "통영", name: "통영시 복지포털", url: "https://www.tongyeong.go.kr/welfare.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "사천", name: "사천시청 누리집", url: "https://www.sacheon.go.kr/", pageKind: 3, verifiedAt: "2026-09-19" },
  { region: "김해", name: "김해시 장애인 지역사회재활시설", url: "https://www.gimhae.go.kr/00976/02310/00988.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "밀양", name: "밀양시 장애인 복지정책", url: "https://www.miryang.go.kr/web/index.do?mnNo=50505020000", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "거제", name: "거제시 장애인 복지포털", url: "https://www.geoje.go.kr/welfare/index.geoje?menuCd=DOM_000009606004001000", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "양산", name: "양산시 장애인 등록안내", url: "https://www.yangsan.go.kr/welfare/contents.do?mid=0601000000", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "의령", name: "의령군 의료·재활(보조기구 교부 포함)", url: "https://www.uiryeong.go.kr/index.uiryeong?menuCd=DOM_000000204001003005", pageKind: 1, verifiedAt: "2026-09-19" },
  { region: "함안", name: "함안군청 누리집", url: "https://www.haman.go.kr/main.web", pageKind: 3, verifiedAt: "2026-09-19" },
  { region: "창녕", name: "창녕군 장애인복지 분류", url: "https://www.cng.go.kr/00596/00734/00737.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "고성", name: "고성군 장애인 등록안내", url: "https://www.goseong.go.kr/welfare/index.goseong?menuCd=DOM_000001807000000000", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "남해", name: "남해군 장애인생활이동지원센터", url: "https://www.namhae.go.kr/welfare/Index.do?c=WL0501090200", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "하동", name: "하동군 장애인 복지서비스", url: "https://www.hadong.go.kr/specialty/00214/00280.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "산청", name: "산청군 장애등록 절차", url: "https://www.sancheong.go.kr/welfare/contents.do?key=477", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "함양", name: "함양군청 누리집", url: "https://www.hygn.go.kr/main.web", pageKind: 3, verifiedAt: "2026-09-19" },
  { region: "거창", name: "거창군 정도별 장애인 등록현황", url: "https://www.geochang.go.kr/02313/02330/02410.web", pageKind: 2, verifiedAt: "2026-09-19" },
  { region: "합천", name: "합천군 장애인 도비보조사업(보조기기·편의설비 지원)", url: "https://www.hc.go.kr/05750/05764/05778.web", pageKind: 1, verifiedAt: "2026-09-19" },
]);

export const POWERCHAIR_CHARGING_NOTICE_TEXT = "전동휠체어 충전 장소는 시군마다 안내가 달라요. 방문 전 관할 기관에 확인하는 것이 확실해요.";
