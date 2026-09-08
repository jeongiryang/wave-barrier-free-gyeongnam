/** Public, bounded metadata only. Never retain an upstream message, URL or key. */
const kinds = new Set(["rate_limited", "quota_exhausted", "auth_error", "access_restricted", "timeout", "upstream_error", "malformed_response", "missing_config"]);
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const safeName = value => typeof value === "string" && /^[A-Za-z0-9_./-]{1,100}$/.test(value) ? value : "unknown";

export function parseProviderRetryAfter(value, now = Date.now()) {
  if (typeof value !== "string" || value.length > 100) return null;
  const input = value.trim();
  if (/^\d+$/.test(input)) {
    const ms = Number(input) * 1000;
    return Number.isSafeInteger(ms) ? ms : null;
  }
  // Do not let Date.parse accept a negative number or an arbitrary date shorthand.
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(input)) return null;
  const at = Date.parse(input);
  return Number.isFinite(at) ? Math.max(0, at - now) : null;
}

export function providerFailure(context, kind, { status = null, code = null, retryAfterMs = null } = {}) {
  const failureKind = kinds.has(kind) ? kind : "upstream_error";
  const retry = Number.isSafeInteger(retryAfterMs) && retryAfterMs >= 0 ? retryAfterMs : null;
  return Object.freeze({
    provider: safeName(context.provider), operation: safeName(context.operation), kind: failureKind,
    httpStatus: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null,
    code: publicCodes.has(code) || kakaoCodes.has(code) || ["ApiKeyAuthFailed", "LOCKED"].includes(code) ? code : null,
    retryAfterMs: retry, resetAt: null,
    retryable: failureKind === "rate_limited" || failureKind === "timeout" || failureKind === "upstream_error",
  });
}

const publicAuth = new Set(["20", "21", "29", "30", "31", "32", "33"]);
const publicCodes = new Set(["01", "02", "03", "04", "05", "10", "11", "12", "20", "21", "22", "23", "29", "30", "31", "32", "33", "99"]);
const kakaoCodes = new Set(["-1", "-2", "-3", "-4", "-5", "-7", "-8", "-9", "-10", "-401", "-402", "-903", "-9798"]);

/** Classifies only explicit provider signals. Unknown errors remain unknown upstream errors. */
export function classifyProviderResponse(context, { status = 200, retryAfter = null, body, raw = "", now = Date.now() } = {}) {
  const retryAfterMs = parseProviderRetryAfter(retryAfter, now);
  const failure = (kind, code = null) => providerFailure(context, kind, { status, code, retryAfterMs });
  if (context.family === "public-data") {
    const envelope = record(body?.response) ? body.response : body;
    const header = record(envelope?.header) ? envelope.header : envelope;
    const code = String(header?.resultCode ?? raw.match(/<(?:returnReasonCode|resultCode)>\s*([^<]+)\s*</i)?.[1] ?? "").trim();
    if (code === "22") return failure("quota_exhausted", code);
    if (code === "23") return failure("rate_limited", code);
    if (publicAuth.has(code)) return failure("auth_error", code);
    if (status !== 429 && code && !["0", "00", "0000"].includes(code)) return failure(code === "05" ? "timeout" : "upstream_error", publicCodes.has(code) ? code : null);
  }
  if (context.family === "kakao" && record(body) && kakaoCodes.has(String(body.code))) {
    const code = String(body.code);
    if (code === "-10") return failure("quota_exhausted", code);
    if (["-3", "-5", "-401", "-402", "-903"].includes(code)) return failure("auth_error", code);
    if (code === "-4") return failure("access_restricted", code);
    if (status !== 429) return failure("upstream_error", code);
  }
  if (context.family === "odsay" && body?.error) {
    const errors = Array.isArray(body.error) ? body.error : [body.error];
    if (!errors.length || errors.some(error => !record(error))) return failure(status === 429 ? "rate_limited" : "malformed_response");
    // Array envelopes are used for gateway/auth failures; never read an array as a single error.
    for (const error of errors) {
      const message = String(error.message ?? error.msg ?? "").slice(0, 500);
      if (/^\[ApiKeyAuthFailed\]/.test(message)) return failure("auth_error", "ApiKeyAuthFailed");
      if (/^(?:\[)?LOCKED(?:\]|$)/i.test(message) || String(error.code).toUpperCase() === "LOCKED") return failure("access_restricted", "LOCKED");
      // A literal statement is classified without displaying/copying the remainder.
      // Do not infer a reset time or quota from ODsay's generic numeric 500 code.
      if (/^(?:Daily|Monthly) (?:API |call |request )?(?:quota|limit) (?:has been )?(?:exceeded|exhausted|reached)[.! ]*$/i.test(message)) return failure("quota_exhausted");
    }
    if (status !== 429 && errors.some(error => !["3", "4", "5", "6", "-98", "-99"].includes(String(error.code ?? error.errorCode)))) return failure("upstream_error");
  }
  if (status === 429) return failure("rate_limited");
  if (status === 401 || status === 403) return failure("auth_error");
  if (status === 408 || status === 504) return failure("timeout");
  if (status < 200 || status >= 300) return failure("upstream_error");
  return null;
}

export function providerFailureMessage(failure, english = false) {
  const copy = {
    rate_limited: ["현재 제공처의 요청 제한으로 최신 정보를 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", "The provider is temporarily limiting requests. Please check again later."],
    quota_exhausted: ["현재 제공처의 이용 한도로 최신 정보를 확인하지 못했습니다. 다른 정보를 확인하거나 나중에 다시 이용해 주세요.", "The provider's usage allowance has been reached. Use other information or check again later."],
    auth_error: ["제공처 연결 권한을 확인하고 있습니다. 다른 정보를 이용해 주세요.", "The provider connection needs an access check. Please use other information."],
    access_restricted: ["제공처가 현재 연결을 제한하고 있습니다. 다른 정보를 이용해 주세요.", "The provider is restricting access. Please use other information."],
    timeout: ["제공처 응답이 늦어 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", "The provider did not respond in time. Please check again later."],
    upstream_error: ["제공처 응답을 확인하지 못했습니다. 잠시 후 다시 확인해 주세요.", "The provider's response could not be verified. Please check again later."],
    malformed_response: ["제공처 정보 형식을 확인하지 못했습니다. 다른 정보를 이용해 주세요.", "The provider returned information that could not be verified. Please use other information."],
    missing_config: ["이 정보는 현재 연결되지 않았습니다.", "This information is not currently connected."],
  };
  return (copy[failure?.kind] || copy.upstream_error)[english ? 1 : 0];
}

export class ProviderRequestError extends Error {
  constructor(failure) { super(providerFailureMessage(failure)); this.name = "ProviderRequestError"; this.failure = failure; }
}

export function caughtProviderFailure(error, context) {
  if (error instanceof ProviderRequestError) return error.failure;
  return providerFailure(context, error?.name === "TimeoutError" || error?.name === "AbortError" ? "timeout" : error instanceof SyntaxError ? "malformed_response" : "upstream_error");
}
