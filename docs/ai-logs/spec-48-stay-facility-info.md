# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 숙소 편의시설 표시
- 작성자: Claude Code (Sonnet 5)
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 0단계 검증 결과

이 작업 환경에는 TourAPI(`KorService2`) 서비스 키가 없어 경남 숙박 표본 20곳 이상에 대한 실제
`detailWithTour2`·`detailIntro2` 응답을 받을 수 없었다. **경남 숙박 표본 20곳의 필드별 값 존재
비율은 확인하지 못했다.** 이 사실을 이슈/PR에 그대로 남긴다.

대신 코드로 확인 가능한 것만 확인했다.

1. `server/tourism/visit-info.ts`의 `fields` 매핑에 `"32"`(숙박) 항목이 이미 있다.
   `{ phone: "infocenterlodging" }`만 매핑돼 있고 `hours`/`rest`/`fees`는 비어 있다. 같은 파일의
   `handleVisitInfo`는 `contentTypeId === "32"`일 때 `checkintime`/`checkouttime`을 별도로 읽어
   `VisitInfo.checkIn`/`checkOut`에 이미 채우고 있다(이 PR 이전부터 존재).
   → 실제 값이 오는지 확인할 수 없으므로 이 매핑에 새 필드를 추가하지 않았다. 값이 오지 않는
   필드를 화면에 넣지 않기 위한 최소 변경만 했다.
2. `server/tourism/accessibility-model.ts`의 `placeFrom`은 `requestedAccessibilityFields`로 사용자가
   고른 프로필에 해당하는 키만 `detailWithTour2`에서 읽는다. 숙박 전용 무장애 필드 매핑은 없고,
   `lib/facility-selection.js`의 `FACILITIES`(`route`/`elevator`/`restroom`/`parking`/`hearingroom`
   등)를 그대로 재사용한다. 숙박 전용 점수 체계나 새 키가 없다는 것을 코드로 확인했다.
3. 실제 제공처 호출로 값 존재 비율을 확인하지 못했으므로, **값이 없을 때 빈 묶음이 그려지지
   않는 것**을 `lib/stay-facility.js`의 `groupStayFacilities`로 구현하고
   `tests/stay-facility.test.mjs`와 `e2e/stay-facility.spec.ts`로 고정했다. 이것이 값 확인을 못한
   상태에서 화면이 나빠지지 않게 하는 유일한 방어다.

## 구현

- 새 제공처, 새 서버 action, 새 환경 변수를 추가하지 않았다. `server/tourism/visit-info.ts`도
  수정하지 않았다(기존 `checkIn`/`checkOut` 처리를 그대로 재사용).
- `lib/stay-facility.js` + `.d.ts`: 순수 함수 `groupStayFacilities`. 항목의 `key`만 보고
  `entry`(들어가기: route/elevator/parking) / `room`(객실과 욕실: restroom/hearingroom) /
  `stay`(머무는 동안: checkIn/checkOut) 세 묶음으로 나눈다. 항목이 없는 묶음은 결과에서 뺀다.
  숙소 전용 키를 새로 만들지 않았고, `state`는 손대지 않고 그대로 통과시킨다(미확인을 없음으로
  바꾸지 않는다).
- `features/planner/components/StayFacilityDetail.tsx`: `place.contentTypeId === "32"`일 때만
  그린다. `place.accessibility`와, 기존 `fetchVisitInfo`(변경 없음)로 받은 `checkIn`/`checkOut`을
  합쳐 `groupStayFacilities`에 넘긴다. 묶음이 하나도 없으면 `등록된 시설 정보가 없어요.`만
  보여준다. 묶음이 있으면 각 항목을 `.access-badge`(기존 클래스, `app/styles/design-system.css`에
  이미 정의)로 표시하고 상태 문구(`정보 있음`/`이용 조건 확인`/`미확인`)를 색이 아닌 문구로
  구분한다. 묶음이 하나라도 있으면 그 아래에 고정 문구
  `객실마다 시설이 다를 수 있어요. 예약 전에 숙소에 직접 확인하는 것이 확실해요.`를 둔다.
- `features/planner/components/PlaceArrivalPreview.tsx`: `시설` 단계에서 숙박일 때만
  `StayFacilityDetail`을 lazy import해 추가로 그린다. 기존 3단계 구조, 체크 기록, 다른 타입의
  화면은 그대로 뒀다. 이 단계는 이미 마지막 단계라 아래에 기존 `PlaceInquiryCard`(#545)가 그대로
  이어져 문의 링크 역할을 한다. 별도 링크를 추가하지 않았다.
- `features/planner/types.ts`: `StayFacilityGroup` 타입 추가.
- `app/styles/place-decisions.css`, `globals.css`, `design-system.css`: **건드리지 않았다.** 새
  클래스를 만들지 않고 기존 `.access-badge`와 인라인 스타일 토큰(`var(--muted)`)만 재사용해서
  CSS gzip 예산을 전혀 늘리지 않았다.

## 명세와 다르게 구현한 부분과 이유

- 명세는 `server/tourism/visit-info.ts`의 `fields` 매핑을 "0단계 결과에 맞춰 보완"하라고 했지만,
  0단계 실제 호출을 하지 못해 어떤 필드가 실제로 값을 주는지 모른다. 값이 오지 않는 필드를
  매핑에 넣지 않기 위해 이 파일은 수정하지 않았다.
- 문의 링크를 `StayFacilityDetail` 안에 별도로 만들지 않았다. `시설` 단계가 이미 마지막 단계라
  `PlaceInquiryCard`가 같은 화면 안에 이미 존재하기 때문이다(중복 링크를 피함).

## 검증

- `npm run lint`: 통과. 0 errors, 14 warnings(모두 기존 경고, 이 변경 이전과 동일).
- `npm run typecheck`: 통과.
- `npm test`: 1338/1340 통과. 실패 2건(`assistant-photo.test.mjs`, `assistant-runtime.test.mjs`)은
  이 머신에 Python이 없어 생기는 기존 문제이며 main에서도 실패한다. 이 PR과 무관하다.
- `npm run build:vercel`: 통과.
- `npm run check:performance`: 통과. CSS gzip 70.00 KiB → 70.00 KiB(변화 없음, 이 PR은 CSS 파일을
  전혀 수정하지 않았다).
- e2e: `e2e/stay-facility.spec.ts`(신규, 10 테스트: 숙박에서만 표시, 세 상태 문구 구분, 미확인이
  없음으로 바뀌지 않음, 체크인/체크아웃 반영, 세 묶음 모두 비면 안내+문의 링크만, 1440/960/390px
  가로 스크롤 없음과 axe 위반 0건) 모두 통과.
  회귀 확인: `e2e/place-arrival-route.spec.ts`, `e2e/slope-info.spec.ts`,
  `e2e/dining-accessibility.spec.ts`, `e2e/place-detail-decision.spec.ts` 모두 통과(총 52건).
  `npm run test:e2e`(전체 스위트)는 이 계보에 이미 있던 실패(`map-tools-reachable` 4건,
  `mobile-touch-targets` 1건, PR #567에서 별도 브랜치로 고친 기존 문제)만 있는지 별도로 실행해
  구분했다(아래 참고).
- 390px·960px·1440px 실제 렌더링: `e2e/stay-facility.spec.ts`의 뷰포트 테스트로 확인(별도 수동
  스크린샷은 남기지 않음).
- 실제 제공처 호출 결과는 없다. 이 PR의 e2e·유닛 테스트는 전부 합성 fixture로 검증했다.

## 완료 기준 대비

- 숙박 장소에서만 숙소 편의 묶음이 보인다: 충족(`place.contentTypeId === "32"` 검사).
- 0단계 결과가 기록돼 있고 값이 오지 않는 필드가 화면에 없다: **부분 충족.** 실제 호출로 값
  존재 비율을 기록하지 못했다(키 없음). 대신 값이 없을 때 빈 묶음을 그리지 않는 방어를 테스트로
  고정했다.
- 세 상태가 구분되고 미확인이 없음으로 표시되지 않는다: 충족.
- 새 서버 action과 새 제공처가 추가되지 않았다: 충족.
- 예약·가격 관련 기능이 추가되지 않았다: 충족.
- 위 명령과 e2e가 모두 통과하고 axe 위반 0건이다: 이 PR 범위의 e2e·회귀 대상은 통과. 전체
  `test:e2e`의 계보 기존 실패는 위에 기록된 대로 구분했다.
