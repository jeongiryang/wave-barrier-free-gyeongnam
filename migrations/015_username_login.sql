-- Additive only: existing email logins, credentials and ownership stay unchanged.
ALTER TABLE neon_auth."user" ADD COLUMN IF NOT EXISTS username TEXT;
-- migrate:split
ALTER TABLE neon_auth."user" ADD COLUMN IF NOT EXISTS "displayUsername" TEXT;
-- migrate:split
CREATE UNIQUE INDEX IF NOT EXISTS wave_username_unique ON neon_auth."user" (username);
