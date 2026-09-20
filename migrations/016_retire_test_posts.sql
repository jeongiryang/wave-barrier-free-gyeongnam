-- Owner-requested removal of the two identified development posts, 2026-09-20.
-- Preserve records for recovery; never match other posts by title alone.
UPDATE community_posts
SET moderation_status = 'hidden'
WHERE moderation_status <> 'hidden'
  AND ((id = 'f8adec55-71f0-4a34-9b17-666ca8fc101d' AND title = '오류 확인 테스트')
    OR (id = '560f4a61-767c-43e0-b956-f724fb61f484' AND title = '질문드립니다'));
