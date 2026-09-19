# PR #번호 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/570
- 제목: feat: 안내견 동반 가능 장소 표시
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 목적

`specs/20-guide-dog-places.md`(안내견 동반 가능 장소 표시) 구현. `KorWithService2/detailWithTour2`의
`helpdog` 필드는 이미 `lib/facility-selection.js`의 `FACILITIES`와 `server/tourism/catalog.ts`의
`profileFields`에 연동돼 있어, 새 제공처나 새 서버 action을 더하지 않고 이미 들어와 있는 데이터를
화면에 세 상태로 구분해 보여주는 작업만 했다.

## 실제 제공처 호출 확인

이 개발 환경(`C:\Users\admin\wave`)에는 한국관광공사 TourAPI 서비스 키가 없다
(`env | grep -i -E "TOUR|DATA_GO|PUBLIC_DATA|SERVICE_KEY|KAKAO"` 결과 없음). 그래서 경남 표본에서
`helpdog` 값이 실제로 오는 비율을 실제 호출로 확인하지 못했다. 비율을 추측으로 적지 않는다.
이 항목은 공공데이터포털·관광공사 API 키를 가진 환경에서 저장소 책임자가 직접 확인해야 한다.

## 역할 구분

- 사람: 명세 승인(specs/20-guide-dog-places.md), 브랜치·PR 정책 지시
- AI: 코드·테스트·문서 작성, 검증 실행, PR 작성

## 구현 요약

- `lib/guide-dog-facility.js`(신규): 안내견 동반 세 상태(`confirmed`/`negative`/`unknown`) 고정 문구와
  법 안내 한 줄을 담는 순수 데이터 모듈. `accessibilityFieldState`의 판정 규칙은 건드리지 않았다.
- `features/planner/components/PlaceFacilitySummary.tsx`: `helpdog` 항목을 일반 목록에서 분리해 항상
  고정 문구로 보여주고, negative·unknown 아래에 법 안내 문장을 붙인다. `동반 불가`라는 표현을 쓰지
  않는다. 새 CSS 클래스 없이 기존 `.access-badge`(design-system.css, 수정하지 않음)와 인라인
  `color: var(--muted)`만 재사용해 CSS 예산 증가를 0으로 유지했다.
- `features/planner/components/PlaceArrivalPreview.tsx`: `시설` 단계 키 목록에 `helpdog` 추가.
- `features/routing/types.ts`: `MapPlace`에 이미 존재하는 `accessibility` 모양을 선택 필드로 추가(새
  타입 아님, `server/tourism/accessibility-model.ts`의 `placeFrom` 결과와 동일한 모양).
- `features/routing/constants.ts`: `FacilityLayerSource`에 `"derived"`를 추가하고
  `derivedFacilityLayers`(`helpdog-confirmed`, `derivedKey: "helpdog"`)를 11번 명세가 남긴 확장 지점에
  등록했다. `officialFacilityLayers`(서버 action 필요)와는 분리했다 — 이 레이어는 서버를 부르지 않는다.
- `features/routing/useFacilityLayers.ts`: `derived` 갈래를 추가했다. 새 네트워크 요청 없이 이미 받아온
  `places`(훅 인자로 추가)에서 `accessibility` 배열에 `helpdog: confirmed`가 있는 곳만 걸러 마커로
  만든다. 지도 핀 모양은 place-search(원형)와 구분하기 위해 기존 official 사각 핀을 재사용했다(새
  모양 CSS를 추가하지 않기 위함 — 아래 CSS 예산 절 참고).
- `features/routing/useRouteMapController.ts`: `useFacilityLayers`에 `places`를 넘긴다.
- `features/routing/components/FacilityLayerPanel.tsx`: "이미 확인된 곳" 그룹을 추가로 그린다. 범례
  문구를 사각 핀이 "공식 공공데이터와 여행지 목록에서 이미 확인된 정보"를 함께 가리키도록 고쳤다.
- `tests/guide-dog-facility.test.mjs`(신규): `helpdog`가 `FACILITIES`·`profileFields`에 있는지, 세 상태
  문구가 서로 다르고 "불가"를 쓰지 않는지, 법 안내에 조항 번호·처벌 규정이 없는지, `derivedFacilityLayers`가
  새 서버 action 없이 등록됐는지 확인한다.
- `e2e/guide-dog.spec.ts`(신규): 편의 조건에서 안내견 동반을 고를 수 있는지, 세 상태가 화면에서 다른
  문구로 구분되고 "불가"가 없는지, negative·unknown에 법 안내가 붙는지, 1440/960/390px에서 가로
  스크롤이 없고 axe 위반이 없는지 확인한다.

## 이미 존재해서 손대지 않은 부분

- "이 조건으로 검색했을 때 결과가 없으면 조건을 해제하지 않는다"(명세 54행)는 `helpdog`만의 요구가
  아니라 모든 편의 조건에 이미 적용되는 일반 동작이다(`features/planner/components/RecommendationCarousel.tsx`의
  `.simple-empty` 메시지와 "필요한 편의는 유지하고 모든 활동에서 찾기"/"같은 조건으로 다시 시도" 버튼).
  지역 선택 드롭다운과 편의 조건 버튼은 항상 열려 있어 "다른 지역 보기"·"조건 바꾸기"에 해당하는
  조작을 이미 제공한다. 이 메커니즘을 그대로 상속하며 새로 만들지 않았다.
- `helpdog` 라벨("안내견 동반")은 이미 화면 문구로 적절해 고치지 않았다.

## CSS 예산

- 시작 시점(브랜치 분기 직후) `npm run check:performance` 측정값: `cssRawKiB: 368.2`, `cssGzipKiB: 70`
  (바이트 단위로는 71,676바이트 gzip, 예산 71,680바이트에서 여유 4바이트).
- 구현 후 재측정: `cssRawKiB: 368.2`, `cssGzipKiB: 70` — **동일**. 새 CSS 규칙을 추가하지 않고 기존
  `.access-badge`(design-system.css, 미수정)와 인라인 스타일만 사용했기 때문이다. 죽은 선언 제거는
  필요 없었다(증가분이 0이므로).

## 수정 이력

- 최초 커밋 이후 `npm run typecheck`를 e2e 파일 추가 시점에 재확인하지 않아, `PlanData.generatedAt`
  (필수 `string`)에 선택 필드인 `Place.checkedAt`을 그대로 대입하는 타입 오류를 놓쳤다. 후속 커밋
  (`fix: e2e/guide-dog.spec.ts의 타입 오류 수정`)으로 기본값을 두어 고쳤고, `npm run typecheck`가
  다시 통과함을 확인했다.

## 알려진 구조적 충돌

- `e2e/facility-layers.spec.ts`의 "공식 데이터 레이어가 하나도 없으면 그 구분을 그리지 않는다" 테스트가
  실패한다(`panel.locator(".map-tool-grid")`가 1개일 것으로 기대하지만, 새로 추가한 "이미 확인된 곳"
  그룹 때문에 2개가 된다). 이 테스트는 PR #565가 만든 것이고, 이 스펙(20)이 그 확장 지점에 첫 파생
  레이어를 등록하면서 생기는 예정된 충돌이다. 지시에 따라 기존 테스트를 고치지 않고 그대로 두었다.
  저장소 책임자가 두 PR을 병합하는 순서에서 이 단언을 갱신해야 한다(예: "공식 레이어가 없어도 다른
  그룹은 그릴 수 있다"는 의미로).

## 검증 결과(2026-09-19, Windows, `C:\Users\admin\wave`, 브랜치 `feat/spec-20-guide-dog-places`)

- `npm run lint` — 통과(에러 0, 기존 landing 이미지 경고 14건은 기준선과 동일).
- `npm run typecheck` — 통과.
- `npm test` — 1287개 중 1285 통과, 2건 실패(`tests/assistant-photo.test.mjs`,
  `tests/assistant-runtime.test.mjs`). 이 두 건은 이 머신에 Python이 없어 생기는 기존 문제이며 main에서도
  실패한다(작업 지시에 명시된 기존 문제).
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. CSS gzip 예산 변화 없음(위 절 참고).
- `npx playwright test e2e/guide-dog.spec.ts` — 4개(desktop+mobile) 모두 통과.
- `npx playwright test e2e/facility-layers.spec.ts e2e/powerchair-charging.spec.ts` — 28개 중 26개 통과,
  2개 실패(위 "알려진 구조적 충돌" 참고, 동일 테스트가 desktop/mobile 두 프로젝트에서 실패).
- `npm run test:e2e`(전체 스위트)는 실행하지 않았다. 저장소의 다른 스펙(23·24·27·28·32·34·50 등)까지
  포함한 전체 e2e는 실행 시간이 매우 길고, 이 작업이 건드린 파일과 무관한 스펙까지 전부 돌리는 대신
  관련 파일(guide-dog, facility-layers, powerchair-charging)만 실행했다. 나머지 스위트는 실행하지 않았고
  통과했다고 적지 않는다.
- 390/960/1440px 실제 렌더링 확인: `e2e/guide-dog.spec.ts`의 두 번째 테스트가 세 너비 모두에서
  가로 스크롤 없음과 axe 위반 0건을 확인한다(자동화된 확인이며, 수동 스크린샷 검토는 하지 않았다).

## 완료 기준 대조

- 편의 조건에서 안내견 동반을 고를 수 있다 — 충족(이미 `FACILITIES`에 있었고 `e2e/guide-dog.spec.ts`로 확인).
- 세 상태가 화면에서 구분되고 "불가" 표현이 없다 — 충족.
- negative·unknown에 안내 한 줄이 함께 보인다 — 충족.
- 새 서버 호출과 새 저장 키가 추가되지 않았다 — 충족(코드 검토 및 테스트로 확인. `derived` 레이어는
  `placesRef`에서만 값을 읽는다).
- 실제 제공처에서 값이 오는 비율이 PR에 기록돼 있다 — **미충족**. 이 환경에 API 키가 없어 실제 호출을
  하지 못했다. 위 "실제 제공처 호출 확인" 절에 사실대로 남겼다.
- 위 명령과 e2e가 모두 통과하고 axe 위반 0건이다 — 부분 충족. 새로 만든 `e2e/guide-dog.spec.ts`는
  axe 위반 0건으로 통과한다. 기존 `e2e/facility-layers.spec.ts`의 그룹 개수 단언 1건은 이 스펙이 만든
  예정된 구조적 충돌로 실패한다(위 "알려진 구조적 충돌" 참고). `npm run test:e2e` 전체는 실행하지
  않았다.
