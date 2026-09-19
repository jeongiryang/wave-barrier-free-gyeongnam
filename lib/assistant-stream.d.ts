export const NARU_PROPOSAL_DELIMITER: string;
export const NARU_STREAM_LIMIT: number;
export function naruStreamDelta(line: unknown): string;
export type NaruStreamResult = {
  mode: 'text' | 'json';
  text: string;
  reply: string;
  proposalText: string | null;
  raw: string;
  truncated: boolean;
};
export function createNaruStreamReader(options?: { limit?: number; delimiter?: string }): {
  readonly mode: 'unknown' | 'text' | 'json';
  readonly truncated: boolean;
  push(chunk: unknown): string;
  finish(): NaruStreamResult;
};
