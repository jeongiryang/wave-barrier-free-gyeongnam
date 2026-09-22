import { matchesProductionDatabase, PRODUCTION_DATABASE_TARGET } from "./database-preflight.js";

export const COMMUNITY_DEMO_BATCH = Object.freeze({
  id: "wave-community-demo-2026-v1",
  ownerKey: "wave-community-demo-fixtures",
  label: "합성 데모 예시",
  createdAt: Date.UTC(2026, 8, 20),
  posts: 360,
  comments: 720,
});

export const COMMUNITY_DEMO_PRODUCTION_TARGET = `${PRODUCTION_DATABASE_TARGET.endpoint}/${PRODUCTION_DATABASE_TARGET.database}`;

const countFields = [
  "batchRows", "postsTotal", "postsActive", "postsNonDemo", "postsNonDemoActive",
  "postsBatch", "postsBatchActive", "postsBatchHidden", "commentsTotal", "commentsActive",
  "commentsNonDemo", "commentsNonDemoActive", "commentsBatch", "commentsBatchActive",
  "commentsBatchHidden", "realCommentsOnBatchPosts", "likesTotal", "likesOnBatchPosts",
  "likesOnNonBatchPosts", "reportsTotal", "reportsOpen", "reportsOnBatchPosts",
  "reportsOnNonBatchPosts", "foreignPostCollisions", "foreignCommentCollisions",
  "extraBatchPosts", "extraBatchComments",
];

export const COMMUNITY_DEMO_SNAPSHOT_SQL = `
WITH expected_columns(table_name, column_name, udt_name, is_nullable) AS (VALUES
  ('community_demo_batches','id','varchar','NO'), ('community_demo_batches','owner_key','varchar','NO'),
  ('community_demo_batches','label','varchar','NO'), ('community_demo_batches','created_at','int8','NO'),
  ('community_posts','id','text','NO'), ('community_posts','author_id','text','NO'),
  ('community_posts','author_name','text','NO'), ('community_posts','category','text','NO'),
  ('community_posts','title','varchar','NO'), ('community_posts','content','text','NO'),
  ('community_posts','region','varchar','YES'), ('community_posts','place_id','varchar','YES'),
  ('community_posts','place_name','varchar','YES'), ('community_posts','created_at','int8','NO'),
  ('community_posts','updated_at','int8','NO'), ('community_posts','moderation_status','varchar','NO'),
  ('community_posts','visit_date','varchar','YES'), ('community_posts','field_reports','jsonb','NO'),
  ('community_posts','journal_places','jsonb','NO'), ('community_posts','visit_photos','jsonb','NO'),
  ('community_posts','demo_batch_id','varchar','YES'),
  ('community_comments','id','text','NO'), ('community_comments','post_id','text','NO'),
  ('community_comments','author_id','text','NO'), ('community_comments','author_name','text','NO'),
  ('community_comments','content','varchar','NO'), ('community_comments','created_at','int8','NO'),
  ('community_comments','updated_at','int8','NO'), ('community_comments','moderation_status','varchar','NO'),
  ('community_comments','demo_batch_id','varchar','YES'),
  ('community_likes','post_id','text','NO'), ('community_likes','user_id','text','NO'),
  ('community_likes','created_at','int8','NO'), ('community_reports','id','text','NO'),
  ('community_reports','post_id','text','NO'), ('community_reports','target_type','varchar','NO'),
  ('community_reports','target_id','text','NO'), ('community_reports','status','varchar','NO')
)
SELECT
  current_database() AS database_name,
  current_setting('transaction_read_only') AS read_only,
  (
    NOT EXISTS (SELECT 1 FROM expected_columns e LEFT JOIN information_schema.columns c
      ON c.table_schema='public' AND c.table_name=e.table_name AND c.column_name=e.column_name
      WHERE c.column_name IS NULL OR c.udt_name<>e.udt_name OR c.is_nullable<>e.is_nullable)
    AND to_regclass('public.community_demo_batches') IS NOT NULL
    AND EXISTS (SELECT 1 FROM pg_constraint c
      WHERE c.conname='community_posts_demo_batch_fk' AND c.conrelid='public.community_posts'::regclass
        AND c.confrelid='public.community_demo_batches'::regclass AND c.contype='f' AND c.convalidated
        AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.community_posts'::regclass AND attname='demo_batch_id')]::smallint[]
        AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.community_demo_batches'::regclass AND attname='id')]::smallint[])
    AND EXISTS (SELECT 1 FROM pg_constraint c
      WHERE c.conname='community_comments_demo_batch_fk' AND c.conrelid='public.community_comments'::regclass
        AND c.confrelid='public.community_demo_batches'::regclass AND c.contype='f' AND c.convalidated
        AND c.conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.community_comments'::regclass AND attname='demo_batch_id')]::smallint[]
        AND c.confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.community_demo_batches'::regclass AND attname='id')]::smallint[])
  ) AS schema_matches,
  (SELECT count(*) FROM community_demo_batches WHERE id = $1) AS batch_rows,
  NOT EXISTS (
    SELECT 1 FROM community_demo_batches
    WHERE id = $1 AND (owner_key <> $2 OR label <> $3 OR created_at <> $4)
  ) AS batch_metadata_matches,
  (SELECT count(*) FROM community_posts) AS posts_total,
  (SELECT count(*) FROM community_posts WHERE moderation_status = 'active') AS posts_active,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id IS NULL) AS posts_non_demo,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id IS NULL AND moderation_status = 'active') AS posts_non_demo_active,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id = $1) AS posts_batch,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id = $1 AND moderation_status = 'active') AS posts_batch_active,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id = $1 AND moderation_status = 'hidden') AS posts_batch_hidden,
  (SELECT count(*) FROM community_comments) AS comments_total,
  (SELECT count(*) FROM community_comments WHERE moderation_status = 'active') AS comments_active,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id IS NULL) AS comments_non_demo,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id IS NULL AND moderation_status = 'active') AS comments_non_demo_active,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id = $1) AS comments_batch,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id = $1 AND moderation_status = 'active') AS comments_batch_active,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id = $1 AND moderation_status = 'hidden') AS comments_batch_hidden,
  (SELECT count(*) FROM community_comments c
    WHERE c.demo_batch_id IS DISTINCT FROM $1
      AND EXISTS (SELECT 1 FROM community_posts p WHERE p.id = c.post_id AND p.demo_batch_id = $1)) AS real_comments_on_batch_posts,
  (SELECT count(*) FROM community_likes) AS likes_total,
  (SELECT count(*) FROM community_likes l
    WHERE EXISTS (SELECT 1 FROM community_posts p WHERE p.id = l.post_id AND p.demo_batch_id = $1)) AS likes_on_batch_posts,
  (SELECT count(*) FROM community_likes l
    WHERE NOT EXISTS (SELECT 1 FROM community_posts p WHERE p.id = l.post_id AND p.demo_batch_id = $1)) AS likes_on_non_batch_posts,
  (SELECT count(*) FROM community_reports) AS reports_total,
  (SELECT count(*) FROM community_reports WHERE status = 'open') AS reports_open,
  (SELECT count(*) FROM community_reports r
    WHERE EXISTS (SELECT 1 FROM community_posts p WHERE p.id = r.post_id AND p.demo_batch_id = $1)) AS reports_on_batch_posts,
  (SELECT count(*) FROM community_reports r
    WHERE NOT EXISTS (SELECT 1 FROM community_posts p WHERE p.id = r.post_id AND p.demo_batch_id = $1)) AS reports_on_non_batch_posts,
  (SELECT count(*) FROM community_posts WHERE id = ANY($5::text[]) AND demo_batch_id IS DISTINCT FROM $1) AS foreign_post_collisions,
  (SELECT count(*) FROM community_comments WHERE id = ANY($6::text[]) AND demo_batch_id IS DISTINCT FROM $1) AS foreign_comment_collisions,
  (SELECT count(*) FROM community_posts WHERE demo_batch_id = $1 AND NOT (id = ANY($5::text[]))) AS extra_batch_posts,
  (SELECT count(*) FROM community_comments WHERE demo_batch_id = $1 AND NOT (id = ANY($6::text[]))) AS extra_batch_comments`;

const integer = (value) => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export function productionTargetMatches(databaseUrl, targetArg, vercelEnv) {
  return matchesProductionDatabase(databaseUrl)
    && targetArg === COMMUNITY_DEMO_PRODUCTION_TARGET
    && (!vercelEnv || vercelEnv === "production");
}

export function snapshotParams(data) {
  return [
    COMMUNITY_DEMO_BATCH.id,
    COMMUNITY_DEMO_BATCH.ownerKey,
    COMMUNITY_DEMO_BATCH.label,
    COMMUNITY_DEMO_BATCH.createdAt,
    data.posts.map((post) => post.id),
    data.comments.map((comment) => comment.id),
  ];
}

export function normalizeDemoSnapshot(row, { requireReadOnly = false, expectedDatabase } = {}) {
  if (!row || (expectedDatabase && row.database_name !== expectedDatabase) || row.schema_matches !== true
    || row.batch_metadata_matches !== true || (requireReadOnly && row.read_only !== "on")) return null;
  const snapshot = {
    database: row.database_name,
    readOnly: row.read_only === "on",
    schema019: true,
    batchMetadataMatches: true,
  };
  for (const field of countFields) {
    const snake = field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    const value = integer(row[snake]);
    if (value === null) return null;
    snapshot[field] = value;
  }
  if (snapshot.batchRows > 1 || snapshot.postsBatch > COMMUNITY_DEMO_BATCH.posts
    || snapshot.commentsBatch > COMMUNITY_DEMO_BATCH.comments
    || snapshot.foreignPostCollisions || snapshot.foreignCommentCollisions
    || snapshot.extraBatchPosts || snapshot.extraBatchComments) return null;
  const absent = snapshot.batchRows === 0 && snapshot.postsBatch === 0 && snapshot.commentsBatch === 0;
  const complete = snapshot.batchRows === 1 && snapshot.postsBatch === COMMUNITY_DEMO_BATCH.posts
    && snapshot.commentsBatch === COMMUNITY_DEMO_BATCH.comments;
  if (!absent && !complete) return null;
  return snapshot;
}

export function preservationValues(snapshot) {
  return [
    snapshot.postsNonDemo, snapshot.postsNonDemoActive,
    snapshot.commentsNonDemo, snapshot.commentsNonDemoActive,
    snapshot.realCommentsOnBatchPosts,
    snapshot.likesTotal, snapshot.likesOnBatchPosts,
    snapshot.reportsTotal, snapshot.reportsOnBatchPosts,
  ];
}

export function preservationAssertionSql(offset = 2) {
  const p = (index) => `$${offset + index}`;
  return `SELECT 1 / CASE WHEN
    (SELECT count(*) FROM community_posts WHERE demo_batch_id IS NULL) = ${p(0)}
    AND (SELECT count(*) FROM community_posts WHERE demo_batch_id IS NULL AND moderation_status='active') = ${p(1)}
    AND (SELECT count(*) FROM community_comments WHERE demo_batch_id IS NULL) = ${p(2)}
    AND (SELECT count(*) FROM community_comments WHERE demo_batch_id IS NULL AND moderation_status='active') = ${p(3)}
    AND (SELECT count(*) FROM community_comments c WHERE c.demo_batch_id IS DISTINCT FROM $1
      AND EXISTS (SELECT 1 FROM community_posts p WHERE p.id=c.post_id AND p.demo_batch_id=$1)) = ${p(4)}
    AND (SELECT count(*) FROM community_likes) = ${p(5)}
    AND (SELECT count(*) FROM community_likes l WHERE EXISTS
      (SELECT 1 FROM community_posts p WHERE p.id=l.post_id AND p.demo_batch_id=$1)) = ${p(6)}
    AND (SELECT count(*) FROM community_reports) = ${p(7)}
    AND (SELECT count(*) FROM community_reports r WHERE EXISTS
      (SELECT 1 FROM community_posts p WHERE p.id=r.post_id AND p.demo_batch_id=$1)) = ${p(8)}
    THEN 1 ELSE 0 END AS preserved`;
}
