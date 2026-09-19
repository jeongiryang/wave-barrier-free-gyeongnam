export type StatusKind = "confirmed" | "unknown" | "negative" | "ok" | "caution" | "error";
export function statusShape(kind: StatusKind): "check" | "question" | "slash" | "dot" | "triangle" | "cross";
export function statusWord(kind: StatusKind): string;
