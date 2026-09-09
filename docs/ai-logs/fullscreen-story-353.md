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


## #385 Design Reference Bible + #353 적용 — pass 4

기준 시각: 2026-09-09 18:52:39 KST. 시작 HEAD `2f09bd419be28c83dcc2c39751d43b5d81cb1d53`, 같은 `feat/fullscreen-story-353` / `D:/wave-production-validation-20260908`. LOCAL VISUAL CHECKPOINT이며 main/Production 반영 아님. #353/#385 Open, Owner 시각 평가 전.

### 적용 결과

- `docs/design/design-reference-bible.md`: canonical brief/SCROLL-ONLY COMPREHENSION/12 patterns/11 sections/GAP/assets/5개 OSS/license·maintenance·SSR·a11y·성능/disposition/설계 contract. `docs/design-system.md` 연결.
- Kakao/SiteInspire/Codrops/Palm Studio/React Bits/Motion Primitives/Magic UI/shadcn/ui/Lenis 공식 자료 조사. Hanwha Ocean 차단, Land-book403은 미확인으로 표시. React Bits MIT+Commons Clause. 새 dependency/라이브러리 코드 복사 없음.
- Hero→Region→편의→추천→일정→지도→출발 전→Community→Closing. 실제 날짜·ID·워터마크를 유지하며 숨은 tab/date controls를 보이는 chapter로 전환. Planner/저장/계정/API 로직 변경 없음.
- 지역 사진/지역명/CTA가 함께 약4초 전환. 이전/다음 arrow만, hover/focus/manual/offscreen/hidden/reduced/SaveData 정지 유지. 지도 disclosure·18 버튼 제거, 기존 경계 source/데이터 보존.
- 실제 우포늪 frame의 viewport 양끝 확장, portrait/right→추천/left→날짜rise→mapoffset→departurevertical→closinghorizon. 빈 sticky spacer 없음.
- Intro curtain 아래 Hero scale/headline/body/CTA stagger. Skip/session/OS/SaveData/media failure/focus 유지. Hero와 소개 장식 재생·설명 버튼/검수 caption 제거. 필수 사진/recording/brand provenance는 footer 보조 출처에 유지.
- CommunityEditor 실제 field 구조를 큰 읽기 전용 DOM으로 표현. 예시임을 표시하며 후기/사용자/좋아요 수 조작 없음.
- nav down hide/up reveal, focus/open preferences/help 유지. gear/help named icon 48px. native summary/Enter/Escape 계약 유지.

### 실패와 수정 — 최초 증거 보존

- 일시 `activeRegion` destructuring 누락으로 SSR client fallback. prop 복원 후 typecheck/새 browser context pageerror0. 기존 agent-browser errors --clear가 누적 오류를 계속 반환해 역사 JSON을 보존하고 새 context `browser-errors-final-newsession.json`으로 분리. fresh HTTP200, HTML에 해당 오류 없음.
- Community copy가 오래된 `:not(.is-visible)` CSS 때문에 숨음. `community-1.png` 실패 보존, visible chapter specificity 수정 후 `community-2.png`와 story/axe PASS.
- `unit-1.log`:52 PASS/5 FAIL(기존 shape/community 문법). arrow/visible chapter 계약으로 갱신, 지역 geometry/no-fake/no-API/권한 검사 보존. `unit-2.log`:57 PASS.
- `design-1.log`:30 PASS/4 FAIL(1.4m), community2건 및 pointer가 region 안에 남는 fixture2건. heading을 viewport80px에 두고 실제 enter/leave로 3999ms/4000ms 경계 검증. `design-2.log`:cinematic+story12 PASS/0 flaky/skip(16.7s). Intro22는 첫 실행에서 PASS.
- `navigation-1.log`:6 FAIL. 새 검사에서 native summary를 button으로 가정, observer is-visible를 section identity로 비교. 이름/summary tag/Enter/Escape 검사, marker 하나만 제외한 모든 section class/order 검사로 수정.
- `navigation-2.log`:5 FAIL/1 flaky. CTA 화살표 앞 공백 fixture 누락, transform 중44px가43.999998px로 계산. 실제 text를 정확히 검사하고 control48px로 확대. 마지막 retry가 수정 시점과 겹쳤으므로 성공 근거로 사용하지 않음. `navigation-3.log`:6 PASS/0 fail/flaky/skip(6.5s).
- 새 skip/test삭제/timeout/retry/worker/budget 완화 없음. Owner가 제거한 UI 검사를 새로운 상시 표시/OS/focus/정확한 날짜·ID 계약으로 이관했다. unit/소형회귀를 Full suite 결과로 주장하지 않는다.

### 검증과 증거

루트: `D:/wave-db-binding-preflight-20260908/fullscreen-story-353-bible-pass4-20260909/`.

- `npm run typecheck`:exit0 (`typecheck-final.log`).
- `npm exec --offline -- eslint <changed TS/TSX/mjs>`:exit0,0errors/7 img warnings (`lint-final.log`), suppress 없음. 최초 PowerShell 파일목록 괄호 오류는 실행 전 실패였으며 수정 후 실제 eslint 실행.
- `node --test tests/landing-boundaries.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs tests/auth-community.test.mjs`:57PASS/0fail/skip,224.525ms (`unit-2.log`).
- CI=true/E2E_BASE_URL=4173, 기존 config 그대로. `npm exec --offline -- playwright test e2e/fullscreen-intro.spec.ts e2e/fullscreen-story-visual.spec.ts e2e/landing-cinematic.spec.ts`; 수정 후 cinematic+story만 재검사. 별도 `e2e/landing-scroll-contract.spec.ts`6case. 최신 개별 결과 총40case PASS, 전체 Playwright 아님.
- 사진 timing fixture는 로컬 bitmap이고 Production provider 성공이 아님. 실제 agent-browser 사진/frame-start/mid/full/reverse, needs/recommendation/itinerary/community/region/hero 캡처와 구분한다.
- 1366px expanded clip inset0%, overflow0. 320/390px namedcontrols/44px/section order/visibletext/axe/overflow 검사. `hero-320.png`, `mobile-regions.png`, `mobile-recommendation.png`, `mobile-community.png`, `hero-desktop-final.png` 직접 확인. 실기기/사람 screen reader/200%zoom 완료 주장 없음.

### 남은 GAP / 재개

- 기존 서버 `http://127.0.0.1:4173/` PID33148 유지. 새 시크릿 세션 또는 Hero 아래 인트로 다시보기로 Owner visual 평가.
- 모바일 itinerary/map 실제3상태의 긴 세로 리듬, 지역 사진별 구도, 전체 Intro→Hero/cinematic 만족도는 Owner 평가 필요.
- 옛 tab/date buttons, map disclosure, scenery/film controls를 가정하는 `landing-first-arrival`, `service-story`, `story-media-remix`, `landing-boundaries`, `landing-regions` 및 연결 touch/performance E2E는 최종candidate 계약 이관이 남음. 기존 날짜·ID·image dimension·실패·OS·locale·no-fetch 검사를 새 visible scene으로 보존할 것. 현재 Full suite green 아님.
- 최종 CSS≤70KiB/plannerJS≤270KiB/landing budget, Full CI/Preview/independent QA/merge/mainCD/Production은 미실행. Owner 시각 체크포인트 후.
- #373/자동화/provider/DB/계정/Planner/저장·공유 untouched. 사용자 dirty10/다른 worktree/queue/실패 artifact/source branches 보존. #353/#385 완료/close 안 함.


## Owner 후속 pass 5 — 7개 장면·카피 순환·읽기 전용 시연 (2026-09-09 19:51:49 KST)

### 범위와 상태

- Owner [#353 상세](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5600307264), [#385 변경](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/385#issuecomment-5600315615) 전체를 읽고 기존 branch/worktree에서 이어갔다. 기준 local parent `c4f42990bf567a887683039f9cb703f336f28929`. 이 항목을 포함한 commit이 다음 LOCAL 체크포인트이며 아직 push/Preview/Production 대상이 아니다.
- `D:/wave-production-validation-20260908`, `feat/fullscreen-story-353`, 기존 dev server `http://127.0.0.1:4173/` PID33148 유지. 다른 worktree·사용자 dirty10·queue294·source branch·기존 실패 artifact 보존. 새 병렬 작업·dependency·계정/API/provider/저장/공유 기능 변경 없음.
- Reference Bible은 최신 변경 기준만 갱신했다. Intro/큰 바다/실제 full-bleed/KO-first는 보존했다.

### 실제 변경

| Owner 항목 | 이번 변경 / 현재 경계 |
| --- | --- |
| Hero | A를 첫 문구로 B/C 3개 카피, 6.5초 간격, 줄 단위 700ms 전환. grid 공유 높이, CTA 문구/href/좌표 유지. 고정 SR 제목·반복 announce 없음. 지속 정지, 화면 밖/hidden 중지, OS/Save-Data A 정적, Intro 다시 보기 후 A부터 시작 |
| Region | Hero 바로 뒤 유지. 큰 제목/kicker 삭제, 기존 1rem/400 본문 2줄만 남김. 빈 wrapper 높이/여백 축소. 사진·저작자·밑줄 원본 URL 동기화, 실패 시에도 출처 유지 |
| 독립 panorama | “여행의 가능성을 넓히다 / 걱정은 덜고…” LandingExpansionScene import/render 제거. DOM/scroll spacer/observer/media 요청 없음. 원본 자산/컴포넌트는 보존만 함 |
| 진행 표시 | `features/landing/sections.ts`가 실제 7개 렌더 및 탐색 목록의 단일 기준. desktop compact/current/index/line/total, hover/focus 목록, Escape/anchor, Intro hidden. 모바일 44px native current/total 선택. URL hash 이동 시 기존 history.state 보존 |
| 편의 | 실제 profiles 카탈로그/아이콘을 읽기 전용 DOM으로 재사용. 접근로/승강기 → 시각 정보 지원 → 선택 2개 요약. 4.2초 1회, 정지/끝난 뒤 다시 보기; 실제 여행 상태나 저장소/API 변경 없음 |
| Community | 실제 지원 카테고리·지역·제목·내용으로 질문 작성 과정을 4.2초 1회 시연. “작성 예시”, 미게시 글 형태 표시. 실제 후기/사용자/좋아요/날짜/이용실적을 만들지 않음. no form/write/auth request. OS/Save-Data 최종 정적 예시 |
| 날짜·일정·지도 소개 | 현재 렌더/anchor/진행 목록에서 제외. [#386](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/386) DEFERRED. LandingJourneyScene·timeline/map captures·manifest 보존. 실제 Planner/날짜/지도 코드와 기능 회귀 검사 미수정 |
| 거리·시간 | [#387](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/387) 후속 FUNCTION, 이번 미착수. #277/#365/#372 경계 유지 |
| 통합 출처 | 기존 `/policies#content-credits`에 사진 원본·저작자·제공기관·이용조건 미확인·워터마크·브랜드/촬영/작성 예시 경계 이관. Footer 운영정책 링크 유지. 개인정보처리방침/약관 미변경 |

### 사진 원문 확인의 한계

- [사진별 원장](../design/region-photo-source-register.md)에 18개를 기록. 현재 링크는 **확인 가능한 정확한 원본 이미지**이며 게시 상세 페이지라고 부르지 않는다. 상세 페이지/개별 이용조건 18개 모두 미확인으로 남겼다. 출처를 만들어내거나 기관 홈에 연결하지 않음.
- 공식 검색에서 같은 제목/저작자의 진해군항제 상세를 찾았지만 이미지 ID가 `2638093`으로 현재 `2638113`과 달라 채택하지 않았다. 이 다른 상세 페이지의 이용유형을 현재 사진의 허가로 전용하지 않았다.
- 출처 링크 일치 검사와 실제 개별 라이선스 확인은 다르다. 출시 전 콘텐츠 확인 GAP이며 이번에 완료로 판정하지 않는다.

### 경량 검증 · 실패 기록 포함

증거 루트: `D:/wave-db-binding-preflight-20260908/fullscreen-story-353-owner-pass5-20260909/`.

- Changed TS/TSX/mjs eslint: `lint-checkpoint.log` exit0, **0 error / 3 기존 img warning**, suppress 없음. `npm run typecheck`: `typecheck-checkpoint.log` exit0.
- `node --test tests/landing-boundaries.test.mjs tests/production-readiness.test.mjs tests/repository-policy.test.mjs tests/auth-community.test.mjs`: `unit-final.log` **57 PASS / 0 FAIL / 0 SKIP**. 이전 `unit-1.log`54/3, `unit-2.log`56/1은 보존. 옛 정적 Community class/버튼 없음/영문 개발 label의 source-regex 계약을 새 읽기 전용 시연과 보존된 6개 원본 검사로 분리했다. 실제 권한·저장·날짜·경로 테스트 삭제 없음.
- Playwright 공통 실행: `CI=true`, `E2E_BASE_URL=http://127.0.0.1:4173`, 기존 config timeout45000/expect8000/retry1/worker2/failOnFlaky 유지, output/report 각 별도 디렉터리.
- `playwright test e2e/landing-owner-pass5.spec.ts`: 최초 `owner-1.log` **8 PASS / 2 FAIL / 2 FLAKY**. storage baseline을 hydration 전에 읽어 기본 theme/locale 저장과 혼동했고, streamed server copy와 live DOM이 잠시 공존할 때 locator가 중복됐다. 기존 `.motion-ready`/단일 root/font/default preference readiness를 기다린 후 상태를 읽도록 고쳤다. assertion 완화가 아니라 초기화 계약 보강. `owner-2.log`12PASS. 추가 offscreen/visibility/Intro replay/history-preservation 포함 최종 `owner-final.log` **14 PASS / 0 FAIL/FLAKY/SKIP**.
- `playwright test e2e/landing-owner-pass5.spec.ts e2e/landing-cinematic.spec.ts e2e/landing-scroll-contract.spec.ts`: `related.log`28PASS. 이중 cinematic10 + nav/static6의 최신 결과를 보존하며, 변경 없는 부분을 반복 실행하지 않았다.
- `playwright test e2e/landing-owner-pass5.spec.ts e2e/fullscreen-story-visual.spec.ts e2e/fullscreen-intro.spec.ts`: `checkpoint.log` **36 PASS / 2 FAIL**. Intro22/Owner14는 PASS, 새 실제 녹화 검사2개가 CSS 최종 transform을 matrix identity라고 잘못 가정했다. 실제 선언/브라우저 값 `none`을 정확히 검사하도록 수정했고 기능 변경 없이 visual 파일2개만 다시 실행했다.
- `playwright test e2e/fullscreen-story-visual.spec.ts`: `visual-2.log` **2 PASS / 0 FAIL/FLAKY/SKIP**,31.4초. 1366/390px 실제 elapsed Hero 3문구·편의/작성 시연·Intro·전체 story 녹화, pageerror0/axe0/overflow0. fixture API와 실제 KTO-hosted 사진 화면 확인을 구분한다.
- 최신 **고유 관련 case 합계54 PASS** = Owner14 + Intro22 + cinematic10 + nav/static6 + visual2. 이는 개별 실행 합산이며 전체 Playwright/CI 결과가 아니다. 최초 실패·flaky/trace/video를 보존했고 재실행 성공으로 소급 변경하지 않았다.
- OS/Save-Data 정적 상태, 320/390 overflow/axe, keyboard/Escape/focus, CTA 고정, 7개 총수, 18개 사진 원본·저작자 링크, 시연 POST0/저장 전후 동일/제외 미디어 요청0 확인. hidden-tab 검사는 visibility 이벤트를 제어한 계약 시험이며 실제 OS 작업 전환 시험으로 부르지 않는다.
- `git diff --check` PASS. 새 skip/timeout/retry/worker/성능 예산 완화 없음. 삭제된 소개 섹션만 Owner의 새 계약으로 이관했고 Planner 기능 검사는 건드리지 않았다.

### 직접 확인 가능한 화면과 녹화

- 1366px compact/expanded rail, Hero A/B/C, facilities final, Community entered text/result, region original photo, Closing, 320/390px 실제 화면 확인. 개별 `region-320.png`, `community-320-final.png`, `community-final.png`; 영상의21초/26초 프레임도 확인했다.
- `visual-results-2/fullscreen-story-visual-th-8be84-mplete-Korean-service-story-desktop-chromium/video.webm`: 전체31.12초. mobile 파일은 같은 디렉터리 접미사 `mobile-chromium`.
- `hero-copy-15s.mp4`: 위 실제 녹화5–20초 무음 추출. `product-demos-12s.mp4`:18–30초 추출. 합성 재생/프레임 속도 변경 없음. 마지막 제어 문구 줄바꿈 방지 및 history.state 보존은 녹화 후 경량14case에서 추가 확인했다.
- 압축된 full-page PNG만 보고 판정하지 않고 실제 크기의 각 section 캡처도 열어 봤다. 실물기기·사람 화면낭독기·200% 확대 전체 검증은 이번에 수행하지 않았다.

### 재개 경계

Owner가 이 로컬 시각 체크포인트를 직접 확인한다. #353/#385 Open 유지, 완료/출시/독립 QA PASS 아님. 다음 수정은 이 candidate에 대한 디자인 피드백과 사진 상세 출처 확인이며, #386 재도입/#387 기능/계정/provider/자동화로 범위를 넓히지 않는다.
옛 landing-first-arrival/service-story/story-media-remix/landing-boundaries/landing-regions의 과거 표현 계약은 최종 candidate에서 계속 이관해야 한다. Full suite green 주장 금지.
성능 예산·Full CI·Preview·독립 QA·merge·Production은 시각 candidate 승인 이후의 별도 Gate로 남긴다. 기존 서버는 종료하지 않는다.


## Owner pass 6 — 지역 사진과 동적인 제품 장면 (2026-09-09 20:11:31 KST)

LOCAL VISUAL CHECKPOINT. 시작 HEAD `d92c4bfc66343a7a538394155adfa8f1288e55a2`, `feat/fullscreen-story-353`, `D:/wave-production-validation-20260908`, 기존 4173 서버 유지. 시작 상태 clean, 사용자 다른 worktree/dirty/queue/artifact 변경 없음. 새 PR/push/Full CI/Preview/Production/DB 변경 없음.

### 실제 변경

- 지역별 서로 다른 관광사진 최소 2장: 총 37장. 창원은 진해군항제·주남저수지·대산플라워랜드 3장. 주 사진과 보조 사진을 동시에 보여주는 비대칭 구성, 각 사진의 출처 링크 유지. 기존 18장 원본/저작자 보존, 추가 19장의 개인 저작자는 API 미제공이므로 만들어 쓰지 않음. 공통 album이 정책 출처 목록도 구성. n/18 장식 제거.
- Hero 문구 정지, 편의/커뮤니티 정지·시연 다시보기 버튼 제거. Intro 재진입 자체는 기존 계약을 유지한다. 사용자 화면의 작성 예시/미게시 검수 캡션은 제거하고, 보조기술 설명/운영정책에는 합성 작성 화면이라는 경계를 남겼다. 가상 사용자/평점/게시일/실제 후기 주장은 추가하지 않았다.
- 우측 7개 섹션 이름/번호를 항상 노출하는 가는 진행선. hover 확장 박스/테두리 제거, native anchor/focus/history 보존. 모바일은 44px 현재/전체 selector.
- 추천: 대산플라워랜드 실제 사진의 viewport panorama + 같은 장소 편의근거 + 원래 워터마크 포함 제품 캡처의 상승/회전 진입. 새로운 독립 장면을 추가하지 않음.
- 편의: 탭 위치를 보여주는 링, 선택 아이콘의 등장, 선택 카드의 상승·색 변화·요약 강조. 실제 시설 catalog를 쓰며 사용자 설정은 건드리지 않음. 모바일에서 각 옵션을 짧고 읽기 쉬운 icon/title 구성으로 정리.
- 커뮤니티: Deep Ocean 배경, 밝은 편집 화면, 입력된 질문 카드의 겹침/등장. 4.2초의 읽기 전용 단계가 새 화면 진입마다 재생. 화면 밖/비활성 탭 중지, OS 감소/SaveData 정적 최종 상태. 서버 쓰기 없음.

### 실제 검증 및 수정 이력

- changed-file ESLint: 0 errors, 2 native img warnings. typecheck PASS.
- 관련 unit/contract 처음 56 PASS / 1 FAIL: 삭제된 정지 버튼의 aria-pressed를 요구하는 과거 UI 계약. Owner의 버튼 제거 계약과 정적 대체/읽기 전용 보존 검사로 갱신. 사진별 실제 지역/중복 방지 계약 추가 후 **58 PASS / 0 FAIL / 0 skip**.
- owner 브라우저 첫 실행 **10 PASS / 4 FAIL**: 편의 요약의 색 대비 4.47:1. CSS 전경색 수정. assertion/기준 그대로 유지.
- cinematic + owner + visual 실행 **24 PASS / 2 FAIL**: 이 패스에서 추가했던 Hero focus hold가 Intro 종료의 h1 focus를 정지 요청으로 오인. 해당 부가 hold 경로를 제거해 canonical 자동 흐름 회복. 실패 원본 보존.
- 영향받은 owner + 실제 녹화 visual + 새 dark 검사 **18 PASS / 0 FAIL / 0 flaky / 0 skip (43.6s)**. 이전 변경 없는 cinematic 10 PASS를 합쳐 서로 다른 관련 브라우저 검사 **28개 PASS 근거**. 같은 SHA Full CI 성공을 주장하지 않는다.
- 320/390/1366 실제 screenshot 육안 확인. KO, OS reduced, SaveData, dark, intro → Hero 문구 3종, CTA geometry/focus, 18개 album/source, native rail, image failure, DOM 시연 중 mutation request 0 및 localStorage 무변경. 실제 기능/API 성공 증거는 아님. 테스트 fixture 관광사진과 실제 CDN 시각 확인을 구분.
- 37장 CDN HEAD 확인은 endpoint가 HEAD에 405를 반환해 검증 방법으로 사용 불가. `photo-head-check.json`의 unavailable을 사진 GET 실패로 오인하지 말 것. 공개 관광 API 실제 응답과 로컬 브라우저 실제 GET/사진 화면은 별도 보존. 개별 권리/원문 상세 검증은 최종 release 전 남음.
- timeout/retry/worker/성능 기준 변경, 신규 skip, 기능 테스트 삭제 없음. 테스트 수정은 Owner가 제거한 controls와 다중 사진의 새 UI 계약에 한정.

증거: `D:/wave-db-binding-preflight-20260908/fullscreen-story-353-owner-pass6-20260909/`. `unit-initial.log`, `unit-final.log`, `browser-initial*`, `browser-final*`, `browser-checkpoint*` 전부 보존. 마지막 폴더에 desktop/mobile 실제 시간 흐름 video.webm 및 장면 캡처가 있다. 완료된 expect.poll의 중간 failed-step resource 이벤트를 테스트 최종 FAIL로 오인하지 말 것.

다음: Owner가 http://127.0.0.1:4173/ 에서 로컬 시각 체크. #353 전체 완료/Production 반영/권리 최종 확인은 아직 아니다. 디자인 확인 뒤에만 candidate 성능/Full CI/Preview/QA/병합 단계를 판단한다. #386/#387, 기능/API/계정/저장/공유/자동화는 이 패스에서 변경하지 않음.


### Pass 6 follow-up — finite Hero and bounded photo warming

Owner 추가 지시 2026-09-09: visible pause UI 없이 무한 반복 제거. Hero는 A → B → C → A(각 6.5초)로 끝나고 스크롤 재진입에도 다시 시작하지 않는다. 명시적인 Intro 다시보기만 초기화한다. OS reduced/SaveData는 A 정적 표시. 공통 hook의 편의/커뮤니티 4.2초 시퀀스는 유지한다.

지역 사진은 기존에도 active album만 lazy DOM에 있었다. 추가 보정: 쇼케이스가 보이고 탭이 활성일 때만 **다음 인접 지역 하나의 album**을 low-priority로 미리 읽는다. 완료된 URL은 재요청하지 않으며 인접 대상 변경/화면 이탈 시 미완료 preload를 중단한다. SaveData는 인접 preload 0건. 18개 지역 전체 preload 없음. 37장 source/author/original URL registry 수정 없음.

검증: typecheck PASS, changed-file ESLint 0 errors / 기존 native img warning 1. 관련 desktop/mobile browser **10 PASS, 0 FAIL, 0 flaky, 0 skip (8.1s)**. 1회 종료 후 60초 경과·스크롤 복귀에도 대표 문구 정착, CTA/focus 유지, 숨은 탭/OS/Intro replay, 공유 demo 무쓰기, adjacent-only 네트워크 요청과 SaveData preload 차단을 검증했다. 증거: 기존 pass6 artifact 아래 `finite-hero/browser.log`와 `finite-hero/results`. Full CI/Preview/배포 안 함. 로컬 4173 서버 유지.
