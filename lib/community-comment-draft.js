const PREFIX = 'wave-community-comment-draft-v1';
const cleanPart = value => typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120) : '';
export const communityCommentDraftKey = (postId, userId = '') => `${PREFIX}:${cleanPart(postId)}${userId ? `:${cleanPart(userId)}` : ''}`;
export const sanitizeCommunityCommentDraft = value => typeof value === 'string' ? value.replace(/\u0000/g, '').slice(0, 1000) : '';
