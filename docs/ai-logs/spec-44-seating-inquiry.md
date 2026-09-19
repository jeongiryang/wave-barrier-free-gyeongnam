# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 자리 확인 돕기
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 목적

명세 44(자리 확인 돕기). 1인 메뉴·단체석·좌석 형태(입식·좌식)를 주는 공공데이터는 없다.
`server/tourism/dining-accessibility.ts`(음식점 `detailIntro2` 처리)와 `lib/facility-selection.js`의
`FACILITIES` 목록을 다시 확인해 이 값을 담는 필드가 없다는 것을 재확인했다. 그래서 이 작업은
거르기가 아니라, 방문 전 문의 항목(#545) 추가와 "등록돼 있지 않다"는 안내 문구만 다룬다.

## 역할 구분

- 사람: 명세 44 작성, 최종 승인, GitHub 저장소·Secret 관리
- AI(이 세션): 명세 재확인, 코드·테스트 변경, 검증 실행, AI 로그·PR 작성

## 구현

- `lib/place-decision-tools.js`: `inquiryOptions` 배열 끝에 세 항목을 추가했다.
  - `seating`(좌석 형태): `의자가 있는 자리가 있나요? 좌식만 있나요?`
  - `solo`(1인 주문): `혼자 먹을 수 있는 메뉴가 있나요?`
  - `groupSeating`(여럿 자리): `여러 명이 함께 앉을 자리가 있나요?`
  - 셋 다 `keys: []`로 둬서 `defaultInquiryOptions`가 확인된 편의 필드로 절대 자동 선택하지
    않는다(기본 선택 아님이 항상 보장된다). `좌석 형태`는 접근성과 직접 관련이 있으므로 기존
    마지막 접근성 질문(`guidance`, 글·쉬운 안내) 바로 다음에 둬서 같은 묶음에 있게 했다. 기존
    일곱 항목의 순서와 문구는 전혀 바꾸지 않았다(뒤에만 붙임).
  - 자리 정보를 담는 데이터 필드(`soloMenu`, `seatingType`, 일행 수 등)는 어디에도 만들지
    않았다. 새 타입도 만들지 않았다(기존 문의 항목 구조 재사용).
- `features/planner/components/PlaceArrivalPreview.tsx`: `시설` 단계에
  `자리 형태와 1인 주문 가능 여부는 공공데이터에 등록돼 있지 않아요. 미리 물어보면 확실해요.`를
  추가했다. 이 단계는 이미 마지막 단계라 바로 아래에 기존 `PlaceInquiryCard`(#545)의
  "문의 카드 만들기" 버튼이 이어지므로 별도 링크를 새로 만들지 않았다.
- `features/planner/components/PlaceInquiryDialog.tsx`, `PlaceFacilitySummary.tsx`: 수정하지 않았다.
  기존 `fieldset > div { flex-wrap: wrap }` 레이아웃이 항목이 늘어나도 그대로 감당한다.
- 목록·지도에 자리 관련 거르기, 사용자 제보 기능, 일행 수 질문/저장 기능을 추가하지 않았다.
- `app/styles/place-decisions.css`, `globals.css`, `design-system.css`는 건드리지 않았다. CSS를
  전혀 늘리지 않았다.

## 명세와 다르게 구현한 부분

- `e2e/place-inquiry.spec.ts`는 명세에 "(기존 확장)"이라 적혀 있었지만, 저장소에 그 이름의 기존
  파일이 없어 새로 만들었다.

## 검증

- `tests/place-decision-tools.test.mjs`(기존 파일 확장): 세 항목 추가·문구·기존 일곱 항목 순서
  불변, 기본 선택 불변, 소스에 `soloMenu`/`seatingType`/`partySize` 등의 필드가 없는 것, 이 모듈이
  `fetch`/`localStorage`/`navigator.geolocation` 등을 참조하지 않는 것을 확인하는 테스트 4건 추가.
  `node --test tests/place-decision-tools.test.mjs` 8개 전부 통과.
- `npm test`: 1342/1344 통과. 실패 2건(`assistant-photo.test.mjs`,`assistant-runtime.test.mjs`)은
  이 머신에 Python이 없어 생기는 기존 문제이며 main에서도 실패한다. 이 PR과 무관.
- `npm run lint`: 통과. 0 errors, 14 warnings(모두 이 변경 이전과 동일한 기존 경고).
- `npm run typecheck`: 통과(`e2e/place-inquiry.spec.ts` 추가 후 재실행 포함).
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. CSS gzip 70.00 KiB → 70.00 KiB(변화 없음, CSS 파일을 전혀
  수정하지 않았다).
- `e2e/place-inquiry.spec.ts`(신규, desktop+mobile-chromium 4건): 새 세 질문을 골라 문의 카드
  미리보기가 완성되는 것, 오프라인 상태에서도 동작하는 것, `/api/*` 네트워크 요청이 0건인 것,
  1440/960/390px에서 가로 스크롤이 없고 axe 위반이 없는 것을 확인 — 모두 통과.
- 회귀(이 PR이 건드린 `PlaceArrivalPreview.tsx`와 관련된 기존 e2e): `e2e/place-arrival-route.spec.ts`,
  `e2e/stay-facility.spec.ts`(desktop+mobile, 16건) 모두 통과. 추가로 `e2e/slope-info.spec.ts`,
  `e2e/dining-accessibility.spec.ts`, `e2e/place-detail-decision.spec.ts`(desktop+mobile, 36건)도
  재확인해 모두 통과했다.
- 전체 `npm run test:e2e`(모든 spec·모든 shard)는 이 저장소 규모와 이 머신의 속도상 실행하지
  않았다(PR #582도 같은 이유로 생략함). 대신 이 PR이 실제로 건드린 파일과 관련된 spec만 선택
  실행했다. 이 계보에 이미 있던 것으로 알려진 `map-tools-reachable`(4건)·`mobile-touch-targets`
  (1건) 실패는 이 PR에서 건드리지 않은 파일(지도 관련)에 대한 것이라 이번 선택 실행 범위 밖이다.
- 390/960/1440px 실렌더링·axe 위반 0건은 위 e2e의 뷰포트 테스트로 확인.
- 이 머신에 공공데이터 키·카카오 키가 없어 이 PR도 합성 fixture로만 검증했다(이 기능 자체가
  네트워크를 쓰지 않으므로 원래도 제공처 호출이 없다).

## 결과와 제한

- 병합하지 않았다. 리뷰 대기 상태로 PR만 올렸다.
- 남은 위험: 없음(이 기능은 순수 UI 문구·문의 항목 추가이며 네트워크·저장 동작이 없다).
- 후속 작업: 사용자 제보로 자리 정보를 모으는 기능은 검증·신고·삭제 체계가 필요해 이 PR
  범위에서 의도적으로 제외했다(명세 44 본문에 명시된 별도 이슈).

## 완료 기준 대비

- [x] 문의 항목 세 개가 추가됐고 기본 선택이 바뀌지 않았다
- [x] 자리 정보를 추측하거나 저장하는 코드가 0건이다(테스트로 고정)
- [x] 자리 관련 거르기가 만들어지지 않았다
- [x] 장소 상세에 등록돼 있지 않다는 사실이 적혀 있다
- [x] 오프라인에서 동작하고 네트워크 요청이 0건이다(e2e로 확인)
- [x] 위 명령과 이 PR 범위 e2e가 통과하고 axe 위반 0건이다(전체 `test:e2e`는 미실행, 사유 위 기재)
