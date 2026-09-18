# PR #번호 AI 작업 로그

- PR: 링크
- 제목: feat: 편의시설 여러 종류 동시 표시 지도
- 작성자: jeongiryang
- 최종 상태: 리뷰 대기
- AI 도구: Claude Code

## 목적

11번 명세 `[P1][접근성·데이터] 편의시설 여러 종류 동시 표시 지도`의 **다중 선택 레이어 구조**를 기존 `components/RouteMap.tsx` 지도 한 개 위에 구현한다. 이 구조는 뒤따르는 명세 8건(13·14·15·16·20·21·33·45)이 각자의 레이어를 등록하는 기반이 된다.

## 역할 구분

- 사람: 요구사항(명세 11), 범위 조정 결정(공식 데이터 레이어를 이번에 등록하지 않는 것), 최종 승인
- AI: 전제 검증, 코드·테스트·문서 작성, 검사 실행, CSS 예산 상쇄 근거 측정, PR 작성

## 시작 전에 검증한 전제

명세는 `accessible-parking`(#530)과 `accessible-restroom`(#531)이 **이미 연동됐다고 전제**한다. 저장소를 직접 확인한 결과 두 제공처는 구현돼 있지 않다.

- `server/tourism/handler.ts`의 action 목록: `availability`, `places`, `place-audio`, `place-coordinates`, `visit-info`, `return-transport`, `crowd-calendar`, `photo`, `spot-photo`, `crowd`, `enrich`, `plan`. `parking`·`restroom`·`facility-layers`는 없다.
- `server/tourism/` 디렉터리에도 주차장·공중화장실 표준데이터를 부르는 모듈이 없다.
- `grep`으로 `pwdbsPpkZoneYn`, `주차장정보표준데이터`를 찾아도 서버 코드에는 없고 카탈로그 라벨 문자열만 나온다.

그래서 없는 데이터를 있는 것처럼 보이게 하지 않기 위해 공식 레이어를 하나도 등록하지 않았다. 자세한 범위 조정은 아래 "구현하지 않은 부분"에 적었다.

## 한 일

- `lib/facility-layers.js` + `.d.ts`(신규): 선택 토글, 레이어별 마커 병합, 실패 표시, 중복 제거, 거리순 상한, 두 공개 좌표 사이 거리 계산만 담은 순수 모듈. 네트워크·브라우저 저장소·위치 API를 참조하지 않는다(단위 테스트로 고정).
- `features/routing/constants.ts`: `FacilityLayerSource`, `FacilityLayer`, `placeSearchFacilityLayers`(6종), `officialFacilityLayers`(빈 배열 = 확장 지점), `facilityLayers`, `FACILITY_LAYER_LIMIT`(4), `FACILITY_MARKER_CAP`(60) 추가. 기존 `nearbyCategories`·`overlayLayers`는 건드리지 않았다.
- `features/routing/useFacilityLayers.ts`(신규): 레이어별 독립 세대 번호·타이머로 요청 취소, 레이어별 로딩·비었음·실패 상태, 상한 안내, 마커 상한 안내, 지도 `idle` 뒤 한 번만 재조회.
- `features/routing/components/FacilityLayerPanel.tsx`(신규): 다중 선택 버튼 그리드, 켜진 레이어 칩(+실패 칩과 `다시 시도`), `모두 끄기`, 글자 범례, 선택한 시설 카드(`지도에서 보기`·`도착지로 선택`만), 고정 근거 문구.
- `features/routing/kakao-map-renderer.ts` / `leaflet-map-renderer.ts`: `update(content)` 안에서 실제 `<button>` 마커를 그린다(카카오는 `CustomOverlay`, Leaflet은 `divIcon`). `data-facility-layer`, `data-facility-marker-id` 부여.
- `features/routing/map-renderer-context.ts`: `mapContentKey`에 편의 마커 포함, `mapMarkerState`/`restoreMapMarkerState`에 편의 마커 초점 복원 추가.
- `features/routing/types.ts`: `MapToolPanel`에 `"facility"` 추가, 렌더러가 레이어 상수를 몰라도 되도록 `FacilityMapMarker`(표시 이름·글자·모양 포함) 추가.
- `features/routing/components/MapCommandBar.tsx`: 지도 도구 묶음에 `◎ 편의 표시` 항목 추가.
- `tests/facility-layers.test.mjs`(신규, 14건), `e2e/facility-layers.spec.ts` + `e2e/facility-layer-fixtures.ts`(신규, 13건 × 2 프로젝트).
- CSS: `app/styles/map-workspace.css`에 패널·마커 스타일 추가. 늘어난 만큼은 **계산된 스타일에 영향을 주지 못하는 죽은 선언**만 골라 제거해 상쇄했다.

## 검증

기준선(분기 직후, `origin/main` = `5ffa800`)

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 0 errors, 14 warnings |
| `npm run typecheck` | 통과 |
| `npm run check:performance` | 통과, CSS gzip 71,681 bytes (70.00 KiB, 상한 71,680) |

작업 후

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 0 errors, 14 warnings (기준선과 동일) |
| `npm run typecheck` | 통과 |
| `npm test` | 1,276건 중 1,274 통과 / 2 실패 — 둘 다 이 머신에 Python이 없어 생기는 기존 실패(`authenticated gateway applies image admission independently`, `dedicated AI runtime waits for startup and never repeats model loading`). main에서도 실패한다. |
| `npm run build:vercel` | 통과 |
| `npm run check:performance` | 통과, CSS gzip **71,676 bytes**(작업 전 71,681보다 5 bytes 감소) |

e2e는 전체를 돌리지 않고 신규 spec과 지도 관련 기존 spec만 선택 실행했다.

- 신규 `e2e/facility-layers.spec.ts`: 26건 전부 통과(desktop-chromium, mobile-chromium). axe 위반 0건.
- 기존 지도·주변·위치 관련 17개 spec: 194건 통과, **8건 실패**. 실패는 전부 `e2e/map-tools-reachable.spec.ts` 한 파일이고 원인은 하나다 — 지도 도구 묶음의 버튼 **개수(11 → 12)와 정확한 문구 목록**을 하드코딩한 단언. 기존 테스트는 고치지 않았다. 자세한 측정은 아래 "구조적 충돌".

### 합성 fixture 결과와 실제 제공처 호출 결과

- **합성 fixture**: 단위 테스트 14건, e2e 26건 전부 합성 데이터다. 카카오 SDK는 `e2e/facility-layer-fixtures.ts`의 스텁으로 대체했다.
- **실제 제공처 호출**: 하지 않았다. 이 머신에는 카카오 JavaScript 키가 없어 개발 서버에서는 지도가 Leaflet 대체 지도로 떨어지고, 그 상태에서는 편의 표시 버튼이 비활성이라 실제 `categorySearch` 응답을 받아보지 못했다. 공식 공공데이터 제공처는 애초에 연결하지 않았다.

### 화면 확인

`npm run dev` 실제 렌더링으로 1440·960·390px에서 확인했다.

- 패널 넘침 없음(`scrollWidth <= clientWidth`, 오른쪽 경계가 뷰포트 안), 마커 버튼 44×44px 이상, 카드 행동 버튼과 레이어 버튼 높이 44px 이상 — e2e로 세 폭 모두 고정.
- 지도 도구 묶음은 편의 표시 버튼을 더한 뒤에도 1440·1024·960·900·768·620·390·320·280px에서 버튼이 잘리거나 44px 아래로 줄지 않고 가로 넘침이 0이다(임시 spec으로 측정한 뒤 삭제).

### CSS gzip 상쇄 근거

추가한 CSS 때문에 총량이 71,681 → 71,935 bytes까지 올라갔다. 기준을 완화하는 대신, **뒤에 오는 같은 선택자가 무조건 덮어써서 계산된 값에 영향을 주지 못하는 선언**만 골라 지웠다. `postcss`로 빌드 결과(.vercel/output/static/assets/*.css)를 파싱해, 같은 at-rule 문맥 안에서 선택자 문자열이 완전히 같은 규칙이 뒤에 다시 나오고 같은 속성을 다시 선언하는 경우만 후보로 삼았다(`!important`는 제외).

지운 것:

| 파일 | 선택자 | 지운 선언 | 덮어쓰는 곳 |
| --- | --- | --- | --- |
| `app/styles/wave-horizon.css` | `:root` | `--accent`, `--onaccent`, `--wave-max`, `--wave-gutter` | `styles/simple-wave.css` `:root` |
| `app/styles/wave-horizon.css` | `.wave-header` | `grid-template-columns` | `simple-wave.css` `.wave-header` |
| `app/styles/wave-horizon.css` | `.wave-header nav` | `gap`, `padding`, `border-radius`, `background` | `simple-wave.css` `.wave-header nav` |
| `app/styles/wave-horizon.css` | `.wave-header nav a` | `padding`, `border-radius`, `font-size` | `simple-wave.css` |
| `app/styles/wave-horizon.css` | `.wave-header nav a[aria-current]` | 규칙 전체 | `simple-wave.css` |
| `app/styles/wave-horizon.css` | `.wave-trip-count` | `color`, `background` | `simple-wave.css` |
| `app/styles/community.css` | `.community-tabs button[aria-pressed="true"]` | `color`, `background` | `wave-horizon.css` 같은 선택자 |
| `app/styles/planner-conversation.css` | `.wave-header` | `min-height`, `padding` | `simple-wave.css` |
| `app/styles/planner-conversation.css` | `.planner-notice > button` | `margin-left`, `min-height`, `color` | 같은 파일 뒤쪽 같은 선택자 |
| `app/styles/planner-conversation.css` | `.naru-log` | `padding`, `background` | 같은 파일 뒤쪽 |
| `app/styles/planner-conversation.css` | `.naru-message` | `max-width` | 같은 파일 뒤쪽 |
| `app/styles/planner-conversation.css` | `.naru-message.user` | `background` | 같은 파일 뒤쪽 |
| `app/styles/planner-conversation.css` | `.naru-input`, `.naru-input > div` | `border-radius`, `flex-direction` | 같은 파일 뒤쪽 |
| `app/styles/planner-conversation.css` | `.naru-tools`, `.naru-character` | `max-height`, `position` | 같은 파일 뒤쪽 |
| `app/styles/planner-conversation.css` | `@media (prefers-reduced-motion) .wave-header` | `transition` | `simple-wave.css` 같은 미디어·선택자 |
| `app/styles/simple-planner.css` | `.simple-trip-actions`, `.simple-itinerary-board` | `display`·`align-items`·`gap`, `margin-top` | 같은 파일 뒤쪽 |
| `app/styles/place-dialog.css` | `.simple-footer p` | `font-size` | `simple-wave.css` |
| `app/styles/landing-restored.css` | `.simple-landing .landing-cta` | `color`, `background` | 같은 파일 뒤쪽 |

`app/globals.css`와 `app/styles/design-system.css`의 `:root` 중복 토큰도 죽은 선언이지만, `tests/theme-contrast.test.mjs`와 `tests/repository-policy.test.mjs`가 그 파일들의 원문에 특정 토큰이 있는지를 직접 검사한다. 기존 테스트를 고치지 않기로 했으므로 **되돌려 그대로 두었다**.

**제거 전후 계산된 스타일 비교(실측).** 개발 서버에서 영향받는 모든 선택자를 담은 1000px 고정폭 프로브를 붙이고, 34개 CSS 속성과 27개 디자인 토큰의 `getComputedStyle` 값을 1440·960·390px에서 모두 읽어 문자열로 비교했다. `origin/main` CSS와 이 브랜치 CSS의 결과는 **세 폭 모두 바이트 단위로 완전히 같다(차이 0건)**. 처음 비교에서는 `width`/`height`에서만 소수점 차이가 보였는데, 웹폰트 로드 시점에 따른 텍스트 측정 흔들림이었고 `document.fonts.ready`를 기다린 뒤에는 그 차이도 사라졌다.

`app/styles/landing-regions.css`·`landing-stories.css` 삭제(명세가 제안한 방법)는 쓰지 않았다. 두 파일은 import가 0이라 번들에 들어가지 않아 지워도 gzip 총량이 0 bytes 줄어든다.

## 구조적 충돌 (고치지 않고 기록)

`e2e/map-tools-reachable.spec.ts`의 4개 테스트(× 2 프로젝트 = 8건)가 실패한다.

- `nav.getByRole("button")`의 개수를 **11로 하드코딩**한다. 편의 표시 버튼이 늘어 **12**가 된다. (3개 테스트)
- 추가 도구 묶음의 버튼 문구를 `["지도", "스카이뷰", "⌖ 주변", "▱ 지도 표시", "◉ 로드뷰", "⇩ 이미지", "↗ 페이지 링크"]`로 **정확히** 단언한다. 실제로는 `"◎ 편의 표시"`가 `"▱ 지도 표시"` 앞에 하나 더 들어간다. (1개 테스트)

레이아웃 자체는 깨지지 않았다. 같은 조건을 임시 spec으로 따로 측정했다.

```
WIDTH 1440: buttons=12 bad=[] pageOverflow=0
WIDTH 1024: buttons=12 bad=[] pageOverflow=0
WIDTH  960: buttons=12 bad=[] pageOverflow=0
WIDTH  900: buttons=12 bad=[] pageOverflow=0
WIDTH  768: buttons=12 bad=[] pageOverflow=0
WIDTH  620: buttons=12 bad=[] pageOverflow=0
WIDTH  390: buttons=12 bad=[] pageOverflow=0
WIDTH  320: buttons=12 bad=[] pageOverflow=0
WIDTH  280: buttons=12 bad=[] pageOverflow=0
```

(`bad`는 44px 미만이거나 잘리거나 도구 모음 밖으로 나간 버튼 목록. 측정 뒤 임시 spec은 삭제했다.)

왜 `주변`을 `편의 표시`로 바꾸지 않았는가: 명세 "진입과 화면"은 `주변` 버튼을 바꾸라고 하지만, 같은 명세 "하지 않는 것"은 `nearbyCategories`의 단일 선택 동작을 제거하지 말라고 한다. 버튼과 패널을 바꾸면 단일 선택 패널이 화면에서 닿을 수 없게 되고, `openNearby` fixture를 쓰는 기존 spec 6개가 광범위하게 깨진다. 사용자에게 보이는 기존 동작을 지키고 깨지는 기존 테스트를 최소화하는 쪽(지도 도구 묶음에 항목 추가, 최상위 내비게이션은 그대로)을 골랐다. 추가한 버튼은 최상위 줄(`map-command-primary`)이 아니라 이차 도구 묶음(`map-advanced-controls`) 안에 있다.

## 결과와 제한

- 병합하지 않았다. auto-merge를 켜지 않았다. `main`에 직접 push 하지 않았다.
- 이번에 구현하지 않은 부분과 이유는 PR 본문의 같은 제목 절에 정리했다. 요약하면 공식 데이터 레이어 2종, 새 서버 action `facility-layers`, `server/tourism/facility-layers.ts`, `FacilityLayerResponse` 계약, `SERVER_BUDGET_MS.facilityLayers`, `tests/facility-layers-response.test.mjs`다. 전부 "검증된 공식 제공처가 아직 없다"는 같은 이유다.
- 남은 위험: `e2e/map-tools-reachable.spec.ts`의 하드코딩된 버튼 개수·문구 단언. 이 기능을 받아들이기로 하면 그 단언을 12개와 새 문구 목록으로 갱신해야 한다. 이 PR에서는 건드리지 않았다.
- 후속 명세가 레이어를 붙이는 방법은 `features/routing/constants.ts`의 `officialFacilityLayers` 주석과 `features/routing/useFacilityLayers.ts`의 `source === "official"` 갈래 주석에 적어 두었다.
