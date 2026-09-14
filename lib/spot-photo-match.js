const normalized = value => typeof value === 'string' ? value.toLocaleLowerCase('ko-KR').replace(/[^\p{L}\p{N}]+/gu, '') : '';
const otherProvinces = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충청북도', '충남', '충청남도', '전북', '전라북도', '전남', '전라남도', '경북', '경상북도', '제주'];

export function spotPhotoRegionMatches(region, ...evidence) {
  const wanted = normalized(region);
  const text = normalized(evidence.filter(Boolean).join(' '));
  if (!wanted || !text) return false;
  if (wanted === '경남전체') return text.includes('경남') || text.includes('경상남도');
  const saysGyeongnam = text.includes('경남') || text.includes('경상남도');
  if (!saysGyeongnam && otherProvinces.some(name => text.includes(name))) return false;
  if (wanted.replace(/시$|군$/, '') === '고성' && !saysGyeongnam) return false;
  return text.includes(wanted.replace(/시$|군$/, ''));
}
