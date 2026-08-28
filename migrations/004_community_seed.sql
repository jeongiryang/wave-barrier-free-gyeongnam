-- 공모전 기능 시연용 샘플 데이터. 실제 이용자 후기와 혼동되지 않도록 제목과 본문에 샘플임을 명시한다.
INSERT INTO community_posts (
  id, author_id, author_name, category, title, content, region, place_id, place_name,
  created_at, updated_at, moderation_status
) VALUES
  ('seed-wave-changwon-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'review', '[샘플] 창원 진해 해양공원 이동 메모', '공모전 기능 시연용 샘플 글입니다. 창원 여행에서는 이동 전에 주차 위치와 무장애 화장실 정보를 공식 관광정보에서 다시 확인하고, 현장 동선은 여유 있게 잡는 흐름을 예시로 보여줍니다.', '창원', NULL, NULL, 1787922000000, 1787922000000, 'active'),
  ('seed-wave-jinju-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'place', '[샘플] 진주 남강 주변 하루 코스 팁', '공모전 기능 시연용 샘플 글입니다. 진주 남강 주변은 여러 관광지를 한 번에 넣기보다 체류 시간을 충분히 두고, 날씨와 행사 시간에 따라 코스를 바꾸는 사용 예시를 담았습니다.', '진주', NULL, NULL, 1787922600000, 1787922600000, 'active'),
  ('seed-wave-tongyeong-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'review', '[샘플] 통영 바다 여행 이동 체크', '공모전 기능 시연용 샘플 글입니다. 통영에서는 경사가 있는 구간과 대중교통 연결을 출발 전에 확인하고, 이동 부담이 크면 가까운 실내 관광지로 대체하는 흐름을 예시로 설명합니다.', '통영', NULL, NULL, 1787923200000, 1787923200000, 'active'),
  ('seed-wave-namhae-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'place', '[샘플] 남해 여행에서 쉬는 지점 잡기', '공모전 기능 시연용 샘플 글입니다. 남해처럼 이동 거리가 긴 지역은 한 번에 많은 장소를 넣기보다 휴식 지점을 정하고 자동차 이동 시간을 먼저 확인하는 계획 예시입니다.', '남해', NULL, NULL, 1787923800000, 1787923800000, 'active'),
  ('seed-wave-geoje-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'review', '[샘플] 거제 섬 여행 날씨 대응 메모', '공모전 기능 시연용 샘플 글입니다. 거제 여행은 바람과 비에 따라 야외 일정을 조정하고, 상황 정보에서 대체 장소를 확인하는 기능을 보여주기 위한 예시 게시물입니다.', '거제', NULL, NULL, 1787924400000, 1787924400000, 'active'),
  ('seed-wave-sancheong-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'place', '[샘플] 산청 자연 여행 접근성 확인', '공모전 기능 시연용 샘플 글입니다. 산청 자연 관광지는 실제 방문 전에 접근로와 화장실 같은 편의정보를 공식 출처에서 다시 확인하도록 안내하는 예시입니다.', '산청', NULL, NULL, 1787925000000, 1787925000000, 'active'),
  ('seed-wave-gimhae-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'general', '[샘플] 김해 대중교통으로 이동할 때', '공모전 기능 시연용 샘플 글입니다. 김해에서는 버스와 철도 운행정보가 확인되는 범위를 먼저 보고, 문 앞까지 경로가 없으면 카카오맵 대중교통 길찾기로 이어가는 사용 흐름을 보여줍니다.', '김해', NULL, NULL, 1787925600000, 1787925600000, 'active'),
  ('seed-wave-hadong-01', 'wave-demo-seed', 'W.A.V.E 샘플 여행자', 'review', '[샘플] 하동 차밭 여행 동선 메모', '공모전 기능 시연용 샘플 글입니다. 하동 여행은 경사와 이동 거리를 고려해 방문지를 줄이고, 일정에 여유 시간을 두는 방식의 여행 설계 예시를 담았습니다.', '하동', NULL, NULL, 1787926200000, 1787926200000, 'active')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  region = EXCLUDED.region,
  updated_at = EXCLUDED.updated_at,
  moderation_status = 'active';
