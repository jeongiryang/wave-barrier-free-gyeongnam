import { clean } from '../shared/http';
import type { ProviderAttempt } from '../shared/provider-data';

/** Statistical IDs are not TourAPI content IDs and never become saved places. */
export function statisticalCandidates(result: ProviderAttempt, kind: 'hub' | 'related', baseYm: string, queryRegion: string) {
  if (!result.ok) return [];
  const rows = result.value.items.flatMap(item => {
    const name = clean(kind === 'hub' ? item.hubTatsNm : item.rlteTatsNm, 100);
    const area = clean(kind === 'hub' ? item.areaCd : item.rlteRegnCd);
    const province = clean(kind === 'hub' ? item.areaNm : item.rlteRegnNm);
    // Related attractions can cross province boundaries. Keep only evidenced Gyeongnam.
    if (!name || !(area === '48' || /^(경남|경상남도)$/.test(province))) return [];
    const scope = clean(kind === 'hub' ? item.signguNm : item.rlteSignguNm, 80);
    return [{ name, scope: scope || (queryRegion === '경남 전체' ? '창원 조회 자료' : queryRegion),
      source: kind === 'hub' ? '기초지자체 중심 관광지' : '관광지별 연관 관광지',
      baseYm: clean(item.baseYm || baseYm, 6), relatedTo: kind === 'related' ? clean(item.tAtsNm, 100) : '' }];
  });
  return [...new Map(rows.map(item => [`${item.scope}:${item.name}`, item])).values()].slice(0, 6);
}
