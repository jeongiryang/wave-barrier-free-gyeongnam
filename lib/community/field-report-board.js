export const FIELD_REPORT_CATEGORY = "field-report";
export const FIELD_REPORT_CONTENT_ID_PATTERN = /^[1-9]\d{0,11}$/;

export function fieldReportBoardEnabled(env = process.env) {
  return ["1", "true", "on", "enabled"].includes(String(env?.WAVE_FIELD_REPORT_BOARD || "").trim().toLowerCase());
}

export function fieldReportAgeMessage(checkedOn, now = Date.now()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(checkedOn || ""))) return "";
  const checked = new Date(`${checkedOn}T12:00:00+09:00`);
  const current = new Date(Number(now));
  if (Number.isNaN(checked.valueOf()) || checked.valueOf() > current.valueOf()) return "";
  let months = (current.getFullYear() - checked.getFullYear()) * 12 + current.getMonth() - checked.getMonth();
  if (current.getDate() < checked.getDate()) months -= 1;
  return months >= 1 ? `${months}개월 전에 확인한 정보예요.` : "";
}

export function asFieldReport(post) {
  if (post?.category !== FIELD_REPORT_CATEGORY) return null;
  return {
    kind: FIELD_REPORT_CATEGORY,
    contentId: String(post.placeId || ""),
    checkedOn: String(post.visitDate || ""),
    body: String(post.content || ""),
  };
}
