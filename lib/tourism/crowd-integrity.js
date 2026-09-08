/** Missing numbers and a different attraction must never become a calm signal. */
export function verifiedCrowdItem(item, title) {
  if (!item || !title) return false;
  const normalize = (value) => String(value || "").normalize("NFKC").replace(/\s+/g, "").toLowerCase();
  if (normalize(item.tAtsNm) !== normalize(title)) return false;
  if (item.cnctrRate == null || String(item.cnctrRate).trim() === "") return false;
  const rate = Number(item.cnctrRate);
  return Number.isFinite(rate) && rate >= 0 && rate <= 100;
}
