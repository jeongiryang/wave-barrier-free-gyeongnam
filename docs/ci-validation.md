# CI·배포 검증 기록

2026-09-12 사용자 지시에 따라 전체 workflow 12개를 감사했다. 필수 검증을 줄이지 않고 중복 실행을 줄인다.

## 2026-09-19 마감 전 대기 단축

- 기준 실행: PR #598 / CI 35440167387은 13분47초, 가장 긴 desktop shard의 검사 단계는 11분55초. quality는 1분46초, boundary는 44초였다. 설치 캐시보다 브라우저 병렬 분산을 우선한다.
- desktop/mobile 각각 8 shard(총 16개)로 분산한다. 각 runner의 2 workers와 모든 검사·retry·timeout·fail-on-flaky는 유지한다. runner 동시 실행 한도나 다른 작업에 의한 대기는 남을 수 있으며 실제 단축률은 새 실행에서 측정한다. 추가 runner 준비 비용과 총 runner 시간은 늘 수 있다.
- main 증명도 16개 browser job 전부 성공을 요구한다. 예전 4 shard 증거는 재사용하지 않는다. frozen sandbox의 과거 4 shard archive는 변경하지 않는다.
- 취소된 내부 PR CI는 같은 PR·branch·workflow·저장소의 더 최신 실행이 있고 실제 실패한 job/step이 없을 때만 실패 이슈 생성을 생략한다. 대체 실행 실패, 단독 취소, API 확인 실패는 계속 triage한다.
- 작업 중에는 변경된 모듈의 `node --test tests/<관련 파일>.test.mjs`, `npm run test:e2e -- e2e/<관련 파일>.spec.ts`로 피드백을 받는다. 묶음 후보가 안정되면 한 번 push하여 전체 CI를 실행한다. 각 PR의 의도·기여·요구사항 매핑을 보존한 뒤 최종 validate 성공 후보만 병합한다.
- PR #373의 Fast/Full 목표는 참고했으나 오래된 queue/bootstrap/CD 변경은 가져오지 않았다. draft PR도 현재 전체 CI를 실행하므로 draft만으로 시간 절감을 주장하지 않는다.

분산 방식 근거: https://playwright.dev/docs/test-sharding . 로컬 목록 대조와 최종 Actions 결과는 해당 PR에 기록한다.

## 실제 지연과 변경

- PR #500 CI [34686077830](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34686077830): 약12분16초.
- 같은 변경의 main CI [34686623864](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34686623864): 약13분17초. 브라우저 설치21–25초, 실제 테스트529–711초로 반복 전체 브라우저 검증이 가장 컸다.
- PR의 desktop/mobile ×8 shard, 각2 workers, fail-on-flaky, retry, timeout, axe, 성능 예산과 frozen boundary를 유지한다.
- main의 보안 감사·lint·typecheck·단위·build·성능 검사는 항상 다시 실행한다. 브라우저·boundary만 아래 증명 조건으로 재사용한다. 단순 경로 필터·skip-ci·무조건 성공으로 생략하지 않는다.
- npm 의존성 캐시를 유지한다. 설치20초를 줄이기 위한 큰 브라우저 캐시는 이번에 추가하지 않는다. 미완성 변경마다 원격 CI를 실행하지 않고 최종 후보를 검증한다.

## 동일 내용 검증 계약

`scripts/verify-ci-reuse.mjs`가 GitHub REST API의 commit/PR/workflow/jobs 근거를 읽는다. 다음 조건을 모두 만족해야 한다.

1. main push이며, 그 정확한 커밋으로 병합된 동일 저장소 PR이다.
2. main과 PR head의 Git tree SHA가 완전히 같다. PR의 quality/browser/boundary는 명시적인 `github.sha`의 합성 merge commit을 검사한다.
3. 같은 CI workflow의 PR head 실행이 최근7일 안에 완료·성공했다.
4. 최신 PR 실행의 quality, validate, sandbox-boundary와 desktop/mobile 각각8개 browser job이 모두 존재하며 완료·성공했다. 새 실패·진행 중 실행 대신 과거 성공을 고르지 않는다. 누락·중복·부분 페이지·취소·skip은 인정하지 않는다.
5. 같은 실행이 남긴 `ci-tree-proof.json`의 저장소·run·PR·head·base·event SHA·실제 checkout SHA/tree를 확인한다. 실제 Git 합성 merge commit의 tree와 부모까지 다시 조회한다. PR head만 비교하여 서로 다른 검사 tree를 재사용하지 않는다.
6. main aggregate는 새 quality 성공과 certificate 성공 및 예상된 두 skip을 함께 요구한다. 실패한 browser/boundary를 certificate로 덮지 않는다.

API 오류·불명확한 근거·직접 main push·다른 tree는 전체 검증으로 돌아간다. 기존 PR #500/main 쌍은 tree와 전체 job 성공이 같지만 checkout proof를 남기기 전 실행이므로 재사용하지 않는다. 병합 후 run.pull_requests가 비는 실제 API 동작도 확인하여 artifact에 원래 이벤트를 기록한다. 신규 Actions 시간은 최종 배포 후 기록한다.

## 버전·트리거 감사

- actions/checkout v7, setup-node v7은 현재 안정 버전 계열을 유지했다.
- upload-artifact v7.0.1, download-artifact v8.0.1, github-script v9.0.0을 공식 release/ref로 확인해 갱신했다. 고정 SHA를 사용하는 자동화는 고정을 유지했다. github-script v9의 ESM 변경에 걸리는 `require('@actions/github')`나 `getOctokit` 재선언은 없었다.
- Vercel CLI는 npm stable59.16.0으로 통일했다. 실제 CLI에서 prebuilt·skip-domain·native curl deployment 플래그를 확인했다. 인증은 step 환경 변수로 전달한다. 후보→health→DB inspect/migrate→promote→health/rollback 순서는 유지한다.
- CD는 성공한 main CI 이후 한 번 실행된다. production-api-smoke는 배포 smoke와 별도로 하루 한 번 운영 제공처 상태를 살핀다. release/release-backfill은 릴리스 기록 경로다.
- issue triage와 상태 routing은 읽은 이벤트를 분류하는 용도다. API 기반 Codex worker/독립 QA 자동화는 기존 비활성·Owner-only 경계를 유지했다. 유료 호출을 활성화하지 않았다. immutable bootstrap과 과거 sandbox archive는 변경하지 않았다.

근거: [GitHub workflow REST API](https://docs.github.com/en/rest/actions/workflow-runs), [artifact release](https://github.com/actions/upload-artifact/releases/tag/v7.0.1), [github-script v9](https://github.com/actions/github-script/releases/tag/v9.0.0), [Vercel CLI](https://vercel.com/docs/cli).
