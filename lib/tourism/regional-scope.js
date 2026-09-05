/** Provider filters are advisory: only explicit location evidence establishes scope. */
export function isGyeongnamItem(item) {
  const address = String(item.addr1 || item.baseAddr || item.address || item.addr || item.svarAddr || item.serviceAreaAddress || item.koFilmst || item.region || item.doNm || "").trim();
  if (/경상남도|경남|gyeongsangnam(?:-do)?/i.test(address)) return true;
  // A code must not override an explicitly conflicting address (e.g. 고성 in 강원).
  if (/서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충남|충북|전라|전남|전북|경상북|경북|제주/.test(address)) return false;
  return String(item.lDongRegnCd || "") === "48";
}

export function filterGyeongnamResult(result) {
  if (!result.ok) return result;
  const items = result.value.items.filter(isGyeongnamItem);
  return { ...result, value: { ...result.value, items, total: items.length } };
}
