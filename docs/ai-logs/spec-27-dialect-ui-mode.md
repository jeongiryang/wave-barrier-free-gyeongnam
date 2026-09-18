# PR #번호 AI 작업 로그

- PR: 링크
- 제목: feat: 화면 말투 고르기
- 작성자: jeongiryang
- 최종 상태: 열림 (base `fix/preferences-disclosure-focus-contract`)
- AI 도구: Claude Code

## 목적

명세 27(화면 말투 고르기)을 구현한다. 화면 안내 문구의 말투를 `표준말`과 `경남 말` 중에서
고를 수 있게 하되 **기본은 표준말**이다. 처음 오는 여행자, 한국어를 배우는 사용자,
화면 낭독기 사용자에게 표준말이 안전하다는 명세의 결정을 그대로 따랐다.

말투는 표현만 바꾸고 정보는 바꾸지 않는다.

## 역할 구분

- 사람: 명세 27의 제품 결정(기본값 표준말, 적용 범위, 저장 키), 문구 최종 확인, 병합 승인
- AI: 코드·문서·테스트 변경, 로컬 검사 실행, PR 작성

## 변경

- `lib/tone-copy.js`, `lib/tone-copy.d.ts`: `toneText`만 둔다. 네트워크·저장소·위치 API를 참조하지 않는다.
- `features/preferences/types.ts`: `Tone`, `tone`, `setTone` 추가.
- `features/preferences/storage.ts`: `wave-tone-v1` 읽기·쓰기. `presentationOptionsEnabled()` 게이트 **밖**에 둔다.
- `features/preferences/context.tsx`: `tone` 상태와 `document.documentElement.dataset.tone` 갱신.
- `features/preferences/PreferenceControls.tsx`: `화면 말투` 설정 한 줄과 `aria-live="polite"` 상태 알림.
- `app/layout.tsx`: 부팅 스크립트에서 `data-tone`을 채운다.
- `features/planner/naru-copy.ts`, `features/planner/course-copy.ts`: `ToneEntry` 문구표(우선순위 1·2).
- `features/planner/components/PlannerAssistant.tsx`, `CourseExpansion.tsx`: 안내·빈 상태 문구에만 적용.
- `docs/design-system.md` 11절: 적용 범위와 적용하지 않는 범위.
- `tests/tone-copy.test.mjs`, `e2e/tone-mode.spec.ts`.

## 검증

분기 직후 기준선(`origin/fix/preferences-disclosure-focus-contract`, `8834bf4`)

| 명령 | 기준선 | 변경 후 |
| --- | --- | --- |
| `npm run lint` | 0 errors / 14 warnings | 0 errors / 14 warnings |
| `npm run typecheck` | 통과 | 통과 |
| `npm test` | — | 1267건 중 1265 통과, 2 실패 |
| `npm run build:vercel` | 통과 | 통과 |
| `npm run check:performance` | 통과 (CSS gzip 71,681바이트) | 통과 (CSS gzip 71,681바이트) |

`npm test`의 실패 2건은 이 머신에 Python이 없어 생기는 기존 문제다. main에서도 실패한다.

- `authenticated gateway applies image admission independently`
- `dedicated AI runtime waits for startup and never repeats model loading`

### CSS gzip

전후 모두 **71,681바이트(70.0010 KiB)로 완전히 동일**하다. 새 CSS 선언을 한 줄도 넣지 않고
기존 `.preference-row`/`em` 표시 방식과 `app/globals.css`의 `.sr-only`를 그대로 썼기 때문이다.
예산 상한이 70 KiB에 거의 딱 차 있으므로 상쇄용 죽은 선언 제거는 필요하지 않았다.

### e2e (선택 실행)

전체를 돌리지 않고 신규 spec과 관련 기존 spec만 골라 실행했다.

- `e2e/tone-mode.spec.ts` 8건 통과 (desktop-chromium 1440px, mobile-chromium)
- `preferences-disclosure-focus`, `preferences-help-language`, `preferences-picker-recovery`,
  `preferences-theme-contrast`, `accessibility-final` 42건 통과
- `simple-naru-conversation`, `naru-persona-actions`, `naru-followup-intents`, `small-trip` 포함 86건 통과

`tone-mode.spec.ts`는 390·960·1440px에서 두 말투 모두 가로 넘침 0과 axe 위반 0건을 확인한다.

## 구현 판단

- **설정 컨트롤을 `<select>`가 아니라 버튼 토글로 두었다.** #554의 `preferences-disclosure-focus.spec.ts`가
  패널 안의 `getByRole("combobox")`를 범위 없이 질의하므로 두 번째 `select`를 넣으면 기존 테스트가
  strict mode 위반으로 깨진다. 기존 테스트를 고치지 않기 위해 기존 화면 색상 설정과 같은
  `.preference-row` 버튼 모양을 썼다. 값이 두 개뿐이라 토글이 자연스럽고, 현재 값을 `em`에 글자로
  표시해 색으로만 알리지 않는다. 조작 영역은 `.preference-row`의 `min-height: 56px`를 따른다.
- **`어떤 도움이 필요할까요?`는 문구표가 아니라 사용처에 `ToneEntry`를 그대로 적었다.**
  `tests/naru-accessibility-ui.test.mjs`가 이 문구를 `PlannerAssistant.tsx` 원본에서 직접 확인한다.
  기존 테스트를 고치지 않기 위해 표준말 문구를 그 파일에 남겼고, 문구 대조 테스트가 이 파일도 함께 읽는다.
- `usePlanRequest`의 `planNotices` 문구에도 말투를 붙여 보았으나, 그 `notice` 값은 현재 어떤 화면에도
  렌더링되지 않고 `tests/search-result-focus.test.mjs`가 직접 만든 `require` 구현으로 이 훅을
  평가하므로 새 import가 기존 테스트를 깨뜨린다. 실제로 보이는 문구가 아니어서 되돌리고
  화면에 보이는 나루 안내·코스 확장 안내로 옮겼다.
- 명세가 예로 든 `features/planner/*-copy.ts` 중 `condition-copy.ts`는 위 이유로 건드리지 않았고,
  같은 규칙의 `naru-copy.ts`·`course-copy.ts`를 새로 두었다.
- 경남 말 문구는 종결어미만 바꾸고(`-어예`, `-이소`) 나머지 낱말을 그대로 두었다. 수치·고유명사·시설
  이름이 달라질 여지를 없애기 위한 보수적인 선택이다. 확신이 없는 문구는 표준말로 남겼다.

## 결과와 제한

- 병합하지 않았다. base는 `fix/preferences-disclosure-focus-contract`(#554)다.
- 위치 권한을 요청하지 않고 위치로 말투를 바꾸는 코드가 0건이다. 설정값은 기기 안에만 둔다.
- 나루의 말투는 이 PR에서 바꾸지 않는다. 명세 28에서 같은 `wave-tone-v1` 값을 쓴다.
- 문구 목록은 저장소 책임자의 확인이 남아 있다. 확인 전에도 기본이 표준말이므로 영향은 없다.
