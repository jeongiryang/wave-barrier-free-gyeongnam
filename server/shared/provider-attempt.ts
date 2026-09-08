import { clean } from "./http";
import { ProviderRequestError } from "../../lib/provider-failure.js";
import type { ProviderAttempt, ProviderResult, ProviderItem } from "./provider-types";

/** Retain verified records without erasing a failed district/theme/detail request. */
export function combineProviderResults(items: ProviderItem[], attempts: ProviderAttempt[]): ProviderResult {
  const partial = attempts.some(result => !result.ok || result.value.partial);
  const failures = attempts.flatMap(result => result.ok ? result.value.failures || [] : result.failure ? [result.failure] : []);
  const unique = [...new Map(failures.map(failure => [`${failure.provider}/${failure.operation}/${failure.kind}`, failure])).values()];
  return { items, total: items.length, ...(partial ? { partial: true, failures: unique } : {}) };
}

export async function attemptProvider(promise: Promise<ProviderResult>): Promise<ProviderAttempt> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? clean(error.message, 120) : "호출 확인 필요",
      ...(error instanceof ProviderRequestError ? {failure:error.failure} : {}),
    };
  }
}
