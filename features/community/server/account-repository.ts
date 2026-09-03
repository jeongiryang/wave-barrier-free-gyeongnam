import { communityDatabase, type CommunitySql } from "./database";

const DELETION_GRANT_TTL_MS = 48 * 60 * 60 * 1000;

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function tokenHash(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToHex(new Uint8Array(digest));
}

export async function prepareCommunityAccountDeletion(userId: string) {
  const sql = await communityDatabase();
  if (!sql) return null;
  const token = bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await tokenHash(token);
  const now = Date.now();
  await sql.transaction([
    sql`DELETE FROM account_deletion_grants WHERE user_id=${userId} OR expires_at<=${now}`,
    sql`INSERT INTO account_deletion_grants (token_hash,user_id,created_at,expires_at) VALUES (${hash},${userId},${now},${now + DELETION_GRANT_TTL_MS})`,
  ]);
  return { sql, token, hash };
}

export async function revokeCommunityAccountDeletion(sql: CommunitySql, hash: string) {
  await sql`DELETE FROM account_deletion_grants WHERE token_hash=${hash}`;
}

export async function completeCommunityAccountDeletion(sql: CommunitySql, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  const hash = await tokenHash(token);
  const rows = await sql`SELECT user_id FROM account_deletion_grants WHERE token_hash=${hash} AND expires_at>${Date.now()} LIMIT 1` as Array<{ user_id: string }>;
  const userId = String(rows[0]?.user_id || "");
  if (!userId) return false;
  await sql.transaction([
    sql`DELETE FROM community_reports WHERE reporter_id=${userId} OR post_id IN (SELECT id FROM community_posts WHERE author_id=${userId}) OR (target_type='comment' AND target_id IN (SELECT id FROM community_comments WHERE author_id=${userId}))`,
    sql`DELETE FROM community_likes WHERE user_id=${userId}`,
    sql`DELETE FROM community_comments WHERE author_id=${userId}`,
    sql`DELETE FROM community_posts WHERE author_id=${userId}`,
    sql`DELETE FROM account_deletion_grants WHERE token_hash=${hash}`,
  ]);
  return true;
}

export async function completeCommunityAccountDeletionFromToken(token: string) {
  const sql = await communityDatabase();
  return sql ? completeCommunityAccountDeletion(sql, token) : null;
}

export async function sweepExpiredAccountDeletionGrants(sql: CommunitySql, now = Date.now()) {
  const rows = await sql`DELETE FROM account_deletion_grants WHERE expires_at<=${now} RETURNING token_hash` as Array<{ token_hash: string }>;
  return rows.length;
}
