-- Demo content is opt-in and remains distinguishable from user-authored content.
-- This migration adds metadata only; it never inserts demo rows.
CREATE TABLE IF NOT EXISTS community_demo_batches (
  id VARCHAR(80) PRIMARY KEY,
  owner_key VARCHAR(120) NOT NULL,
  label VARCHAR(80) NOT NULL,
  created_at BIGINT NOT NULL
);

-- migrate:split
ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(80);

-- migrate:split
ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS demo_batch_id VARCHAR(80);

-- migrate:split
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_demo_batch_fk'
      AND conrelid = 'community_posts'::regclass
  ) THEN
    ALTER TABLE community_posts
      ADD CONSTRAINT community_posts_demo_batch_fk
      FOREIGN KEY (demo_batch_id) REFERENCES community_demo_batches(id);
  END IF;
END $$;

-- migrate:split
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_comments_demo_batch_fk'
      AND conrelid = 'community_comments'::regclass
  ) THEN
    ALTER TABLE community_comments
      ADD CONSTRAINT community_comments_demo_batch_fk
      FOREIGN KEY (demo_batch_id) REFERENCES community_demo_batches(id);
  END IF;
END $$;

-- migrate:split
CREATE INDEX IF NOT EXISTS community_posts_demo_batch_idx
  ON community_posts (demo_batch_id) WHERE demo_batch_id IS NOT NULL;

-- migrate:split
CREATE INDEX IF NOT EXISTS community_comments_demo_batch_idx
  ON community_comments (demo_batch_id) WHERE demo_batch_id IS NOT NULL;
