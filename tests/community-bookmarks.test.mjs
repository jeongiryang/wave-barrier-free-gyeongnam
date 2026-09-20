import test from 'node:test';
import assert from 'node:assert/strict';
import { readCommunityBookmarks, changeCommunityBookmark, COMMUNITY_BOOKMARK_KEY } from '../lib/community/bookmarks.ts';

function storage(initial = null) {
  let value = initial;
  return { getItem: key => { assert.equal(key, COMMUNITY_BOOKMARK_KEY); return value; }, setItem: (key, next) => { assert.equal(key, COMMUNITY_BOOKMARK_KEY); value = next; } };
}
test('bookmarks store IDs only, preserve prior writes and reload/removal exactly', () => {
  const local = storage();
  assert.deepEqual(readCommunityBookmarks(local), []);
  changeCommunityBookmark(local, 'post-1', true);
  changeCommunityBookmark(local, 'post-2', true);
  assert.deepEqual(readCommunityBookmarks(local), ['post-2', 'post-1']);
  changeCommunityBookmark(local, 'post-1', true);
  assert.deepEqual(readCommunityBookmarks(local), ['post-1', 'post-2']);
  changeCommunityBookmark(local, 'post-1', false);
  assert.deepEqual(readCommunityBookmarks(local), ['post-2']);
});
test('corrupt storage, traversal IDs and quota errors never silently erase prior bookmarks', () => {
  for (const raw of ['broken', '{}', '["../../account"]']) {
    const local = storage(raw);
    assert.throws(() => changeCommunityBookmark(local, 'valid-post', true));
    assert.equal(local.getItem(COMMUNITY_BOOKMARK_KEY), raw);
  }
  const local = storage('["kept"]');
  assert.throws(() => changeCommunityBookmark(local, '../private', true));
  assert.throws(() => changeCommunityBookmark({ ...local, setItem: () => { throw new Error('quota'); } }, 'new-post', true));
  assert.deepEqual(readCommunityBookmarks(local), ['kept']);
});
test('bounded storage rejects a 51st bookmark but permits removal and existing saves', () => {
  const local = storage(JSON.stringify(Array.from({ length: 50 }, (_, i) => `post-${i}`)));
  assert.throws(() => changeCommunityBookmark(local, 'extra', true), RangeError);
  assert.equal(readCommunityBookmarks(local).length, 50);
  assert.equal(changeCommunityBookmark(local, 'post-0', true).length, 50);
  changeCommunityBookmark(local, 'post-0', false);
  assert.equal(changeCommunityBookmark(local, 'extra', true).length, 50);
});
