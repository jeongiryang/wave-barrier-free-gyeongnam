-- Preserve user content; future-dated field experiences require moderation.
-- Do not automatically publish these rows when their dates eventually arrive.
UPDATE community_posts p
SET moderation_status = 'under_review'
WHERE p.moderation_status = 'active'
  AND (
    p.visit_date > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.journal_places) item
      WHERE item->>'day' > to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD')
    )
  );
