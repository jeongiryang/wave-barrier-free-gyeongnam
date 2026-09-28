-- Public, read-only starter plans. Only editorial choices and verified KTO content IDs
-- are stored here; no provider response, facility claim, visit claim or travel time.
CREATE TABLE IF NOT EXISTS judge_demo_trips (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  region TEXT NOT NULL,
  theme TEXT NOT NULL,
  note TEXT NOT NULL,
  profile_keys JSONB NOT NULL,
  place_ids JSONB NOT NULL,
  day_offsets JSONB NOT NULL,
  visit_minutes JSONB NOT NULL,
  break_minutes JSONB NOT NULL,
  sort_order INTEGER NOT NULL,
  CHECK (jsonb_typeof(place_ids) = 'array'),
  CHECK (jsonb_typeof(profile_keys) = 'array'),
  CHECK (jsonb_typeof(day_offsets) = 'array'),
  CHECK (jsonb_typeof(visit_minutes) = 'array'),
  CHECK (jsonb_typeof(break_minutes) = 'array')
);
-- migrate:split
INSERT INTO judge_demo_trips (id, title, region, theme, note, profile_keys, place_ids, day_offsets, visit_minutes, break_minutes, sort_order) VALUES
('judge-changwon', '[시연] 창원 문화와 공원', '창원', '역사·문화', '장소별 운영시간과 출입 편의는 출발 전에 확인하세요.', '["route","restroom"]', '["1748884","1904774","2784014"]', '[0,0,1]', '[75,90,60]', '[15,20,20]', 1),
('judge-tongyeong', '[시연] 통영 전망과 쉬어가기', '통영', '자연·휴양', '방문 순서와 휴식 시간을 직접 바꿔 보세요. 이동 시간은 별도 조회가 필요합니다.', '["parking"]', '["2782790","1622623","2929871"]', '[0,0,0]', '[45,60,60]', '[20,15,20]', 2),
('judge-jinju', '[시연] 진주 자연과 문화', '진주', '자연·휴양', '두 날짜로 나누어 일정을 비교해 보세요. 현장 접근성은 공식 정보를 확인하세요.', '["route","elevator"]', '["127816","1950218","2786064"]', '[0,0,1]', '[90,60,45]', '[30,15,20]', 3),
('judge-geoje', '[시연] 거제 바다와 역사', '거제', '역사·문화', '방문 계획 예시입니다. 이동 경로와 운영시간은 확인 전입니다.', '["restroom"]', '["793469","4114708","2719883"]', '[0,0,1]', '[45,75,60]', '[15,20,20]', 4),
('judge-gimhae', '[시연] 김해 미술과 산책', '김해', '역사·문화', '메모·상태 변경·일정 복원과 두 여행 비교를 시험해 보세요.', '["parking","route"]', '["130841","748486","2916432"]', '[0,0,0]', '[90,60,60]', '[20,20,15]', 5)
ON CONFLICT (id) DO NOTHING;
