-- 출시 후 공개 커뮤니티에는 실제 이용자가 작성한 글만 노출한다.
-- 기존 seed 행은 감사와 롤백을 위해 보존하되 공개 상태에서 제외한다.
UPDATE community_posts
SET moderation_status = 'hidden'
WHERE author_id = 'wave-seed'
  AND moderation_status <> 'hidden';
