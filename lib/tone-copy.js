// 화면 말투(표준말 / 경남 말) 문구 선택만 담당한다.
// 네트워크, 저장소, 위치 API를 참조하지 않는다.

/**
 * 말투에 맞는 문구를 돌려준다.
 * 경남 말 문구가 없으면 표준말을 그대로 돌려준다. 모든 문구를 번역할 필요가 없다.
 * @param {{ standard: string, gyeongnam?: string }} entry
 * @param {"standard" | "gyeongnam"} tone
 * @returns {string}
 */
export function toneText(entry, tone) {
  if (!entry || typeof entry.standard !== "string") return "";
  if (tone !== "gyeongnam") return entry.standard;
  const dialect = entry.gyeongnam;
  return typeof dialect === "string" && dialect.trim() ? dialect : entry.standard;
}
