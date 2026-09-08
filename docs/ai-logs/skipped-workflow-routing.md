# 실행되지 않은 후속 workflow의 실패 오탐 수정

- 관련: #288, #358, #359. 기준 main `4d65a5c0be00b093051b4a8b07aecd2e5eec0a13`.
- 범위: 기존 실패 환류의 `skipped` 분류만 수정한다. 모델 API, executor 활성화,
  예약, sandbox, 배포 정책, 제품 코드, 기존 CI 검증 범위는 변경하지 않는다.

## 실제 재현

main CI835의 모바일 skip-link flaky 이후 CD run34187870681과 Post-Deploy
Production QA run34187873698은 `skipped`로 끝났다. 배포·운영 검사가 실행된 것은 아니다.
Failure Router는 `success`만 제외했기 때문에 두 실행을 실패 Issue #358/#359로 만들었다.

실제 두 workflow 이름/경로를 사용하고 이벤트 본문은 failure, GitHub 재조회 결과는
skipped인 회귀 검사에서 수정 전 기존 중복 방지 검사 1 PASS, 새 검사 1 FAIL을 확인했다.
의존성 설치 완료 전에 시도한 첫 검사는 js-yaml 미설치로 실행되지 않았다. 이 setup 실패와
설치 후 확인한 실제 회귀 실패 로그를 따로 보존했다.

## 수정

- job 조건에서 `skipped`를 제외해 불필요한 runner/Issue 작업을 시작하지 않는다.
- GitHub API로 다시 읽은 실제 결론에도 같은 경계를 적용한다. 이벤트 본문만 믿지 않는다.
- 실제 failure의 최초 등록·재전달·새 attempt 댓글 중복 방지는 그대로 유지한다.
- 기존의 다른 결론 처리 정책은 바꾸지 않는다. 테스트 삭제·skip·assertion·timeout·
  workers·성능 예산 완화가 없다.

## 검증 상태

작업 경로 `D:/wave-failure-router-20260908`.

- `npm ci --ignore-scripts`: 성공.
- `node --test tests/automation-failure-router.test.mjs`: 수정 후 2 PASS, 실패/skip 0.
- `npm run lint`, `npm run typecheck`: 성공.
- `npm test`: 634 PASS, 실패/skip 0. workflow YAML을 실제 파싱하고 inline script를 실행한다.
- `npm run build:vercel`, `npm run check:performance`: 성공.
- `npm audit --omit=dev --audit-level=high`, `npm audit --audit-level=moderate`: 모두 취약점 0.
- 최신 PR HEAD의 hosted actionlint 및 전체 Playwright/axe, 독립 QA와 main 반영은 대기.

로그는 `D:/wave-db-binding-preflight-20260908/router-*.log`에 보존한다.
이 계약 검사는 GitHub의 실제 skipped 이벤트 재전달이나 전체 zero-touch canary 성공을
대신하지 않는다. #358/#359는 main에서 적용·실행 근거를 확인하기 전 완료 처리하지 않는다.
