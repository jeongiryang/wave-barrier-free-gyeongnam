CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'place', 'review')),
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  region VARCHAR(20),
  place_id VARCHAR(100),
  place_name VARCHAR(120),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  CHECK ((place_id IS NULL AND place_name IS NULL) OR (place_id IS NOT NULL AND place_name IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS community_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content VARCHAR(1000) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_likes (
  post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON community_posts (created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_category_created_idx ON community_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_place_created_idx ON community_posts (place_id, created_at DESC) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS community_posts_author_created_idx ON community_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_comments_post_created_idx ON community_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS community_comments_author_created_idx ON community_comments (author_id, created_at DESC);
