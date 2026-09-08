export type ProviderItem = Record<string, string | number | null | undefined>;
export type ProviderResult = { items: ProviderItem[]; total: number; partial?: boolean; failures?: import("../../lib/provider-failure.js").ProviderFailure[]; unclassifiedFailure?: boolean };
export type ProviderAttempt = { ok: true; value: ProviderResult } | { ok: false; error: string; failure?: import("../../lib/provider-failure.js").ProviderFailure; failures?: import("../../lib/provider-failure.js").ProviderFailure[]; unclassifiedFailure?: boolean };
export type TransportProviderState = "connected" | "ready" | "error" | "missing";
