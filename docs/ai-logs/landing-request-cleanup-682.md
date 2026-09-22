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
