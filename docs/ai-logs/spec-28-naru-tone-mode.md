# PR #563 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/563
- 제목: feat: 나루 말투 고르기
- 작성자: jeongiryang
- 최종 상태: 열림 (base `feat/spec-27-dialect-ui-mode`)
- AI 도구: Claude Code

## 목적

명세 28(나루 말투 고르기)을 구현한다. 나루의 말투를 명세 27이 만든 **화면 말투 설정 하나**로
함께 고르게 한다. 기본은 표준말이다. 나루 전용 설정을 새로 만들지 않고 같은 `wave-tone-v1`
값(`standard` / `gyeongnam`)을 쓴다.

말투만 바꾼다. 나루가 말하는 내용, 제안하는 동작, 확인·미확인 구분은 바뀌지 않는다.

## 역할 구분

- 사람: 기본값 표준말 결정, 품질 기준과 중단 조건, 로컬 모델 운영, 병합 승인
- AI: 코드·문서·테스트 변경, 로컬 검사 실행, PR 작성

## 변경

- `server/assistant/handler.ts`
  - 컨텍스트 재구성에 `const tone = ctx.tone === 'gyeongnam' ? 'gyeongnam' : 'standard';` 한 줄.
  - `toneInstruction`(한 문단)과 `systemInstructions(tone)` 합성. 기존 `instructions`의 마지막
    안전 문장 두 개를 `safetyRules`로 **옮겨** 말투 문단 뒤에 두었다. 지우거나 줄이지 않았다.
  - 입력 크기 제한, 메시지 6개와 `clean(content, 1200)`, 동시 실행 제한, 응답 6,000자 제한,
    사진 경로 분리, `endpointFor`의 URL 제한은 그대로다.
- `features/planner/components/PlannerAssistant.tsx`: 요청 컨텍스트에 `tone` 한 필드.
- `features/preferences/tone-release.ts`(신규): `dialectToneEnabled()` 품질 게이트.
- `features/preferences/{PreferenceControls.tsx,storage.ts,context.tsx}`, `app/layout.tsx`: 게이트 적용.
- `docs/naru-service.md`: 말투 문단, 품질 기준, 측정 결과, 감추는 방식과 켜는 방법.
- `tests/assistant-tone.test.mjs`(신규), `e2e/naru-tone.spec.ts`(신규), `tests/tone-copy.test.mjs`(부팅 스크립트 단언 갱신).

`lib/assistant-actions.js`, `server/assistant/gateway.py`, `warm-model.py`, systemd 단위 파일,
GitHub Actions 워크플로는 건드리지 않았다. 유료 LLM API로 바꾸지 않았고 모델 호출 방식도 그대로다.

## 품질 측정: 수행하지 못했음

| 항목 | 값 |
| --- | --- |
| 측정한 대표 요청 수 | **0건** (기준 20건 이상) |
| 측정 일시 | 없음 |
| 장소·시설·숫자·시간 일치 | 측정 불가 |
| 확인·미확인 구분 유지 | 측정 불가 |
| 제안된 동작 일치 | 측정 불가 |
| 뜻이 달라진 문장 | 측정 불가 |
| 어색함·희화화 | 측정 불가 |
| 판정 | **기준 미달 — 사투리 선택지를 감춘 상태로 둔다** |

이 머신에서 승인된 DSW 전용 로컬 모델(`WAVE_AI_BASE_URL`)에 접근할 수 없어 두 말투로 실제
응답을 받을 수 없었다. e2e의 합성 fixture 응답은 모델의 사투리 생성 품질에 대한 증거가 되지
않으므로 품질 증거로 쓰지 않았다. 모델 이름이나 GPU 수도 증거로 쓰지 않았다.

### 감추는 방식

`features/preferences/tone-release.ts`의 `dialectToneEnabled()`가 게이트다. 개발 빌드에서
`wave-dev-presentation`이 `enabled`일 때만 `true`이고, Production 빌드에서는 항상 `false`다.
게이트를 네 곳에 함께 걸어 저장된 브라우저 값으로도 켤 수 없게 했다.

- `PreferenceControls.tsx`: 말투 설정 항목을 그리지 않는다.
- `storage.ts`: 저장된 `wave-tone-v1`을 읽지 않고 `standard`를 돌려준다.
- `context.tsx`: `setTone('gyeongnam')`이 `standard`가 된다.
- `app/layout.tsx` 부팅 스크립트: `data-tone`이 `gyeongnam`이 되지 않는다.

실제 Production 번들을 열어 확인했다. `dialectToneEnabled()`가 `function c(){return!1}`로
컴파일되고 `readStoredTone`이 그 값을 먼저 확인하므로, 나루 요청의 `tone`은 항상 `standard`이고
사투리 프롬프트 문단이 쓰이지 않는다.

### 나중에 켜는 방법

위 품질 측정을 20건 이상 수행해 결과 표를 `docs/naru-service.md`에 채운 뒤,
`dialectToneEnabled()`가 무조건 `true`를 돌려주도록 바꾸면 된다. 다른 코드는 바꿀 필요가 없다.
기준에 못 미치면 이 함수를 그대로 두고 측정 결과만 갱신한다.

## 검증

분기 직후 기준선(`feat/spec-27-dialect-ui-mode`)

| 명령 | 기준선 | 변경 후 |
| --- | --- | --- |
| `npm run lint` | 0 errors / 14 warnings | 0 errors / 14 warnings |
| `npm run typecheck` | 통과 | 통과 |
| `npm test` | — | 1273건 중 1271 통과, 2 실패 |
| `npm run build:vercel` | 통과 | 통과 |
| `npm run check:performance` | 통과 (CSS gzip 71,681바이트) | 통과 (CSS gzip 71,681바이트) |

`npm test`의 실패 2건은 이 머신에 Python이 없어 생기는 기존 문제다. main에서도 실패한다.

- `authenticated gateway applies image admission independently`
- `dedicated AI runtime waits for startup and never repeats model loading`

### CSS gzip

전후 모두 **71,681바이트(70.0010 KiB)로 동일**하다. 명세대로 CSS 추가가 0줄이다.
상쇄용 죽은 선언 제거는 필요하지 않았고 하지도 않았다.

### e2e (선택 실행)

- `e2e/naru-tone.spec.ts`(신규), `e2e/tone-mode.spec.ts`,
  `simple-naru-conversation`, `naru-persona-actions`, `naru-followup-intents`,
  `naru-availability-recovery`, `naru-trip-upgrade`,
  `preferences-*`, `accessibility-final` — **124건 통과**.
- `tests/assistant-actions.test.mjs`는 `npm test`에 포함되어 통과했다.
- `npm run test:e2e` 전체는 실행하지 않았다.

## 구현 판단

- **안전 규칙을 새로 쓰지 않고 기존 문장을 옮겼다.** 명세가 "한 문단만 더한다"와
  "안전 규칙이 마지막에 오게 한다"를 함께 요구하므로, `instructions` 끝의
  `실행했다고 말하지 마세요. reply에 시설 이용 가능이나 안전 보장을 쓰지 마세요.` 두 문장을
  `safetyRules`로 분리해 말투 문단 뒤에 붙였다. 문장은 하나도 지우거나 바꾸지 않았고
  중복해서 쓰지도 않았다.
- **`tone`을 모델 `context` JSON에 넣지 않았다.** 명세가 "시스템 프롬프트 선택에만 쓴다"고
  했으므로 컨텍스트 재구성 결과에는 포함하지 않는다. 테스트가 이를 단언한다.
- **명세 27이 만든 `tests/tone-copy.test.mjs`의 부팅 스크립트 단언 한 줄을 갱신했다.**
  게이트를 부팅 스크립트에도 걸었기 때문이다. 저장소의 기존 테스트가 아니라 앞선 PR에서
  이 작업이 직접 추가한 테스트이며, 기준을 완화한 것이 아니라 더 좁은 동작을 고정한다.
- 나루 e2e에서 말투를 바꾸려면 나루 대화를 잠시 닫는다. 나루 패널이 모달 `<dialog>`라
  열린 상태에서는 헤더 설정을 누를 수 없다. 다시 열었을 때 대화 기록이 유지되는 것을 확인했다.

## 결과와 제한

- 병합하지 않았다. base는 `feat/spec-27-dialect-ui-mode`이며 그 PR의 base가 #554다.
- **사투리 선택지는 감춰진 상태다.** 품질 측정 전에는 공개하지 않는다.
- 나루 요청에 위치 관련 필드가 없다. `현재 위치는 제공되지 않습니다` 문장을 지우지 않았다.
- 남은 후속 작업: 로컬 모델에 접근 가능한 환경에서 대표 요청 20건 측정 후 게이트 해제 판단.
