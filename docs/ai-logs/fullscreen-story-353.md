# #353 전체 화면 첫 진입 / Landing 첫 시각 체크포인트

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
