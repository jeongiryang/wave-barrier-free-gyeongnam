-- One-time account-owned examples for the explicitly named judge login.
-- Read public editorial plans and their verified KTO IDs; never copy provider
-- place names, facilities, coordinates, routes, photos, or API responses.
CREATE TABLE IF NOT EXISTS judge_account_seed_runs (
  username TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  seeded_at BIGINT NOT NULL
);
-- migrate:split
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi') THEN
    IF (SELECT COUNT(*) FROM neon_auth."user" WHERE username = 'openapi') <> 1 THEN
      RAISE EXCEPTION 'judge account username is missing or ambiguous';
    END IF;
    IF (SELECT COUNT(*) FROM wave_account_trips WHERE user_id =
      (SELECT id::text FROM neon_auth."user" WHERE username = 'openapi')) > 15 THEN
      RAISE EXCEPTION 'judge account has too many existing trips to add examples';
    END IF;
  END IF;
END $$;
-- migrate:split
WITH judge AS (
  SELECT id::text AS id FROM neon_auth."user"
  WHERE username = 'openapi' AND NOT EXISTS
    (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi')
), anchor AS (
  SELECT (now() AT TIME ZONE 'Asia/Seoul')::date + 7 AS first_day,
    FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint AS now_ms
), plans AS (
  SELECT t.*, mapping.account_id
  FROM judge_demo_trips t JOIN (VALUES
    ('judge-changwon', '78ac85f4-ce49-4585-9f46-024c30040856'),
    ('judge-tongyeong', '5343a300-b31c-4142-927d-b35019c7b6c9'),
    ('judge-jinju', 'f39a0fb0-92b3-4c70-be29-58fbe85469a2'),
    ('judge-geoje', 'aaefdfc0-200b-4c46-9b2b-5f60996a336e'),
    ('judge-gimhae', '69fda030-e924-4001-b3dc-80c07d5d9243')
  ) AS mapping(template_id, account_id) ON t.id = mapping.template_id
)
INSERT INTO wave_account_trips (id, user_id, payload, revision, created_at, updated_at, invite_hash, invite_expires)
SELECT plans.account_id, judge.id,
  jsonb_build_object(
    'version', 1, 'title', plans.title, 'region', plans.region,
    'travelStart', to_char(anchor.first_day, 'YYYY-MM-DD'),
    'travelEnd', to_char(anchor.first_day + (SELECT MAX(value::int) FROM jsonb_array_elements_text(plans.day_offsets) AS offsets(value)), 'YYYY-MM-DD'),
    'dayStartTime', '10:00', 'travelMode', 'transit',
    'themes', jsonb_build_array(CASE WHEN plans.theme = '자연·휴양' THEN 'nature' ELSE 'history' END),
    'profiles', plans.profile_keys, 'guidancePreferences', '{}'::jsonb,
    'comfort', jsonb_build_object('maxWalkMinutes', 30, 'breakEveryMinutes', 90, 'breakMinutes', 15),
    'placeIds', plans.place_ids,
    'scheduleAssignments', (SELECT jsonb_object_agg(p.place_id,
      to_char(anchor.first_day + (plans.day_offsets ->> (p.position::int - 1))::int, 'YYYY-MM-DD'))
      FROM jsonb_array_elements_text(plans.place_ids) WITH ORDINALITY AS p(place_id, position)),
    'visitMinutesByPlaceId', (SELECT jsonb_object_agg(p.place_id, plans.visit_minutes -> (p.position::int - 1))
      FROM jsonb_array_elements_text(plans.place_ids) WITH ORDINALITY AS p(place_id, position)),
    'breakMinutesByPlaceId', (SELECT jsonb_object_agg(p.place_id, plans.break_minutes -> (p.position::int - 1))
      FROM jsonb_array_elements_text(plans.place_ids) WITH ORDINALITY AS p(place_id, position)),
    'restPurposeByPlaceId', jsonb_build_object(plans.place_ids ->> 0, 'rest'),
    'fixedVisits', '{}'::jsonb, 'dayDeadlines', '{}'::jsonb,
    'status', 'planned',
    'note', plans.note || ' [시연] 실제 방문 기록이나 시설 확인 결과가 아닙니다.'
  )::text,
  1, anchor.now_ms - plans.sort_order * 1000, anchor.now_ms - plans.sort_order * 1000, NULL, 0
FROM plans CROSS JOIN judge CROSS JOIN anchor
ON CONFLICT (id) DO NOTHING;
-- migrate:split
INSERT INTO wave_travel_preferences (user_id, selected_ids, revision, updated_at)
SELECT id::text, '["route","restroom"]', 1, FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint
FROM neon_auth."user"
WHERE username = 'openapi' AND NOT EXISTS
  (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi')
ON CONFLICT (user_id) DO NOTHING;
-- migrate:split
INSERT INTO community_demo_batches (id, owner_key, label, created_at)
VALUES ('judge-openapi-2026-v1', 'judge-account-openapi', '심사 계정 예시', FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint)
ON CONFLICT (id) DO NOTHING;
-- migrate:split
INSERT INTO community_posts
  (id, author_id, author_name, category, title, content, region, place_id, place_name,
   visit_date, field_reports, journal_places, visit_photos, created_at, updated_at,
   moderation_status, demo_batch_id)
SELECT examples.id, judge.id::text, 'openapi · 시연 계정', examples.category, examples.title,
  examples.content, examples.region, NULL, NULL, NULL, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint - examples.sort_order * 1000,
  FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint - examples.sort_order * 1000,
  'active', 'judge-openapi-2026-v1'
FROM neon_auth."user" AS judge CROSS JOIN (VALUES
  ('judge-openapi-post-01', 'tips', '[시연] openapi 계정의 여행 준비 메모',
   '이 글은 심사 계정에서 게시글 수정과 댓글 기능을 확인하기 위한 예시입니다. 실제 방문 후기나 시설 확인 결과가 아닙니다. 여행 중 쉬는 시간과 필요한 편의를 직접 조정해 보세요.', '창원', 1),
  ('judge-openapi-post-02', 'travel-talk', '[시연] openapi 계정의 일정 의견 나누기',
   '동행자와 방문 순서·휴식 시간을 이야기해 보는 시연용 글입니다. 실제 관광지 운영과 편의 정보는 공식 조회 또는 현장 문의로 확인해 주세요.', '통영', 2)
) AS examples(id, category, title, content, region, sort_order)
WHERE judge.username = 'openapi' AND NOT EXISTS
  (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi')
ON CONFLICT (id) DO NOTHING;
-- migrate:split
INSERT INTO community_comments
  (id, post_id, author_id, author_name, content, created_at, updated_at, moderation_status, demo_batch_id)
SELECT 'judge-openapi-comment-01', 'judge-openapi-post-01', judge.id::text, 'openapi · 시연 계정',
  '[시연] 댓글 수정·삭제도 이 계정에서 확인할 수 있습니다.',
  FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint,
  'active', 'judge-openapi-2026-v1'
FROM neon_auth."user" AS judge
WHERE judge.username = 'openapi' AND NOT EXISTS
  (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi')
ON CONFLICT (id) DO NOTHING;
-- migrate:split
DO $$ DECLARE judge_id TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM judge_account_seed_runs WHERE username = 'openapi') THEN
    SELECT id::text INTO judge_id FROM neon_auth."user" WHERE username = 'openapi';
    IF (SELECT COUNT(*) FROM wave_account_trips WHERE user_id = judge_id AND id IN
      ('78ac85f4-ce49-4585-9f46-024c30040856', '5343a300-b31c-4142-927d-b35019c7b6c9',
       'f39a0fb0-92b3-4c70-be29-58fbe85469a2', 'aaefdfc0-200b-4c46-9b2b-5f60996a336e',
       '69fda030-e924-4001-b3dc-80c07d5d9243')) <> 5
       OR NOT EXISTS (SELECT 1 FROM wave_travel_preferences WHERE user_id = judge_id)
       OR (SELECT COUNT(*) FROM community_posts WHERE author_id = judge_id AND id IN
          ('judge-openapi-post-01', 'judge-openapi-post-02')) <> 2
       OR NOT EXISTS (SELECT 1 FROM community_comments WHERE id = 'judge-openapi-comment-01' AND author_id = judge_id)
    THEN
      RAISE EXCEPTION 'judge account examples were not saved completely';
    END IF;
    INSERT INTO judge_account_seed_runs (username, user_id, seeded_at)
    VALUES ('openapi', judge_id, FLOOR(EXTRACT(EPOCH FROM now()) * 1000)::bigint);
  END IF;
END $$;
