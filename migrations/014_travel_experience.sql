CREATE TABLE IF NOT EXISTS wave_observations (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, place_id TEXT NOT NULL, observed_at BIGINT NOT NULL, created_at BIGINT NOT NULL, readings JSONB NOT NULL);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_observations_place_idx ON wave_observations (place_id, observed_at DESC);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_observations_author_idx ON wave_observations (author_id, created_at DESC);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_companions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL, payload JSONB NOT NULL, tokens JSONB NOT NULL, revision INTEGER NOT NULL DEFAULT 1, created_at BIGINT NOT NULL, expires_at BIGINT NOT NULL, revoked BOOLEAN NOT NULL DEFAULT FALSE);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_companions_expiry_idx ON wave_companions (expires_at);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_companions_owner_idx ON wave_companions (owner_id, created_at DESC);
