# 최신 main 기준 PR 검토 정책

모든 새 PR은 작성자와 변경 종류에 관계없이 병합 직전 최신 `main`을 포함한 HEAD로
다시 검증한다. GitHub가 squash merge 시 최신 `main` 위에 변경을 적용하더라도,
PR 브랜치에서 최신 코드 조합을 검사하지 않았다면 이 기준을 충족하지 못한다.

## 필수 절차

1. `git fetch origin main`
2. `git merge-base --is-ancestor origin/main HEAD` 성공 확인
3. 실패하면 `origin/main` 병합 또는 리베이스
4. typecheck, lint, test, Vercel 빌드 재실행
5. 갱신된 HEAD의 GitHub CI 성공 확인
6. 변경·회귀·보안·접근성·배포 영향 검토
7. 실패나 대기 중인 검사가 없을 때만 병합

## 2026-08-18 소급 점검

협업자 PR #14와 #16은 브랜치가 병합 직전 최신 `main`을 포함하지 않은 상태에서
squash merge됐다. 두 변경 모두 충돌 없이 최신 `main` 위에 적용됐지만, 새 조합의
PR CI를 받지 않았으므로 현재 정책에는 미달한다.

병합 후 현재 `main`에서 typecheck, lint, 테스트 8개, Vercel Node 22 빌드와
`git diff --check`를 다시 실행해 모두 성공했으며 실제 회귀는 발견되지 않았다.
이 기록은 절차상 누락과 코드 품질 결과를 구분하기 위해 남긴다.
