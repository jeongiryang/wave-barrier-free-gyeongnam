export const COMMUNITY_BOOKMARK_KEY = 'wave-community-bookmarks-v1';
export const COMMUNITY_BOOKMARK_LIMIT = 50;
const validId = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);

/** Keep public IDs only, never a copy of a potentially removed post or its author. */
export function readCommunityBookmarks(storage: Pick<Storage, 'getItem'>): string[] {
  const raw = storage.getItem(COMMUNITY_BOOKMARK_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || value.length > COMMUNITY_BOOKMARK_LIMIT || !value.every(validId)) throw new Error('invalid bookmarks');
  return [...new Set(value)];
}

export function changeCommunityBookmark(storage: Pick<Storage, 'getItem' | 'setItem'>, id: string, saved: boolean): string[] {
  if (!validId(id)) throw new Error('invalid post ID');
  // Read at the moment of writing so a different card/tab's last save is retained.
  const current = readCommunityBookmarks(storage);
  const next = saved ? [id, ...current.filter(item => item !== id)] : current.filter(item => item !== id);
  if (next.length > COMMUNITY_BOOKMARK_LIMIT) throw new RangeError('bookmark limit');
  storage.setItem(COMMUNITY_BOOKMARK_KEY, JSON.stringify(next));
  return next;
}
