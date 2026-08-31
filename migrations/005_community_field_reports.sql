-- 공식 접근성 근거와 분리해 보관하는 여행자 현장 제보와 여행일지 연결 정보.
-- 런타임 DDL(features/community/server/database.ts)과 같은 내용이며 이 파일이 기준이다.

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS visit_date VARCHAR(10);

-- migrate:split

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS field_reports JSONB NOT NULL DEFAULT '[]'::jsonb;

-- migrate:split

ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS journal_places JSONB NOT NULL DEFAULT '[]'::jsonb;

-- migrate:split

CREATE INDEX IF NOT EXISTS community_posts_journal_places_idx ON community_posts USING GIN (journal_places);
