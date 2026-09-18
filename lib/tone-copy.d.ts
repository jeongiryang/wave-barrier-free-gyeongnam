export type ToneEntry = { standard: string; gyeongnam?: string };

/** gyeongnam 이 없으면 standard 를 돌려준다. 모든 문구를 번역할 필요가 없다. */
export function toneText(entry: ToneEntry, tone: "standard" | "gyeongnam"): string;
