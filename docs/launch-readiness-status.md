# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-06. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.

## 기준과 판정 방법

- main·Production `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포6278499275. 열린 Issue47·PR30.
  #287 b803b80은 Ready·CI 성공·MERGEABLE이나 승인0/3·REVIEW_REQUIRED/BLOCKED다.
  모든 열린 PR의 누락 담당자·라벨·검토자 요청을 보완했다. 작성자를 제외한 3명에게 요청했으며 실제 승인은 별도다.
- 통합 후보는 `audit/launch-integration-20260906`에 기존 제품·보안#309·자동화 stack을 보존해 합성한다.
  기존 PR 폐기·강제 push·거대 대체 PR·보호 규칙 우회·병합·배포·008 적용은 없다.
- **날씨 #328 `84491e58e92cb32b7e77d536441d4102d8cac8be`, Ready**:
  잘못된 날씨 응답의 플래너 오류, 독립 재조회·pending focus, 실제 예보 날짜, 날씨/일정 영향 KO·EN, 대비를 수정했다.
  관련92/92·unit304/304·lint/typecheck/build/performance PASS. 전체 source425 pass/기존skip1/실패0(9.3분),
  [CI425 pass/기존skip1/flaky0(20.0분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34053139108).
  첫 관련90 pass/2 fail은 기존 비 예보 fixture의 필수 region 누락이었다. 실제 handler 계약에 맞춰 region만 추가하고
  기존 재검색·저장·편의조건 assertion과 timeout은 유지했다. 신규 region 누락 거부 단위 검사도 추가했다.
- **날씨까지 합친 `42ecfaefba66b5502749bc11893cf42ee6d2acb3`**:
  unit331/331·기본검사PASS·audit0, 전체429 pass/기존skip1/실패0(9.7분), CSS69.80/70·planner268.81/270KiB.
  이 검증 뒤 독립 검토의 RC-14/15와 반복 재생 P2를 수정했으므로 아래 새 후보와 구분한다.
- **RC-14 #325 `a461c8bd8dc40862bf823c3ed7ef0d4f392c90ef`**:
  동일 이동수단의 0분/미리보기 선행 응답에서 보이는 25분 경로가 활성화되지 않는 desktop/mobile2건을 재현했다.
  표시·집계·선택·일정 구간에 동일한 configured=true·유한 양수 시간 기준을 적용했다.
  저장 구간의 기존-ID 무효/부재4건은 원래도 통과했고 보존했다. 관련94/94·unit286/286·기본검사PASS,
  전체 source373 pass/기존skip1/실패0(8.2분), [CI373 pass/기존skip1/flaky0(16.7분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054721820), Ready.
- **RC-15 #316 `c6e0354baeb9c023f253521d0c641f318e47125f`**:
  HTTP200 envelope가 유효해도 개별 정류장에 cityCode/nodeId가 없으면 도착 조회를 할 수 없다.
  query와 기존 snapshot→model을 공통 검사해 provider/dataset error를 전파한다. 실제 도착 API 미호출을 고정했다.
  신규2 FAIL→관련14/14·unit292/292·기본검사PASS, [CI247 pass/기존skip1/flaky0(10.1분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054278433).
  정상 정류장0건과 실제 도착조회0건, 의존 실패 계약은 모두 유지한다.
- **반복 재생 #315 `8c8f85aae5838449e205f76ff1ce01a4ea20c15a`**:
  첫 실행 이후 boolean이 바뀌지 않아 live region 안내가 멈추던 P2를 desktop/mobile2건으로 재현했다.
  첫 정확한 문구 assertion은 유지하고, 반복 횟수로 두 번째·세 번째 status 텍스트를 갱신한다.
  관련여정44/44, 영어 반복 추가 intro6/6·unit280/280·기본검사PASS, [CI251 pass/기존skip1/flaky0(10.0분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054686832), Ready.
- **후속 세 수정을 합친 `b05bc78dea3d3f2a0bdd3c1e67cd19bbfb208862`**:
  교통 import 및 환경설정 status 충돌을 양쪽 기능을 보존해 해결했다. unit334/334·lint/typecheck/build/performance PASS,
  audit0·CSS69.80/70·planner268.85/270KiB. 전체 Playwright·axe **437 pass/기존skip1/실패0(9.8분)**.
  source PR의 과거 HEAD와 새 후보 결과를 섞지 않는다. 독립 재검토·Preview·Production 확인은 별도다.
- **현재 원자적 작업 `fix/map-load-recovery`**, #328 기반 별도 worktree:
  기본 지도 뒤 대체 지도 모듈도 실패할 때 unhandled rejection·무한 로딩이 남고 개발 오류 화면이 조건 조작을 가리는
  desktop/mobile2건을 재현했다. 명시적 실패 상태·KO/EN 재로딩 안내·기기 일정 유지와 오래된 요청 취소 경계를 수정 중이다.
  신규8/8 UI·취소/실패 계약3/3 PASS, 관련/전체·새 CI·PR은 미완료다. 이 작업은 b05bc78의 성공에 포함하지 않는다.
  첫 확장 UI4 pass/4 fail은 화면 밖 상단 환경설정을 누르던 새 테스트 순서였다. Home으로 드러내는 실제 조작을 반영했다.
  지도 전체 영어·소개 지도 실제 행정경계는 별도 미완료이며, 현재 소개 지도는 출처 없는 단순화 안내도다.
- 보존된 Ready: #327579cd82 전체 로컬/CI411, #3260a8df96 389, #319be9e908 283,
  #324c81e68f CI349, #323e358e0f CI327, #320/#321/#322. 모두 기존skip1이며 미배포다.
  #3131ac5ccf의 [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34052610482)도 성공했다.
  source audit high2/moderate1은 #309 미포함 개발 의존성이고, 보안 변경을 합성한 audit0과 구분한다.
- Production 16:56:46 UTC26/27 PASS·route1 FAIL. 17:29:55 익명390/1366에서 카드3개·일정 추가/새로고침 복원,
  pageerror/console error/GET 실패/overflow0. GPS·서버쓰기·mock 없이 검증했다. 기존 자동 추천/장소1개100% 회귀는 운영에 남는다.
  18:46 health HTTP200은 설정 확인이며 전체 API 성공 증거가 아니다. 새 계약만으로 기존 route 실패를 해결 처리하지 않는다.
- 공식 ChatGPT 웹 Scheduled에서 기존5개를 읽었다. 대기열은 매시간/실행 중, PR 검수는 GitHub PR·리뷰·댓글·커밋 이벤트 감시다.
  최근 #327 검수와 RC-14/15 실제 GitHub 리뷰가 대응한다. 공지·위치정보센터·배포점검도 모니터링 중이며 새 예약/설정 변경 없음.
  #294에 증거를 반영했다. 웹 감시·GitHub/Notion 환류와 로컬 구현→별도 QA 전체 자동화는 구분한다.
  모델 API3개 disabled_manually 유지, 로컬 Codex ChatGPT 로그인 확인, 실제 과금 내역/잔여 한도는 이번 조회로 확정하지 않는다.
- 실제 Chrome의 내부 배율 설정 페이지는 브라우저 보안 정책이 차단했다. 우회하지 않았으며 200% 검증 완료로 세지 않는다.
  11개 뷰포트·키보드·axe 결과와 실제 확대/낭독기/실기기 검증은 별개다.
- 전체 요청은 미완료다. 지도 SDK/주변 보강정보·인증/정책 KO·EN, 실제200%·실기기/낭독기·성능,
  Preview·008 운영 스키마/영향/백업·복원, 최종 Production 여정·사람 리뷰/공모전 확인이 남는다.

이전 수치·실패 artifact·보존 브랜치는 [체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)와
[이전 실행표](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/blob/1ac5ccf31eb03deaedc550b26728a6973037b8a6/docs/launch-readiness-status.md)에 보존했다.

## 요구사항 → 이슈 → 구현·근거 → 남은 조치

모든 행은 최종 운영 검증 전이므로 Open을 유지한다. 대표 반응형 작업은 #286으로 모으며
#278의 추가 뷰포트·가로모드·확대 요구를 #286 증거에 포함한 뒤 중복 종료를 판단한다.

| Issue | 담당 | 상태 | 관련 PR·코드·검증 | 남은 조치·의존성 |
| --- | --- | --- | --- | --- |
| #251 일정·지도·날씨·언어 | Engineering/QA | 진행 중 | #287/#307/#311/#317~#319/#321~#326, `e2e/itinerary-language.spec.ts`, `e2e/departure-language.spec.ts`, `tests/weather-integrity.test.mjs` | #327/#328 교통·날씨 후속 운영 검증, 지도 SDK·주변 보강정보·인증/정책 영어 |
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
| #294 구독 실행 Gate | PM/Engineering | 진행 중 | 실제 웹 예약5개·매시간 queue·GitHub 이벤트 검수·기존 read-only receipt·로컬 smoke | 구현→독립 QA 전체 자동화·한도/PC/앱 조건; 유료 경로 비활성 |
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
3. 구독 자동화: API workflow 3개는 `disabled_manually`. 기존 웹 예약5개·queue/PR검수 최근 결과를 읽었다.
   웹 이벤트 검수·GitHub/Notion 환류는 확인했지만 사용자 PC 구현·독립 테스트 전체 연결은 미검증이다.
   로컬 프로젝트 예약은 PC·앱·파일 접근이 필요하며 웹 작업은 연결 도구 범위다. 새 예약/인증 복사/유료 전환은 없다.
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
