export const NARU_WORKSPACES_KEY: string;
export const NARU_MAX_WORKSPACES: number;
export const NARU_MAX_MESSAGES: number;
export type NaruWorkspaceMessage = Readonly<{ role: 'user' | 'assistant'; text: string; source?: 'local-vision' | 'photo-input' }>;
export type NaruWorkspace = Readonly<{
  id: string; title: string; tripId: string; updatedAt: string; bookId?: string;
  messages: readonly NaruWorkspaceMessage[]; input: string;
}>;
export type NaruWorkspaceInput = {
  id?: string; tripId: string; title?: string; bookId?: string; messages: readonly { role: string; text: string; source?: string }[]; input?: string;
};
export type NaruWorkspaceError = 'unavailable' | 'corrupt' | 'version' | 'invalid' | 'trip-changed' | 'write-failed' | 'conflict' | 'limit';
export type NaruWorkspaceStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function sanitizeNaruWorkspace(value: unknown): NaruWorkspace | null;
export function readNaruWorkspaces(storage: Pick<Storage, 'getItem'>):
  { ok: true; workspaces: readonly NaruWorkspace[] } | { ok: false; error: NaruWorkspaceError; workspaces: readonly NaruWorkspace[] };
export function saveNaruWorkspace(storage: NaruWorkspaceStorage, input: NaruWorkspaceInput, now?: string):
  { ok: true; workspace: NaruWorkspace; workspaces: readonly NaruWorkspace[] } | { ok: false; error: NaruWorkspaceError };
export function removeNaruWorkspace(storage: NaruWorkspaceStorage, id: string):
  { ok: true; workspaces: readonly NaruWorkspace[] } | { ok: false; error: NaruWorkspaceError };
