-- 공개 이용 예시. 실제 이용자 후기로 오인되지 않도록 제목과 본문에 샘플임을 명시한다.
INSERT INTO community_posts (
  id, author_id, author_name, category, title, content, region,
  place_id, place_name, created_at, updated_at, moderation_status
) VALUES
  (
    'seed-changwon-access', 'wave-seed', 'W.A.V.E 여행메이트', 'place',
    '[샘플] 창원 무장애 여행 동선에서 확인할 것',
    '실제 여행자가 작성한 글이 아닌 이용 예시입니다. 창원 여행에서는 출발 전 관광지의 접근로, 장애인 화장실, 엘리베이터 운영정보를 공식 상세 화면에서 다시 확인해 주세요.',
    '창원', NULL, NULL, 1787931000000, 1787931000000, 'active'
  ),
  (
    'seed-jinju-evening', 'wave-seed', 'W.A.V.E 여행메이트', 'general',
    '[샘플] 진주 저녁 일정은 이동시간을 넉넉하게',
    '실제 여행자가 작성한 글이 아닌 이용 예시입니다. 진주에서 여러 장소를 묶을 때는 실제 길찾기 결과와 날씨·운영시간을 함께 확인하고, 이동이 어려운 동행자가 있다면 체류시간을 여유 있게 조정해 보세요.',
    '진주', NULL, NULL, 1787931060000, 1787931060000, 'active'
  ),
  (
    'seed-tongyeong-transport', 'wave-seed', 'W.A.V.E 여행메이트', 'general',
    '[샘플] 통영에서 대중교통으로 움직일 때',
    '실제 여행자가 작성한 글이 아닌 이용 예시입니다. 통영 이동은 서비스의 대중교통 운행정보와 카카오맵 경로를 함께 비교하고, 승하차 지점의 접근성은 방문 전에 별도로 확인하는 것을 권장합니다.',
    '통영', NULL, NULL, 1787931120000, 1787931120000, 'active'
  ),
  (
    'seed-namhae-slow', 'wave-seed', 'W.A.V.E 여행메이트', 'review',
    '[샘플] 남해 하루 코스는 장소 수보다 여유를',
    '실제 여행자가 작성한 글이 아닌 이용 예시입니다. 남해처럼 이동거리가 길어질 수 있는 지역에서는 추천 장소를 많이 담기보다 길찾기 예상시간과 휴식시간을 먼저 보고 하루 일정을 구성해 보세요.',
    '남해', NULL, NULL, 1787931180000, 1787931180000, 'active'
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  content = EXCLUDED.content,
  region = EXCLUDED.region,
  updated_at = EXCLUDED.updated_at,
  moderation_status = 'active';
