# 9월 30일 출시 CI·CD 계약

2026-09-26 정이량의 지시로 개발 단계의 반복 대기와 에이전트 토큰 소모를 줄이고 AI 나루와 제출 기능 검증에 집중하도록 재구축했다. 작업 마감은 **2026-09-30 23:59 KST**, 10월 채점 대비다. 공식 제출 마감일을 새로 확정한 문서는 아니다.

## 실행 경로

| 실행 | 검사 | 의미 |
|---|---|---|
| PR·main의 CI | 전체 단위, lint, 타입, 의존성 보안, actionlint, 빌드, 성능 + 핵심 브라우저27여정 × desktop/mobile 각2 shard | 개발 후보의 필수 validate |
| 수동 Release Audit | 같은 품질 검사 + 기존 모든 E2E × desktop/mobile 각8 shard | 최종 후보의 자동 전수 회귀 release-validate |
| main CI 성공 후 CD | 최신 main SHA/필수6개 job 검증 → 후보 배포 → health → DB inspect/migration → 최신성 재확인 → 승격 → health/rollback | 검증한 개발 개선을 운영에 반영 |
| Production API Smoke | 기존 일1회·수동 제공처 검사 + 독립된 제한 횟수의 실제 나루 의도/일정안 검사 | 운영 실측. 외부 hold와 제품 오류 구분 |
| npm run harness -- release evidence.json | 현재 커밋의 최신 Release Audit 실조회 + 모든 요구의 증거·리뷰·렌더·나루 보고서 | 제출 준비 근거 확인 |

**빠른 CI는 모든 기능/디자인의 최종 합격이 아니다.** 9월30일 후보는 전체 Release Audit, `harness/features.json`의31쪽 요구, 실제 API/계정/저장/공유 여정,1440·960·390px 렌더와 독립 QA가 모두 필요하다. 제출자료의 API 활용·향후 계획도 현재 구현과 대조한다.

## 비용과 대기

- 기준: PR #709 CI `36151024884`,2026-09-25 14:58:07–15:12:03 UTC, **13분56초**. 브라우저16개 job,quality,sandbox-boundary,certify,validate 구조였고 quality는2분25초였다.
- 새 PR 브라우저4개 job에서27개 핵심 여정을 두 기기로 검사한다. 목록은 `harness/quick-tests.json`. 삭제/개명은 계약 검사 실패다. 테스트는 삭제하지 않으며 전수 실행에서 그대로 사용한다.
- draft도 빠른 CI를 실행한다. 변경 중에는 관련 단위/E2E를 로컬에서 확인하고 의미 있는 수정이 쌓이면 push한다. 같은 로그 전체를 반복 읽거나 수초마다 Actions를 조회하지 않는다.
- 이전 동일-tree 인증/재사용은 폐기했다. main도 핵심 검사를 다시 실행하므로 이전16-shard 증명과 새4-job 증명이 섞이지 않는다.
- npm 캐시 유지,설치의 중복 audit/fund만 생략. 명시적 두 보안 감사와 성능 한도는 유지한다. 실제 속도는 새 Actions 실행으로 측정한다.
- 과거 이슈 라우터·PM dispatch·API Codex/QA worker·release 발행 workflow는 보관했다. 하네스는 역할별 작업 지침과 검사 CLI이며 LLM 자동 반복 호출을 하지 않는다.

## 합격과 배포

validate는 quality와 모든 browser matrix 작업의 성공을 요구한다. 실패·취소·skip·누락은 통과하지 못한다. Release Audit도 전수 결과를 같은 방식으로 집계하며 CD를 자동 호출하지 않는다.

CD의 `scripts/verify-deployment-ci.mjs`는 현재 main SHA,동일 저장소,ci.yml,push 이벤트,최신 실행,모든 필수 job의 완료/성공을 검증한다. 과거 성공으로 새 실패를 덮지 않는다. 수동 preflight도 Owner·main·같은 CI 성공이 필요하며 DB/alias를 바꾸지 않는다. 후보 대기 중 main이 바뀌면 승격 직전에 차단한다. Vercel Git 자동 배포 비활성화와 Actions 단일 배포 경로를 유지한다.

PR 검사에 유료 LLM이나 구독 인증을 제공하지 않는다. 기존 sandbox/bootstrap은 보존한다. 제품 인증·개인정보·오래된 응답·저장 실패 회귀는 계속 실행한다. 과거 자동화 테스트는 보관 원문을 검증하고 현재 CI 계약은 `tests/release-harness.test.mjs`가 검증한다.

## 현재 운영 제약

- 기존 ODsay searchPubTransPathT hold 이슈 #454가 종합 실 API 검사를 선행 중단한다. 실제 계정/한도 재확인과 제한된 재검증이 필요하며 빠른 CI나 다른 제공처 성공으로 해소됐다고 하지 않는다.
- Naru job은 실제 승인 로컬 모델의 의도와 일정안까지만 확인한다. 화면의 적용/되돌리기,휴대전화·음성·GPS·보조기기 사용은 별도 증거가 필요하다.

## 롤백

- 기준 커밋 `8e23a9781f4d0ba151e9dd1c91559bd08792b41f`
- 원격 태그 `backup/pre-release-harness-20260926`
- 원문 `.github/workflow-archive/2026-09-26/`:12개 workflow와 기존 정책
- 로컬 자료 `operations/pre-release-harness-20260926.zip`. 태그는 전체 저장소를 보존하며 ZIP은 운영 관련 사본이다.

설정 롤백은 **재구축 squash 커밋을 git revert한 PR**으로 한다. 충돌 시 최신 제품 코드를 보존하며 설정만 조정한다. 복원 workflow의 CI 성공 후 squash merge한다. 전체 원본이 필요하면 별도 checkout에서 `git switch --detach backup/pre-release-harness-20260926`를 사용한다. 보호 규칙 변경·force push·사용 중인 디렉터리 초기화를 하지 않는다. Production 긴급 복귀는 기존 CD의 Vercel rollback 경로다.

## 근거

[Playwright CLI](https://playwright.dev/docs/test-cli),[GitHub concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency),[Vercel promote](https://vercel.com/docs/cli/promote). 과거 CI 설계는 보관 폴더 `policy/ci-validation.md`에 남긴다.

## 2026-09-26 실제 새 Actions 결과와 배포 연결 보완

- 재구축 PR #712 CI 36244234804: 13:09:42–13:11:52 UTC, **2분10초**, quality·browser4개·validate 모두 성공. 이전 #709 13분56초보다 약84% 짧다. 이것은 일상 검증 범위를 집중한 결과이며 전체 E2E는 Release Audit에 남는다.
- #712 squash: a72c9c89a45ed22e2d5246469e04951e7dfc1143. main CI 36244406054 성공.
- 최초 CD 36244548062는 후보가 정확한 커밋을 반환했지만 health step에 기대 SHA 환경변수가 누락되어 승격 전에 실패했다. 운영 alias는 바꾸지 않았다.
- 보완 PR #713: 후보/운영 health step 모두 기대 SHA를 전달하도록 수정하고 두 wiring을 회귀 검사에 포함. 관련18개 및 전체 새 CI 36244718958 성공. squash: 7d565884b59a28a73ce2d4fe5e4f97526ba5c154.
- 설정 전체 롤백은 후속 수정과 재구축을 역순으로 되돌리는 PR이다: `git revert 7d565884b59a28a73ce2d4fe5e4f97526ba5c154 a72c9c89a45ed22e2d5246469e04951e7dfc1143`. 이후 제품 변경과 충돌하면 최신 제품을 보존하며 설정 충돌을 해결한다.
