# PR #번호 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/568
- 제목: feat: 전동휠체어 충전 가능 장소
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 목적

`specs/15-powerchair-charging.md`(전동휠체어 충전 가능 장소) 구현. 명세의 0단계(제공처 검증)를
먼저 수행했고, 공공데이터포털 OpenAPI로 경상남도 표본을 실제 호출로 확인하지 못해 명세의
"대체 설계"를 구현했다. 지도 레이어나 설치 장소 목록 대신, 장소 상세의 "주차" 단계에
정적 안내 카드 하나와 경남 18개 시군의 공식 안내 페이지 링크만 추가했다.

## 0단계 검증 결과

- 후보 데이터셋
  - 전국전동휠체어급속충전기표준데이터 (data.go.kr/data/15034533, 소관 보건복지부 · 제공 지자체).
    표준데이터로 갱신주기 반기, 필드에 시설명·시도명·시군구명·주소·위경도·운영시간·관리기관·
    데이터기준일자가 있다고 웹 조회로 확인. 경남 진주시 표본이 포함된다는 웹 조회 결과도 있었다.
  - 충청북도 괴산군_전동휠체어급속충전기(15085492) — 단일 군 전용, 경남 아님.
  - 부산광역시_장애인 전동보장구 급속충전기 설치 현황(15034013) — 부산 전용, 경남 아님.
- **실제 호출 시도 결과**: 이 개발 환경(`C:\Users\admin\wave`)의 환경 변수에 공공데이터포털 API 키가
  없다(`env | grep -i -E "TOUR|DATA_GO|PUBLIC_DATA|SERVICE_KEY"` 결과 없음). 그래서 위 데이터셋을
  실제로 호출하지 못했다. WebFetch로 확인한 포털 페이지는 OpenAPI 엔드포인트 URL·인증 파라미터·
  실제 응답 예시를 보여주지 않았다(JS 렌더링 포털이라 정적 조회로 상세 스펙 확인 불가).
  **필드명과 경남 표본 건수를 추측으로 채우지 않았다.**
- 결론: OpenAPI 호출로 경남 표본이 있음을 실제로 확인하지 못했으므로 **대체 설계**를 구현했다.

## 역할 구분

- 사람: 명세 승인(specs/15-powerchair-charging.md), 브랜치·PR 정책 지시
- AI: 0단계 조사, 코드·테스트·문서 작성, 검증 실행, PR 작성

## 구현 요약(대체 설계)

- `lib/powerchair-charging-links.js`: 경남 18개 시군의 공식 안내 페이지 링크 정적 데이터(순수 데이터,
  네트워크·저장소·위치 API 미참조). 각 URL은 WebFetch/WebSearch로 2026-09-19에 접속 가능함을 확인.
  가능하면 장애인 전동보장구·충전기 관련 페이지(1순위), 없으면 장애인복지 페이지(2순위), 그것도
  없으면 시청/군청 공식 누리집 메인(3순위)을 사용했다.
- `features/planner/components/PowerchairChargingNotice.tsx`: 새 정적 컴포넌트. 네트워크 호출 없음.
  명세 문구 `전동휠체어 충전 장소는 시군마다 안내가 달라요. 방문 전 관할 기관에 확인하는 것이
  확실해요.`를 그대로 표시하고, `<details>`로 접은 18개 시군 링크 목록을 둔다.
- `features/planner/components/PlaceArrivalPreview.tsx`: "주차" 단계에서만 위 컴포넌트를
  `lazy`+`Suspense`로 불러오도록 한 줄 추가.
- `tests/powerchair-charging.test.mjs`, `e2e/powerchair-charging.spec.ts` 신규.
- `app/styles/place-decisions.css`는 수정하지 않았다(아래 CSS 예산 참고).
- 대체 설계이므로 명세의 "본 설계를 구현하는 경우에만 해당하는 지침"(서버 파일, handler.ts 분기,
  request-budget 항목, `officialFacilityLayers` 등록, 지도 핀)은 적용하지 않았다.

## 검증

- 기준선(분기 직후, `feat/spec-11-facility-multi-layer-map` 기준): `npm run lint` PASS(경고만,
  변경 없음), `npm run typecheck` PASS, `npm run check:performance` PASS
  (`cssGzipKiB: 70`/70, 실측 71676바이트).
- 구현 후: `npm run lint` PASS(동일한 기존 경고 14건, 새 오류 없음), `npm run typecheck` PASS,
  `npm test` — 1280개 중 1278 PASS·2 FAIL. 실패 2건은 이 머신에 Python이 없어 생기는 기존 문제
  (`assistant-photo.test.mjs`, `assistant-runtime.test.mjs`, 오류 메시지 `Python \n\n 9009 !== 0`)로
  main에서도 동일하게 실패한다. 이번 변경과 무관하며 고치지 않았다. 새로 추가한
  `tests/powerchair-charging.test.mjs`(4개)는 모두 PASS.
- `npm run build:vercel` PASS.
- `npm run check:performance`(구현 후) PASS — `cssGzipKiB: 70`/70, 실측 71676바이트로 **분기 시
  기준선과 정확히 동일**(바이트 단위로 동일함을 직접 확인). `place-decisions.css`를 전혀 수정하지
  않고 기존 클래스(`place-inquiry-entry`)를 그대로 재사용했기 때문에 CSS 번들에 새 바이트가 전혀
  추가되지 않았다. 분기 시점에 헤더룸이 4바이트(71680-71676)뿐이었기 때문에, 죽은 선언 제거로
  상쇄하는 대신 새 CSS를 아예 추가하지 않는 쪽을 선택했다.
- e2e: `npm run test:e2e -- e2e/powerchair-charging.spec.ts --project=desktop-chromium` PASS(1개).
  관련 기존 스펙 `e2e/recommendation-language.spec.ts`(8개, "주차·입구·시설 미리보기" 영역 포함)와
  `e2e/return-transport.spec.ts`(3개, 같은 다이얼로그를 공유)도 재실행해 회귀 없음을 확인, 모두 PASS.
  전체 e2e 스위트는 실행하지 않았다(지시에 따름).
- 이 머신에는 카카오 지도 JS 키가 없어 실제 지도 제공처 호출은 검증하지 못했다. 다만 대체 설계는
  지도 레이어나 카카오맵 링크를 전혀 만들지 않으므로 이 제약의 영향을 받지 않는다.
- 18개 시군 링크는 WebSearch/WebFetch로 개별 확인했다(함안군은 1차 조사에서 접속 실패가
  보고돼 대체 URL로 재확인). 확인 날짜는 모두 2026-09-19.
- 1440px·960px·390px 실제 렌더링: 개발 서버를 별도로 띄우지 않고, 위 세 뷰포트에서 실행되는
  Playwright e2e 검증(`document.documentElement.scrollWidth - innerWidth <= 1` 확인 및
  각 뷰포트에서의 axe 0 violations)으로 확인했다. 브라우저 수동 스크린샷 검토는 하지 않았다.

## 위치정보 불변조건 확인

- 서버 코드를 추가하지 않았다(대체 설계는 API 호출이 없다). 사용자 좌표 필드, `navigator.geolocation`
  호출, 외부 지도 링크에 `from`/`sLat`/`sLng`를 추가한 곳이 없다.
- 배터리 잔량, 주행 이력, 기기 정보를 수집하지 않는다.

## 결과와 제한

- 완료 기준 충족 여부
  - 0단계 검증 결과 기록: 충족(위 절 참고).
  - 대체 설계 구현: 충족.
  - 이용 가능 여부를 보장하는 문구 없음: 충족(테스트로 확인).
  - 서버 요청·응답에 사용자 좌표 필드 없음: 충족(서버 변경 없음).
  - 외부 지도 링크에 출발지 좌표 없음: 해당 없음(대체 설계는 외부 지도 링크를 만들지 않음).
  - 명령·e2e 통과, axe 위반 0: 충족(선택 실행한 범위 내에서).
- 남은 위험: 데이터 기준일·제공처 이름을 표시하는 카드/거리순 3개 카드 UI는 이번 PR에 없다
  (본 설계 전용 요구사항이며, 대체 설계 선택으로 해당하지 않음). 향후 공공데이터포털 API 키가
  확보되고 실제 호출로 경남 표본이 있음이 확인되면 본 설계로 후속 작업할 수 있다.
- PR 링크는 채웠다: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/568
