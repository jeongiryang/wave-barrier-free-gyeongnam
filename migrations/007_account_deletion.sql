CREATE TABLE IF NOT EXISTS account_deletion_grants (
  token_hash CHAR(64) PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  created_at BIGINT NOT NULL,
  expires_at BIGINT NOT NULL
);

-- migrate:split
CREATE INDEX IF NOT EXISTS account_deletion_grants_expires_idx
  ON account_deletion_grants (expires_at);
