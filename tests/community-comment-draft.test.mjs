import assert from 'node:assert/strict';
import test from 'node:test';
import { communityCommentDraftKey, sanitizeCommunityCommentDraft } from '../lib/community-comment-draft.js';

test('comment drafts are isolated by post and signed-in account', () => {
  assert.equal(communityCommentDraftKey('post-1'), 'wave-community-comment-draft-v1:post-1');
  assert.notEqual(communityCommentDraftKey('post-1', 'user-a'), communityCommentDraftKey('post-1', 'user-b'));
  assert.notEqual(communityCommentDraftKey('post-1', 'user-a'), communityCommentDraftKey('post-2', 'user-a'));
  assert.equal(sanitizeCommunityCommentDraft(`a\u0000${'b'.repeat(1100)}`).length, 1000);
});
