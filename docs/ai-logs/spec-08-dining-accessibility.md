# PR #578 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/578
- 제목: feat: 음식점 접근성 겹쳐 보기
- 작성자: 황대겸
- 최종 상태: 열림(리뷰 대기)
- AI 도구: Claude Code (Claude Opus 5)

## 목적

명세 `specs/08-popular-food-accessibility.md`(P1, 인기 맛집에 접근성 정보 겹쳐 보기)를
구현한다. 여행지 상세의 `시설` 단계에서 주변 음식점 목록 위에 확인된 편의 정보를
겹쳐 보여 주어, 사용자가 진입 가능 여부를 목록 단계에서 판단할 수 있게 한다.

원래 아이디어는 후기순·조회순 인기 식당을 기준으로 삼는 것이었으나, W.A.V.E가 쓸
수 있는 공식 제공처 가운데 개별 음식점의 후기 수·별점·조회수를 주는 것이 없다.
그래서 이 작업은 인기 표기를 만들지 않고, 근거가 다른 두 묶음을 각각의 근거와 함께
보여 주는 쪽으로 구현했다.

## 역할 구분

- 사람: 요구사항(명세 문서), 브랜치 스택 순서 결정, 계정·Secret, 최종 승인
- AI: 명세·기존 코드 조사, 서버·클라이언트·순수 함수·테스트 작성, lint/typecheck/
  test/build/성능 예산/e2e 실행, 커밋과 PR 본문 작성

## 변경 파일

신규

- `server/tourism/dining-accessibility.ts` — 공개 `contentId` 검증(`/^[1-9]\d{0,11}$/`),
  `detailCommon2` 재조회와 경남 검증, `areaBasedList2`(`contentTypeId=39`) 주변 조회,
  `detailWithTour2` 편의 확인, `detailIntro2` 운영시간, 거리 계산·정렬·상한 10곳,
  `budgetClock`/`withinBudget` 예산, 상한 100개 FIFO 캐시(실패·부분 결과 캐시 금지).
- `lib/dining-accessibility.js` + `lib/dining-accessibility.d.ts` — 편의 태그 정리와
  최대 3개 선택(`+N`), 세 상태 문구, 거리 반올림과 기준을 밝힌 문구, 두 묶음 분리,
  중복 상호 제거. 순수 함수만 둔다.
- `features/planner/components/DiningAccessibilityList.tsx` — 두 묶음 목록, 태그 표시,
  외부 링크, 실패·빈 상태. `optionalPlannerJson`으로 호출하고 `AbortController`로
  장소 변경·닫기 시 취소한다.
- `tests/dining-accessibility.test.mjs`, `e2e/dining-accessibility.spec.ts`

수정

- `server/tourism/handler.ts` — `action === "dining-accessibility"` 분기만 추가.
- `lib/request-budget.js` — `SERVER_BUDGET_MS.diningAccessibility = 17_500` 추가.
  `CLIENT_BUDGET_MS`는 기존대로 파생되므로 대응 항목이 함께 생긴다.
- `features/planner/types.ts` — `DiningEvidence`/`DiningFacility`/`DiningPlace`/
  `DiningAccessibilityResponse` 추가. 별점·후기·조회수·순위·사용자 좌표 필드 없음.
- `features/planner/components/PlaceArrivalPreview.tsx` — `시설` 단계에서 lazy import.
  기존 3단계 구조와 체크 기록은 그대로 두었다. 선택 prop `onClose`만 더했다.
- `features/planner/components/PlaceDecisionDialog.tsx` — `onClose`를 미리보기에 전달.
- `features/routing/nearby-place-data.ts`, `features/routing/kakao-sdk.ts` —
  제공처가 주는 `category_name`을 그대로 옮기는 필드 추가, `Places`의 지도 인자를
  선택으로 넓힘. `placeLink`의 `https://place.map.kakao.com/<숫자>` 규칙은 그대로다.

## 검증

이 머신에서 실행한 것과 결과는 다음과 같다.

- `npm run lint` — 통과. 오류 0건, 경고 14건(기준선과 같은 수, 모두 기존
  `<img>` 관련 `@next/next/no-img-element` 경고).
- `npm run typecheck` — 통과.
- `npm test` — 기존 실패 2건만 남고 나머지 통과.
  `authenticated gateway applies image admission independently`와
  `dedicated AI runtime waits for startup and never repeats model loading`은
  이 머신에 Python이 없어(`9009 !== 0`) 나는 문제이며 `main`에서도 실패한다.
  고치지 않고 그대로 두었다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과(exit 0).
  CSS gzip 합계가 변경 전 71,676바이트, 변경 후 71,676바이트로 같다(상한 71,680).
  CSS를 한 줄도 늘리지 않았기 때문이며, 따라서 상쇄 삭제도 하지 않았다.
  `app/styles/globals.css`와 `app/styles/design-system.css`는 건드리지 않았다.
  플래너 초기 JS gzip 206.10 → 206.14 KiB(상한 270), 가장 큰 JS 청크 58.15 →
  58.17 KiB(상한 110).
- `npx playwright test e2e/dining-accessibility.spec.ts` — 18건 통과
  (desktop-chromium, mobile-chromium). 1440/960/390px에서 가로 스크롤 없음과
  axe 위반 0건을 포함한다.
- 장소 상세 관련 기존 e2e 선택 실행 — 68건 통과:
  `place-arrival-route`, `slope-info`, `tactile-paving`, `guide-dog`,
  `powerchair-charging`, `place-detail-decision`, `nearby-query-integrity`.

실행하지 않은 것

- `npm run test:e2e` 전체는 돌리지 않았다. 변경 범위가 장소 상세와 주변 장소
  검색에 한정되어 관련 spec만 선택 실행했다.
- 실제 제공처 1회 호출 확인을 하지 못했다. 이 머신에 공공데이터포털 서비스 키와
  카카오 JavaScript 키가 없어 `KorService2/areaBasedList2`(`contentTypeId=39`)와
  `KorWithService2/detailWithTour2`의 경남 표본 응답을 실측하지 못했다. 이 PR의
  모든 검증 결과는 합성 fixture 기준이다. 필드 이름은 추측하지 않고 명세가 적은
  것과 저장소가 이미 쓰고 있는 것(`server/tourism/visit-info.ts`의
  `opentimefood`/`infocenterfood`, `server/tourism/plan-query.ts`의
  `lDongRegnCd`/`lDongSignguCd`/`arrange`)만 썼다.

## 결과와 제한

- 별점·후기 수·조회수·순위·인기 배지를 표시하거나 추정하지 않는다. 나중에 채우려는
  자리도 만들지 않았다. 타입에 그런 필드가 없다는 것을 단위 테스트가 소스에서
  직접 확인한다.
- 미확인과 명시적 부재를 글자로 구분하며, 색을 빼도 모양이 다르다
  (확인됨: 체크 인라인 SVG + 시설 이름, 부재: 테두리만 있는 칩 + `없음`,
  미확인: 점선 테두리 + `정보 없음`).
- 서버 요청·응답에 사용자 좌표 필드가 없다. 새 `navigator.geolocation` 호출부를
  만들지 않았고 외부 링크에 `from`/`sLat`/`sLng`를 붙이지 않는다.
- 음식 종류는 관광공사 묶음에서 표시하지 않는다. `areaBasedList2`는 `cat3` 같은
  분류 코드만 주고 읽을 수 있는 종류 이름을 주지 않는데, 코드를 이름으로 옮기는
  표를 지어내면 근거 없는 값이 된다. `category_name`을 그대로 주는 카카오 묶음
  에서만 표시한다. 명세의 카드 항목 중 이 한 가지가 관광공사 묶음에서 비어 있다.
- 편의 태그의 "요청된 편의 조건"은 장소 상세가 이미 담고 있는
  `place.accessibility`의 키 순서를 쓴다. 이 값이 곧 사용자가 여행 조건에서 고른
  편의이며, 결과 수를 늘리려고 조건을 해제하지 않는다.
- 남은 위험: 실제 제공처 응답을 한 번도 보지 못했다. 경남 표본에서
  `contentTypeId=39` 결과와 `detailWithTour2` 필드가 실제로 오는지, 그리고 예산
  17.5초 안에 음식점 10곳의 편의·운영시간 확인이 끝나는지는 키가 있는 환경에서
  다시 확인해야 한다. 예산을 넘기면 확인하지 못한 항목이 `unknown`으로 남으므로
  잘못된 단정이 생기지는 않는다.
- 후속: 명세가 적은 `조건을 유지한 채 다른 지역 보기`/`조건 바꾸기`는 지금 상세를
  닫고 기존 지역 선택·편의 선택 조작부로 초점을 옮기는 것까지만 한다. 조건을
  자동으로 바꾸지 않는다.

## PR 연 뒤 CI 상태(2026-09-19 확인)

- 통과: `quality`, `sandbox-boundary`, `browser (1, desktop/mobile)`,
  `browser (3, desktop)`, `browser (4, desktop/mobile)`.
- 실패: `browser (2, desktop)`, `browser (2, mobile)`, `browser (3, mobile)`,
  그리고 그 결과를 모으는 `validate`.
- `browser (2, *)`의 실패 5건은 모두 `e2e/map-tools-reachable.spec.ts`(4건)와
  `e2e/mobile-touch-targets.spec.ts`(1건)이며, **base 브랜치 PR #576에서 같은
  샤드가 정확히 같은 5건으로 실패한다.** 이 PR이 새로 만든 실패가 아니라 스택
  아래에서 이미 실패 중인 기존 문제다. 고치지 않았다.
- `browser (3, mobile)`은 197건 통과·2건 skip·flaky 1건
  (`e2e/region-change-boundary.spec.ts:52` `new trip ignores a delayed map
  location failure`)으로 exit 1이 됐다. 재시도에서 통과한 불안정 테스트이며
  지도 지역 변경 흐름이라 이 PR의 변경 범위와 무관하다. spec 파일이 하나 늘어
  샤드 배분이 밀리면서 이 테스트가 3번 샤드로 옮겨 온 것이다.
- 이 PR이 추가한 `e2e/dining-accessibility.spec.ts` 18건은 CI와 로컬 양쪽에서
  모두 통과했다. 기준을 완화하거나 테스트를 skip해서 통과시키지 않았다.
