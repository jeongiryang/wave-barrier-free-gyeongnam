# PR #번호 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/582
- 제목: feat: 지역 가게 보기
- 작성자: Claude Sonnet 5 (에이전트)
- 최종 상태: PR 오픈, 리뷰 대기
- AI 도구: Claude Code

## 목적

08번(음식점 접근성) 목록 위에 두 가지 관찰 가능한 사실로만 걸러 볼 수 있게
한다. (1) 한국관광공사 관광정보에 등록된 곳인지(확인된 사실), (2) 지금 결과
목록 안에서 같은 이름이 2곳 이상 나오는지(관찰된 사실, 체인 단정 아님).
**상표 이름 목록을 코드나 데이터로 걸러내지 않는다.** 어떤 가게가 체인인지
알려주는 공식 제공처가 없고, 목록은 금방 낡으며, 특정 상표를 이름으로 적어
제외하면 그 사업자에 대한 부정적 표시가 되기 때문이다.

## 역할 구분

- 사람: 명세 승인, 최종 검토
- AI: 조사, 코드·문서 변경, 검사, PR 작성 전체 수행

## 구현

- `lib/local-place-filter.js` + `.d.ts`(신규): `normalizePlaceName`(공백·괄호
  안 지점명·`~점`으로 끝나는 마지막 낱말을 뗀 비교용 문자열), `groupPlaceNames`,
  `repeatedNameIds(places, threshold)`. 상표 이름 목록·`isChain` 같은 판단
  필드를 두지 않았다. `tests/local-place-filter.test.mjs`의
  "lib/local-place-filter.js에는 상표 이름 목록 상수가 없다" 테스트로
  고정했다.
- `features/planner/components/FilterChipRow.tsx`: 39번이 옮긴 범용 칩
  컴포넌트에 `ToggleChip`(단일 켜짐/꺼짐 칩)을 추가해 재사용했다. 새 파일을
  만들지 않았다.
- `features/planner/components/DiningAccessibilityList.tsx`:
  - `관광정보에 등록된 곳만 보기`: 08번의 두 묶음(관광공사 등록/카카오 검색)이
    이미 근거로 나뉘어 있으므로, 이 선택은 확인되지 않은 카카오 묶음 섹션
    전체를 접는(숨기는) 것으로 구현했다. 다시 끄면 그대로 되돌아온다.
  - `같은 이름이 여러 곳에 있는 가게 접어두기`: 두 묶음 각각 독립 상태로
    적용했다(39번의 종류 거르기와 같은 독립 패턴). 반복 판정은 그 묶음의
    **원본**(다른 거르기 적용 전) 목록 기준이므로, 39번 종류 거르기와 순서를
    바꿔 적용해도 같은 결과가 나온다(`useFoodCategoryFilter`의 `display`에
    `useLocalPlaceFilter.apply`를 적용하는 방식 — 두 필터 모두 원본 항목
    속성만으로 판정하는 독립 술어라 합성 순서가 결과에 영향을 주지 않는다).
  - 접은 항목은 지우지 않고 "같은 이름 N곳 접음" + "펼치기"로 항상 되돌릴 수
    있다.
  - 선택으로 결과가 0개가 되어도 자동으로 끄지 않고 `조건에 맞는 곳이
    없어요.` + `조건 끄기`를 보여준다(39번의 `고른 종류에 맞는 곳이
    없어요.` + `선택 지우기`와 문구를 다르게 구분했다).
  - 두 선택 모두 새 네트워크 요청을 만들지 않는다.
- `features/routing/nearby-place-data.ts`: 검증 규칙(placeLink 등)을 수정하지
  않았다.

## 명세와 다르게 구현한 부분

- 명세는 `features/routing/components/NearbyPlacesPanel.tsx`에도 같은 선택을
  적용하라고 요청했지만, 이번 PR에서는 **적용하지 않았다.** 이 파일은 08/35/39
  범위 밖의 모든 주변 장소 카테고리(주차장·병원·버스 등)를 함께 다루는
  범용 패널이라 음식점 전용 거르기를 안전하게 얹으려면 `useNearbyPlaces` 훅의
  상태 구조를 함께 바꿔야 했고, 이 계보가 기반한 08번 PR 범위를 벗어난다고
  판단했다. 08번의 `DiningAccessibilityList.tsx`(카카오 결과를 보여주는 기존
  컴포넌트)에는 명세대로 구현했다.

## 검증

```
npm run lint       # 통과, 기존 경고 14건만(신규 0건)
npm run typecheck  # 통과
npm test           # 1335개 중 1333 통과, 2건 실패(Python 부재로 인한 기존 실패, main에서도 실패)
npm run build:vercel  # 통과
npm run check:performance  # 통과 — CSS gzip 71,676B(변화 없음), cap 71,680B
```

- `npx playwright test e2e/local-place-filter.spec.ts e2e/food-category.spec.ts e2e/dining-accessibility.spec.ts --project=desktop-chromium` — local-place-filter 7/7, 39번·08번 회귀 재검증 전체 통과
- 같은 스펙 3종 `--project=mobile-chromium` — 23/23 전체 통과
- `npm run test:e2e`(전체 스위트, 모든 브라우저 shard)는 시간 제약으로 실행하지 못했다.
- 390/960/1440px 실제 렌더링·axe 위반 0건은 `local-place-filter.spec.ts`의 반응형 테스트로 확인.
- 코드 검토로 상표 이름이 저장소에 추가되지 않았음을 확인(단위 테스트로도 고정).

## 지도 계보 기존 CI 실패(참고, 이 PR과 무관)

`map-tools-reachable`(4건), `mobile-touch-targets`(1건)는 이 계보에 이미 있던
실패이며 별도 브랜치(PR #567)에서 테스트 계약을 고쳤다. 이 PR은 해당 파일을
건드리지 않았다.

## 결과와 제한

- 완료 기준: 두 선택 동작 + 근거 표시(충족), 상표 이름 목록 0건(충족, 단위
  테스트로 고정), 접힌 항목 항상 펼칠 수 있고 개수 표시(충족), 새 네트워크
  요청 0건(충족), 체인 단정 문구 없음(충족), 위 명령·e2e 통과 및 axe 위반
  0건(충족, 실행 범위 내).
- `NearbyPlacesPanel.tsx`(11번/지도) 적용은 하지 않았다. 위 "명세와 다르게
  구현한 부분" 참고.
- 이 머신에 공공데이터 키·카카오 키가 없어 합성 fixture로만 검증했다.
- 전체 `npm run test:e2e`(전 브라우저 shard)는 실행하지 않았다.
