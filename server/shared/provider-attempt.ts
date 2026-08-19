import { clean } from "./http";
import type { ProviderAttempt, ProviderResult } from "./provider-types";

export async function attemptProvider(promise: Promise<ProviderResult>): Promise<ProviderAttempt> {
  try {
    return { ok: true, value: await promise };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? clean(error.message, 120) : "호출 확인 필요",
    };
  }
}
