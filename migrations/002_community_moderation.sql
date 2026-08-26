ALTER TABLE community_posts
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE community_comments
  ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_posts_moderation_status_check'
      AND conrelid = 'community_posts'::regclass
  ) THEN
    ALTER TABLE community_posts
      ADD CONSTRAINT community_posts_moderation_status_check
      CHECK (moderation_status IN ('active', 'under_review', 'hidden')) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_comments_moderation_status_check'
      AND conrelid = 'community_comments'::regclass
  ) THEN
    ALTER TABLE community_comments
      ADD CONSTRAINT community_comments_moderation_status_check
      CHECK (moderation_status IN ('active', 'under_review', 'hidden')) NOT VALID;
  END IF;
END $$;

ALTER TABLE community_posts
  VALIDATE CONSTRAINT community_posts_moderation_status_check;
ALTER TABLE community_comments
  VALIDATE CONSTRAINT community_comments_moderation_status_check;

CREATE TABLE IF NOT EXISTS community_reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('post', 'comment')),
  target_id TEXT NOT NULL,
  reason VARCHAR(20) NOT NULL CHECK (reason IN ('incorrect', 'unsafe', 'spam', 'abuse', 'privacy', 'other')),
  details VARCHAR(500),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at BIGINT NOT NULL,
  resolved_at BIGINT,
  UNIQUE (reporter_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS community_reports_status_created_idx
  ON community_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reports_target_idx
  ON community_reports (target_type, target_id, status);
