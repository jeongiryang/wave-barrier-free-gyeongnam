# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 접근로 설명 원문 표시
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 0단계 검증 결과와 선택한 설계

**1단계만 구현했다.**

### 가. `route` 필드 실제 내용 확인

이 개발 환경(Windows, `C:\Users\admin\wave`)에는 공공데이터포털·한국관광공사 서비스 키가 전혀
없다(`env | grep -i -E "TOUR|DATA_GO|PUBLIC_DATA|SERVICE_KEY|KAKAO"` 결과 없음). 그래서 명세가
요구하는 "경남 관광지 표본 20곳 이상에 대해 `detailWithTour2`의 `route` 값을 실제로 받아본다"는
절차를 수행할 수 없었다. 값이 있는 비율, 표현 목록 등은 실측하지 못했다 — 추측으로 채우지
않는다. (참고: `lib/wheelchair-route-info.js`의 스펙 13 작업 기록에 따르면 이 저장소는 `route`가
문장형 설명이라고 전제하고 있으나, 이번 작업에서 별도로 재확인하지는 못했다.)

### 나. 공공데이터 확인

WebSearch로 `경사로`, `보도 경사`, `장애물 없는 생활환경`, `이동편의시설`,
`data.go.kr "경사로" 표준데이터 OpenAPI 보도` 등을 검색했다. 결과는 공공데이터포털 총론 페이지,
무관한 데이터셋(입찰공고, 보도자료 등)뿐이었고, **경사로·보도 경사 위치를 주는 OpenAPI, 특히
경상남도 표본이 있는 것을 하나도 찾지 못했다.**

### 판단

나에서 쓸 수 있는 제공처를 찾지 못했으므로 **2단계(`server/tourism/slope-info.ts`)는 구현하지
않는다.** 가의 결과(실측 불가)는 그대로 1단계 설계에 반영해, 있는 그대로의 원문만 보여주고 값이
없을 때 평탄하다고 쓰지 않는 방식을 택했다.

## #572와 겹치는 부분 (중복 구현하지 않음)

PR #572(`feat/spec-13-wheelchair-route-layer`, 이 브랜치 계보의 조상)가 장소 상세 "입구" 단계에
이미 다음을 구현해 두었다.

- `place.accessibility`에서 `key === 'route'`인 항목의 상태를 confirmed/negative/unknown으로
  구분해 `lib/wheelchair-route-info.js`의 고정 문구로 보여주는 "휠체어 통행 정보" 블록
  (`features/planner/components/PlaceArrivalPreview.tsx`).
- 그 세 문구가 정확히 스펙 16이 요구하는 문구와 같다.
  - `unknown` → `접근로 정보가 등록돼 있지 않아요.` (스펙 16의 "값이 없으면" 문구와 동일)
  - `negative` → `접근로가 없다고 등록돼 있어요.` (스펙 16의 "명시적 부재" 문구와 동일)
- #545(문의 기능, `PlaceInquiryCard`)로 가는 링크("문의 카드 만들기" 버튼, 3단계로 이동).

**이 PR은 위 항목을 다시 만들지 않았다.** #572가 만든 `wheelchairRouteStateText`와 링크를 그대로
재사용했다.

## 이번에 새로 구현한 부분

- `lib/slope-description.js`(신규): "경사와 턱의 정도는 등록된 설명 그대로예요. 실제 기울기는
  확인되지 않았어요." 고정 문구 하나만 담는 순수 모듈. 고도·표고 API를 참조하지 않는다.
- `server/tourism/accessibility-model.ts`: `route` 항목만 `clean()`으로 HTML 태그를 제거하고
  600자까지 보존하도록 고쳤다. 기존 `buildAccessibilityItems`는 HTML 태그를 지우지 않고 300자로
  자르기만 했다(다른 필드는 그대로 둠). `clean()` 자체의 기본값(240)은 바꾸지 않았다.
- `features/planner/components/PlaceArrivalPreview.tsx`: "입구" 단계의 일반 필드 목록에서
  `route` 항목만 따로 처리해, 원문이 있으면 인용 스타일(`<blockquote>`, 왼쪽 세로선
  `3px solid var(--line)`, 글자 `var(--ink)`, 인라인 스타일만 사용해 새 CSS 클래스를 만들지
  않음)로 그대로 보여주고, 원문이 없으면 #572의 `wheelchairRouteStateText`로 대체했다. 그 아래에
  `SLOPE_DESCRIPTION_DISCLAIMER`를 항상 붙였다. 기존 "휠체어 통행 정보" 블록(#572)은 건드리지
  않았다.
- `tests/slope-info.test.mjs`, `e2e/slope-info.spec.ts` 신규.

## 절대 금지 사항 준수

- 고도·표고 API를 연결하지 않았다. `server/tourism/slope-info.ts`, 관련 모듈을 만들지 않았다
  (테스트로 부재를 확인).
- 힘듦 등급, 색 신호등(초록·노랑·빨강)을 표시하지 않는다(e2e·유닛 테스트로 해당 낱말 부재를
  확인).
- 접근로 설명을 요약·재작성하지 않는다(원문을 그대로 `<blockquote>`에 넣는다, HTML 태그 제거는
  마크업 정리이지 내용 재작성이 아니다 — 다른 모든 필드도 `clean()`으로 같은 처리를 받는다).
- 정보 없음을 평탄함으로 표시하지 않는다(#572의 unknown 문구를 그대로 재사용, "평탄" 낱말을
  쓰지 않는다).
- 경사 정보로 장소를 목록에서 자동 제외하지 않는다(필터링 로직을 건드리지 않았다).
- `difficulty`, `hard`, `steep`, `gradient` 같은 판단 필드를 만들지 않았다(유닛 테스트로 확인).
- 사용자 좌표를 표현하는 필드를 만들지 않았다(새 서버 코드 자체가 없다).

## 역할 구분

- 사람: 명세 승인(specs/16-slope-warning-layer.md), 브랜치·PR 정책 지시
- AI: 0단계 조사(WebSearch, 환경 변수 확인), 코드·테스트·문서 작성, 검증 실행, PR 작성

## CSS 예산

- 이번 작업은 CSS 파일을 전혀 건드리지 않았다(인용 스타일은 인라인 `style` 속성만 썼다).
- 분기 시점(`feat/spec-14-tactile-paving`)과 구현 후 모두 `cssRawKiB 368.2` / `cssGzipKiB 70`으로
  **완전히 동일**하다.

## 검증 결과(2026-09-19, Windows, `C:\Users\admin\wave`, 브랜치 `feat/spec-16-slope-info`)

- `npm run lint` — 통과(에러 0, 기존 경고 14건은 기준선과 동일).
- `npm run typecheck` — 통과(e2e 파일 추가 후 다시 실행함).
- `npm test` — 1303개 중 1301 통과, 2건 실패(`tests/assistant-photo.test.mjs`,
  `tests/assistant-runtime.test.mjs`). 이 머신에 Python이 없어 생기는 기존 문제이며 main에서도
  실패한다. 새로 추가한 `tests/slope-info.test.mjs` 5건은 모두 통과했다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. CSS gzip 예산 변화 없음(위 절 참고).
- `npx playwright test e2e/slope-info.spec.ts e2e/place-arrival-route.spec.ts e2e/guide-dog.spec.ts
  e2e/tactile-paving.spec.ts e2e/facility-layers.spec.ts e2e/powerchair-charging.spec.ts` — 50개
  (desktop+mobile) 모두 통과. 같은 `PlaceArrivalPreview.tsx`를 건드리는 스펙 13·15·20과
  회귀가 없음을 함께 확인했다.
- `npm run test:e2e`(전체 스위트)는 실행하지 않았다. 이 작업이 건드리지 않은 다른 스펙까지 전부
  돌리는 대신 관련 파일만 실행했다. 나머지는 통과했다고 적지 않는다.
- 390/960/1440px 실제 렌더링 확인: `e2e/slope-info.spec.ts`의 네 번째 테스트가 세 너비 모두에서
  가로 스크롤 없음과 axe 위반 0건을 자동으로 확인한다. 수동 스크린샷 검토는 하지 않았다.
- 코드 검토로 고도·표고 API 호출 0건 확인: 이번 커밋의 변경 파일(`lib/slope-description.js`,
  `server/tourism/accessibility-model.ts`, `features/planner/components/PlaceArrivalPreview.tsx`)
  어디에도 고도·표고·elevation·altitude 관련 호출이 없다. `server/tourism/slope-info.ts`도
  만들지 않았다.
- 실제 제공처 호출 결과는 없다. 0단계 가·나 모두 실제 호출/표본 확인을 하지 못했다(서비스 키
  없음, 경남 표본 OpenAPI 미확인). 이 PR의 테스트는 전부 합성 fixture 결과다.

## 완료 기준 대조

- 접근로 설명이 원문 그대로 보인다 — 충족(값이 있을 때, `<blockquote>`로 인용).
- 고도 계산 코드와 고도 API 호출이 0건이다 — 충족(코드 검토로 확인).
- 힘듦 등급이나 색 신호등 표시가 없다 — 충족(테스트로 확인).
- 정보 없음이 평탄함으로 표시되지 않는다 — 충족(#572의 문구 재사용, "평탄" 낱말 없음).
- 0단계 결과가 기록돼 있고 그에 따라 2단계 구현 여부가 정해졌다 — 충족(위 0단계 절).
- 위 명령과 e2e가 모두 통과하고 axe 위반 0건이다 — 위에서 실행한 범위 내에서 충족. 전체
  `npm run test:e2e`는 실행하지 않았다(위 절 참고).
