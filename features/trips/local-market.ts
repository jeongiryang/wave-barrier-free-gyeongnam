export type LocalMarket = { id: string; name: string; operator: string; regions: readonly string[]; url: string; checkedOn: string };
const gyeongnamRegions = ['거창', '합천', '창녕', '밀양', '양산', '함양', '산청', '의령', '함안', '김해', '창원', '하동', '진주', '사천', '고성', '남해', '통영', '거제'] as const;

export const localMarkets: readonly LocalMarket[] = [{
  id: 'e-gyeongnam-mall',
  name: 'e경남몰',
  operator: '경상남도 · 경남투자경제진흥원',
  regions: gyeongnamRegions,
  url: 'https://egnmall.kr/kwa-home',
  checkedOn: '2026-09-20',
}];
