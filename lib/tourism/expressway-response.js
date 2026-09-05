const SUCCESS_CODES = new Set(["", "0", "00", "0000", "200", "OK", "SUCCESS"]);

function text(value, maxLength = 120) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim().slice(0, maxLength)
    : "";
}

/**
 * 한국도로공사 OpenAPI는 인증 오류를 HTTP 200 JSON으로 돌려줄 수 있다.
 * 목록이 없다는 이유만으로 정상 빈 결과로 취급하지 않고 오류 봉투를 먼저 판정한다.
 *
 * @param {unknown} body
 * @returns {{ items: Array<Record<string, unknown>>, total: number }}
 */
export function normalizeExpresswayResponse(body) {
  const root = body && typeof body === "object" ? /** @type {Record<string, unknown>} */ (body) : {};
  const nestedError = root.error && typeof root.error === "object"
    ? /** @type {Record<string, unknown>} */ (root.error)
    : {};
  const code = text(root.code ?? root.resultCode ?? nestedError.code ?? nestedError.resultCode, 40).toUpperCase();
  const message = text(root.message ?? root.msg ?? root.resultMsg ?? nestedError.message ?? nestedError.msg ?? nestedError.resultMsg);
  const explicitError = Boolean(root.error)
    || !SUCCESS_CODES.has(code)
    || (!Object.hasOwn(root, "list")
      && !Object.hasOwn(root, "items")
      && !Object.hasOwn(root, "data")
      && /(?:error|fail|invalid|unauthorized|인증|오류|실패)/i.test(message));

  if (explicitError) {
    const suffix = [code, message].filter(Boolean).join(" · ");
    throw new Error(`테마휴게소 API 오류${suffix ? `: ${suffix}` : ""}`);
  }

  const list = root.list ?? root.items ?? root.data;
  const items = Array.isArray(list)
    ? list
    : list && typeof list === "object"
      ? [/** @type {Record<string, unknown>} */ (list)]
      : [];
  const reportedTotal = Number(root.count ?? root.totalCount ?? items.length);
  return {
    items: /** @type {Array<Record<string, unknown>>} */ (items),
    total: Number.isFinite(reportedTotal) && reportedTotal >= 0 ? reportedTotal : items.length,
  };
}
