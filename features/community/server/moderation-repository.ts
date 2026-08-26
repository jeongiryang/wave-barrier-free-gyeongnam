import { communityDatabase, type CommunityRow } from "./database";

export async function createCommunityReport(input: {
  reporterId: string;
  postId: string;
  targetType: "post" | "comment";
  targetId: string;
  reason: string;
  details: string;
}) {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const target = input.targetType === "post"
    ? await sql`SELECT author_id FROM community_posts WHERE id=${input.targetId} AND moderation_status='active' LIMIT 1` as CommunityRow[]
    : await sql`SELECT c.author_id FROM community_comments c JOIN community_posts p ON p.id=c.post_id WHERE c.id=${input.targetId} AND c.post_id=${input.postId} AND c.moderation_status='active' AND p.moderation_status='active' LIMIT 1` as CommunityRow[];
  if (!target[0]) return { missing: true as const };
  if (target[0].author_id === input.reporterId) return { ownContent: true as const };
  const recent = await sql`SELECT COUNT(*) count FROM community_reports WHERE reporter_id=${input.reporterId} AND created_at>${Date.now() - 86400000}` as CommunityRow[];
  if (Number(recent[0]?.count || 0) >= 10) return { rateLimited: true as const };

  const inserted = await sql`INSERT INTO community_reports (id,reporter_id,post_id,target_type,target_id,reason,details,status,created_at) VALUES (${crypto.randomUUID()},${input.reporterId},${input.postId},${input.targetType},${input.targetId},${input.reason},${input.details || null},'open',${Date.now()}) ON CONFLICT (reporter_id,target_type,target_id) DO NOTHING RETURNING id` as CommunityRow[];
  if (!inserted[0]) return { duplicate: true as const };
  const reports = await sql`SELECT COUNT(DISTINCT reporter_id) count FROM community_reports WHERE target_type=${input.targetType} AND target_id=${input.targetId} AND status='open'` as CommunityRow[];
  const reportCount = Number(reports[0]?.count || 0);
  if (reportCount >= 3) {
    if (input.targetType === "post") await sql`UPDATE community_posts SET moderation_status='under_review' WHERE id=${input.targetId} AND moderation_status='active'`;
    else await sql`UPDATE community_comments SET moderation_status='under_review' WHERE id=${input.targetId} AND moderation_status='active'`;
  }
  return { reported: true as const, underReview: reportCount >= 3 };
}

export async function listOpenCommunityReports() {
  const sql = await communityDatabase();
  if (!sql) return null;
  const rows = await sql`SELECT r.id,r.post_id,r.target_type,r.target_id,r.reason,r.details,r.created_at,p.title AS post_title,CASE WHEN r.target_type='post' THEN p.content ELSE c.content END AS target_content,CASE WHEN r.target_type='post' THEN p.moderation_status ELSE c.moderation_status END AS moderation_status FROM community_reports r JOIN community_posts p ON p.id=r.post_id LEFT JOIN community_comments c ON r.target_type='comment' AND c.id=r.target_id WHERE r.status='open' AND (r.target_type='post' OR c.id IS NOT NULL) ORDER BY r.created_at DESC LIMIT 100` as CommunityRow[];
  return rows.map((row) => ({
    id: String(row.id), postId: String(row.post_id), targetType: String(row.target_type), targetId: String(row.target_id),
    reason: String(row.reason), details: row.details ? String(row.details) : "", createdAt: Number(row.created_at),
    postTitle: String(row.post_title), targetContent: String(row.target_content || "").slice(0, 240), moderationStatus: String(row.moderation_status),
  }));
}

export async function applyCommunityModeration(targetType: "post" | "comment", targetId: string, status: "active" | "hidden") {
  const sql = await communityDatabase();
  if (!sql) return { unavailable: true as const };
  const updated = targetType === "post"
    ? await sql`UPDATE community_posts SET moderation_status=${status} WHERE id=${targetId} RETURNING id` as CommunityRow[]
    : await sql`UPDATE community_comments SET moderation_status=${status} WHERE id=${targetId} RETURNING id` as CommunityRow[];
  if (!updated[0]) return { missing: true as const };
  const reportStatus = status === "active" ? "dismissed" : "resolved";
  await sql`UPDATE community_reports SET status=${reportStatus},resolved_at=${Date.now()} WHERE target_type=${targetType} AND target_id=${targetId} AND status='open'`;
  return { updated: true as const };
}
