-- 기존 커뮤니티 테이블에 현장 확인 정보 글 종류만 추가한다.
-- 장소 좌표나 장애·건강·자격 필드는 추가하지 않는다.
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS community_posts_category_check;

-- migrate:split
ALTER TABLE community_posts
  ADD CONSTRAINT community_posts_category_check
  CHECK (category IN ('general', 'place', 'review', 'tips', 'together', 'travel-talk', 'field-report')) NOT VALID;

-- migrate:split
ALTER TABLE community_posts VALIDATE CONSTRAINT community_posts_category_check;

-- migrate:split
CREATE INDEX IF NOT EXISTS community_posts_field_report_place_idx
  ON community_posts (place_id, visit_date DESC, created_at DESC)
  WHERE category='field-report' AND moderation_status='active';
