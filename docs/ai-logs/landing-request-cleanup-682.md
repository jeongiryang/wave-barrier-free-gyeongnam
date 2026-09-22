# PR #682 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/682
- 제목: 서비스 소개 화면을 요청 디자인으로 정리
- 작성자: ginaginaring
- 최종 상태: 열림, 미병합
- AI 도구: Codex

## 목적

사용자가 제공한 화면 예시를 기준으로 랜딩 인트로의 재생 컨트롤을 제거하고, 서비스 소개 CTA와 지역 사진 카드를 단순화하며, 요청한 보조 문구를 랜딩에서 삭제한다. 일정 설계기의 기존 지역 필터 기능은 유지한다.

## 역할 구분

- 사람: 변경 요구사항과 기준 스크린샷 제공, PR 생성 및 미병합 지시
- AI: 최신 main 기반 격리 작업 트리 생성, 구현과 회귀 테스트 수정, 데스크톱·모바일 검증, 브랜치 푸시와 PR 작성, 로컬 미리보기 실행

## 검증

- `npm run typecheck`: 통과
- `npm run lint`: 오류 0, 기존 경고 25
- `npm test`: 1,623개 통과
- 관련 Playwright desktop-chromium: 52개 통과
- 관련 Playwright mobile-chromium: 19개 통과
- `npm run build:vercel`: 통과
- `npm run check:performance`: 통과. CSS gzip 84.65/85 KiB, 랜딩 초기 JS gzip 143.97/155 KiB, 플래너 초기 JS gzip 264.23/270 KiB
- 390px 모바일 카드에서 발견한 사진 하단 여백을 수정한 뒤 모바일 전체 관련 시나리오를 재실행했다.

## 결과와 제한

- PR은 요청대로 병합하지 않고 열린 상태로 유지한다.
- Production 배포 검증은 수행하지 않았다. 병합 전 GitHub Actions 필수 검사가 별도로 통과해야 한다.

## 2026-09-22 독립 검토 후 보완 후보

- 이슈 #681 대조에서 누락된 지역 사진 출처 링크를 복원했다. 기존 사진 원본 URL로 연결하는 작은 링크를 사진 위에 배치하고 44px 조작 영역, 키보드 초점, 새 탭 안내를 유지했다. 별도 하단 패널은 추가하지 않았다.
- CTA의 새 그라데이션을 덮던 night-regression.css의 단색 배경과 mobile-design-b.css의 투명 배경 규칙을 제거했다. 390/960/1440px 실제 computed style에서 파란색–보라색 그라데이션을 확인했다.
- CI run 35676833386 desktop shard 2는 키보드 종료 테스트의 WebGL 시작 대기에서 8초 poll을 넘겨 flaky로 실패했다. trace의 마지막 getAttribute 요청은 430315ms에 시작했지만 435174ms에 재생시간 4121ms를 반환했다. 오류 스크린샷에서도 렌더링된 인트로와 초점이 있는 건너뛰기가 확인됐다.
- 키보드 종료 검사는 실제 인트로 모듈 요청을 대기시켜 로딩 중에도 유일한 건너뛰기 버튼, 44px 영역, Tab/Shift+Tab 초점 유지, Esc 종료와 본문 초점 복귀를 확인한다. 실제 WebGL 자동 재생·완료·재생 반복 검사는 그대로 유지했고 timeout, retry, failOnFlakyTests, workflow는 변경하지 않았다.
- 일반 출처 링크가 없다고 잘못 단정한 기존 회귀 assertion을 요구사항에 맞게 수정했다. 새 키보드 회귀는 320/390/960/1440px, 한국어·영어의 18개 링크 원본 URL과 사진 내 경계를 확인한다.

### 보완 후보에서 실제 실행한 검사

- 격리 Vite http://127.0.0.1:4191. Node: C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe. E2E_EXECUTABLE_PATH=C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe 사용.
- 첫 로컬 실행은 새 Vite 초기 의존성 최적화가 끝나기 전에 시작해 connection refused가 발생했으며 중단했다. 서버 ready 확인 후 아래 실행으로 검증했다.
- playwright test e2e/fullscreen-intro.spec.ts e2e/landing-regions.spec.ts --grep 'omits playback|replaying a completed|original credits' --workers=2: desktop/mobile 20개 통과 (1.5분).
- playwright test e2e/simple-landing.spec.ts e2e/region-culture.spec.ts --workers=2: desktop/mobile 24개 통과 (1.3분). 실제 자동 완료, 건너뛰기, Esc, reduced-motion, CTA computed gradient, 사진 채움, axe, 화면 넘침 포함.
- tests/production-readiness.test.mjs 선택 검사: 'region|Region|지역' 1개, 'landing offers five' 1개 통과.
- 변경 TS/TSX 및 해당 Node 테스트 ESLint: 오류 0, 기존 img 경고 1.
- git diff --check 통과. 390px/1440px hero 스크린샷 육안 확인.
- 독립 QA 최종 브라우저 재검증 및 최신 main 포함 CI는 관리 에이전트와 조정한다. 이 절에서는 전체 CI 또는 Production 검증을 새로 완료했다고 주장하지 않는다. 나루 UI·모델 상호작용은 이 보완 검증에서 실행하지 않았다.

### 독립 QA 반영: 사진 출처와 지역명 겹침

- 독립 QA가 960px에서 출처 링크와 지역명 실제 글자 겹침을 발견했다. 첫 작성자 검사는 사진 안에 링크가 있는지만 확인해 이 문제를 잡지 못했다.
- 출처를 우측 상단으로 옮기고 중간 화면 폭의 이름 아래 여백을 조정했다. 영어 지역명도 포함한 DOM Range 글자 경계로 출처 겹침을 검사했다. 첫 조정에서는 영어 960px가 실패해 출처의 상단 간격을 2px로 보완했고, 4개 폭 16개 검사가 통과했다.
- 601px 경계에서 기존 5열 카드는 97.8 x 73.3px로 작아 지역명이 카드 밖으로 잘렸다. 601–900px만 3열로 조정해 4:3 비율을 유지했다. 601px 확인 결과 카드 175 x 131.25px, 사진 object-fit: cover이며 육안 검토에서도 지역명·출처가 분리됐다.
- 최종 회귀는 320/390/601/960/1440px의 한국어·영어 18개 카드 모두에서 출처와 실제 글자 비중첩, 글자의 카드 내 표시, 44px 조작 영역, 원본 URL, 키보드 초점을 확인한다.
- `tsc --noEmit`는 보완 후보에서 통과했다. 최초 독립 후보는 d2460fb이며 반응형 보완은 후속 커밋에 기록한다.
- 최종 `playwright test e2e/landing-regions.spec.ts --grep "original credits" --workers=2`: desktop/mobile 20개 통과 (2.6분).

### CI quality 실패 후 전체 단위 검사

- CI run 35684990459의 quality job 106609792551은 tests/performance-hardening.test.mjs의 오래된 assertion 한 개에서 실패했다. 기존 PR이 출처 링크 전체 삭제를 기대하던 `doesNotMatch(regionPhotoSource(photo).href)` 조건이 이슈 #681에 맞춰 복원한 링크를 거부했다.
- 해당 조건만 `match`로 바꿨다. hover/읽기 시 새 fetch·타이머를 만들지 않는 조건, 같은 사진 album·목적지·lazy loading 조건은 유지했다. 제품 코드는 변경하지 않았다.
- 선택 검사로 놓친 같은 종류의 stale assertion을 확인하기 위해 이번에는 전체 `npm test`를 실행했다. 1,629개 통과, 실패/취소/skip 0, 15.2초. 기존 단위 테스트 전체를 실행한 결과이며 별도의 나루 UI 또는 실제 모델 요청을 실행한 것은 아니다.
- 전체 실행 로그: C:/Users/user/Documents/wave-audit-20260922/pr682-full-unit.log. `git diff --check` 통과. 필수 PR CI는 후속 커밋으로 다시 실행한다.

### CI 그라데이션 측정·스타일 준비 오류 보완

- CI run 35685329093에서 desktop/mobile 밝은 화면 대비 검사는 1.822로 실패했다. 기존 측정기는 `backgroundImage`를 읽지 않고 투명 `backgroundColor`의 상위 배경만 비교했다. 실제 CTA의 흰 글자와 세 그라데이션 stop의 대비는 5.38678/6.38954/6.69689로 모두 4.5 이상이다. 독립 QA의 390px 스크린샷 배경 336픽셀 측정도 최소 5.46이었다.
- 같은 run desktop shard 7의 reduced-motion 검사는 hydration 직후 `backgroundImage=none`을 한 번 읽고 실패했다. trace에서 night-landing.css의 초기 요청(213127ms) 뒤 client module 요청(214060ms)이 발생했고, 즉시 평가가 214356ms에 끝났다. 실패 직후 스크린샷에는 올바른 그라데이션이 표시됐다. hydration 표식과 route CSS 적용 시점이 다를 수 있으므로 기존 8초 assertion 범위에서 `toHaveCSS`로 필수 그라데이션을 확인한 뒤 색상을 검사한다. 지속적인 누락은 여전히 실패한다.
- 랜딩 대비를 독립 light/dark 케이스로 분리해 opaque sRGB 그라데이션 모든 stop과 흰 글자를 실제 computed style에서 측정한다. 흰 글자 대비에서 sRGB 보간의 휘도는 볼록하므로 가장 밝은 stop이 최악값이다. 밝은 중간 stop(대비 1), 배경 없음, 투명 stop 반례를 추가했다. 지원하지 않는 배경을 건너뛰거나 상위 색으로 대체하지 않는다. 기존 단색 요소의 측정과 4.5 기준은 유지했다.
- 제품 코드, CSS, CI timeout/retry/failOnFlakyTests/workflow는 변경하지 않았다.
- 격리 서버 :4191에서 `playwright test e2e/dark-theme-contrast.spec.ts e2e/simple-landing.spec.ts --grep '그라데이션|reduced motion keeps' --workers=2`: desktop/mobile 12개 통과(40.6초). 새 랜딩 대비·반례와 390/960/1440px reduced-motion 검사를 실행했고 mixed 나루 시나리오는 실행하지 않았다. 앞서 기록한 Node와 E2E_EXECUTABLE_PATH override를 동일하게 사용했다.
- 전체 `npm test`: 1,629개 통과, 실패/skip 0(24.6초). 로그: C:/Users/user/Documents/wave-audit-20260922/pr682-gradient-unit.log. `tsc --noEmit`, 변경 두 spec의 ESLint, `git diff --check` 통과. 후속 PR CI와 독립 한정 검토를 별도로 확인한다.
- 독립 코드 QA에서 RGB 사이의 미지원 color(display-p3) stop을 놓칠 수 있는 parser 경계를 발견했다. RGB 구간을 제거한 뒤 미지원 색상 함수가 남으면 거부하고, 어두운 RGB 사이의 밝은 display-p3 중간 stop 반례를 추가했다. 같은 gradient 6개 desktop/mobile 검사 재실행 통과(6.9초), 변경 spec ESLint 통과. 복잡한 색상 지원으로 확장하지 않았다.

### 이슈 #681 추가 요구: 인트로 전 본문 첫 프레임 노출 방지

- 2026-09-22 갱신된 이슈 본문의 첫 프레임 요구를 다시 대조했다. 기존 검사는 React 시작 뒤 인트로 renderer만 늦춰 초기 HTML 노출을 놓쳤다. 기존 LandingIntro는 SSR에서 닫힌 dialog이며 useEffect에서만 showModal을 호출했다.
- 앱 entry-browser 모듈을 보류한 469c562 제품의 390px 회귀는 예상대로 실패했다. 화면에 인트로 뒤의 제목·사진·CTA가 노출됐고 hydration 표식은 없었다. 증거는 C:/Users/user/Documents/wave-audit-20260922/intro-first-paint-before에 보존했다.
- head의 동기 bootstrap이 처음 방문한 루트 화면에서만 인트로와 같은 불투명 배경을 먼저 표시한다. 본문은 숨기고 실제 dialog showModal 이후 같은 프레임에 덮개를 제거한다. bootstrap 중에도 Tab으로44px 건너뛰기에 접근해 Enter로 종료하거나 Esc로 즉시 본문을 볼 수 있다. 앱 코드가 오지 않으면8초 watchdog이 복구하며 뒤늦은 앱 로딩은 인트로를 다시 덮지 않는다.
- 이미 본 세션, OS 모션 감소, JavaScript 비활성화, 비랜딩 경로와 명시적인 /#regions 본문 방문은 덮개 없이 기존 화면을 보여준다. 재생 요청은 기존대로 동작한다. 외부 CSS/React 적용 전에 필요한 최소 스타일을 head에 함께 넣었다.
- 첫 후보22개 실행은21개 통과, 기존 desktop 키보드 검사1개 실패였다. trace에서 Vite 초기 로딩 중 scrollY133이 복원돼 기존 scrollY>24 예외가 인트로를 건너뛴 사실을 확인했다(8초 watchdog 실패가 아님). pending 동안 본문 스크롤을 막고 fresh-root pending에서만 복원된 오프셋을 시작 거부로 간주하지 않게 좁혔다. 명시적 hash는 bootstrap과 자동 시작에서 모두 제외해 사용자의 본문 탐색 의도를 보존한다.
- 최종 제품·브라우저 후보562594f. `playwright test e2e/landing-initial-paint.spec.ts e2e/fullscreen-intro.spec.ts --grep 'first paint|visitors do not|pre-hydration|failed app startup|intentional navigation|blocked application|without JavaScript|omits playback' --workers=2`: desktop/mobile26개 통과(28.4초). 390/960/1440px 첫 paint·불투명 전환, 복원 오프셋, Tab/Enter44px, Esc, seen/reduced/noJS, login/#regions,8초 시계 복구를 확인했다.
- `playwright test e2e/simple-landing.spec.ts e2e/fullscreen-intro.spec.ts --grep 'approved arrival|the skip action|keyboard users|runtime OS|denied session|unavailable WebGL|initial OS reduction' --workers=2`: desktop/mobile18개 통과(41.8초). 실제 자동 재생 완료·다시 불러오기·계획 이동, Esc, 모션 변경, 저장소 읽기/쓰기 거부, WebGL 실패 복구를 확인했다. 나루 UI·모델 검사는 실행하지 않았다.
- 첫 전체 단위 실행은 새 hash/pending 조건을 거부한 기존 소스 문자열 assertion1개가 실패했다(1,628통과). seen/hash/비pending scroll 예외를 유지하는 조건으로 수정 후 전체 `npm test`1,629개 통과, 실패/skip0(33.6초). 최종 로그 C:/Users/user/Documents/wave-audit-20260922/pr682-initial-paint-unit-final.log.
- 최종 `tsc --noEmit`, 변경 파일 ESLint, `git diff --check`, `npm run build:vercel`, `npm run check:performance` 통과. CSS gzip84.67/85KiB, landing JS144.29/155KiB, planner JS264.41/270KiB. 빌드 로그 C:/Users/user/Documents/wave-audit-20260922/pr682-initial-paint-build.log. :4191 및 앞서 기록한 Node/browser 실행 경로를 사용했다.
- 이 보완은469c562 위에서 작업했으며 최신 main 병합은 관리 담당이 수행한다. 독립 첫 paint QA와 최종 PR CI/배포 결과는 이후 확인한다.
