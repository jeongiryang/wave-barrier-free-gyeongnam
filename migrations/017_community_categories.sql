-- Match the approved desktop community tabs. Existing records are retained.
ALTER TABLE community_posts
  DROP CONSTRAINT IF EXISTS community_posts_category_check,
  ADD CONSTRAINT community_posts_category_check
    CHECK (category IN ('general', 'place', 'review', 'tips', 'together', 'travel-talk', 'field-report'));
