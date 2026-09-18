# PR #번호 AI 작업 로그

- PR: 링크
- 제목: feat: 글자 크게 보기
- 작성자: jeongiryang
- 최종 상태: 작성 후 CI 확인 중
- AI 도구: Claude Code (Opus 5)

## 목적

`specs/24-large-text-mode.md`([P1][접근성] 글자 크게 보기)를 구현한다. 저시력 사용자와 작은 글자를 읽기 어려운 사용자가 브라우저 설정을 몰라도 서비스 안에서 글자를 키울 수 있게 한다. 화면 일부를 확대하는 돋보기 창이 아니라 문서 전체의 루트 글자 크기를 단계적으로 키우는 방식이며, 핵심은 설정 추가가 아니라 커진 상태에서 모든 화면이 실제로 쓸 수 있다는 것이다.

## 역할 구분

- 사람: 요구사항(명세 문서), 범위 결정, 최종 승인, 계정·Secret 입력
- AI: 기존 `features/preferences/` 구조 조사, 타입·상태·저장소·부팅 스크립트·설정 UI 구현, `px`→`rem` 치환, CSS 예산 상쇄를 위한 죽은 선언 조사·제거, e2e 신규 spec 작성, 검증 실행, PR 본문과 이 로그 작성

## 변경 내용

- `features/preferences/types.ts`: `TextScale` 타입과 `PreferencesValue`의 `textScale`·`setTextScale` 추가.
- `features/preferences/storage.ts`: `wave-text-scale-v1` 읽기·쓰기를 기존 `try/catch` 형태로 추가. **`presentationOptionsEnabled()` 게이트 바깥**에서 읽고 쓴다. 접근성 설정은 언어·테마와 달리 항상 동작해야 한다.
- `features/preferences/context.tsx`: `textScale` 상태와 `document.documentElement.dataset.textScale` 갱신.
- `features/preferences/PreferenceControls.tsx`: `role="radiogroup"` 안의 네이티브 `<input type="radio">` 3개. 값마다 실제 크기(`16px`·`18px`·`20px`)를 함께 표시하고, 변경을 `aria-live="polite"`로 `글자 크기를 크게로 바꿨어요.`처럼 알린다.
- `app/layout.tsx`: 부팅 인라인 스크립트에 한 줄을 더해 첫 그리기 전에 `data-text-scale`을 채운다. 기존 `data-theme`·`data-motion`과 같은 `try/catch` 안이다.
- `app/styles/simple-wave.css`: `html[data-text-scale="large"] { font-size: 112.5% }`, `html[data-text-scale="larger"] { font-size: 125% }`. `body { font-size: 16px }`를 `1rem`으로 바꿔 루트 배율이 본문에 전달되게 했다.
- `app/styles/simple-planner.css`, `app/styles/simple-wave.css`: 본문·라벨의 `px` 글자 크기 92곳을 `rem`으로 치환.
- `app/styles/preferences.css`: 설정 컨트롤 스타일 9줄.
- `app/styles/planner-unified-workspace.css`, `app/styles/planner-journey-control.css`: CSS gzip 예산 상쇄를 위한 죽은 규칙 제거(아래 참고).
- `e2e/text-scale.spec.ts`: 신규.

## 검증

### 실행한 명령과 결과

| 명령 | 결과 |
| --- | --- |
| `npm run lint` | 통과 (경고 14건, 오류 0건 — 변경 전 main과 동일) |
| `npm run typecheck` | 통과 |
| `npm test` | 1262건 중 1260 pass / 2 fail. 실패 2건은 Python 미설치로 인한 이 머신의 기존 문제이며 변경 전 main에서도 동일하게 실패한다(`authenticated gateway applies image admission independently`, `dedicated AI runtime waits for startup and never repeats model loading`). |
| `npm run build:vercel` | 통과 |
| `npm run check:performance` | 통과. CSS gzip 69.5KiB / 상한 70KiB |
| `npx playwright test e2e/text-scale.spec.ts --project=desktop-chromium` | 8/8 통과 |
| `npx playwright test e2e/text-scale.spec.ts --project=mobile-chromium` | 8/8 통과 |
| `npx playwright test e2e/touch-target-contract.spec.ts e2e/mobile-touch-targets.spec.ts` | 4/4 통과 |
| `npx playwright test e2e/preferences-*.spec.ts e2e/public-presentation-release.spec.ts e2e/accessibility-final.spec.ts` | 33 pass / 4 fail (`preferences-disclosure-focus.spec.ts` — 아래 참고) |
| 레이아웃 회귀 22개 spec 2배치 | 71건 전부 통과 |

e2e 전체는 돌리지 않았다. 신규 spec과 변경 영향이 있는 기존 spec만 선택 실행했다.

### 신규 e2e가 고정한 것

- 세 단계 전환이 `html[data-text-scale]`과 실측 루트 `font-size`(16/18/20px)에 반영되고, 새로고침 뒤에도 유지된다.
- `radiogroup`을 화살표 키만으로 조작할 수 있고, 커진 상태에서 초점이 화면 안에 남는다. axe 위반 0건.
- `localStorage` 접근이 예외를 던지는 상태에서도 기본값으로 동작하고 오류 문구·pageerror가 없다.
- **넘침 검사**: `아주 크게`에서 390/960/1440px × `/`, `/planner`, `/festivals`, `/community`, `/travel-book`, `/guide`, 장소 상세 dialog, 지도 도구 패널 — `document.documentElement.scrollWidth <= clientWidth`. 기존 `e2e/landing-contract.ts`의 `expectNoOverflow`를 재사용했다.
- **조작 영역 검사**: `아주 크게` + 390px에서 글자 크기 선택지 3개와 지도 도구 11개가 모두 44px 이상.
- **핵심 여정 검사**: `아주 크게` + 390px에서 기존 `chooseTripConditions`·`openItinerary`로 지역 고르기 → 장소 담기 → 일정 만들기 → 저장까지 진행되고, 저장된 값에 `textScale`이 섞이지 않는다.

### 위치정보 불변조건

`navigator.geolocation`을 호출하지 않는다. 이 설정은 `localStorage`에만 있고 서버·계정·나루 컨텍스트·공유 일정으로 나가지 않는다. 핵심 여정 e2e가 저장된 여행 데이터에 `textScale`이 없음을 단언한다.

## CSS gzip 예산

| 시점 | CSS gzip |
| --- | --- |
| 변경 전(main) | 71678 bytes = **70.00 KiB** (상한 70 KiB, 여유 약 7바이트) |
| `px`→`rem`와 신규 스타일 추가 직후 | 71827 bytes = 70.14 KiB — **예산 초과** |
| 죽은 선언 제거 후(최종) | 71173 bytes = **69.50 KiB** |

기준을 완화하지 않고, 계산된 스타일이 바뀌지 않는 죽은 선언만 제거해 상쇄했다.

### 제거한 선언과 근거

`app/styles/planner-journey-control.css` — `.journey-stage-stream`, `.journey-stage-panel` 규칙 8줄과 `@media (max-width: 1560px)` 블록 3줄, 빈 `@media (max-width: 1040px) {}`.

- `.journey-stage-panel`은 `app/`·`components/`·`features/`·`lib/` 어디에도 없다.
- `.journey-stage-stream`은 `features/planner/hooks/useJourneyProgress.ts:98`의 `document.querySelector`와 `features/planner/hooks/useReadinessFocus.ts:40`의 `closest`에서 **읽기만** 한다. 이 클래스를 `className`으로 붙이는 코드가 없어 DOM에 존재하지 않으므로, 이 클래스를 조상으로 요구하는 규칙은 어떤 요소에도 매치되지 않는다. 빌드된 JS 번들에도 두 조회 문자열 외에는 나오지 않는다.
- 빈 미디어 블록은 아무 선언도 만들지 않는다.

`app/styles/planner-unified-workspace.css` — `.journey-subheading`, `.itinerary-empty-state`, `.itinerary-primary-actions`, `.itinerary-secondary-actions`, `.itinerary-course`, `.day-planner`, `.day-start-control`, `.place-carousel` 관련 39줄.

- 여덟 클래스 모두 소스 전체(`app/`·`components/`·`features/`·`lib/`)에서 grep 0건이고, 문자열 조립으로도 만들어지지 않으며, 빌드된 JS 번들에도 문자열이 없다. 즉 DOM에 절대 나타나지 않는다.
- `html[data-theme="dark"] .itinerary-secondary-actions, html[data-theme="dark"] .planner-journey-workspace .travel-layers { ... }`는 규칙을 지우지 않고 **죽은 첫 번째 선택자만** 떼어냈다. `.travel-layers`는 `features/planner/components/TravelSignalsPanel.tsx:70`에서 실제로 쓰이므로 남겼다.
- `.planner-journey-workspace .place-carousel,` / `.planner-journey-workspace .day-planner,`는 살아 있는 선택자 목록 안의 죽은 두 줄만 제거했다.

명세는 초과 시 import가 없는 `app/styles/landing-community-active.css` 등을 함께 지우라고 적었지만, 그 파일들은 `app/layout.tsx`가 import하지 않아 애초에 번들에 없다. 지워도 gzip 수치가 변하지 않으므로 그 방법을 쓰지 않았다.

## 명세와 다르게 구현한 부분

1. **명세의 파일 경로**: 명세는 `components/SitePreferences.tsx`를 읽으라고 했지만 실제로는 `features/preferences/*`를 re-export하는 3줄 파일이다. 구현은 `features/preferences/` 아래 실제 파일에 했다.
2. **`PreferencesValue` 형태**: 명세가 적은 타입에는 `setLocale`·`toggleTheme`이 빠져 있다. 기존 타입을 줄이지 않고 `textScale`·`setTextScale`만 더했다.
3. **저장 키 상수**: 처음에는 `TEXT_SCALE_KEY` 상수를 썼으나 기존 `tests/browser-storage.test.mjs`가 `localStorage.setItem("…"` 형태의 문자열 리터럴만 인식해 "읽기만 하고 아무도 채우지 않는 키"로 잡혔다. 테스트를 고치지 않고 구현에서 리터럴을 쓰도록 바꿨다.
4. **설정 항목 위치**: 패널 안에서 글자 크기 행을 언어·화면 색상 뒤에 두었다. 언어·테마는 `presentationOptionsEnabled()`로 막혀 일반 사용자에게 보이지 않으므로 **Production에서는 글자 크기가 패널의 첫 행**이다. 기존 `preferences-disclosure-focus.spec.ts`의 탭 순서 단언 일부를 보존하기 위한 배치다.
5. **`px`→`rem` 범위**: 명세는 6개 파일을 들었지만 "넘침이 확인된 화면부터 바꾼다"고도 적었다. 넘침은 어디서도 재현되지 않았고, `app/styles/community.css`·`place-dialog.css`·`map-workspace.css`에는 `px` 글자 크기 선언이 아예 없다. 실제로 계산된 스타일을 이기는 마지막 파일인 `simple-wave.css`·`simple-planner.css`만 바꿨다. `planner-flow.css`는 뒤에 오는 `simple-planner.css`에 덮이는 부분이 많고, 바꿀 경우 CSS 용량만 늘고 화면에는 영향이 없는 선언이 다수라 이번 범위에서 제외했다. 닫기 `×`, 담기 `+` 같은 글리프 크기는 명세대로 `px`를 유지했다.

## 남은 위험과 후속 작업

### 기존 테스트와의 구조적 충돌 (고치지 않고 남김)

`e2e/preferences-disclosure-focus.spec.ts`의 4개 케이스(`ko`/`en` × `320px`/`1366px`)가 **37행 한 줄에서** 실패한다.

```
await page.keyboard.press("Tab");
await expect(page.getByRole("link", { name: "계정 관리", exact: true })).toBeFocused();
```

이 테스트는 환경설정 패널의 초점 이동 대상이 **정확히 언어 select와 화면 색상 버튼 둘뿐**이라는 전제로 짜여 있다. 화면 색상 버튼에서 Tab을 누르면 패널을 벗어나 헤더의 `계정 관리` 링크에 닿는다는 단언이다. 명세가 요구하는 글자 크기 `radiogroup`은 세 번째 초점 대상이므로, 패널 안 어디에 두더라도 이 단언은 깨진다. 앞에 두면 26행(첫 Tab = combobox)까지 함께 깨지므로, 깨지는 단언이 가장 적은 배치를 골랐다.

- 실측: 4개 케이스 모두 37행에서만 실패한다. 같은 파일의 나머지 단언(초점 복귀, Escape, 넘침 0, 헤더 링크 줄바꿈, axe 위반 0건, console 오류 0건)은 전부 통과한다.
- 이 테스트는 `playwright.config.ts`의 `storageState`가 `wave-dev-presentation=enabled`를 넣어 주는 **개발 전용 경로**만 검사한다. Production에서는 언어·화면 색상이 보이지 않으므로 이 탭 순서 자체가 존재하지 않는다.
- 테스트를 완화하거나 skip하지 않았고 timeout도 늘리지 않았다. 후속 작업으로 남긴다: 이 spec을 "패널 안 초점 대상을 모두 순회한 뒤 패널을 벗어난다"는 형태로 다시 쓰는 것이 맞다고 본다.

### 기타

- `e2e/landing-scroll-contract.spec.ts:7`은 이 브랜치에서 실패하지만 `git stash`로 변경을 걷어낸 상태에서도 동일하게 실패한다. 이 변경과 무관한 기존 실패다.
- e2e 전체(`npm run test:e2e`)는 실행하지 않았다. 신규 spec과 영향 범위의 기존 spec만 골라 돌렸다. 전체 결과는 PR CI로 확인한다.
- `app/page.tsx`와 `features/landing/`은 이번 범위가 아니라 건드리지 않았다. 다만 `simple-wave.css`의 `.simple-region-*` 글자 크기는 소개 화면과 플래너 지역 선택이 함께 쓰는 선언이라 `rem` 치환의 영향을 받는다. 넘침·조작 영역 e2e로 두 화면 모두 확인했다.
- 간격 토큰 `--s-1`~`--s-8` 값은 바꾸지 않았다.
