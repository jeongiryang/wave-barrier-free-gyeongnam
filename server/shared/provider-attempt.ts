import { clean } from "./http";
import { ProviderRequestError } from "../../lib/provider-failure.js";
import type { ProviderAttempt, ProviderResult, ProviderItem } from "./provider-types";

/** Retain verified records without erasing a failed district/theme/detail request. */
export function combineProviderResults(items: ProviderItem[], attempts: ProviderAttempt[]): ProviderResult {
  const partial = attempts.some(result => !result.ok || result.value.partial);
  const failures = attempts.flatMap(result => result.ok ? result.value.failures || [] : [...(result.failure ? [result.failure] : []), ...(result.failures || [])]);
  // Preserve the existence of an unknown failure, never its private error text.
  // A quota alongside a budget/parser failure must not erase engineering triage.
  const unclassifiedFailure = attempts.some(result => result.ok
    ? result.value.unclassifiedFailure || (result.value.partial && !result.value.failures?.length)
    : result.unclassifiedFailure || (!result.failure && !result.failures?.length));
  const unique = [...new Map(failures.map(failure => [`${failure.provider}/${failure.operation}/${failure.kind}`, failure])).values()];
  return { items, total: items.length, ...(partial ? { partial: true, failures: unique, ...(unclassifiedFailure ? {unclassifiedFailure:true} : {}) } : {}) };
}

/** All failed districts/themes still preserve every classified and unknown cause. */
export function combineFailedProviderAttempts(attempts: ProviderAttempt[]): ProviderAttempt {
  const result = combineProviderResults([], attempts);
  return {ok:false,error:"정보를 확인하지 못했습니다.",failures:result.failures || [],
    ...(result.failures?.length ? {failure:result.failures[0]} : {}),
    ...(!attempts.length || result.unclassifiedFailure ? {unclassifiedFailure:true} : {})};
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
