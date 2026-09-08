export type ProviderFailureKind = "rate_limited" | "quota_exhausted" | "auth_error" | "access_restricted" | "timeout" | "upstream_error" | "malformed_response" | "missing_config";
export type ProviderContext = { provider: string; operation: string; family?: "public-data" | "kakao" | "odsay" | "open-meteo" | "expressway" };
export type ProviderFailure = Readonly<{ provider: string; operation: string; kind: ProviderFailureKind; httpStatus: number | null; code: string | null; retryAfterMs: number | null; resetAt: null; retryable: boolean }>;
export function parseProviderRetryAfter(value: unknown, now?: number): number | null;
export function providerFailure(context: ProviderContext, kind: ProviderFailureKind, options?: {status?: number | null; code?: string | null; retryAfterMs?: number | null}): ProviderFailure;
export function classifyProviderResponse(context: ProviderContext, response?: {status?: number; retryAfter?: string | null; body?: unknown; raw?: string; now?: number}): ProviderFailure | null;
export function providerFailureMessage(failure: Pick<ProviderFailure,"kind"> | null | undefined, english?: boolean): string;
export class ProviderRequestError extends Error { readonly failure: ProviderFailure; constructor(failure: ProviderFailure); }
export function caughtProviderFailure(error: unknown, context: ProviderContext): ProviderFailure;
