import { classifyProviderResponse, caughtProviderFailure, providerFailure, ProviderRequestError } from "../../lib/provider-failure.js";

/**
 * No automatic request retry. A warm-instance circuit avoids repeated known
 * restrictions; it is not a global/account quota counter across Vercel instances.
 * Unknown hard-quota reset stays closed for this instance, never guesses midnight.
 * Operational registry/automation holds must survive process/deployment restarts.
 */
export function createProviderRequester({ now = Date.now, random = Math.random } = {}) {
  const circuits = new Map();
  const inFlight = new Map();
  const halfOpen = new Map();
  return async function requestProvider(context, url, options, fetcher = fetch) {
    const key = `${context.provider}:${context.operation}`;
    const circuit = circuits.get(key);
    if (circuit && (circuit.until === null || now() < circuit.until)) throw new ProviderRequestError(circuit.failure);
    if (circuit && halfOpen.has(key)) throw new ProviderRequestError(circuit.failure);
    // Full URLs stay only in this private, transient in-flight map, never receipts/logs.
    const requestKey = `${key}:${url}`;
    if (inFlight.has(requestKey)) return inFlight.get(requestKey);
    const lease = {};
    if (circuit) halfOpen.set(key, lease);
    const work = Promise.resolve().then(async () => {
      try {
        const response = await fetcher(url, options);
        const raw = typeof response.text === "function" ? await response.text() : JSON.stringify(await response.json());
        let body;
        try { body = JSON.parse(raw); } catch { /* XML adapters validate their own success schema. */ }
        const failure = classifyProviderResponse(context, { status: response.status, retryAfter: response.headers?.get?.("retry-after"), body, raw, now: now() });
        if (failure) throw new ProviderRequestError(failure);
        // Only the request admitted against this exact state may clear it.
        // An older concurrent success is not evidence that a newer hold recovered.
        if (circuits.get(key) === circuit) circuits.delete(key);
        return {
          ok: response.ok, status: response.status, headers: response.headers,
          text: async () => raw,
          json: async () => {
            if (body === undefined) throw new ProviderRequestError(providerFailure(context,"malformed_response",{status:response.status}));
            return body;
          },
        };
      } catch (error) {
        const failure = caughtProviderFailure(error, context);
        const current = circuits.get(key);
        if (current?.until === null) {
          // Never downgrade an unknown-reset hold with an older in-flight result.
        } else if (["quota_exhausted", "access_restricted", "auth_error"].includes(failure.kind)) circuits.set(key, { failure, until: null });
        else if (failure.kind === "rate_limited") {
          const count = Math.min((current?.count || 0) + 1, 6);
          const backoff = Math.min(60_000 * (2 ** (count - 1)), 15 * 60_000);
          const jitter = Math.floor(Math.max(0, Math.min(1, random())) * 1000);
          const delay = Math.max(1000, failure.retryAfterMs ?? (backoff + jitter));
          const until = Math.max(current?.until ?? 0, now() + delay);
          circuits.set(key, { failure, count, until: Number.isSafeInteger(until) ? until : null });
        }
        throw new ProviderRequestError(failure);
      } finally {
        inFlight.delete(requestKey);
        if (halfOpen.get(key) === lease) halfOpen.delete(key);
      }
    });
    inFlight.set(requestKey, work);
    return work;
  };
}

export const requestProvider = createProviderRequester();
