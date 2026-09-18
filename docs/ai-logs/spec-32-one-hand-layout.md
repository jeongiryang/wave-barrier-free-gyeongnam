# PR #559 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/559
- 제목: feat: 한 손으로 쓰기 좋은 배치
- 작성자: jeongiryang
- 최종 상태: 열림 (base `main`)
- AI 도구: Claude Code

## 목적

명세 32 `[P2][접근성] 한 손으로 쓰기 좋은 배치`를 구현한다. 휠체어를 밀거나 지팡이를 짚거나 짐을 든 상태에서 좁은 화면을 쓸 수 있도록, 자주 쓰는 조작을 엄지가 닿는 화면 아래쪽으로 옮긴다. 별도의 한 손 모드를 만들지 않고 기본 배치를 고친다.

## 역할 구분

- 사람: 요구사항(명세 32), 분기점과 base 결정, 최종 승인
- AI: 0단계 실측, 코드·CSS·테스트·문서 변경, 죽은 선언 판별과 상쇄, 검사 실행, PR 작성

## 0단계 측정 (390×844, `--project=desktop-chromium`)

구현 전에 실제로 측정했다. `top%`는 화면 위에서부터의 위치다.

| 화면 | 주요 조작 | 변경 전 | 변경 후 | 상단 33%? |
| --- | --- | --- | --- | --- |
| `/planner` 여행지 찾기 | 지역 고르기 | 27.9% | 27.9% (그대로) | 예 |
| `/planner` 여행지 찾기 | 편의 고르기 | 27.8% | 27.8% (그대로) | 예 |
| `/planner` 여행지 찾기 | 찾기 | **버튼 없음** (조건 변경 시 자동 검색) | 없음 | 해당 없음 |
| `/planner` 내 일정 | 일정 만들기(`시간표 만들기`) | 초기 설정 화면의 단독 버튼 | 그대로 | 아니오 |
| `/planner` 내 일정 | 저장(`내 여행에 저장`) | **29.9%** | 29.9% (그대로) | **예 — 구조적 충돌, 아래 참고** |
| `/planner` 내 일정 | 날짜 바꾸기(`1일차 …`) | 46.7% | 그대로 | 아니오 |
| 장소 상세 dialog | 담기(`일정에 추가`) | 37.0% | 그대로 | 아니오 |
| 장소 상세 dialog | 닫기 (위) | **1.4%** | 1.4% (습관대로 유지) | 예 |
| 장소 상세 dialog | 이 창 닫기 (아래, 신규) | 없음 | **dialog 높이의 92.3% 지점, 48px 이상(실측 50px)** | — |
| 지도 도구 | 도구 열기(`지도 도구 +`) | 89.1% | 그대로 | 아니오 |
| 지도 도구 | 레이어 고르기·닫기 | 도구 열림 후 하단 | 그대로 | 아니오 |
| `/travel-book` | 여행 열기(`나의 여행 펼쳐보기`) | 44.9% | 그대로 | 아니오 |

가로로 밀어야 보이는 목록(`overflow-x: auto|scroll` 이면서 `scrollWidth > clientWidth`)은 여행지 찾기·검색 결과·장소 상세 dialog·내 일정·지도 도구·`/travel-book` **전부 0개**였다. 명세 3절은 이미 만족하고 있어 바꿀 것이 없었다.

## 구조적 충돌: 내 일정 `내 여행에 저장` (29.9%)

상단 33% 안에 있어 대상이지만, 이번 PR에서 고치지 않았다. 추측이 아니라 실측으로 확인했다.

`.simple-trip-tools`(저장·공유 행)는 `#itinerary` 안에서 일정 보드보다 **위**에 있다. 여기에 `position: sticky; bottom: 0`을 적용해 브라우저에서 직접 측정한 결과는 다음과 같다.

| 스크롤 | 적용 전 `.simple-trip-tools` 위치 | 적용 후 |
| --- | --- | --- |
| `scrollY=0` | top 28.5% | top 44.8% (아래로 밀려나 제자리에 빈 공간이 생김) |
| `scrollY=592` | top −25.2% (화면 밖) | top −25.3% (**여전히 화면 밖**) |

`sticky`는 요소를 자기 블록(`#itinerary`, 높이 809px) 밖으로 내보내지 못한다. 이 행이 블록의 맨 위에 있으므로 아래로 밀려 빈 자리만 남기고, 블록이 지나가면 같이 사라진다. 즉 **CSS만으로는 하단 고정이 되지 않는다.**

동작하게 하려면 마크업을 일정 보드 뒤로 옮겨야 하는데,

- 그러면 **768px 이상 배치도 함께 바뀐다.** 명세 상세 계약 7 · 완료 기준 `768px 이상 배치가 변경 전과 같다`에 어긋난다.
- `order`나 `flex-direction: row-reverse`는 명세가 금지한다.
- `position: fixed`도 금지한다.
- 저장 버튼에 의존하는 기존 e2e가 18개 있다. 기존 테스트를 고치지 않는다는 원칙에 따라 건드리지 않았다.

따라서 고치지 않고 측정값과 함께 남긴다. 이 화면을 제대로 고치려면 명세가 예시로 든 `.planner-primary-action` 같은 전용 주요 조작 영역을 내용 끝에 두도록 마크업을 재설계해야 하고, 그 변경은 768px 이상 배치 변경을 수반하므로 별도 이슈로 다루는 것이 맞다.

## 변경 파일

- `features/planner/components/PlaceDecisionDialog.tsx`: `.modal-body` 맨 끝에 `div.modal-close-end`로 감싼 `이 창 닫기`(영문 `Close this dialog`) 버튼 추가. 위 버튼은 `aria-label="닫기"`인 현재 형태 그대로 둔다. 두 버튼의 접근 가능한 이름은 다르다.
- `app/styles/place-dialog.css`: 아래 닫기 버튼 스타일. 기본 `display:none`, `@media (max-width: 767px)`에서만 표시.
- `app/styles/simple-planner.css`, `app/styles/wave-horizon.css`: 죽은 선언 제거(상쇄용).
- `e2e/one-hand-layout.spec.ts` (신규).

새 CSS 파일, 새 컴포넌트, 새 설정, 새 저장 키, 새 상태를 만들지 않았다. `components/WaveHeader.tsx`는 건드리지 않았다. 간격 토큰 값을 바꾸지 않았다.

## CSS gzip 예산과 상쇄 근거

`main`의 CSS gzip은 이미 상한을 꽉 채우고 있었다. 스크립트 단위가 아닌 바이트 단위로 재면 `71681B / 71680B`로, 소수점 둘째 자리 반올림 덕분에 간신히 통과하는 상태였다.

| | `cssRawKiB` | `cssGzipKiB` (예산 70) | 실제 gzip 바이트 |
| --- | --- | --- | --- |
| `origin/main` | 367.99 | 70.00 | 71681 |
| 이 PR | 367.83 | 70.00 | **71681 (동일)** |

추가한 CSS를 상쇄하기 위해 **뒤에 오는 같은 선택자가 무조건 덮어써서 계산된 스타일이 바뀔 수 없는 죽은 선언만** 제거했다. import가 0인 CSS 파일 삭제는 번들에 없어 효과가 없으므로 쓰지 않았다.

1. `simple-planner.css` `.simple-trip-actions { display; align-items; gap; padding }` — 뒤의 최상위 규칙 `.simple-trip-actions{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap}`가 앞 세 속성을, `.simple-trip-actions { padding-block: 12px; }`가 `padding`의 블록 방향을 덮어쓴다. 인라인 방향 `0`은 `div`의 초기값과 같다.
2. `simple-planner.css` `.simple-trip-actions > button { min-height; padding; border; border-radius; background }` — 뒤의 `.simple-new-trip,.simple-save-control>button,.simple-trip-actions>button,…`가 같은 명시도로 다섯 속성을 모두 다시 선언한다.
3. `simple-planner.css` `.simple-place-photo .smart-image-fallback { padding: 10px; font-size: 12px; }` — 뒤의 같은 선택자가 `padding: 8px; font-size: 11px;`로 둘 다 덮어쓴다.
4. `simple-planner.css` `.simple-itinerary-board { … margin-top: 24px; }` 중 `margin-top`만 — 뒤의 최상위 `.simple-itinerary-board{margin-top:24px}`가 같은 명시도·같은 값으로 무조건 덮어쓴다.
5. `simple-planner.css` `.simple-place-photo .smart-image-fallback { min-height: 0; … padding: 8px; … }` 중 `min-height`와 `padding`만 — 뒤의 같은 선택자가 두 값을 같은 값으로 다시 선언한다.
6. `wave-horizon.css` `html { scroll-padding-top }`, `body { background }`, `h1,h2,h3 { letter-spacing }`, `.wave-header nav a[aria-current] { color; background; box-shadow }` — 뒤에 import 되는 `simple-wave.css`가 같은 선택자로 같은 속성을 모두 다시 선언한다(`app/layout.tsx`에서 `wave-horizon.css` 45행, `simple-wave.css` 49행). 이 네 건은 감싼 버튼의 스타일이 늘어난 만큼을 상쇄하려고 추가로 제거했고, 제거 전후 390·768·1440px에서 `html`·`body`·첫 제목·`aria-current` 메뉴의 계산된 스타일이 완전히 동일함을 확인했다.
6. `wave-horizon.css` `html { scroll-padding-top }`, `body { background }`, `h1,h2,h3 { letter-spacing }`, `.wave-header nav a[aria-current] { color; background; box-shadow }` — 뒤에 import 되는 `simple-wave.css`가 같은 선택자로 같은 속성을 모두 다시 선언한다(`app/layout.tsx`에서 `wave-horizon.css` 45행, `simple-wave.css` 49행). 이 네 건은 감싼 버튼의 스타일이 늘어난 만큼을 상쇄하려고 추가로 제거했고, 제거 전후 390·768·1440px에서 `html`·`body`·첫 제목·`aria-current` 메뉴의 계산된 스타일이 완전히 동일함을 확인했다.

모두 최상위 규칙(미디어 쿼리 밖)이고, 덮어쓰는 쪽도 최상위·같은 명시도·뒤 순서라 조건 없이 이긴다.

**근거를 말로만 두지 않고 실제로 확인했다.** 제거 전후로 390·768·960·1440px에서 `.simple-trip-actions`와 그 버튼의 계산된 스타일(display, align-items, gap, padding 4방향, flex-wrap, margin, min-height, border, border-radius, background-color, font-size, line-height, color)과 경계 상자를 받아 비교했고 **네 폭 모두 완전히 동일**했다.

## 기존 e2e 충돌

### 해결됨: 닫기 버튼 이름 중복 (7건)

처음에는 명세가 두 닫기 버튼의 **접근 가능한 이름을 같게** 하라고 요구했다. 그 결과 768px 미만에서 dialog 안에 이름이 `닫기`(영문 `Close`)인 버튼이 둘이 되어, `getByRole("button", { name: "닫기", exact: true })`를 쓰는 기존 spec이 Playwright strict mode 위반으로 깨졌다.

**명세 32의 2절이 수정되어 해결됐다.** 이제 이름을 다르게 둔다. 위 버튼은 기존 `aria-label="닫기"`를 그대로 두고, 아래 버튼만 `이 창 닫기`(영문 `Close this dialog`)로 바꿨다. 기존 테스트를 고친 것이 아니라 구현 쪽 버튼 이름을 바꾼 것이다. 이름이 같으면 화면 낭독기 사용자도 어느 것인지 구분할 수 없으므로 접근성 측면에서도 이쪽이 맞다.

이 변경으로 다음 7건이 다시 통과한다.

| spec | 건수 | 현재 |
| --- | --- | --- |
| `e2e/place-detail-decision.spec.ts:45` (ko/en × light/dark) | 4 | 통과 |
| `e2e/core-journeys.spec.ts:62` | 1 | 통과 |
| `e2e/simple-naru-conversation.spec.ts:145` | 1 | 통과 |
| `e2e/naru-followup-intents.spec.ts:148` | 1 | 통과 |

### 남음: 초점 되감기 순서 (2건)

`e2e/recommendation-language.spec.ts:44`의 `English facility evidence preserves original records and keyboard actions` light·dark 2건은 **여전히 실패한다. 원인이 다르다.**

이 검사는 `isMobile`일 때만 도는 블록에서 위 닫기 버튼에 초점을 준 뒤 `Shift+Tab`을 눌러 오디오 가이드 요약에 초점이 가기를 기대한다. 위 닫기는 dialog에서 초점 순서가 처음이므로, 초점 가두기 때문에 `Shift+Tab`은 **마지막 요소로 감긴다.** 예전에는 그 마지막이 오디오 가이드 요약이었는데 이제는 새로 추가한 아래 닫기 버튼이다.

브라우저에서 직접 확인했다.

```
from: modal-close | ×
Shift+Tab -> BUTTON | 이 창 닫기
```

이것은 이름 문제가 아니라 **초점 순서 문제**이며, `dialog 아래 닫기 버튼이 초점 순서의 마지막이다`(상세 상호작용 계약 5)라는 명세 요구에서 직접 나온다. 아래 닫기를 초점 순서 마지막에 두는 한 피할 수 없다. **기존 테스트를 고치지 않는다는 원칙에 따라 손대지 않았다.** 검토자가 결정할 사항이다.

1. 명세대로 아래 닫기를 초점 순서 마지막에 두고, `recommendation-language.spec.ts`의 되감기 기대값을 새 마지막 요소로 바꾼다(별도 커밋·별도 판단).
2. 아래 닫기를 초점 순서 마지막에 두지 않는다. 이 경우 명세 상세 상호작용 계약 5를 바꿔야 한다.

### 해결됨: `.modal-body > button` 계약 (8건)

첫 CI에서는 실패가 13건이었다. 아래 닫기를 `.modal-body`의 직계 자식 `button`으로 두면 기존 계약이 주요 조작을 세는 데 쓰는 `.modal-body > button` 선택자에 함께 걸려, **768px 이상에서도** 장소 상세의 조작 순서 검사가 깨졌다. 버튼을 `div.modal-close-end`로 감싸 해결했고, 이제 768px 이상에서는 DOM 계약까지 변경 전과 같다. 명세 2절도 이 처리를 명시하도록 수정됐다.

## 검증

실행한 명령과 결과:

- `npm run lint` — 통과 (0 errors, 14 warnings). `origin/main` 기준선과 동일하다.
- `npm run typecheck` — 통과.
- `npm test` — 1262건 중 1260건 통과, 2건 실패. 실패는 `authenticated gateway applies image admission independently`, `dedicated AI runtime waits for startup and never repeats model loading`이며 이 머신에 Python이 없어 생기는 기존 문제다. `origin/main`에서도 실패한다. 이 변경과 무관하다.
- `npm run build:vercel` — 통과.
- `npm run check:performance` — 통과. 위 표 참고.
- `npm run test:e2e -- e2e/one-hand-layout.spec.ts --project=desktop-chromium` — 신규 5건 모두 통과.
- 명세 2절 수정을 반영한 뒤 다시 확인했다.
  - `npm run test:e2e -- e2e/place-detail-decision.spec.ts e2e/recommendation-language.spec.ts e2e/core-journeys.spec.ts e2e/simple-naru-conversation.spec.ts e2e/naru-followup-intents.spec.ts --project=mobile-chromium` — **33건 통과, 2건 실패**(9건 → 2건). 남은 2건은 위 `초점 되감기 순서` 절.
  - 같은 목록을 `--project=desktop-chromium`으로 — **35건 모두 통과**.
  - `npm run test:e2e -- e2e/one-hand-layout.spec.ts --project=desktop-chromium` — 5건 통과. `--project=mobile-chromium` — 5건 통과.
- `npm run test:e2e -- e2e/mobile-touch-targets.spec.ts e2e/touch-target-contract.spec.ts e2e/place-content-loading.spec.ts e2e/place-decisions.spec.ts e2e/planner-workspace-responsive.spec.ts --project=desktop-chromium` — 기존 10건 모두 통과. 명세가 계속 통과해야 한다고 지정한 `mobile-touch-targets`, `touch-target-contract`가 여기 포함된다.

실행하지 않은 검사:

- `npm run test:e2e` 전체는 돌리지 않았다. 지시에 따라 신규 spec과 관련 기존 spec만 선택 실행했다.
- 명세가 요구한 `아주 크게` 상태 확인은 **할 수 없다.** 24번(글자 크게 보기)이 아직 병합되지 않았다. 확인 불가.
- 화면 키보드가 올라온 상태에서 입력칸이 가려지는지는 확인하지 않았다. 이번 PR에 고정 영역이 없어 해당 위험이 생기지 않는다.

수동 확인 내용:

- 390·768·960·1440px에서 dialog를 실제로 열어 아래 닫기의 표시 여부, 높이(50px), 접근 가능한 이름, 초점 순서를 확인했다. 768px 이상에서는 `display:none`이라 그려지지 않고 Tab 순서에도 없다.
- 위 닫기에 초점을 준 뒤 `Shift+Tab`이 어디로 가는지 브라우저에서 직접 확인했다. 결과는 위 `초점 되감기 순서` 절에 적었다.
- axe 위반 0건을 네 폭 모두에서 확인했다.

## 결과와 제한

- 병합 커밋: 없음. 열린 PR이다. base는 `main`이다. **CI가 아직 초록이 아니다.** 명세 2절 수정으로 9건 중 7건이 해결됐고, `mobile-chromium` 2건(`recommendation-language.spec.ts:44` light·dark)이 남는다. 원인은 초점 되감기 순서이며 위 절에 적었다. 기준을 완화하거나 실패를 숨기지 않았고 기존 테스트도 고치지 않았다.
- 남은 위험과 후속 작업: 내 일정의 `내 여행에 저장`은 여전히 29.9%에 있다. 위 구조적 충돌 절에 측정값과 이유를 남겼다. 주요 조작 영역을 내용 끝으로 옮기는 마크업 재설계는 768px 이상 배치 변경을 수반하므로 별도 이슈가 필요하다.
- CSS gzip은 상한과 정확히 같은 바이트 수라 여유가 없다. 다음에 CSS를 늘리는 작업은 다시 상쇄가 필요하다.
