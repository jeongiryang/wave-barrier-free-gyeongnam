ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS visit_photos JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(visit_photos)='array' AND jsonb_array_length(visit_photos)<=2);
-- migrate:split
CREATE INDEX IF NOT EXISTS community_posts_facility_history_idx ON community_posts (place_id, visit_date DESC, created_at DESC) WHERE category='review' AND moderation_status='active' AND visit_date IS NOT NULL;
