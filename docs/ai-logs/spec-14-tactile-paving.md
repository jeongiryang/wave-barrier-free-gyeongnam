# PR #번호 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/574
- 제목: feat: 점자블록 정보 표시
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 0단계 검증 결과와 선택한 설계

**1단계만 구현했다.** 근거는 다음과 같다.

- WebSearch로 `점자블록`, `시각장애인 유도블록`, `보행자 이동편의시설`, `점자블록 표준데이터
  OpenAPI 위치정보` 등을 검색했다. 결과는 공공데이터포털·지자체 오픈API 총론 페이지나 무관한
  데이터셋(입찰공고, 보도자료, 대피시설 등)뿐이었고, **보행로 단위 점자블록·유도블록 위치를 주는
  OpenAPI, 특히 경상남도 표본이 있는 것을 하나도 찾지 못했다.**
- 이 개발 환경(Windows, `C:\Users\admin\wave`)에는 공공데이터포털 서비스 키가 없어, 설령
  후보 데이터셋을 찾았더라도 명세가 요구하는 "실제 1회 호출로 확인" 절차(0단계 3번)를 수행할 수
  없다. 이는 스펙 13 작업 때 확인한 것과 같은 환경 제약이다.
- 명세 0단계 4번 조건(OpenAPI로 경남 표본을 실제로 받을 수 있을 것)을 만족하는 제공처를 확인하지
  못했으므로 **2단계(보행로 구간 표시, `server/tourism/tactile-paving.ts`)는 구현하지 않았다.**
  1단계(이미 있는 관광지 단위 `braileblock` 정보를 찾기 쉽게 만드는 작업)만 구현하고 완료로 본다.

## 작업 A: e2e/facility-layers.spec.ts 테스트 전제 갱신

`e2e/facility-layers.spec.ts`의 "공식 데이터 레이어가 하나도 없으면 그 구분을 그리지 않는다"
테스트는 `.map-tool-grid` 요소 개수를 `1`로 고정하고 있었다(장소 검색 그룹만 있다고 가정). 그런데
PR #570이 `derivedFacilityLayers`에 `helpdog-confirmed`를 추가하면서 "이미 확인된 곳" 구분도
항상 그려지게 됐고, 이번 PR이 `braileblock-confirmed`를 더하면서도 마찬가지다. 실제로 이 PR의
변경 없이(수정 전 원본 테스트 파일로) 이 테스트만 다시 돌려 확인한 결과 `Expected: 1, Received: 2`
로 **이미 실패하고 있었다**(desktop·mobile 모두). 다음과 같이 고쳤다.

- 특정 그룹 이름이나 총 개수를 하드코딩하지 않고, `placeSearchFacilityLayers` /
  `officialFacilityLayers` / `derivedFacilityLayers` 중 실제로 항목이 있는 구분의 수를 세어
  기대값으로 쓴다.
- 원래 의도("레이어가 0개인 구분은 그리지 않는다")는 그대로 유지한다. `officialFacilityLayers`가
  비어 있는 동안 "공식 공공데이터" 헤딩이 없다는 단언은 그대로 뒀다.
- 단언을 지우지 않고, 한국어 주석 한 줄로 이유를 남겼다.

이 커밋은 별도 PR을 만들지 않고 이 PR(feat/spec-14-tactile-paving)에 함께 포함했다.

## 역할 구분

- 사람: 명세 승인(specs/14-tactile-paving-layer.md), 브랜치·PR 정책 지시
- AI: 0단계 조사(WebSearch), 코드·테스트·문서 작성, 검증 실행, PR 작성

## 구현 요약(1단계)

- `lib/facility-selection.js`의 `FACILITIES`에는 `braileblock`이 이미 있었고, 편의 조건 고르기
  화면(`features/planner/components/PlannerConditionsPanel.tsx`)은 `FACILITIES` 배열 전체를
  그대로 매핑해 보여주므로 **점자블록은 이미 선택 가능했다.** 코드 변경이 필요 없었다(직접
  Playwright로 다시 확인함, 아래 검증 결과 참고).
- `lib/tactile-paving-facility.js`(신규): confirmed/negative/unknown 세 고정 문구
  (`점자블록 있음` / `점자블록 없음` / `점자블록 정보 없음`)와 "관광지에 등록된 정보예요. 주변
  보도의 점자블록은 확인되지 않았어요." 고정 안내를 담는 순수 데이터 모듈. 안내견 동반
  (`lib/guide-dog-facility.js`, 스펙 20)과 같은 패턴이다. 네트워크·저장소·위치 API를 참조하지
  않는다.
- `features/planner/components/PlaceFacilitySummary.tsx`: 안내견 동반과 마찬가지로 점자블록도
  일반 항목 목록에서 분리해, 위 세 문구와 안내를 항상 함께 보여주는 배지를 추가했다. 기존
  `.access-badge` 클래스만 재사용해 **새 CSS를 추가하지 않았다.**
- `features/routing/constants.ts`: `derivedFacilityLayers`에
  `{ id: "braileblock-confirmed", label: "점자블록이 확인된 곳", source: "derived",
  derivedKey: "braileblock", glyph: "점" }`를 추가했다. 새 서버 action이나 새 네트워크 요청을
  만들지 않고, 이미 조회된 장소 목록(`MapPlace.accessibility`)에서 `state === "confirmed"`인
  항목만 걸러 마커로 그리는 기존 `derived` 갈래(`features/routing/useFacilityLayers.ts`)를 그대로
  탄다. 지도 핀 모양(사각 vs 원형)과 마커 상한(60개), 4개 레이어 상한, 범례 문구 등은 기존 인프라가
  자동으로 적용한다.
- `features/routing/components/FacilityLayerPanel.tsx`: 영문 레이블 매핑에
  `"braileblock-confirmed": "Tactile paving confirmed"` 한 줄만 추가했다.
- `tests/tactile-paving.test.mjs`, `e2e/tactile-paving.spec.ts` 신규(안내견 관련 테스트와 같은
  구조).

## 명세와 다르게 구현한 부분과 이유

- 명세 0단계는 "찾은 데이터셋마다 이름·URL·제공기관 등을 기록한다"고 요구하지만, 실제로 검색
  결과에서 점자블록·유도블록 위치 데이터 자체를 제공하는 후보 데이터셋을 하나도 찾지 못해 표로
  기록할 대상이 없었다. 검색어와 결과(무관한 데이터셋만 나옴)는 위 절에 그대로 남겼다.
- 그 외에는 명세를 축소하거나 다른 방식으로 대체하지 않았다.

## CSS 예산

- 분기 시점(`feat/spec-13-wheelchair-route-layer`, 이 PR의 부모) 실측: `cssRawKiB 368.2`,
  `cssGzipKiB 70`(반올림 표시. 스펙 13 로그 기준 바이트 단위 71,676 / 예산 71,680).
- 구현 후 실측: `cssRawKiB 368.2`, `cssGzipKiB 70` — **완전히 동일**. 이번 작업은 CSS 파일을 전혀
  건드리지 않았다(`app/styles/map-workspace.css` 등 기존 클래스만 재사용). 죽은 선언을 지워
  상쇄할 필요가 없었다.

## 검증 결과(2026-09-19, Windows, `C:\Users\admin\wave`, 브랜치 `feat/spec-14-tactile-paving`)

- `npm run lint` — 통과(에러 0, 기존 landing 이미지·`window.location.assign` 경고 14건은 기준선과
  동일).
- `npm run typecheck` — 통과.
- `npm test` — 1298개 중 1296 통과, 2건 실패(`tests/assistant-photo.test.mjs`,
  `tests/assistant-runtime.test.mjs`). 이 머신에 Python이 없어 생기는 기존 문제이며 main에서도
  실패한다. 새로 추가한 `tests/tactile-paving.test.mjs`는 모두 통과했다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. CSS gzip 예산 변화 없음(위 절 참고).
- `npx playwright test e2e/tactile-paving.spec.ts e2e/facility-layers.spec.ts
  e2e/guide-dog.spec.ts` — 34개(desktop+mobile) 모두 통과. `facility-layers.spec.ts`의 갱신된
  단언("공식 데이터 레이어가 하나도 없으면 그 구분을 그리지 않는다")과 안내견(스펙 20) 관련
  테스트가 이번 변경과 함께 회귀 없이 통과함을 확인했다.
- `npm run test:e2e`(전체 스위트)는 실행하지 않았다. 이 작업이 건드리지 않은 다른 스펙까지 전부
  돌리는 대신 관련 파일만 실행했다. 나머지는 통과했다고 적지 않는다.
- 390/960/1440px 실제 렌더링 확인: `e2e/tactile-paving.spec.ts`의 두 번째 테스트가 세 너비 모두
  에서 가로 스크롤 없음과 axe 위반 0건을 자동으로 확인한다. 수동 스크린샷 검토는 하지 않았다.
- 실제 제공처 호출 결과는 없다. 0단계에서 보행로 단위 점자블록 OpenAPI를 확인하지 못했고, 1단계는
  이미 조회된 `KorWithService2/detailWithTour2` 응답(합성 fixture)에서 파생하는 구현이라 새 호출
  자체가 없다.

## 완료 기준 대조

- 편의 조건에서 점자블록을 고를 수 있고 장소 상세에서 세 상태가 구분된다 — 충족(위 e2e로 확인).
- 0단계 검증 결과가 기록돼 있고 그에 따라 2단계 구현 여부가 정해졌다 — 충족(위 0단계 절).
- 통행 가능을 주장하는 문구가 없다 — 충족(새 문구는 상태·범위 안내뿐이다).
- 표시가 색 외의 방법으로도 구분된다 — 충족(문구 자체가 다르고, 지도 마커는 기존 사각/원형 핀
  구분과 글자 glyph `점`을 쓴다. 색만으로 구분하지 않는다).
- 서버 요청·응답에 사용자 좌표 필드가 없다 — 충족(새 서버 코드를 추가하지 않았다).
- 위 명령과 e2e가 모두 통과하고 axe 위반 0건이다 — 위에서 실행한 범위 내에서 충족. 전체
  `npm run test:e2e`는 실행하지 않았다(위 절 참고).
