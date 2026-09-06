# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-06. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.

## 기준과 판정 방법

- main·Production: `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포 ID `6278499275`.
- 현재 열린 Issue **47개**, PR **21개**다. 최초 PR 13개에 후속 수정 #312~#319가 추가됐다. 새 변경 발생 시 다시 조회한다.
- #287 `b803b80` → #307 `8b0257c` → #311 `93d1058` 제품 후보와 #309 `a9cf9db` 보안 변경,
  #289→#306 자동화 stack을 격리 worktree `audit/launch-integration-20260906`에서 합성했다.
- 승인 0/3은 병합의 실제 차단이다. #287에 syt83·unknownamed와 세 번째 협업자 ginaginaring의 리뷰를 요청했다.
  보호 규칙을 낮추거나 관리자 우회하지 않는다. 구현·문서·로컬 검증은 계속한다.
- 완료는 구현·회귀·문서·배포·운영 증거가 함께 있을 때만 사용한다. 아래의 코드·테스트 경로는
  구현 근거이며, 파일 존재를 해당 Issue 전체 AC 충족으로 해석하지 않는다.
- 이번 통합에서 lint·typecheck·단위/계약 306/306·전체 audit 0·Vercel build·성능 예산은 통과했다.
  첫 전체 Playwright는 **222 pass / 17 fail / 기존 skip 1**이었다. #311 문구·DOM 변경을 실제 화면과
  대조해 선택자를 보정한 뒤 **239 pass / 기존 skip 1**. #311 새 HEAD의 [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34022005546)도 성공했다.
  timeout·접근성 기준·완료 상태 assertion을 완화하지 않았다.
- 후속 #312의 전체 회귀는 **237 pass / 2 fail / 기존 skip 1**. 인증 폼 hydration 전 기본 GET 제출로
  민감 입력이 URL로 이동하는 별도 결함을 #314 `2ef2fa5`에서 수정했다. 추가 회귀 포함 **247 pass / 기존 skip 1**, 새 HEAD CI 성공.
- #315는 환경설정의 실제 인트로 재생·초점·동작 감소 계약, #316 `a4ce81e`는 공공교통 전용 키와 미조회 상태를 수정한다.
  #316 행동 회귀 6/6·전체 단위 286/286·브라우저 239 pass/기존 skip 1. 모두 미병합·미배포다.
- 통합 `eee1208`은 전체 unit/contract **313/313**, Playwright·axe **249 pass / 기존 skip 1**,
  lint/typecheck·Vercel build/performance·actionlint PASS, shellcheck 47개 실패 0, 전체 audit 0이었다.
- 후속 #311 `93d1058`은 활동 미선택/날짜 Gate·영어 접근성 이름과 활동 카드 대비를 보완했다.
  관련 E2E 50/50, 전체 247 pass / 기존 skip 1. #314 `6f9fc54`는 인증 화면 위치 처리 문구도 바로잡았다.
  #313 `b94559a`는 PDF 태그·문서 언어·제목·대체 설명을 보완하고 9쪽을 렌더링 검수했다.
  #289 `acb7dab`는 기존 구독 예약 receipt와 #309 보안 후보를 문서에 반영했다. 모두 원격에 보존했다.
- 위 변경을 합성한 `5db27a2bdffe9e50b6031b781feaf8154e1d703e`: unit/contract **313/313**,
  전체 Playwright·axe **257 pass / 기존 skip 1**, lint/typecheck·Vercel production build·성능 예산 PASS,
  전체 audit **0**. 앞선 결과와 SHA를 구분한다. 이는 로컬 후보 검증이며 Preview/Production 증거가 아니다.
- Production 27개 진단 중 23개 통과, route·관광 추천 KO/EN·관광 보강 실패다. Kakao·ODsay의 실제 경로 응답은 보존됐다.
  #312 `7af38df`는 HTTP 200 안의 제공처 오류까지 CDN 캐시되는 결함을 수정했으며 미배포다.
  최종 런칭/제출 가능 판정은 하지 않는다.
- 10:25 UTC 마지막 Production 재진단은 **20/27 통과**로 바뀌었다. 지역 사진·장소 사진·집중률도
  실패했다. 앞선 23/27은 08시 이력이다. 최신 상세는 [API 감사](api-integration-audit.md)에 기록한다.
- 통합 5db27a2의 11개 viewport(320×568~2560×1440) 랜딩/중립 플래너 22화면은
  콘솔 오류·가로 넘침·자동 추천 요청 0, h1 폭 잘림 0이었다. 대표 320/768/2560 화면을 직접 확인했다.
  모든 단계·테마·언어·확대·실기기 QA를 완료했다는 의미는 아니다.
- #317 `6f4d999`는 영어 편의/활동/날짜와 저장/검색 상태를 수정했다. unit 280/280,
  전체 Playwright·axe 253 pass/기존 skip 1, [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34028553188).
  포함 통합 `311de6ceab72456ca83d68db88467a3ad2ef2fa1`: unit/contract 313/313,
  전체 Playwright·axe 263 pass/기존 skip 1, lint/typecheck·Vercel build·성능 예산 PASS, audit 0.
  모두 로컬/CI 후보이며 Production 반영은 아니다.
- #318 `7e6c1ed`는 내비게이션 KO/EN·추천 상태·줄바꿈을 보완하고 기존 #314 인증 보호를 merge했다.
  unit 280/280, 전체 267 pass/기존 skip 1, [CI 성공](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34029670552).
  포함 통합 `b13f5c7`: unit 313/313, 전체 269 pass/기존 skip 1, lint/typecheck/build/performance/audit PASS.
- #319 `8eb38c5`는 환경설정/공개 4페이지 도움말 KO/EN, 실제 보이는 단계, ARIA 진행 그래픽,
  도움말 지연 import/실패 복구, 모바일 설정 패널 위치를 보완한다. 기존 #315 재생/초점을 merge했다.
  unit 280/280, 관련 E2E 56/56, 전체 279 pass/기존 skip 1, lint/typecheck/build/performance PASS.
  플래너 JS gzip 270.82 KiB 초과를 268.55 KiB로 줄였으며 기존 270 KiB 예산은 유지한다.
- 11:36:55 UTC Production 재진단도 **20/27, 동일 7건 실패**다. main/배포 SHA는 그대로다.
- 최종 합성 `3bc4abe8dacbf57d55784baddd93aec01022ebb5`: unit/contract **313/313**, 전체
  Playwright·axe **279 pass / 기존 skip 1**, lint/typecheck·Vercel build·성능 예산 PASS, audit **0**.
  #319 CI는 별도로 확인한다. 위 로컬 성공을 실제 Preview나 Production 성공으로 계산하지 않는다.

## 요구사항 → 이슈 → 구현·근거 → 남은 조치

모든 행은 최종 운영 검증 전이므로 Open을 유지한다. 대표 반응형 작업은 #286으로 모으며
#278의 추가 뷰포트·가로모드·확대 요구를 #286 증거에 포함한 뒤 중복 종료를 판단한다.

| Issue | 담당 | 상태 | 관련 PR·코드·검증 | 남은 조치·의존성 |
| --- | --- | --- | --- | --- |
| #251 일정·지도·날씨·언어 | Engineering/QA | 진행 중 | #287/#307/#311, `e2e/launch-integrity.spec.ts`, `tests/weather-integrity.test.mjs` | KO/EN 전체 여정·Production 재검증 |
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
| #269 추천 카드 | Engineering/QA | 진행 중 | #287/#311, `RecommendationCarousel.tsx`, `PlaceDecisionDialog.tsx` | 공식 사진 실패·확인 근거·키보드·출처 |
| #270 공식 사진 | Engineering/QA | 진행 중 | `features/tourism/components/SmartSpotImage.tsx`, `scripts/check-photo-coverage.mjs` | API별 실제 표출·사용 조건·이미지 LCP 확인 |
| #271 상세보기 | Engineering/QA | 진행 중 | #287, `PlaceDecisionDialog.tsx`, `e2e/launch-integrity.spec.ts` | 랜딩/플래너 진입·순환·복귀·영어·확대 |
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
5. 독립적으로 계속할 제품 작업: #317~#319에서 조건·내비게이션·설정·도움말을 수정했다.
   영어 추천·일정·경로·인증 폼·정책 본문과 전체 언어 상태별 QA가 남는다.
   390·1366px 기본 배율에서 새 활동 Gate는 넘침 없이 보였지만 CSS zoom 2 진단은 잘림이 있어
   실제 브라우저 200% 확대 검증을 완료로 세지 않는다. #251/#265/#286에서 검증·수정을 이어간다.

정확한 worktree·SHA·미완료 범위는 [실행 체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)를 따른다.

## 다음 실행 순서

1. #311~#316 제품 후보·#309 보안·자동화 stack의 최종 합성 SHA를 전체 검증하고 원격에 보존한다.
2. 제품·보안·자동화 합성 후보의 전체 검사와 실제 Preview를 SHA로 연결한다.
3. Production 제공처별 실패 진단, 008 운영 사전 점검, KO/EN·전 뷰포트 잔여 QA를 처리한다.
4. 이 표의 각 Issue AC에 운영 증거를 연결해 완료/부분/중복을 확정한다. 증거 없이 닫지 않는다.
5. 공식 양식 검토 PDF를 최종 배포 화면으로 교체하고 구독 queue 종단간 안전 작업을 마무리한다.
