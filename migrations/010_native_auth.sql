-- Reviewed additive pre-cutover migration for #351. Do not run on request startup.
-- Existing IDs, credentials, ownership, sessions and managed config are unchanged.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '15s';
-- A duplicate causes rollback; never resolve duplicates by deleting an account.
CREATE UNIQUE INDEX IF NOT EXISTS wave_account_provider_unique ON neon_auth.account ("providerId", "accountId");
CREATE TABLE IF NOT EXISTS neon_auth."rateLimit" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  count INTEGER NOT NULL,
  "lastRequest" BIGINT NOT NULL
);
COMMIT;
