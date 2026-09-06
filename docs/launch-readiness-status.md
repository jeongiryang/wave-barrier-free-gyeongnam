# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-06. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.

## 기준과 판정 방법

- main·Production: `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포 ID `6278499275`.
- 열린 Issue **47개**, PR **29개**. 후속 #312~#327과 팀원의 #320을 보존했다.
- #287 `b803b80`은 Ready·CI 성공·MERGEABLE이나 **승인 0/3, REVIEW_REQUIRED/BLOCKED**다.
  요청 reviewer는 syt83·unknownamed·ginaginaring이다. 보호 규칙 우회·병합·배포·008 적용은 없다.
- 통합은 검증용 `audit/launch-integration-20260906`에서 기존 제품·보안 #309·자동화 stack을 합성한다.
  기존 PR을 닫거나 거대 대체 PR을 만들지 않는다. 부모 병합 후 자식에 최신 main을 합쳐 diff와 CI를 다시 확인한다.
- **최신 통합 검증 후보 `04375f5aebe579a5f73059e4fda3d516445bfb2e`**:
  #327 교통 조회 근거/한영 복구 UI까지 합성·push했다. unit·contract **328/328**,
  lint/typecheck/Vercel build/performance PASS, audit **0**, 전체 Playwright·axe
  **415 pass / 기존 skip 1 / 실패 0 (9.2분)**. CSS **69.78/70 KiB**, planner 초기 JS **269.58/270 KiB**.
  이전 698d30a의 전체393/기본324도 통과했다. Preview·Production 성공으로 대신하지 않는다.
- **#327 `579cd82ced3bcc70e84fce5565cf129ff3b68c06`**: 정상0건/미조회/오류/legacy ready를 구분하고
  누락 도착시간·정류장 수, 목록의 운행 과장, 재조회 포커스/viewport 가림, 교통 상세 KO/EN을 수정했다.
  관련112/112·신규22/22, unit301/301·기본검사PASS, 전체 로컬 **411 pass/기존 skip1/실패0(9.0분)**,
  [CI도 411 pass/기존 skip1/flaky0(15.5분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34051397198), Ready.
  source audit3건은 #309 미포함 개발 의존성이며 통합 audit0과 구분한다.
  새 Production 계약은 parser 검증 후 queryStatus/resultCount를 필수로 요구한다. KORAIL/현재 도착정보의
  실제 성공0건만 허용하고 미조회/오류/근거 없는 ready를 거부한다. 정류장/지역/터미널은 양수 결과 필수다.
  과거 Production의 route 실패를 이 계약 변경만으로 해결했다고 세지 않는다.
- **진행 중 `fix/weather-language`**: #327 이후 별도 worktree에서 날씨 영어/날짜/실패 복구를 검수한다.
  수정 전 데스크톱·모바일6건 실패를 보존했다. 잘못된 응답으로 플래너가 깨지고, 재조회 버튼이 없으며,
  영어 화면에 한국어가 남았다. 실제 캡처의 밝은 화면 대비와 첫 예보를 무조건 오늘로 부르는 문제도 수정 중이다.
  아직 미커밋·미PR이며 통합04375f5의 성공에 포함하지 않는다. 기존 작업을 덮어쓰지 않는다.
- **#319 `be9e908`**: 도움말 표시 직후 첫 Shift+Tab이 배경으로 빠지는 4건을 재현했다.
  layout effect로 표시 전 focus/trap을 설정한다. 관련 14/14, unit 280/280, 전체 로컬 **283 pass/기존 skip 1**,
  [CI 34046824130 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34046824130), Ready.
- **#325 `aa48328`**: 경로 KO/EN·실제 확인 건수·캐시된 구간 안내·복사 실패와 320px 글꼴 잘림 수정.
  관련 30/30, unit 285/285, [CI 367 pass/기존 skip 1/flaky 0](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34046440171), Ready.
  초기 CI 361 pass/4 fail과 마지막 source 로컬 366 pass/1 fail(초기 page.goto ERR_NO_BUFFER_SPACE)은 이력으로 보존한다.
- **#326 `0a8df96`**: 지도 검색의 오류/빈 결과/잘못된 응답·새 입력 취소·중복 실행·pending focus·긴 이름/스크롤·KO/EN.
  관련 122/122, 신규 18/18, unit 287/287, 전체 로컬 **389 pass/기존 skip 1**,
  [CI도 389 pass/기존 skip 1/flaky 0](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34047189164), Ready.
  320/390/768/1366 × light/dark·44px·실제 Tab/가림·axe·페이지 오류/overflow를 확인했다.
- **#316 `9792cbf`**: HTTP 200의 잘못된 응답을 정상 0건으로 바꾸던 결함을 공식 KORAIL/TAGO 명세와 대조했다.
  수정 전 8 pass/2 fail → 관련 10/10, unit 290/290, lint/typecheck/build/performance PASS.
  7c6d0e1의 [CI 34048166351](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34048166351)는 247 pass/기존 skip 1로 성공했다.
  최신 부모 #311을 합친 전체 로컬은 **247 pass/기존 skip 1/실패 0 (5.6분)**이다.
  [새 CI 34048864949](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34048864949)는 247 pass/기존 skip1/flaky0으로 성공했고 Ready다.
  첫 로컬 전체 237 pass/2 fail은 격리 포트 4189와 기존 ICS 기대 포트 4173 불일치다. 테스트 변경 없이 기본 포트에서 재검증했다.
  #316에서는 smoke를 변경하지 않았다. 이후 #327의 명시적 조회 근거 계약은 위 항목과 구분한다.
- #324 `c81e68f`는 [CI 349 pass/기존 skip 1](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34043069596),
  #323 `e358e0f`는 [CI 327 pass/기존 skip 1](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34040324753),
  #313 `4cc52aa`는 [CI 247 pass/기존 skip 1](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34043473857), 모두 Ready.
  #320/#321/#322도 Ready·CI 성공·미배포다. source audit high 2/moderate 1은 #309 미포함 기준이며 통합 audit 0과 구분한다.
- 최신 전체 Production **2026-09-06 16:56:46 UTC: 26/27 PASS, route 1 FAIL**.
  관광 KO/EN·보강·사진·집중률은 회복됐다. 17:02 cache MISS 경로에는 Kakao/ODsay 대안 5개·정류장 6개가 있었다.
  도착/KORAIL 0건 ready 문구는 앱의 해석이며 원 제공처의 검증된 빈 응답임을 독립적으로 확정하지 않는다.
- 17:29:55 실제 Production 390/1366px: 추천 카드 3개·API 오류 상태 0·pageerror/console error/GET 실패/overflow 0.
  장소 카드 범위를 지정해 두 폭 모두 장소 추가 후 새로고침 복원을 확인했다. 첫 데스크톱 탐색의 넓은 버튼 선택은 제품 실패로 세지 않는다.
  명시적 검색 없이 자동 추천 요청, 장소 1개로 준비도 100%가 되는 기존 회귀는 여전히 운영에 있다.
  #287 이후 후보에서 이미 수정한 범위이며 새 배포 후 재검증한다. 실제 로그인/쓰기·전체 여행 완료 증거는 아니다.
- 구독 비용 제한과 모델 API workflow 3개 `disabled_manually`를 유지한다. 무인 queue·독립 QA·운영 동기화 완료를 주장하지 않는다.
- 전체 요청은 미완료다. 실제 200%·실기기/화면 낭독기·지도 SDK/교통·날씨 상세/인증·정책 KO/EN,
  Preview·008 운영 스키마/영향/백업·복원, 최종 운영 여정과 사람 확인이 남는다.

이전 수치·실패 artifact·보존 브랜치는 [체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)와
[이전 실행표](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/blob/4cc52aa567f2c80f5ca8c6111ae67fea9eb1eed9/docs/launch-readiness-status.md)에 보존했다.

## 요구사항 → 이슈 → 구현·근거 → 남은 조치

모든 행은 최종 운영 검증 전이므로 Open을 유지한다. 대표 반응형 작업은 #286으로 모으며
#278의 추가 뷰포트·가로모드·확대 요구를 #286 증거에 포함한 뒤 중복 종료를 판단한다.

| Issue | 담당 | 상태 | 관련 PR·코드·검증 | 남은 조치·의존성 |
| --- | --- | --- | --- | --- |
| #251 일정·지도·날씨·언어 | Engineering/QA | 진행 중 | #287/#307/#311/#317~#319/#321~#326, `e2e/itinerary-language.spec.ts`, `e2e/departure-language.spec.ts`, `tests/weather-integrity.test.mjs` | 지도 SDK·교통·날씨/혼잡 상세·인증/정책 영어, Production 재검증 |
| #252 복수 테마 | Engineering/QA | 진행 중 | #287, `tests/plan-locale-theme.test.mjs`, `server/tourism/` | 다중 테마·부분 실패 실호출 및 운영 저장·복원 |
| #253 단계형 조건 | Engineering/QA | 진행 중 | #287/#311, `PlannerConditionsPanel.tsx`, `e2e/fixtures.ts` | 지역→편의→활동→날짜→명시적 검색 최종 회귀 |
| #254 빈 추천·단계 잠금 | Engineering/QA | 진행 중 | #287/#307, `useJourneyProgress.ts`, `e2e/evidence-truthfulness.spec.ts` | 기존 일정 열람과 현재 추천 준비율을 구분해 AC 정리 |
| #255 기능 위계 | Engineering/QA | 진행 중 | #287/#311, `app/planner/page.tsx`, `e2e/planner-product-flow.spec.ts` | 실제 좁은 화면·짧은 높이·첫 행동 검증 |
| #256 날씨 시각화 | Engineering/QA | 진행 중 | `features/planner/components/WeatherBoard.tsx`, `tests/weather-integrity.test.mjs` | 예보 밖 날짜·영어·빈 상태·운영 예보 확인 |
| #257 소개 문구 | Engineering/QA | 진행 중 | #311, `features/landing/components/`, `e2e/landing-regions.spec.ts` | 실제 사용자 이해·공식 사진·KO/EN 잔여 문구 |
| #258 경남 지도 | Engineering/QA | 진행 중 | #287, `LandingRegionStory.tsx`, `e2e/landing-regions.spec.ts` | 공식 경계·텍스트 대안·실기기·출처 재검증 |
| #259 캘린더·지도 소개 | Engineering/QA | 진행 중 | #287/#311/#315, `LandingProductStories.tsx`, `e2e/reduced-motion-scroll.spec.ts` | 다시보기 계약은 후보 회귀 검증, 실제 운영 반영·시각 검수 |
| #261 중립·명시적 검색 | Engineering/QA | 진행 중 | #287/#311, `usePlanRequest.ts`, `e2e/launch-integrity.spec.ts` | 모든 진입 경로·프로필 적용·운영 요청 증거 |
| #263 UX Epic | Engineering/QA/PM | 진행 중 | 본 실행표, #287/#307/#311 | 개별 AC 완료와 운영 반영을 함께 집계 |
| #264 일정·지도 단일 기준 | Engineering/QA | 진행 중 | #287, `tests/itinerary-legs.test.mjs`, `e2e/itinerary-route-sync.spec.ts` | 날짜·순서·수단 변경 무효화와 배포 확인 |
| #265 용어·CTA | Engineering/QA | 진행 중 | #311/#317~#326, `e2e/planner-step-copy.spec.ts`, `e2e/departure-language.spec.ts` | 교통·날씨 상세·인증/정책의 한국어 잔여·내부 용어 |
| #266 CSS 정리 | Engineering/QA | 진행 중 | `app/styles/`, `tests/module-reachability.test.mjs` | obsolete 규칙의 실제 도달성·시각 회귀 대조 후 최소 삭제 |
| #267 첫 사용자 전체 QA | QA | 진행 중 | #314 인증 제출 보호, `e2e/core-journeys.spec.ts`, `e2e/auth-hydration.spec.ts` | Preview·Production 비회원/인증 전체 여정, 실패 시나리오 |
| #268 필요한 편의 선택 | Engineering/QA | 진행 중 | #287/#311, `PlannerAccessibilityProfiles.tsx` | 유형 단정 없는 문구·복수 선택·KO/EN 운영 검수 |
| #269 추천 카드 | Engineering/QA | 진행 중 | #287/#311/#321, `RecommendationCarousel.tsx`, `PlaceDecisionDialog.tsx` | 공식 사진·원문 출처·배포 후 확인 |
| #270 공식 사진 | Engineering/QA | 진행 중 | `features/tourism/components/SmartSpotImage.tsx`, `scripts/check-photo-coverage.mjs` | API별 실제 표출·사용 조건·이미지 LCP 확인 |
| #271 상세보기 | Engineering/QA | 진행 중 | #287/#321, `e2e/recommendation-language.spec.ts`, 한국어·영어 포커스·상하단 axe | 랜딩 패턴 통합·실제 확대·운영 확인 |
| #272 URL·뒤로가기 | Engineering/QA | 진행 중 | #287/#311, `usePlannerStageView.ts`, `e2e/planner-product-flow.spec.ts` | 질문 단계 URL·직접 진입·새로고침 전체 조합 |
| #273 18개 시·군 | Engineering/QA | 진행 중 | #287, `components/GyeongnamRegionPicker.tsx`, `e2e/mobile-touch-targets.spec.ts` | 지도 실패 대안·지역 사진·짧은 화면 |
| #274 편의 근거 상태 | Engineering/QA | 진행 중 | #287, `tests/accessibility-score.test.mjs`, `e2e/evidence-truthfulness.spec.ts` | 공식/미확인/불일치/사용자 제보 Production 대조 |
| #275 날짜 영향 | Engineering/QA | 진행 중 | #287/#311, `PlannerConditionsPanel.tsx`, `tests/itinerary-schedule.test.mjs` | 날짜는 예보·행사·일정용이라는 안내와 API 영향표 최종 대조 |
| #276 지도 단순화 | Engineering/QA | 진행 중 | #307/#311, `features/routing/components/`, `e2e/map-tools-reachable.spec.ts` | 모든 도구의 실기능·실제 SDK·텍스트 대안 |
| #277 장소/경로 접근성 | Engineering/QA | 진행 중 | #287, `tests/transport-capability-truth.test.mjs` | 경로 접근성 미확인 표시·외부 지도 범위 운영 확인 |
| #278 반응형 | QA | 진행 중·중복 통합 후보 | #286과 본문 비교, `e2e/launch-integrity.spec.ts` | #286에 고유 요구를 보존한 뒤 중복 종료 판단 |
| #279 화면 회귀 | QA | 진행 중 | E2E screenshot·trace, `e2e/planner-product-flow.spec.ts` | 핵심 화면별 baseline·픽셀 변화 사람 검토 |
| #280 준비율·출발 확인 | Engineering/QA | 진행 중 | #287/#307/#324, `useJourneyProgress.ts`, `e2e/launch-integrity.spec.ts`, `e2e/departure-language.spec.ts` | 새 SHA 운영 반영·전체 구간과 별도 확인 절차 |
| #281 여행 lifecycle | Engineering/QA | 진행 중 | `tests/travel-book.test.mjs`, `e2e/travel-book.spec.ts` | 새 여행 초기화의 모든 저장 키·세션·URL 교차 검증 |
| #282 느린 네트워크 | Engineering/QA | 진행 중 | #312 캐시·#316 교통 경계, `lib/request-budget.js`, `e2e/slow-upstream.spec.ts` | Production KTO/KORAIL/TAGO 지연 원인·배포 후 복구 재검증 |
| #283 도움말 | Engineering/QA | 진행 중 | `components/HelpCenter.tsx`, `e2e/help-public-pages.spec.ts` | #311 DOM 변경 후 모든 안내 대상·포커스 재검증 |
| #284 성능 | Engineering/QA | 진행 중 | `scripts/check-performance-budget.mjs`, `e2e/performance-boundaries.spec.ts` | 현재 전송량 예산 PASS. 실제 LCP/CLS/INP·느린 기기 측정 미완료 |
| #285 WCAG 2.2 AA | QA/운영자 | 진행 중 | axe·대비·44px·포커스 회귀 | 자동 테스트 외 화면 낭독기·당사자 검증; 완전 준수 선언 금지 |
| #286 전 구간 반응형 | QA | 진행 중 | #278 통합 대표, `e2e/launch-integrity.spec.ts` | 320×568~2560×1440·가로·200%·safe-area·소프트키보드 전체 증거 |
| #288 자동화 Epic | Engineering/QA | 진행 중 | #289~#306 stack·CI, 구독 smoke 이력 | 실제 queue→구현→별도 QA→기록→Notion의 종단간 실행 |
| #290 실패 라우터 | Engineering/QA | 진행 중 | #291·contract CI | main 미병합·실제 중복 이벤트/실패 환류 |
| #292 Issue lifecycle | Engineering/QA | 진행 중 | #293·contract CI | 팀원 포함 실제 Issue smoke·중복 방지 |
| #294 구독 실행 Gate | PM/Engineering | 실제 차단 | #294 예약 조회 receipt·로컬 smoke | 공식 Scheduled 설정/실행 내역 접근·PC/앱 조건·한도 확인 |
| #295 PM dispatch | Engineering/PM | 실제 차단 | #296 비활성 API 경로 보존 | 구독 기반 인계 검증; API Secret 활성화 금지 |
| #297 Engineering worker | Engineering/QA | 진행 중 | #298 비활성 API 경로·로컬 구독 smoke | 실제 안전한 queue 작업 구현·PR 증거 |
| #299 독립 QA | QA | 진행 중 | #300 비활성 API 경로·정적 계약 | 별도 검증 실행 근거, 자기승인을 사람 승인으로 계산 금지 |
| #301 배포 후 QA | Engineering/QA | 진행 중 | #302 읽기 전용 fixture·SHA guard | main 미병합·실제 CD 환류·운영 smoke |
| #303 Compliance agent | PM/Engineering | 진행 중 | #304는 실행 구현이 아닌 역할 계약 | Gmail/Notion 수동 연결 확인. 구독 예약 실행 미검증 |
| #305 제출·심사 agent | PM/Engineering | 진행 중 | #306은 역할 계약, 공식 원본·제출 원고 확보 | 실제 자동 생성·검수·PDF·최종 운영 대응 |
| #308 의존성 보안 | Engineering/QA | 진행 중 | #309, exact alias·악성 입력·audit 0 | 커뮤니티 포크 유지보수 위험·Vercel 실제 함수 smoke·사람 리뷰 |
| #310 UI 참고 | Engineering/QA | 진행 중 | #311·PM 부분 채택 기록 | 실제 회귀 수정·검증; 원 시안 전체 복제/자동 완료 금지 |
| #11 공모전·운영 | PM/운영자/Engineering | 진행 중·사람 확인 분리 | [정합성](contest-compliance.md), [원고](submission/development-entry-draft.md) | 팀명 충돌·개인 자격·법적 검토·운영 계정·백업·최종 제출 |

## 실제 차단과 계속 가능한 일

1. 필수 사람 승인 3건: 병합만 차단. 기존 PR 회귀·문서·시각 QA를 계속한다.
2. Preview/DB 관리 접근: 현재 로컬 Vercel CLI 로그인·연결된 Vercel/Neon 도구가 확인되지 않았다.
   운영 Secret은 출력·복사하지 않는다. 기존 Production CD를 Preview용으로 실행해 운영을 변경하지 않는다.
   008의 트랜잭션·등록·앱 호환은 코드 검토했고 실제 스키마·백업·복원·영향 행 수는 별도 확인한다.
3. 구독 자동화: API workflow 3개는 `disabled_manually`. #294의 기존 예약 조회 receipt는
   전체 구현·독립 QA 자동화를 증명하지 않는다. 이 환경의 공식 Scheduled 관리 도구가 없어
   기존 예약 목록·수정 권한을 확인하지 못했다. 확인 전에 중복 예약을 만들지 않는다.
4. 공모전: 부문·마감·예비 합격은 확인 완료. 팀명·최종 팀원·이력·법적 의무·실제 제출은 사람 확인.
5. 독립적으로 계속할 제품 작업: #317~#319/#321에서 조건·내비게이션·설정·도움말·추천 상세를 수정했다.
   영어 일정·경로·인증 폼·정책 본문과 전체 언어 상태별 QA가 남는다. #320은 보완 코드·로컬 회귀
   증거와 CI 성공을 추가했고 PM 재검토·배포 증거가 남는다.
   390·1366px 기본 배율에서 새 활동 Gate는 넘침 없이 보였지만 CSS zoom 2 진단은 잘림이 있어
   실제 브라우저 200% 확대 검증을 완료로 세지 않는다. #251/#265/#286에서 검증·수정을 이어간다.

정확한 worktree·SHA·미완료 범위는 [실행 체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)를 따른다.

## 다음 실행 순서

1. #311~#316 제품 후보·#309 보안·자동화 stack의 최종 합성 SHA를 전체 검증하고 원격에 보존한다.
2. 제품·보안·자동화 합성 후보의 전체 검사와 실제 Preview를 SHA로 연결한다.
3. Production 제공처별 실패 진단, 008 운영 사전 점검, KO/EN·전 뷰포트 잔여 QA를 처리한다.
4. 이 표의 각 Issue AC에 운영 증거를 연결해 완료/부분/중복을 확정한다. 증거 없이 닫지 않는다.
5. 공식 양식 검토 PDF를 최종 배포 화면으로 교체하고 구독 queue 종단간 안전 작업을 마무리한다.
