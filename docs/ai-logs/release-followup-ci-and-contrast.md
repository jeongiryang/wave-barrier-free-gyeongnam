# main CI 및 실제 Preview 회귀 후속 통합

- 기준 main: `4d65a5c0be00b093051b4a8b07aecd2e5eec0a13`
- 관련: #357, #358, #359, #285; 원본 PR #361 및 #362
- 실행: Owner 위임 Codex Engineering, 단일 #288 작업 원장
- 상태: 구현 및 로컬 검증 완료; 원격 최종 CI/QA/Preview 대기, 미병합·운영 미반영

## 통합 이유와 보존

#334와 #356 병합 후 main CI838의 실제 `/planner` HTTP500 및 다른 페이지의
Vite overlay 실패를 #362에서 수정했다. #361은 앞선 CI실패로 **실행하지 않은**
CD/Post-Deploy QA `skipped`를 실패 Issue로 잘못 등록하던 별도 결함을 수정했다.
두 PR은 파일이 겹치지 않으며 원본 PR/브랜치/커밋/CI와 artifact를 보존한다.

최신 #362 Preview에서 활성 추천 이전/다음 버튼이 dark theme에서 흰 배경에
밝은 화살표를 표시하는 추가 #285 접근성 결함을 실제로 확인했다. 이 작은
후속 통합은 동일 최신 HEAD에서 세 수정의 조합을 검증하고 연속 base 변경마다
이전 증거를 잘못 재사용하는 일을 피하기 위한 것이다. 별도 sandbox 연구나
P2 장식·기능 확장이 아니다. 원본 PR은 Production 증거 전 종료하지 않는다.

- #361 원본 `6b5ccf765dc426595522bd471d89839ad8e14c6e` → 보존된 cherry-pick `d6806cf`.
- #362 원본 `7202b844ddbafb0a5a39461cfdb0943c9d83af3a` → 보존된 cherry-pick `fd2ac03`.
- 원본 변경 파일별 diff를 비교해 누락/수정/중복이 없는지 최종 확인한다.

## Preview 실제 결함과 수정

Preview deployment `dpl_GX6G7xMCcobG1P1fG1h4aP4Qq51W`, SHA7202b84에서
EN/KO → dark → Changwon/시설/자연 → 명시적 추천 검색 후 320/1366px로 확인했다.
`Previous places`/`Next places` 모두 disabled=false, opacity1,
배경 rgb(255,255,255), 글자 rgb(232,245,251)이었다. 접근 가능한 이름이 존재해도
저시력 사용자가 방향을 구분하기 어려운 상태다.

`app/styles/landing-explorer.css`의 `.carousel-actions button` 한 규칙에서
고정 흰 배경과 상속 글자색 대신 기존 `--white`/`--ink` 쌍을 명시하고 테두리에
`--line`을 적용한다. hover는 같은 토큰 쌍을 반전한 기존 동작을 유지한다.
새 토큰/JS/의존성/크기/접근 가능한 이름 변경은 없다.

새 Playwright 회귀는 KO/EN × light/dark × desktop/mobile에서 명시적으로
지역/시설/활동/날짜를 고른 실제 UI fixture 여정을 거쳐 양쪽 버튼을 확인한다.
대비4.5:1, 44px, 활성/표시, native Tab 포커스와 outline, Enter 후 단계/포커스,
hover 대비 및 가로 넘침을 검사하고 숫자/스크린샷 artifact를 남긴다.

## 검증과 한계

- `npm ci`: 성공,618 packages.
- lint: 오류0/기존 warning2; typecheck 성공.
- unit/contract: 636 pass, fail/skip0.
- Vercel build와 performance 성공: CSS69.96/70 KiB, planner269.97/270 KiB; 예산 그대로.
- production/all dependency audits: 취약점0.
- 새 UI 회귀 `CI=true npm run test:e2e -- e2e/carousel-control-contrast.spec.ts`: 기존 CSS에서4pass/4fail(다크4건 모두1.1119859:1), 수정 CSS에서8pass/fail·flaky·skip0(11.4초). 기존 CSS 비교 전에 수정 파일을 외부 checkpoint에 복사했고 finally로 byte-identical 복원 검증했다. baseline/fixed report·trace·화면과 대비 JSON을 각각 별도 보존했다.
- 실제 생성된 EN dark320/1366 스크린샷을 열어 화살표 및 키보드 focus ring을 시각 확인했다. 실제 Preview와 fixture 화면은 구분한다.
- 통합 exact-HEAD 전체 CI/Preview/독립 QA 결과는 PR에서 연결한다.
- 이전 #361 CI839/독립 QA PASS, #362 관련52PASS 및 전체로컬775PASS+기존skip1(19.8분,fail/flaky0)/CI840은 각 원본 HEAD의 증거이며 이 후보의 전체 성공으로 세지 않는다.
- 기존 테스트 삭제·skip 추가·assertion/locator/timeout/workers/retry/성능 기준 완화 없음.
- 모델/API false gate, sandbox boundary, DB/CD 적용 코드와 의존성/lockfile은 원본대로 유지한다.
- 원본 사용자10파일의 보존 manifest SHA256 재확인 모두 일치(2026-09-08T06:18:56Z). 원본40worktree와 기존 모든 artifact 보존; 추가 worktree4개로 총44개.
- CanonicalProduction은 아직34e6021, 운영008 미적용. DBbinding/isolated PITR/rollback 증거가 존재하지만 Production 성공을 대신하지 않는다. ODsay 제한 관련 실응답은 외부 운영 상태로 남고 추가 직접 호출이나 유료 전환을 하지 않았다.
