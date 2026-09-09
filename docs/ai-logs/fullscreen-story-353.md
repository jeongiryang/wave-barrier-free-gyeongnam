# #353 전체 화면 첫 진입 / Landing 첫 시각 체크포인트

> 최신 상태는 아래 **Owner 디자인 전용 패스 3** 절이다. 첫 체크포인트의 환경설정 replay·앱 motion·작은 Hero Canvas 설명은 이후 Owner 결정으로 대체되었다. 과거 검증·실패 기록은 보존한다.

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


## Owner 디자인 전용 패스 3 — 2026-09-09 KST

- 시작 HEAD: `42ca1bcfff87d94fb8309d066d3601d15577ea89`. 같은 `feat/fullscreen-story-353` / `D:/wave-production-validation-20260908`에서 작업. 시작 dirty 없음. 원격 main `a355f38d21d67b50ae5936bdcb49a3a310c96198`, #353 Open 확인.
- **LOCAL VISUAL CHECKPOINT**. 새 PR/push/Full CI/build/Preview/배포/독립 QA를 수행하지 않았다. 기존 서버 `http://127.0.0.1:4173/`, PID33148 유지. Production 성공 증거가 아니다. #353 완료/close 아님.
- 범위는 소개 UI, 이미지 구성, 스크롤 연출, 지역 쇼케이스와 Intro. Planner/계정/저장·공유/provider/DB/CI architecture/자동화 변경 없음. 기존 사용자 dirty10, 다른 worktree/queue294/과거 로그 보존.

### 바뀐 화면

1. Intro에는 건너뛰기 하나만 남겼다. 이전 패스의 pause/직접 planner 링크 계약은 이번 Owner 결정으로 대체. 무음, Escape, 한 버튼 Tab 순환, 종료 후 Hero/재생 trigger 포커스, 세션 정책, OS/Save-Data 정적 대안 유지.
2. 파도 → 무장애 → 워드마크 단계는 약 3.35초에 완성되고 5.2초 이내 종료한다. 종료는 620ms 위로 걷히는 화면과 Hero의 1초 zoom/밝기 연속 전환. 두 개의 어긋난 워드마크가 겹치지 않도록 마지막 글자는 선명한 HTML로 렌더한다. 일반 모션을 약하게 만드는 설정은 추가하지 않았다.
3. 기존 RAF 스크롤 처리에서 장면별 진행률을 공유한다. 편의 장면은 오른쪽 crop, 상상 여행은 왼쪽 큰 세로 프레임, 실제 일정 화면은 아래에서 올라오는 깊이, 출발 전 장면은 상하 curtain, closing은 항구 horizon 확대다. 조작 요소는 crop하지 않는다. OS 동작 감소에서는 이미지 전체가 정적으로 남는다.
4. 지역은 대형 실제 관광사진/지역명/짧은 설명/동일 지역 CTA가 함께 바뀌는 4초 쇼케이스다. 18개 수동 선택은 자동 넘김을 멈추며, 키보드 focus/hover/offscreen/탭 숨김/OS 감소/데이터 절약에서도 멈춘다. 여행 저장값을 수정하지 않는다. 지도는 펼쳐 보는 보조 정보로 옮겼고 18개 경계/목록/선택/hit-test 대안을 유지한다.
5. 지역 자동 넘김에서 live API를 반복하지 않는다. 2026-09-09 기존 공개 Production photo 경로를 지역별 한 번씩 읽어 확인한 **18개 편집용 사진 URL/출처/촬영자**를 `region-showcase-photos.ts`에 보존한다. 원본은 KTO 호스트에서 제공하며 영구 사진 blob/키/새 provider는 추가하지 않았다. 표시는 `2026.09 선정 관광사진`으로, 실시간 운영/편의 확인을 주장하지 않는다. 사진 로딩 실패는 해당 지역의 정적 이야기와 실제 선택 링크로 남는다.
6. 실제 남해 다랭이마을 사진을 출발 전 확인의 큰 장면에 사용한다. 출처/촬영자/선정월 유지. 실시간 날씨 또는 시설 확인 완료 화면으로 표시하지 않는다.

### 발견 및 수정

- 마지막 CTA에서 `data-land-reveal`을 빼자 기존 `.landing-cta:not(.is-visible)` 규칙으로 모든 내용과 배경이 숨었다. 실제 실패 스크린샷 확인 후 observer 연결을 복원. 관련 전체 소개 시각 회귀가 통과했다.
- 지역 버튼이 hydration 전에 클릭 가능한 문제를 방지하기 위해 기존 preferences의 `hydrated` 신호로 readiness를 공유한다. 별도 setState effect는 제거했다. 사용자의 첫 선택/키보드 focus를 보존한다.
- 새 전환 테스트의 두 문제는 fixture/setup이었다: 마우스 `(0,0)`이 지역 영역 안에 있어 의도된 pause를 유지했고, 실시간으로 도는 clock에 상대 3990ms를 더해 4초 경계를 넘었다. 실제 header hover로 영역을 벗어나고, 고정 시계에서 hover pause/resume으로 시작점을 만든 후 3999ms 유지/4000ms 전환을 엄격하게 검증한다.
- Intro skip의 장식 화살표는 aria-hidden이므로 접근 가능한 이름에 포함하지 않는다. 이전 media-control/planner assertions는 Owner의 single-exit 계약(버튼1/링크0/Tab/OS runtime/실제 Hero CTA)으로 교체했다. 모달·접근성·영상 실패·세션 거부·재생·키보드 검사는 삭제하지 않았다.

### 검증과 증거

외부 증거 루트: `D:/wave-db-binding-preflight-20260908/fullscreen-story-353-design-pass3-20260909/`.

- `npm run typecheck`: PASS (`typecheck-3.log`).
- 변경 TS/TSX/mjs 대상 eslint: 최초 0 errors/5 img warnings, readiness effect 추가 뒤 1 error 발생(`lint-final.log`), 기존 hydrated 신호를 재사용한 뒤 해당 파일 0 errors/1 img warning (`lint-region-final.log`). 경고를 숨기는 disable 추가 없음.
- `node --test tests/landing-boundaries.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs tests/auth-community.test.mjs`: 57 PASS /0 fail/0 skip (`unit-2.log`). 이전 1FAIL은 과거 1.96초/9초/Intro planner 링크에 대한 정적 계약이었으며 새 Owner 계약을 반영했다. 실패 로그 보존.
- Intro/전체 소개 시각/경계/지도 대안/legacy 첫 진입/focus/hover/모바일 터치 관련 선택 실행: **52 PASS, 1.2m, 0 failure/flaky/skip**, `contracts.log`, `contracts-report/`, `contracts-results/`. 명령은 아래에 보존.
- 새 cinematic 검증 최종 결과는 이 문서 아래 최신 체크포인트 결과를 참조한다. 4초 자동 전환·수동 선택·사진/지역/CTA 일치·기기 저장 무변경·API0호출·감소/화면 밖 정지·320px 실패 대안·방향별 crop를 검증한다. 사진 timing fixture는 KTO URL에 로컬 이미지를 응답하며, Production 실제 사진 성공으로 계산하지 않는다.
- 최초 디자인 묶음 `design-1.log`: 24 PASS/10 FAIL (2.6m), `design-2.log`: 32 PASS/2 FAIL (1.1m), `rotation-3.log`:2 FAIL. 최신 수정 이후 `rotation-4.log`:2 PASS (2.1s). 최초 실패/trace/video를 소급 덮어쓰지 않았다.
- 실제 agent-browser: 기존 서버에서 KO desktop1366×900 /mobile390×844 Intro/Hero/지역사진/정원/출발전/closing 확인. `errors` 출력 없음. 관련 Playwright는320px/KO·EN/map light·dark/axe/overflow/포커스를 확인한다. 실기기/사람 낭독기/200% zoom을 이 패스에서 완료했다고 주장하지 않는다.
- 수동 실제 사진 screenshot: `region-wip.png`, `region-stage.png`, `region-mobile.png`, `departure-desktop.png`. Intro `intro-mobile-final.png`; 나머지 `hero-wip.png`, `possibility-desktop.png`, `closing-desktop.png`, `closing-mobile.png`.
- 새 skip/timeout/retry/workers/성능 예산 완화 없음. 전체 Full CI/전체 unit/전체 E2E/production build/최종 bundle budget는 아직 실행하지 않음.

```powershell
$env:E2E_BASE_URL='http://127.0.0.1:4173'
$env:CI='true'
node scripts/run-playwright.mjs e2e/fullscreen-intro.spec.ts e2e/fullscreen-story-visual.spec.ts e2e/landing-boundaries.spec.ts e2e/landing-regions.spec.ts e2e/landing-first-arrival.spec.ts e2e/preferences-help-language.spec.ts e2e/launch-integrity.spec.ts e2e/mobile-touch-targets.spec.ts e2e/performance-boundaries.spec.ts --grep 'full-screen|full-screen arrival|completed session|static intro|failed media|media end|runtime reduction|denied session|legacy app motion|320px short|region boundaries|English regions|boundary code|failed boundary|actual polygon|실제 경계|normal arrival|English preferences|intro replays|English intro|모바일 경남|짧게 스친'
node scripts/run-playwright.mjs e2e/landing-cinematic.spec.ts
```

### 남은 디자인 GAP / 재개

- Owner가 설명한 한화오션식 확장감/비대칭/장면 리듬을 적용했다. 이번 실행에서 네 첨부 영상의 실제 파일은 제공되지 않았고 한화오션 공식 페이지는 웹 접근을 차단했다. 원본 영상을 프레임별 대조했다고 주장하지 않는다. 레퍼런스 코드/자산 복제 없음.
- 지역별 대표 사진의 시각적 선별 여지는 남는다(예: 통영은 케이블카 사진). 사진 URL은 외부 호스트 의존이며 최종 후보의 이미지 성능/전송량 점검이 필요하다.
- 실제 일정/지도 소개는 기존 클릭 가능한 촬영 기록 보드다. 이를 완전히 별개의 full-screen scroll scene으로 재구현했다고 주장하지 않는다. 추가 디자인 필요 여부는 이 체크포인트의 Owner 육안 판단 후 결정한다.
- 최종 CSS/landing budget, full CI, exact Preview, independent QA, merge/CD/Production 검증은 후보 확정 뒤 수행. #353는 그 전에는 완료가 아니다.

### 최종 경량 체크포인트 결과

- `e2e/landing-cinematic.spec.ts`: **10 PASS /0 fail/flaky/skip, 9.9s**, `cinema-final.log`, `cinema-final-report/`, `cinema-final-results/`. 앞선 선택회귀52PASS와 별도 실행. 준비 상태는 기존 `hydrated` 신호를 공유하며 새 setState effect가 없다.

- 최종 `typecheck-final.log` exit0, 변경 파일 전체 `lint-checkpoint.log` exit0 (0 errors/5 img warnings). `git diff --check` PASS.
