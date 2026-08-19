export type ProviderItem = Record<string, string | number | null | undefined>;
export type ProviderResult = { items: ProviderItem[]; total: number };
export type ProviderAttempt = { ok: true; value: ProviderResult } | { ok: false; error: string };
export type TransportProviderState = "connected" | "ready" | "error" | "missing";
