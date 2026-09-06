# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-06. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.

## 기준과 판정 방법

- main·Production: `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포 ID `6278499275`.
- 현재 열린 Issue **47개**, PR **25개**다. 후속 수정 #312~#323과 팀원의 #320을 포함한다. 새 변경 발생 시 다시 조회한다.
- #287 `b803b80` → #307 `8b0257c` → #311 `93d1058` 제품 후보와 #309 `a9cf9db` 보안 변경,
  #289→#306 자동화 stack을 격리 worktree `audit/launch-integration-20260906`에서 합성했다.
- 승인 0/3은 병합의 실제 차단이다. #287에 syt83·unknownamed와 세 번째 협업자 ginaginaring의 리뷰를 요청했다.
  보호 규칙을 낮추거나 관리자 우회하지 않는다. 구현·문서·로컬 검증은 계속한다.
- 완료는 구현·회귀·문서·배포·운영 증거가 함께 있을 때만 사용한다. 아래의 코드·테스트 경로는
  구현 근거이며, 파일 존재를 해당 Issue 전체 AC 충족으로 해석하지 않는다.
- 직전 검증 후보 `bf2cfe87fc94709b1453cdc81318133e64bbabac`는 #320~#323과 제품·보안·자동화를 합성했다.
  lint/typecheck, unit·contract **313/313**, Vercel build/performance PASS, audit **0**,
  전체 Playwright·axe **319 pass / 기존 skip 1 / 실패 0 (8.1분)**. CSS gzip 69.61/70 KiB,
  planner JS 265.40/270 KiB다. Preview나 Production 검증으로 세지 않는다.
- #321 `272bf68`: 추천 상세 KO/EN·원문 언어·후기 오류/빈 결과/재시도·dark/light 대비.
  unit 280, 전체 295 pass/기존 skip 1, [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34032622064), Ready.
- 팀원 #320 `bfeda5f`: 팀원의 간결한 3/2/1열 구성과 추가 커밋을 보존하고 도식 7개·한영 설명을 보완했다.
  모든 비주얼을 숨겼던 P1의 보완 코드이며 PM 디자인 재검토는 남는다. unit 280, 전체 251 pass/기존 skip 1,
  390/768/960/1366/1440×light/dark 고유 20화면·키보드·44px·포커스 가림·axe,
  [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34034203872), Ready.
- #322 `0b916a4`: 일정 변경 뒤 옛 공유 URL 재사용·늦은 응답·복사 성공 오표시를 수정했다.
  저장 중 포커스와 dark 대비도 보완했다. 재현 4 fail → 최종 8/8, 전체 303 pass/기존 skip 1,
  unit 280, [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34036478371), Ready.
  이미 발행한 공유 링크나 사용자 데이터를 삭제하지 않았다.
- #323 초기 `be79d0c`: 일정 KO/EN·저장 안내·원문 언어·선택 해설·실제 지연 로딩과 대비를 보완했다.
  320px 캡처에서 확인한 DAY 2/Earlier 잘림도 수정했다. unit 280, 관련 72/72, 최종 새 회귀 12/12,
  전체 **315 pass/기존 skip 1/실패 0 (8.0분)**, lint/typecheck/build/performance PASS.
  [CI 34037880762](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34037880762)는 314 pass/1 flaky/기존 skip 1로 success다.
  재시도 사례의 스크롤 이동을 trace로 조사했다. 현재 `e358e0f`는 후속 자동 스크롤 취소·지도 높이·경로 선택 상태를 수정했다.
  관련 34/34, unit 280/280, lint/typecheck/build/performance PASS. [새 CI 34040324753](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34040324753)와 전체 검증 진행 중.
  최신 합성 `88ae5e8`은 unit 313/313, lint/typecheck/build/performance PASS, audit 0,
  전체 **331 pass / 기존 skip 1 / 실패 0 (8.4분)**이다. CSS 69.64/70·planner 265.64/270 KiB.
  #323 로컬 첫 전체는 326 pass/1 fail/기존 skip 1이며 `page.goto`의 Chromium ERR_NO_BUFFER_SPACE였다.
  artifact를 보존하고 병행 실행 종료 후 같은 전체 범위를 단독 재실행한다. CI/후속 결과는 PR에서 확인한다.
- #313 `947d704` 문서 [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34038501253), 전체 247 pass/기존 skip 1.
  이전 후보별 수치·수정 과정은 [체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)와
  [이전 실행표 커밋](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/blob/ecf90b3674f561a8e50fa2606333c83adeb6c293/docs/launch-readiness-status.md)에 보존했다.
- 최신 전체 Production 진단은 **2026-09-06 14:02:46 UTC 22/27**, 실패 5건이다.
  route·추천 KO/EN·관광 보강·집중률이 실패했고 지역/장소 사진 응답은 계약을 통과했다.
  08시의 23/27과 11:36의 20/27은 과거 이력이다.
  12:12 추가 분석에서는 Kakao/ODsay 경로가 연결됐지만 KORAIL/TAGO 일부 timeout, KO 추천은
  HTTP 200/cache MISS에서도 장소 0·8개 제공처 error였다. 12:46 로컬 공통 호스트 진단도 timeout이었다.
  이 추가 분석을 전체 성공이나 공식 상류 장애 확인으로 해석하지 않는다. [API 감사](api-integration-audit.md).
- 기존 11개 viewport의 랜딩/중립 플래너 22화면, 영어 중립 24화면, 설정/도움말 16화면,
  추천 상세 16화면의 로컬 증거가 있다. 전체 상태·200% 확대·실기기·화면 낭독기·운영 검수를 대신하지 않는다.

## 요구사항 → 이슈 → 구현·근거 → 남은 조치

모든 행은 최종 운영 검증 전이므로 Open을 유지한다. 대표 반응형 작업은 #286으로 모으며
#278의 추가 뷰포트·가로모드·확대 요구를 #286 증거에 포함한 뒤 중복 종료를 판단한다.

| Issue | 담당 | 상태 | 관련 PR·코드·검증 | 남은 조치·의존성 |
| --- | --- | --- | --- | --- |
| #251 일정·지도·날씨·언어 | Engineering/QA | 진행 중 | #287/#307/#311/#317~#319/#321~#323, `e2e/itinerary-language.spec.ts`, `tests/weather-integrity.test.mjs` | 경로 상세·출발 확인·인증/정책 영어, Production 재검증 |
| #252 복수 테마 | Engineering/QA | 진행 중 | #287, `tests/plan-locale-theme.test.mjs`, `server/tourism/` | 다중 테마·부분 실패 실호출 및 운영 저장·복원 |
| #253 단계형 조건 | Engineering/QA | 진행 중 | #287/#311, `PlannerConditionsPanel.tsx`, `e2e/fixtures.ts` | 지역→편의→활동→날짜→명시적 검색 최종 회귀 |
| #254 빈 추천·단계 잠금 | Engineering/QA | 진행 중 | #287/#307, `useJourneyProgress.ts`, `e2e/evidence-truthfulness.spec.ts` | 기존 일정 열람과 현재 추천 준비율을 구분해 AC 정리 |
| #255 기능 위계 | Engineering/QA | 진행 중 | #287/#311, `app/planner/page.tsx`, `e2e/planner-product-flow.spec.ts` | 실제 좁은 화면·짧은 높이·첫 행동 검증 |
| #256 날씨 시각화 | Engineering/QA | 진행 중 | `components/WeatherBoard.tsx`, `tests/weather-integrity.test.mjs` | 예보 밖 날짜·영어·빈 상태·운영 예보 확인 |
| #257 소개 문구 | Engineering/QA | 진행 중 | #311, `features/landing/components/`, `e2e/landing-regions.spec.ts` | 실제 사용자 이해·공식 사진·KO/EN 잔여 문구 |
| #258 경남 지도 | Engineering/QA | 진행 중 | #287, `LandingRegionStory.tsx`, `e2e/landing-regions.spec.ts` | 공식 경계·텍스트 대안·실기기·출처 재검증 |
| #259 캘린더·지도 소개 | Engineering/QA | 진행 중 | #287/#311/#315, `LandingProductStories.tsx`, `e2e/reduced-motion-scroll.spec.ts` | 다시보기 계약은 후보 회귀 검증, 실제 운영 반영·시각 검수 |
| #261 중립·명시적 검색 | Engineering/QA | 진행 중 | #287/#311, `usePlanRequest.ts`, `e2e/launch-integrity.spec.ts` | 모든 진입 경로·프로필 적용·운영 요청 증거 |
| #263 UX Epic | Engineering/QA/PM | 진행 중 | 본 실행표, #287/#307/#311 | 개별 AC 완료와 운영 반영을 함께 집계 |
| #264 일정·지도 단일 기준 | Engineering/QA | 진행 중 | #287, `tests/itinerary-legs.test.mjs`, `e2e/itinerary-route-sync.spec.ts` | 날짜·순서·수단 변경 무효화와 배포 확인 |
| #265 용어·CTA | Engineering/QA | 진행 중 | #311, `e2e/planner-step-copy.spec.ts` | 영어의 한국어 잔여·사용자에게 불필요한 내부 용어 |
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
| #280 준비율·출발 확인 | Engineering/QA | 진행 중 | #287/#307, `useJourneyProgress.ts`, `e2e/launch-integrity.spec.ts` | 새 SHA 운영 반영·전체 구간과 별도 확인 절차 |
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
