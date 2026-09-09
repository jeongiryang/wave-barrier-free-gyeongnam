# #353 전체 화면 첫 진입 / Landing 첫 시각 체크포인트

> 최신 상태는 아래 **Owner 두 번째 피드백 적용** 절이다. 첫 체크포인트의 환경설정 replay·앱 motion·작은 Hero Canvas 설명은 이후 Owner 결정으로 대체되었다. 과거 검증·실패 기록은 보존한다.

- 상태: **LOCAL VISUAL CHECKPOINT. 미배포·미병합, #353 Open.**
- 기준: 2026-09-09 11:55 KST. 시작 시 원격 main / canonical Production 모두 `a355f38d21d67b50ae5936bdcb49a3a310c96198`.
- 브랜치: `feat/fullscreen-story-353`, 기존 `D:/wave-production-validation-20260908` worktree 재사용.
- 이슈: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353
- Owner 요구 기록: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5594816366
- 작업 원장: #288 comment `5552551854`. 다른 queue의 generation/attempt/receipt는 변경하지 않음.
- 담당: Codex 구현·관련 검증. 독립 QA PASS를 발행하지 않음. Owner 육안 평가는 아직 받지 않음.

## 바뀐 사용자 경험

1. 처음 Landing에 진입하면 Hero와 별도의 native dialog가 viewport를 채운다. 일반 모션은 무음 수면 영상과 큰 W.A.V.E 브랜드, 즉시 사용 가능한 건너뛰기·플래너 링크를 제공한다. Hero의 기존 Canvas는 보조 visual로 유지한다.
2. 영상 종료 또는 9초 watchdog 뒤 실제 Hero로 전환한다. 일시정지·정적 모드·영상 실패에서는 사용자가 건너뛰기/계획 링크로 진행한다. 자동 종료의 대안이 항상 보인다.
3. 완료/건너뛰기는 `sessionStorage`의 `wave-arrival-session-v1=done`에 기록한다. 같은 탭의 새로고침에서는 다시 자동 노출하지 않는다. 새 브라우저 세션은 다시 노출하며 환경설정에서 명시적으로 재생할 수 있다. `/planner` 직접 진입에 인트로를 강제하지 않는다. 저장소 접근 거부도 이탈을 막지 않는다.
4. 초기 focus는 건너뛰기, Tab은 modal 안에서 순환, 첫 종료는 Hero 제목, 명시적 재생 종료는 원래 replay 버튼으로 돌아온다. OS 동작 감소가 런타임에 바뀌어도 버튼 DOM/포커스를 유지한다.
5. OS/app 동작 감소·지원 브라우저의 Save-Data에서는 영상 요청 없이 전체 화면 정적 이미지/브랜드/CTA를 제공한다. 재생 중 동작 감소는 src를 해제한다. 영상/이미지 실패 시 브랜드와 버튼은 단색 배경에서도 남는다.
6. Hero의 KO headline/CTA를 모바일 보조 visual보다 먼저 배치한다. 편의 소개는 반복 3열 카드에서 큰 동행 이미지와 세 질문으로, 마지막 CTA는 항구 이미지와 선명한 밝은 글자로 연결한다. 기존 확장 장면·실제 관광사진·같은 여행의 날짜/지도 기록·경남 18개 지역은 유지한다.
7. 스크롤 제목의 실제 미표시 결함을 수정했다. 관찰하는 h2 자체에 `clip-path: inset(0 0 100%)`가 있어 IntersectionObserver가 노출을 감지하지 못했다. 마스크를 자식 span으로 옮겨 기존 강한 reveal 효과와 제목 관찰을 분리했다.

미디어별 USE/EDIT/REPLACE/KEEP/REJECT는 [선택 기록](../media-selection-353.md), 출처는 [자산 문서](../assets-and-licenses.md)에 기록했다. 새 영상은 v3 원본과 Git blob/크기가 동일하다. 생성 풍경은 실제 관광지/편의시설 근거로 표시하지 않는다.

## 실행한 검증

모든 명령은 위 worktree의 WIP를 대상으로 실행했다. 아래 결과는 hosted CI나 Production 결과가 아니다.

| 명령 / 범위 | 실제 결과 |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 오류 0 / 경고 7. img 및 기존 ref 경고, 규칙 변경 없음 |
| `node --test tests/landing-boundaries.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs tests/auth-community.test.mjs` | 57 PASS / 0 FAIL / 0 SKIP |
| `CI=true E2E_BASE_URL=http://127.0.0.1:4173 node scripts/run-playwright.mjs e2e/fullscreen-intro.spec.ts e2e/fullscreen-story-visual.spec.ts` | 당시 18 PASS / 0 FAIL / 0 FLAKY / 0 SKIP, 27.2초. desktop + mobile, Intro/whole Landing axe 위반 0 |
| 저장된 app 동작 감소 guard 추가 후 `... e2e/fullscreen-intro.spec.ts --grep 'app-reduced|runtime reduction'` | 4 PASS / 0 FAIL / 0 FLAKY / 0 SKIP, 3.4초. 새 2건 + 관련 기존 2건. 전체 20건 재실행으로 주장하지 않음 |
| agent-browser 실제 화면 | 320×568 Intro 정확히 x0/y0/320/568, 버튼 높이 48px 이상. 320 Hero / 390×844 dark / 1366×900 Intro 캡처, overflow 없음. JS page error 없음 |

첫 시각 검증의 HTML 보고서·PNG·WebM·실패 trace는 저장소 외부에 보존:

`D:/wave-db-binding-preflight-20260908/fullscreen-story-353-20260909/`

- `final-visual-report/`, `final-visual-results/`: 18건 PASS. 각 desktop/mobile 하위 폴더에 `01-fullscreen-intro.png`, `02-hero.png`, 각 장면 PNG, `journey-0..3.png`, `whole-page-static.png`, `video.webm`.
- `preference-checkpoint-report/`, `preference-checkpoint-results/`: app reduced / runtime 4건 PASS.
- `intro-320-checkpoint.png`, `hero-320-checkpoint.png`, `hero-390-dark-checkpoint.png`.
- `lint-checkpoint2.log`, `typecheck-checkpoint2.log`, `unit-checkpoint2.log`.

## 실패 기록과 계약 변경

- 초기 Intro: 8 FAIL / 4 PASS. hydration 이전 클릭/ESC 처리와 Tab 순환이 부족했다. static native dialog/form, 작은 pre-hydration exit, modal key handling으로 수정했다.
- 다음 Intro: 8 PASS / 3 FAIL / 1 FLAKY. streaming 중 숨겨진 dialog를 고른 ESC bootstrap 문제를 visible dialog 선택으로 수정했다. 실패 trace 보존. 이후 static 4 PASS 및 위 18건 PASS.
- 다음 결합 검사: Intro 12 PASS, story 2 FAIL. h2 클립/관찰 결함을 실제 화면에서 재현했고 제품 CSS를 수정한 뒤 story 2 PASS. opacity assertion은 그대로 유지했다.
- 초기 lint 1 오류는 effect의 동기 상태 초기화였다. 명시적 replay마다 독립 ArrivalScene을 생성하고 기본 state를 mount에서 초기화해 effect의 불필요한 setState를 제거했다. 동작 감소에서는 remount하지 않는다.
- 초기 관련 unit 56 PASS / 1 FAIL은 과거 `LandingIntro` 존재 금지 정책이었다. Owner의 새 full-screen 계약으로 갱신해 modal·direct planner link·skip·mute·preload none·Save-Data·reduced-motion·bounded timer·focus return·fullscreen assertions를 추가했다. 기존 glyph/지역/obsolete UI 검사는 유지했다.
- 기존 테스트 삭제, skip 추가, timeout/retry/workers/성능 예산 변경 없음. 최초 실패를 이후 PASS로 소급 덮어쓰지 않는다.

## 다음 검증 전 남은 일

1. Owner가 로컬 `http://127.0.0.1:4173/`의 첫 화면과 전체 서비스 story를 육안 검토한다. 환경설정 → 인트로 다시보기로 반복 확인 가능하다. 이 요청된 시각 체크포인트 이전에 Full CI를 시작하지 않았다.
2. 기존 `e2e/launch-integrity.spec.ts`의 non-modal replay 정책과 Landing 진입 setup을 새 Owner 계약에 맞춰 갱신해야 한다. 새 Intro 테스트가 기존 전체 E2E의 대체물은 아니다. 현재 그 전체 파일/전체 suite가 통과했다고 주장하지 않는다.
3. CSS/JS build budget 재측정 필요. 기존 CSS가 70KiB 예산에 근접했다. 이번 스타일 추가분을 포함한 production build/성능 PASS는 아직 없다. 예산을 올리지 않는다.
4. 200% 실제 브라우저 확대, 태블릿, 실물 기기·화면 낭독기, 전체 core journey 검증은 별도로 남는다. 자동 axe와 사람 검증을 구분한다.
5. 시각 candidate 안정 후 exact Full CI → Preview → 독립 QA → merge → main CI/CD → canonical Production exact-SHA → 실제 추천/일정/지도/저장/복원/공유를 진행한다. ODsay hold를 반복 호출로 풀려고 하지 않는다.
6. 최종 Production 이후 README/제출 원고·이미지·시연 자료를 동기화한다. 지금 캡처는 로컬 디자인 검토용이다.

현재 원본 사용자 dirty 10파일, 기존 worktree/브랜치/queue/artifact, 예전 실패 기록, DB restore/PITR 증거는 그대로 보존했다. 새 worktree·Preview·Full CI·Production 배포·DB operation·유료 API·canary는 시작하지 않았다.

## Owner 두 번째 피드백 적용 — 2026-09-09 로컬 시각 후보

같은 `D:/wave-production-validation-20260908`, `feat/fullscreen-story-353`, 부모 `cdea963f8ba8f6ae914b8fab41c9805f6cadf174`에서 이어서 구현했다. 원격 main은 14:27 KST 재조회에서도 `a355f38d21d67b50ae5936bdcb49a3a310c96198`. 이번 작업은 Preview/Production 배포가 아니다.

### 실제 변경

- Hero의 흰 copy panel·작은 우측 Canvas를 제거했다. 해안 위에 큰 headline/CTA와 방향성 scrim을 배치했다. 이전 #21의 일반 모션 약화용 미사용 Hero CSS도 정리했다.
- 기존 Canvas의 파도 → 무장애 형상 → 워드마크를 전체 화면 Intro에 배치했다. Intro와 Hero가 같은 v3 해안 이미지/무음 영상을 공유한다. 마지막 Canvas 워드마크 위에 선명한 HTML 브랜드가 나타난다. 첫 진입 정책·skip·즉시 planner link·pause·Save-Data·OS 정적 대체는 유지했다.
- 짧은 320×568에서 설명과 CTA가 겹치는 문제를 육안 확인해 문구 위치를 분리했고, 교차 bounding-box 검사도 추가했다.
- v1 함께 계획하는 그림은 편의 장면, v2 정원은 새 큰 상상 여행 장면, v2 항구는 closing에 적용했다. 기존 expansion·공식 관광사진·같은 날짜/장소의 실제 일정/지도 기록은 유지했다.
- v2 원본 영화의 영어/옛 카드 구성을 그대로 배포하지 않고 같은 이미지 세 장을 20초 무음 영상으로 새로 편집했다. 새 영상은 명시적 재생만 허용한다. 원본·실제 관광정보·상상 visual의 구분은 [미디어 선택](../media-selection-353.md)과 [출처](../assets-and-licenses.md)에 반영했다. FFmpeg 재현 출력의 SHA-256도 동일했다.
- 환경설정의 motion/replay UI, 수동 상태·toggle·copy·CSS를 제거했다. 과거 `wave-motion`은 무시하고 저장 시 정리한다. `motion`/`data-motion`은 기존 렌더러와 OS 동작 감소를 연결하는 파생 상태로만 유지한다. replay는 Hero CTA 아래의 작은 키보드 접근 가능한 버튼으로 옮겼다.
- OS reduce → normal 전환에서 Intro가 정적으로 남는 실제 버그도 수정했다. 자식 effect가 부모의 이전 `data-motion=calm`을 읽어 정적 상태에 남았었다. Intro는 현재 `matchMedia`를 직접 읽으며, 폴링/강제 focus 복귀로 우회하지 않는다.

### 검증과 실패 보존

모든 실행 위치는 위 worktree, 공개 API는 관련 browser fixture다. 실제 provider/Production 결과로 표시하지 않는다. 실행 로그는 다음 외부 폴더에 보존했다.

`D:/wave-db-binding-preflight-20260908/fullscreen-story-353-owner-pass2-20260909/`

| 명령/범위 | 근거 |
| --- | --- |
| `npm run typecheck` | PASS. `typecheck-checkpoint.log` |
| 변경 TS/TSX/MJS + 새 파일에 `node node_modules/eslint/bin/eslint.js <files>` | 오류 0, img 관련 기존 경고 3. `lint-final.log`; 마지막 Intro 수정도 `intro-lint-checkpoint.log` 오류 0 |
| `node --test tests/landing-boundaries.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs tests/auth-community.test.mjs` | `unit-final.log`: 57 PASS / 0 FAIL / 0 SKIP |
| `CI=true E2E_BASE_URL=http://127.0.0.1:4173 node scripts/run-playwright.mjs e2e/fullscreen-intro.spec.ts e2e/fullscreen-story-visual.spec.ts` | 최종 **24 PASS / 0 FAIL / 0 FLAKY / 0 SKIP, 35.9초**. `visual-checkpoint.log`와 `visual-checkpoint-report/`, `visual-checkpoint-results/`. Intro/전체 Landing의 관련 화면·axe·320px 겹침·runtime 계약 |
| `... e2e/service-story.spec.ts e2e/launch-integrity.spec.ts e2e/preferences-help-language.spec.ts e2e/preferences-theme-contrast.spec.ts --grep 'service story|failed media|data.saving|initial .*reduced motion|intro|English preferences|환경설정 전체'` | `controls.log`: 34 PASS / 0 FAIL / 0 FLAKY / 0 SKIP, 33.5초 |
| `... e2e/story-media-remix.spec.ts` (media 묶음 안) | `media-2.log`: 새 remix 4 PASS. 같은 실행의 과거 service-story 22 FAIL은 아래에 별도 기록 |
| `... e2e/landing-first-arrival.spec.ts e2e/preferences-disclosure-focus.spec.ts e2e/accessibility-final.spec.ts e2e/landing-regions.spec.ts --grep 'normal arrival|preferences never|OS 동작|반복 시연'` | `focus-phase.log`: 16 PASS / 0 FAIL / 0 FLAKY / 0 SKIP, 20.9초. 정상 Canvas 실제 pixel 다양성/전체 viewport/순서, 320/1366 KO/EN 환경설정 focus |

실패는 삭제하지 않았다:

1. `unit-1.log`는 WaveField의 새 per-scene pause 전달을 과거 문법으로 검사해 1 FAIL. `unit-2.log`는 layout에서 직접 import한 arrival CSS를 기존 globals 모음에서 찾다가 1 FAIL. `unit-3.log`는 미사용 CSS 정리 중 함께 지워진 구역 주석 marker 때문에 1 FAIL. 각각 현재 계약의 정확한 검사/직접 source 읽기/원래 구역 marker 복원으로 해결했고 최종 57 PASS. 실제 CSS 폭 기준은 변경하지 않았다.
2. `media.log`: 24 FAIL / 2 PASS. 기존 `.story-media` 단일 요소 가정·옛 첫 진입/수동 motion setup, 새 테스트의 play 후 바뀐 accessible name 추적 오류가 원인. `media-2.log`: remix 4 PASS, 기존 media 테스트는 Hero replay까지 같은 버튼으로 잡아 22 FAIL. 마지막에는 Hero의 **figcaption 안 재생 control**을 정확히 검사하고, replay는 별도 modal/복귀 계약으로 검사했다. 이름·focus·재생·0 request·대비 assertion은 유지/추가했으며 `.first()`나 force click으로 우회하지 않았다.
3. `visual-final.log`: 22 PASS / 2 FAIL. 새 320px 검사에서 OS reduce → normal 뒤 Canvas가 `static`에 남는 제품 결함을 재현했다. 위 live OS signal 수정 후 해당 runtime/첫 진입 묶음을 다시 검증했다.

기존 test case 삭제·신규 skip·timeout/retries/workers/성능 예산 변경 없음. Owner가 제거한 UI의 검사는 OS-only·페이지 내 replay·정확한 modal focus 계약으로 전환했다. 관련 검사만 실행했고 full suite 결과로 주장하지 않는다. 실제 화면 확인 중 발견한 작은 화면 겹침은 axe PASS와 별도로 수정했다.

### 로컬 검토와 다음 경계

- 로컬 서버 `http://127.0.0.1:4173/` (기존 PID 33148)은 유지한다. Hero CTA 아래 **인트로 다시보기**. 새 시크릿 세션은 첫 Intro부터 확인할 수 있다.
- 직접 확인한 새 이미지: `intro-320-final.png`, `intro-desktop-final.png`, 관련 desktop/mobile story PNG/WebM. 큰 흰 패널 없음, 원래 Canvas는 전체 Intro, v1/v2 그림과 새 선택 영상이 실제 UI에 보인다.
- Owner 육안 승인 전 Full CI/Preview/독립 QA/merge/Production을 시작하지 않는다. #353는 Open/PARTIAL. build/CSS 70KiB·planner 270KiB 예산, 전체 제품 회귀, 실제 Production 검증과 제출 캡처는 아직 후속 Gate다.
- #373/zero-touch/유료 API/provider hold/DB는 손대지 않았다. 사용자 dirty10, 기존 worktree/branch/queue generation/attempt/receipt, 이전 실패 artifact는 보존했다. 미디어 원본 전체 merge나 삭제 없음.
