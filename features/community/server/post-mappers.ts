import type { CommunityRow } from "./database";

export function mapCommunityPost(row: CommunityRow, userId = "") {
  return {
    id: String(row.id),
    category: String(row.category),
    title: String(row.title),
    content: String(row.content),
    region: row.region ? String(row.region) : null,
    placeId: row.place_id ? String(row.place_id) : null,
    placeName: row.place_name ? String(row.place_name) : null,
    authorName: String(row.author_name),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    commentCount: Number(row.comment_count || 0),
    likeCount: Number(row.like_count || 0),
    likedByMe: Boolean(row.liked_by_me),
    isOwner: Boolean(userId && row.author_id === userId),
  };
}

export function mapCommunityComment(row: CommunityRow, userId = "") {
  return {
    id: String(row.id),
    content: String(row.content),
    authorName: String(row.author_name),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    isOwner: Boolean(userId && row.author_id === userId),
  };
}
