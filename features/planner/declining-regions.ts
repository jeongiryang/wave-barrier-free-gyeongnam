export type DecliningRegionNotice = {
  regions: readonly string[];
  source: string;
  sourceUrl: string;
  noticedOn: string;
  checkedOn: string;
};

export const DECLINING_REGION_LABEL = "행정안전부 인구감소지역이에요.";

export const decliningRegionNotice: DecliningRegionNotice = {
  regions: ["거창", "고성", "남해", "밀양", "산청", "의령", "창녕", "하동", "함안", "함양", "합천"],
  source: "인구감소지역 지정 고시(행정안전부고시 제2021-66호)",
  sourceUrl: "https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000016&nttId=90651",
  noticedOn: "2021-10-19",
  checkedOn: "2026-09-20",
};

const decliningRegionSet = new Set(decliningRegionNotice.regions);

export function isDecliningRegion(name: string) {
  return decliningRegionSet.has(name);
}

export function decliningRegionSourceLabel() {
  return `행정안전부 고시 · 확인 ${decliningRegionNotice.checkedOn}`;
}

export function decliningRegionsFirst(names: readonly string[]) {
  return [...names].sort((left, right) => Number(isDecliningRegion(right)) - Number(isDecliningRegion(left)));
}
