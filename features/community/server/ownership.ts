import { communityDatabase, type CommunityRow } from "./database";

async function ownership(
  table: "community_posts" | "community_comments",
  id: string,
  userId: string,
  postId = "",
) {
  const sql = await communityDatabase();
  if (!sql) return "unavailable" as const;
  const rows = table === "community_posts"
    ? await sql`SELECT author_id FROM community_posts WHERE id=${id} LIMIT 1` as CommunityRow[]
    : await sql`SELECT author_id FROM community_comments WHERE id=${id} AND post_id=${postId} LIMIT 1` as CommunityRow[];
  if (!rows[0]) return "missing" as const;
  return rows[0].author_id === userId ? "owner" as const : "forbidden" as const;
}

export const postOwnership = (postId: string, userId: string) => (
  ownership("community_posts", postId, userId)
);

export const commentOwnership = (postId: string, commentId: string, userId: string) => (
  ownership("community_comments", commentId, userId, postId)
);
