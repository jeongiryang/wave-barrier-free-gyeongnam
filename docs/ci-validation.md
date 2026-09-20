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


## 2026-09-21 승인된 인트로 의존성의 immutable pin 재등록

- PR #667의 사용자 승인 인트로를 통합하면서 `three@0.186.0`, `@react-three/fiber@9.7.0`, `@types/three@0.183.1`과 전이 의존성이 추가됐다. 검토 대상 소스는 커밋 `208d47261c5702773d03827f86eb44bfa943e1fb`이다.
- 기존 lock 대비 패키지 20개가 추가됐고 기존 패키지 항목은 변경되지 않았다(루트 의존성 목록만 추가). 추가 항목은 모두 `https://registry.npmjs.org/` 다운로드와 sha512 integrity가 있으며 install-script 플래그가 없다. 이는 코드의 무해성을 자동 보장하는 정책이 아니라 이번 승인 범위의 고정 의존성 검토 기록이다.
- CI 35532800570은 후보 실행 전 `package-lock.json`의 기존 고정 해시와 새 lock이 달라 `BLOCKED_SANDBOX`로 거부했다. 외부 bootstrap의 SHA256은 정상이며 나머지 helper 12개와 추가 경계 파일 4개의 해시는 그대로 일치했다.
- lock pin만 `ae0ef08fa49232fc4b36fc81c0c5328c563800767a353a9b810f185b6a3fb25b`에서 `93283120fe309e14434c83d452fe038ddf6a02c5d5b484e5bf1402a8bb48fb91`로 바꾼다. 다운로드 원본 SOURCE_SHA도 위 검토 커밋으로 고정한다. 검증 함수·권한·네트워크·격리·변조 거부 코드는 변경하지 않는다.
- 배포본을 먼저 별도 immutable 커밋 A로 원격 고정하고, 후속 커밋 B에서 workflow URL과 SHA256을 A로 갱신한다. 후보 branch의 최신 내용을 자동으로 허용하거나 해시 검사를 제거하지 않는다. 이후 lock 변경도 별도 검토와 재배포가 필요하다.

- 배포 커밋 A: `5b9c9c319b2d0c6893cb4d4d5f8edc6371069945`. 외부 bootstrap SHA256: `cfcde4821762a6c1b1d36e3a528ecbc379900b6521bb17cba76f6578b37c22b8`.
- 원격 A의 고정 URL에서 bootstrap을 내려받아 위 해시를 검사한 뒤, checkout 밖 임시 디렉터리에서 Python `-I -B`로 실행했다. 검토 대상 파일 13개를 검사하고 17개 배포 파일의 다운로드 해시를 검증했다. 후보 코드는 실행하지 않았다.
- 기존 고정 CI bootstrap 공격 테스트와 installed bootstrap 공격 테스트를 변경 없이 실행했다. helper·entrypoint·lockfile 변조는 다운로드/실행 이전에 거부됐고, 위조 배포 응답과 공개 sentinel/네트워크 접근 시도도 차단됐다. Linux bubblewrap/AppArmor·자원 경계의 최종 증거는 새 SHA의 GitHub Actions 결과로 남긴다.
