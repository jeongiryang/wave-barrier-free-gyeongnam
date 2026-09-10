-- Additive account travel storage. Only user-authored fields and public place IDs;
-- no tourism API responses, coordinates, provider tokens or inferred health data.
CREATE TABLE IF NOT EXISTS wave_account_trips (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, created_at BIGINT NOT NULL, updated_at BIGINT NOT NULL,
  invite_hash TEXT, invite_expires BIGINT NOT NULL DEFAULT 0
);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_account_trips_owner ON wave_account_trips(user_id, updated_at);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_trip_members (
  trip_id TEXT NOT NULL REFERENCES wave_account_trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, name VARCHAR(30) NOT NULL, joined_at BIGINT NOT NULL,
  PRIMARY KEY(trip_id,user_id)
);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_trip_members_user ON wave_trip_members(user_id);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_trip_votes (
  trip_id TEXT NOT NULL REFERENCES wave_account_trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, place_id VARCHAR(80) NOT NULL,
  PRIMARY KEY(trip_id,user_id,place_id)
);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_trip_comments (
  id TEXT PRIMARY KEY, trip_id TEXT NOT NULL REFERENCES wave_account_trips(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, name VARCHAR(30) NOT NULL, content VARCHAR(500) NOT NULL, created_at BIGINT NOT NULL
);
-- migrate:split
CREATE INDEX IF NOT EXISTS wave_trip_comments_trip ON wave_trip_comments(trip_id,created_at);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_travel_preferences (
  user_id TEXT PRIMARY KEY, selected_ids TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 1, updated_at BIGINT NOT NULL
);
-- migrate:split
CREATE TABLE IF NOT EXISTS wave_travel_limits (
  user_id TEXT NOT NULL, action TEXT NOT NULL, window_start BIGINT NOT NULL, count INTEGER NOT NULL,
  PRIMARY KEY(user_id,action)
);
