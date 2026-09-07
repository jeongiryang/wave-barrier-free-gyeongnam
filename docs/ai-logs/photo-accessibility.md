# 관광사진 상태와 지역명 접근성 수정

- 2026-09-07 UTC, Engineering executor. 관련 #269/#270/#285 및 KO/EN 핵심 여정 요구.
- 기준 c1bae6f 통합 후보에서 독립 `fix/photo-accessibility` worktree를 만들었다. #342 포커스 변경과 원본 브랜치는 보존하며 리뷰 전 base에 source를 밀어 넣지 않는다.
- 실제 390/1366 캡처의 흰 사진 위 지역명이 흰색을 상속해 대비 1:1이었다. `.city-chip`에 짙은 글자와 불투명 흰 바탕을 지정해 사진 색·테마에 의존하지 않게 했다.
- `SmartSpotImage`의 한국어 고정 alt/로딩/실패 안내를 현재 KO/EN 설정에 맞췄다. 응답 없음·오류는 사진을 곧 제공한다는 약속 대신 현재 확인 불가로 설명한다. 원문 제목·지역명에 언어를 표시하고 기존 공식 사진 요청/ID/재시도/보안 URL/지연 로딩/이미지 크기는 보존했다.

## 실행 근거

- 수정 전 c1 앱: 새 브라우저24건 모두 FAIL. 대비1:1과 한국어 고정 안내/기존 준비 중 문구를 확인했다. trace·error-context·캡처는 `wave-launch-20260906/photo-before-*`에 보존.
- 수정 후 같은24건 PASS(26.8초): KO/EN × light/dark × desktop/mobile, 흰 사진 성공·실제 브라우저 이미지 decode 실패·공식 대체 조회 empty/HTTP503, 로딩 이름·실패 안내·장소1001 유지·일정 추가·axe·가로 overflow·pageerror. 합성 사진/응답은 E2E fixture이며 실제 KTO 호출 성공으로 세지 않는다.
- 390/1366 영어 캡처를 직접 확인: 지역명 식별 가능, 사진 없음 안내 영어, 레이아웃 유지. 원문 관광지/주소는 기존 원문 안내와 함께 보존한다.
- lint/typecheck/unit491/Vercel production build/performance PASS. 최초unit490 PASS/1 FAIL은 기존 `공식 사진 준비 중` exact-copy 계약이었다. 실패 상태 조건과 KO/EN 설명을 모두 검사하도록 갱신했고 동작 E2E를 추가했다. 테스트 삭제·skip 추가·timeout/대비 기준 완화 없음.
- CSS69.83/70, 랜딩115.11/155, 플래너269.59/270, 최대chunk95.92/110KiB. npm audit 전체0건; 의존성 변경 없음.
- 첫 전체630개는627 PASS/기존skip1/2 FAIL(15.2분). 두 실패는 core-journeys:55가 기존 `공식 사진 준비 중`을 찾던 exact-copy 검사였고 axe 위반은 아니었다. error-context/trace/캡처를 확인한 뒤 새 상태 문구를 exact:true로 확인하도록 갱신했다. 기존 상세/일정/경로/복원/axe 검사는 보존했다. 핵심 여정+사진42 PASS(57.4초).
- 이 테스트 계약 보완 SHA의 전체630개·CI는 다시 실행한다. 앱은6ab7b57과 동일하다. #342와 합성한 c70539d Preview는04:17:13 UTC Ready이며 영어 실제 KTO추천7곳과 `Photo of` 이름을 확인했다. 이미지 실패24건은 fixture이며 Production 실장애를 만들지 않았다. 아직 최종전체/CI/Production 완료가 아니다.
- 독립 QA의 WCAG 3.1.2 P1 지적을 반영해 영어 문구와 한국어 고유명을 하나의 언어 없는 문자열로 합치지 않았다. 영어 로딩·실패 문구에는 `lang="en"`, 한국어 장소·지역에는 `lang="ko"`를 지정했고, 이미지 대체텍스트는 역할 중복을 피하고 원문 장소명 언어를 표시했다. 성공·로딩·empty/503 상태의 문서 상속과 요소 `lang` 회귀를 추가했다. 이 증분의 최신 HEAD CI·Preview·독립 QA 재판정은 아직 대기 중이다.

## 남은 범위

#342와 함께 통합 시 성능 예산과 회귀를 다시 검사한다. 현재 Production34e6021/사람 승인3건/008 운영 적용 및 외부 게이트는 그대로다. 모바일 추천 이동 버튼이 세로로 배치되는 기존 정보 위계도 별도 확인이 필요하다. API 모델/유료 fallback/Secret·구독 인증 복사/신규 예약은 실행하지 않았다.
