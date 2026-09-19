# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 휠체어 통행 정보 표시
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 0단계 검증 결과와 선택한 설계

**대체 설계(2단계)를 구현했다.** 근거는 다음과 같다.

- 공공데이터포털(data.go.kr)에서 검색어 `무장애`, `보행자 이동편의시설`, `장애물 없는 생활환경`,
  `보도 경사`, `경상남도 보행`, `경상남도 무장애`, `경상남도 교통약자`로 실제 검색을 반복했다
  (`https://www.data.go.kr/tcs/dss/selectDataSetList.do?keyword=...`을 curl로 직접 호출).
- 웹 검색으로 처음 나온 후보 `공공데이터활용지원센터_GIS 기반 교통약자 보행이동 편의 및 장애시설
  정보`(data.go.kr/data/15086283)는 실제로 열어보니 **404**(존재하지 않는 링크)였다.
- 위 검색어들로 실제로 찾은 데이터셋은 다음과 같았고, 전부 이 기능에 맞지 않았다.
  - `경기도 성남시_보행자 전용도로`(15111669), `경기도 성남시_적치물 등 장애물`(15111670) — 경남
    표본 아님.
  - `서울교통공사_교통약자_이용시설_승강기_가동현황`(15067770), `서울교통공사_교통약자이용정보`
    (15143843) — 경남 표본 아님, 지하철 역사 승강기 데이터.
  - `대구광역시 서구_교통약자를 위한 관공서/병의원/복지시설 상세데이터`(15110491/95/96) — 경남
    표본 아님.
  - `경상남도 남해군_횡단보도 조회 서비스`(15111900), `경상남도 의령군_보안등정보 서비스`
    (15112084) — 경남 표본은 있으나 횡단보도·보안등 위치 데이터일 뿐, 무장애 보행로·보행 편의
    시설 데이터가 아니다.
  - `경기도 성남시_보행자 전용도로 미리보기/활용신청`(15091548 등) — **파일 다운로드(fileData)
    전용**이라 OpenAPI가 아니다(명세가 이미 경고한 경우와 정확히 일치).
- **경상남도(도 또는 18개 시군) 표본이 있는 무장애 보행로/보행 이동편의시설 OpenAPI를 하나도
  찾지 못했다.**
- 설령 데이터셋을 찾았더라도, 이 개발 환경에는 공공데이터포털 API 키가 없어(`env | grep -i -E
  "TOUR|DATA_GO|PUBLIC_DATA|SERVICE_KEY"` 결과 없음) 실제 1회 호출로 확인하는 0단계 3번 절차를
  수행할 수 없었을 것이다.
- 명세 0단계 4번의 조건("OpenAPI로 JSON을 받을 수 있고, 경남 표본이 있으며, 구간/지점 좌표와
  기준일이 있다")을 만족하는 제공처를 확인하지 못했으므로 **2단계 대체 설계**를 구현했다.
  이는 지시문이 명시적으로 "이쪽일 가능성이 높다"고 예상한 경로다.

## 역할 구분

- 사람: 명세 승인(specs/13-wheelchair-route-layer.md), 브랜치·PR 정책 지시
- AI: 0단계 조사(WebSearch + curl 직접 호출), 코드·테스트·문서 작성, 검증 실행, PR 작성

## 구현 요약(대체 설계)

- `lib/wheelchair-route-info.js`(신규): `route` 필드의 confirmed/negative/unknown 세 고정 문구와
  "주차장에서 입구까지의 계단 없는 길은 확인되지 않았어요." 고정 안내를 담는 순수 데이터 모듈.
  네트워크·저장소·위치 API를 참조하지 않는다. 통행 가능 여부를 뜻하는 불리언 필드가 없다.
- `features/planner/components/PlaceArrivalPreview.tsx`: `입구` 단계에서만 이 문구를 보여주는
  블록을 추가했다. `place.accessibility`에서 `key === 'route'`인 항목의 상태를 그대로 쓴다(새
  판정 로직 없음). 아래에 항상 고정 안내 문장을 두고, 이미 있는 `PlaceInquiryCard`(#545 문의
  기능, 이 컴포넌트의 마지막 "시설" 단계에 이미 통합돼 있음)로 이동하는 링크를 뒀다.
  기존 클래스 `.place-inquiry-entry`(스펙 15가 도입, design-system.css 아님)와
  `.simple-text-link`(이미 `min-height: 44px`)만 재사용해 **새 CSS를 추가하지 않았다.**
- 지도에 구간을 그리지 않았다. 새 레이어, 새 서버 파일(`server/tourism/accessible-route.ts`),
  새 action, 새 환경 변수, 새 `request-budget` 항목을 만들지 않았다.
- `tests/place-arrival-route.test.mjs`, `e2e/place-arrival-route.spec.ts` 신규.

## 명세와 다르게 구현한 부분과 이유

- 명세는 "#528의 현장 의사소통판과 #545의 문의 기능으로 가는 링크를 둔다"고 했다. 이 저장소의
  현재 브랜치 계보(main → #565 → #568 → #570 → 이 PR)에는 **#528(현장 의사소통판)이 병합돼 있지
  않다**(별도 미병합 원격 브랜치 `codex/issue-528-onsite-communication`으로만 존재하며, main도
  정지 상태라 어느 브랜치에서도 가져올 수 없다). 존재하지 않는 화면으로 링크를 걸 수는 없으므로,
  **#545(문의 기능, `PlaceInquiryCard`)로 가는 링크만 뒀다.** #528이 이후 병합되면 같은 자리에
  두 번째 링크를 추가하면 된다.
- "문의 기능으로 가는 링크"는 새 라우팅이나 앵커가 아니라, 이미 같은 `PlaceArrivalPreview` 안에
  있는 3단계("시설")로 `setActive`를 옮기는 버튼으로 구현했다(그 단계에 `PlaceInquiryCard`가 이미
  렌더링된다). 새 화면·새 서버 action을 만들지 않기 위한 선택이다.

## CSS 예산

- 분기 시점(`feat/spec-20-guide-dog-places`) 실측: `cssRawKiB 368.2`, `cssGzipKiB 70`(바이트 단위
  71,676 / 예산 71,680, 헤더룸 4바이트).
- 구현 후 실측: `cssRawKiB 368.2`, `cssGzipKiB 70` — **완전히 동일**. 새 CSS 클래스를 하나도
  추가하지 않고 기존 `.place-inquiry-entry`·`.simple-text-link`만 재사용했다. 1440/960/390px에서
  Playwright로 가로 스크롤 0을 실제로 확인해 계산된 레이아웃이 깨지지 않았음도 함께 확인했다.

## 검증 결과(2026-09-19, Windows, `C:\Users\admin\wave`, 브랜치 `feat/spec-13-wheelchair-route-layer`)

- `npm run lint` — 통과(에러 0, 기존 landing 이미지 경고 14건은 기준선과 동일).
- `npm run typecheck` — 통과.
- `npm test` — 1291개 중 1289 통과, 2건 실패(`tests/assistant-photo.test.mjs`,
  `tests/assistant-runtime.test.mjs`). 이 머신에 Python이 없어 생기는 기존 문제이며 main에서도
  실패한다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. CSS gzip 예산 변화 없음(위 절 참고).
- `npx playwright test e2e/place-arrival-route.spec.ts` — 6개(desktop+mobile) 모두 통과.
- `npx playwright test e2e/powerchair-charging.spec.ts e2e/guide-dog.spec.ts
  e2e/place-arrival-route.spec.ts` — 12개 모두 통과(같은 `PlaceArrivalPreview.tsx`를 건드리는
  스펙 15·20과 회귀가 없음을 함께 확인).
- `npm run test:e2e`(전체 스위트)는 실행하지 않았다. 이 작업이 건드리지 않은 다른 스펙까지 전부
  돌리는 대신 관련 파일만 실행했다. 나머지는 통과했다고 적지 않는다.
- 390/960/1440px 실제 렌더링 확인: `e2e/place-arrival-route.spec.ts`의 세 번째 테스트가 세 너비
  모두에서 가로 스크롤 없음과 axe 위반 0건을 자동으로 확인한다. 수동 스크린샷 검토는 하지 않았다.
- 합성 fixture 결과만 있다. 실제 제공처 호출 결과는 없다(0단계에서 쓸 수 있는 제공처를 찾지
  못했으므로 대체 설계를 구현했고, 대체 설계는 서버 호출을 하지 않는다).

## 완료 기준 대조

- 0단계 검증 결과가 기록돼 있고, 그에 따라 2단계가 구현돼 있다 — 충족.
- 화면 어디에도 휠체어 통행 가능을 단정하는 문구가 없다 — 충족(테스트로 "통행 가능"/"이용 가능"
  문자열 없음을 확인).
- 정보가 없는 곳이 통행 불가로 표시되지 않는다 — 충족(`unknown` 문구는 "등록돼 있지 않아요"이지
  "없어요"가 아니다).
- 서버 요청·응답에 사용자 좌표 필드가 없다 — 충족(새 서버 요청 자체가 없다).
- 표시 선이 여행 경로선과 색 외의 방법으로 구분된다 — **해당 없음**(2단계는 지도에 선을 그리지
  않는다. 이 항목은 1단계에만 해당한다).
- 위 명령과 e2e가 모두 통과하고 axe 위반 0건이다 — 충족(이 PR이 새로 만들거나 건드린 범위 안에서.
  전체 `test:e2e`는 실행하지 않았다).
