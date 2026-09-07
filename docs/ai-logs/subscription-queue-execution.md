# 구독 대기열의 잠금·실행·독립 QA 연결

2026-09-07, Refs #288 #294, 기존 PR #289. 서비스 수정 #342–#345와 별도로 기존 Control Plane 브랜치에서 작업한다.

## 원인과 변경

기존 웹 예약은 GitHub/Notion을 감시·갱신하지만 로컬 구현 프로세스를 실행한 근거는 없었다.
API worker는 비용 정책으로 비활성화되어 있다. 공용 상태의 원자적 잠금과 HEAD에 고정된 로컬 구독 실행 경로가 빠져 있었다.

- 원격 전체 작성자 Issue/PR·CI 실패 조회, immutable owner work order와 exact scope를 추가했다.
- GitHub Contents SHA 비교로 동시 claim을 제한하고 30분 lease, 이전 소유자 fencing, 최대 2회/15분 재시도, 명시적 resume를 구현했다.
- 모델 프로세스는 ChatGPT/포함 한도만 사용하며 도구·shell·connector·GitHub credential 없이 파일 제안 또는 QA JSON만 반환한다.
- 별도 worktree의 문서 변경에 전체 기존 검증을 실행하고 PR ref와 queue ref를 atomic push한다. 충돌 시 force/부분 게시 fallback은 없다.
- 최신 HEAD의 CI 이후 다른 ephemeral 프로세스로 QA하고 GitHub receipt와 Notion 미확인 보고를 연결한다. 사람 승인 3건/Production/GO는 유지한다.
- 일반 애플리케이션 생성 코드의 로컬 실행은 검증된 격리가 없으므로 blocked-sandbox다. 문서 작업의 성공을 전체 코드 자동화 완료로 확장하지 않는다.

## 검증과 실제 실행 경계

### 호스트 격리 P1 재개 후보 — 2026-09-07

원본 `wave-subscription-queue`의 cbb7587 및 미커밋 10파일은 변경하지 않았다. patch와 SHA256 사본을 보존한 뒤 별도 `D:/wave-subscription-sandbox-289`에 변경을 적용했다. 배포 차단·QA findings·오류 분류 보완은 유지한다. 아래 과거 로컬 실행은 이번 수정본의 검증 근거로 쓰지 않는다.

문서 변경이어도 체크아웃의 npm 스크립트는 비신뢰 코드라는 P1을 수정한다. `validateDocumentation`의 호스트 spawn을 제거하고, 설정된 Linux/WSL bubblewrap 경계 안에서만 검증한다. 설정 누락·probe 실패·검증 실패는 `BLOCKED_SANDBOX`로 중단하며 호스트 fallback, 모델 호출, publish 성공으로 진행하지 않는다. 일반 코드 자동화 범위는 여전히 차단한다.

- 사용자/마운트/PID/네트워크/IPC/UTS namespace, 추가 user namespace 차단, 새 session, capability 제거, 비어 있는 환경, 호스트 드라이브 미마운트를 적용한다. bwrap 자체 환경에도 인증 변수를 전달하지 않는다.
- 문서 후보는 `git archive`의 tracked 파일과 검증된 문서 변경만 옮긴다. `.git`, 실제 `.env`, `.npmrc`, 로컬 node_modules·인증 파일은 옮기지 않는다. tar 경로 탈출·symlink·hardlink는 거부한다. Git은 신뢰된 절대 실행 파일을 사용하고 checkout의 hooks/fsmonitor를 실행하지 않는다.
- 의존성 준비는 자격증명 없는 파일 경계에서 공식 registry의 sha512 lockfile과 `npm ci --ignore-scripts`만 사용한다. 저장소 및 의존성 lifecycle은 실행하지 않는다. 저장소의 lint/typecheck/unit/build/budget/E2E 실행에는 외부·호스트 로컬 네트워크가 없는 별도 namespace를 사용한다. Chromium은 사전 준비된 별도 browser 디렉터리만 읽는다.
- 설정에는 bwrap/Node 바이너리 SHA256을 고정하며 이 파일은 저장소 밖에 둔다. 보관 가능한 scratch 위치, 최대 전체 24분, 자식 파일 64MiB·프로세스 수 제한, 종료 시 자식 정리를 적용한다. 임의 stdout/stderr를 GitHub 댓글로 내보내지 않는다.
- 공식 Ubuntu 24.04 업데이트의 bubblewrap 0.9.0-1ubuntu0.1을 작업 도구 폴더에만 추출했고, Node 22.23.2 Linux 배포를 공식 SHASUMS256과 대조했다. 전역 설치·인증 복사·유료 서비스 변경은 없다.
- 공개 파일과 수신기만 사용한 초기 11개 경계 검사는 PASS였다. 통합 helper의 격리 검사 PASS, 격리를 제거한 대조 시험은 의도대로 FAIL, 악성 동작을 시도하는 합성 npm 6개 명령은 모두 파일/네트워크 차단 상태로 PASS했다. npm 설정 중복 경로 실패를 발견해 서로 다른 빈 설정 경로로 수정했고 실패 로그도 보존했다. 종료 코드 0만 반환하는 가짜 probe를 승인하지 않도록 challenge receipt regression PASS (including the exit-zero negative control).

이것은 W.A.V.E 전체 sandbox 검증이나 queue 종단간 성공이 아니다. 이 기기의 browser 디렉터리는 아직 비어 있고, 최신 CI·실제 전체 sandbox 실행·별도 최신 HEAD QA가 남았다. `WAVE_VALIDATION_SANDBOX_CONFIG`를 예약 실행 환경에 등록하지 않았고 실제 queue tick/모델 구현·QA 호출/Notion ack/시도 횟수 초기화를 하지 않았다. #294의 기존 attempts·generation·receipt·blockedPhase를 유지하며 독립 QA PASS 전 `blocked-sandbox` 운영 경계를 유지한다.

공식 구성 근거: [bubblewrap 보안 모델](https://github.com/containers/bubblewrap#sandbox-security), [Ubuntu 보안 패치](https://ubuntu.com/security/notices/USN-7046-1). 이 검사는 호스트 파일·네트워크 경계를 검증한 것이며 커널 취약점 부재나 자원 고갈 방어 전체를 보장하지 않는다. 읽기·네트워크를 허용했던 이전 Windows sandbox 결과를 덮어쓰지 않는다.

### 실제 smoke 이후 보완

`d58e893`의 실제 문서 구현은 원격 공용 claim→구독 파일 제안→전체 로컬 검사(unit306,
Playwright237 PASS/기존skip1)→기존 #289 atomic push→CI34091892987 성공까지 진행했다.
동일 구현 재실행은 modelCalls0/중복 PR0이다. 별도 QA는 댓글5566335607에 FAIL을 남기고
과도한 Notion 완료 표현을 수정 대기열로 반환했다. 최초 QA worktree 준비 실패와 시도2회는 보존한다.

실행에서 발견한 P1을 같은 PR에서 수정했다.

- 상태 브랜치의 Vercel 설정 누락으로 Preview14건이 실패했다. 원격2d1322c에서 차단하고
  초기 tree·모든 상태 쓰기·atomic publish에 배포 비활성 검사를 추가했다.
- QA 실패 URL만 전달하던 경로에 구체적인 findings를 보존했다. 이전 URL-only receipt는
  같은 revision/HEAD/소유자 marker를 검증한 뒤 데이터로만 전달한다.
- Git 오류는 토큰/원격 본문 없이 작업·종료 상태·허용된 분류만 남긴다.
- 보완 후 관련 신규 실행 계약22 PASS, 전체 unit309/lint/typecheck/Vercel build/performance PASS.
  최신 전체 브라우저 검사는 원자적 수정 보존 후 실행한다. 이전237 결과를 새 코드 전체 검증으로 세지 않는다.

Notion 무료 block 한도 때문에 최종 환류는 pending/unacknowledged다. Windows sandbox의
공개 canary 시험은 외부 읽기·로컬 연결 차단에 실패했다. 일반 생성 코드는 blocked-sandbox로 유지한다.
전체 실행 증거·실패 및 한계는 [runbook](../subscription-queue-runbook.md)에 연결했다.

두 번째 실제 구현은 15분 대기 후 같은 명세의 실패 근거를 받아 `cbb7587b6e9dcfbc15cfb8c0bc8f1d25f683d660`을
게시했다. 전체 unit306/Playwright237 PASS·기존skip1(5.5분), 나머지 기존 검사 PASS다.
구현 시도2/QA시도2를 초기화하지 않는다. 생성 문장의 '수행하지 않았다'는 과거 수동 관제 기록과
혼동될 수 있어 조정기 검토에서 '이번 최종 QA→Notion 반영·재조회 미완료'로 범위를 명확히 했다.
이 수동 보완을 무인 전체 성공이나 별도 QA PASS로 표시하지 않는다.

07:30 UTC 의존성 감사: 이 원본 브랜치의 npm audit은 high2/moderate1(fflate/image-size/vinext)이다.
이는 #309의 개발 도구 교체가 아직 포함되지 않은 상태다. #309를 포함한 제품 합성0333091/b64541b는
같은 시각 audit0이었다. 원본 자동화 PR의 audit까지0이라고 주장하지 않으며 #309와 안전한 합성 검증을 병합 의존성으로 유지한다.

### 초기 구현 당시 기록

- 신규 계약 19개 PASS, 기존 구독 계약 포함 관련 24개 PASS: 동시 CAS, 만료/늦은 결과, CI 재실행 attempt, stale HEAD, 자기 댓글 중복 방지, 독립 QA/실패 환류, 명시적 resume, auth/quota 중단, 원자적 게시, 범위 밖 파일 거부, 실제 tick 선택/재실행 계약.
- 전체 단위·계약 306 PASS, lint/typecheck PASS. Vercel build/performance PASS. 전체 Playwright와 새 HEAD CI 결과는 완료 후 PR에 연결한다.
- 실제 GitHub scan: Issue 49/PR 44, 최근 failure 100건 창(total 114). 전체 과거 실패 감사로 세지 않는다.
- 공식 app-server 포함 한도 조건 PASS, 모델 turn 0. 코드의 fixture 실행을 실제 모델 구현/QA 성공으로 표시하지 않는다.
- 2026-09-07 06:22 UTC경 Work PM 웹에서 기존 queue/독립 QA 예약 상세 조회. 설정을 변경하지 않았고 조회 중 queue 명칭이 AI Release Owner로 바뀌어 다른 작업자의 설정을 보존했다.
- 첫 실제 작은 작업, 원격 claim/atomic publish, 최신 CI·독립 QA·Notion 재조회, 중복 없는 재실행은 아직 미검증이다. 아래 runbook 절차로 계속한다.

## 정확한 재개 지점

[실행 runbook](../subscription-queue-runbook.md)에 따라 #294의 오래된 구독 예약 설명을 작은 실제 작업으로 분리한다.
현재 HEAD를 고정한 승인 명세 → GitHub 공용 claim → 구독 수정 → 전체 검증 → 기존 #289 갱신 → CI → 별도 QA → 기존 Notion 대시보드 재조회 순으로 증거를 남긴다.
예약 관리 화면의 실제 등록과 CLI 실행 파일 작성은 별도 상태다. API workflow 3개는 계속 disabled_manually다.
# CI runner 격리 검증 후속 — 2026-09-07

- 독립 QA의 추가 bootstrap P1을 반영해 대상 checkout 밖의 고정 설치·manifest pin·전체 12파일 검사를 추가했다. Windows 공개 sentinel 시험에서 정상 verify-only, helper/entrypoint 변조 6건 및 manifest 변조 거부를 확인했다. queue/model/GitHub 쓰기는 실행하지 않았다.
- CI #801의 첫 전체 sandbox 검사는 `.npmrc` 제외 후 기존 `legacy-peer-deps=true` 모드가 빠져 dependency preparation에서 실패했다. 설정 파일을 다시 노출하지 않고 검토한 설치 옵션을 trusted coordinator에 명시했다. 일반 제품 회귀 결과와 sandbox 실행 성공을 혼동하지 않는다.
- CI #802는 bootstrap/namespace 시험을 통과했으나 설치 중 native dependency 추출이 64MiB 파일 제한에 걸려 `EFBIG`로 중단됐다. lifecycle을 끈 trusted npm 설치 단계에만 256MiB 추출 제한을 적용한다. 저장소 코드 실행·로그의 64MiB 제한, timeout, worker, 테스트 assertion 및 성능 예산은 유지한다. 외부 고정 설치의 verify-only도 성공했으며 예약/tick은 실행하지 않았다.
- CI #803: 일반 검증은 unit314 및 Playwright237 PASS/기존skip1로 성공했다. 실제 sandbox에서는 lint/typecheck/unit/build/performance가 통과했으나 Playwright218 PASS/12FAIL/7flaky/기존skip1이었다. 주로 axe의 새 Chromium context가 crash하고 한글 ICS 파일명은 `download`로 바뀌었다. sandbox 내부 UTF-8 locale을 명시하고 Linux가 thread까지 세는 프로세스 제한을 1024로 설정해 같은 두 worker를 수용하는지 재검증한다. 이는 아직 원인 해소를 확정한 결과가 아니다.
- bwrap 종료/timeout 뒤 로그를 보존하며 전체 실행 상한은 20분으로 줄여 CI artifact 업로드 시간을 확보했다. 기존 Playwright timeout/retry/worker/assertion은 바꾸지 않았다. trace·스크린샷은 namespace 종료 뒤 일반 파일만 별도 디렉터리에 복사하고 symlink는 실패 처리해 uploader의 호스트 파일 접근을 막는다. #803은 명령 로그만 보관되어 실패 trace를 회수하지 못한 한계가 있으며 이후 CI부터 보완한다.
- WSL도 PATH 검색 대신 시스템 실행 파일을 지정하고 Python bridge를 `-I`로 실행한다. 외부 고정 설치는 이후 소스 변경을 기존 pin으로 수용하지 않는 것을 실제 verify-only의 거부로 확인했다.
- `a34b1d6` CI #800에서 실제 경계 probe가 성공했다. 전체 제품용 별도 CI job을 추가해 인증정보 없는 snapshot에서 기존 lint/typecheck/unit/build/performance/Playwright 명령 6개를 모두 실행한다. 기존 일반 CI의 검사와 기준은 유지한다.
- npm lockfile의 번들 내부 항목은 별도 URL이 없는 정상 형식이다. 검증된 registry 부모 tarball과 명시된 bundleDependencies에 포함된 경우만 허용하고, 부모 없음·멤버 불일치·외부 registry를 거부하는 시험을 추가했다. WSL의 공개 canary/악성 npm 시험 5개 그룹은 통과했지만 이는 전체 제품 QA가 아니다.
- `4cf713d` CI #797 및 `f24fa94` CI #798은 lint/typecheck/unit 314건까지 성공했지만 실제 sandbox probe에서 실패했다. #798은 `namespace-permission`으로 분류했으며 브라우저/build 단계는 실행되지 않았다.
- `ddf0608` CI #799에서 runner의 배포판 정책 파일이 없어 `test -f`가 실패했다. 기존 파일 존재를 가정한 접근을 대체해 AppArmor upstream의 고정 commit 정책과 SHA256을 검증한 뒤 일회성 CI runner에만 로드한다. 자식 capability 제한을 포함하며 전역 AppArmor/user namespace 보호와 로컬 PC 정책은 변경하지 않는다.
- 근거: [Ubuntu의 프로그램별 namespace 정책](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces), [AppArmor upstream bwrap/child profile](https://gitlab.com/apparmor/apparmor/-/blob/8e431ebcd915216a03ebc8d01e72b1741bb2f855/profiles/apparmor/profiles/extras/bwrap-userns-restrict).
- 실제 queue 실행·독립 QA PASS·전체 애플리케이션의 sandbox 통과를 주장하지 않는다. `blocked-sandbox`를 유지하며 새 HEAD에서 CI probe와 기존 전체 회귀를 다시 확인한다.

### Screenshot resource regression — 2026-09-07

- CI #804 (`60896f64`, run 34128660896) completed the ordinary checks, but the actual sandbox application run reported 235 passed, 2 failed, 1 existing skipped, 0 flaky. The two failures were mobile-profile full-page captures at 1920px and 2560px (`Page.captureScreenshot: Unable to capture screenshot`). Exported traces preserve the unchanged Pixel 7 scale factor 2.625.
- A public memfd regression reproduced the old 64MiB working-file cap failure outside the target checkout. With the changed helper, the same namespace permits a 128MiB public rendering buffer and still rejects a 600MiB allocation with EFBIG. Working-file capacity is bounded at 512MiB; trusted dependency extraction remains 256MiB. Diagnostic read and artifact export caps remain separate and unchanged.
- Reviewed source copied outside the checkout was run using `/usr/bin/python3 -I -B tests/subscription-sandbox-boundary.py <public-config>` in WSL. The old helper failed the new regression (exit 1); the changed helper passed all seven printed groups (exit 0): bounded buffers, bundled dependency validation, filesystem/HOME/environment/network boundaries, unconfined negative control, exit-zero negative control, six hostile synthetic npm commands, and safe artifact export. This is boundary evidence, not full application QA.
- Full-page screenshot success on the changed helper still requires the next CI application sandbox run. No test deletion, new skip, assertion/locator change, timeout/retry/worker change, viewport reduction or performance-budget increase was made. No queue tick, scheduler registration, model call, publish activation or #294 metadata reset was performed. Keep `blocked-sandbox` until same-HEAD independent QA passes.
# Aggregate writable workspace P1 follow-up — 2026-09-07

- CI810 f951c4d91bdcf336715ef0643bc346475b1b1381 FAILED before npm installation: preserved `ci-810-sandbox/wave-validation-wvnjsvos-install.log` reports nested bwrap namespace permission denial. Ubuntu's pinned upstream `unpriv_bwrap` intentionally denies capabilities in children; the WSL public probe environment did not have that profile. This is not an application test PASS and was not retried unchanged.
- Added a separate root-owned/hash-verified quota-owner bwrap copy/profile on the disposable CI runner only. The existing global policy is retained. The trusted owner may construct the inner namespace; repository execution explicitly has ALL kernel caps dropped and further user namespaces disabled/asserted. Added hostile-command checks for zero CapEff/CapPrm/CapBnd, denied unshare, read-only root/dev and capped tmpfs. Arbitrary replacement owner bytes are rejected. No local system profile/pin modification or queue activation occurred; validation of this candidate remains pending.

- Independent review5133081079 at ea10705823d70b9bb9cf6fd0ff53c26c5da952c5 correctly found that per-file512MiB is not an aggregate quota. CI807 green did not resolve this boundary.
- A trusted outer namespace now owns a dedicated2GiB tmpfs workspace throughout preparation, six inner-namespace commands and capped export. `/tmp`, home-cache and shared memory are bounded separately; repository root and `/dev` are read-only. The inner boundary remains filesystem/network isolated and cannot create more user namespaces. No target helper executes before the existing external bootstrap verification.
- Public-only external probes v1/v2 failed before npm execution: read-only outer `/tmp` prevented private diagnostics, then `/dev/null` could not open because the host-root bind forbids device access. v3 explicitly creates bounded temporary storage and a minimal device mount; all8 probe groups pass (exit0), including aggregate ENOSPC on several individually permitted files, public128MiB memfd,600MiB rejection, six synthetic commands, filesystem/HOME/network negative controls and safe artifact export. First two failed copies/logs remain preserved in D:/wave-resume-20260907-347/sandbox-quota-public-20260907{,-v2}; successful copy is -v3.
- Added stronger per-command root/device write-denial and auxiliary tmpfs-capacity assertions for CI. The real application has NOT yet run under this new total quota at this checkpoint. Screenshot dimensions, workers, timeouts, assertions, performance budgets and skip count remain unchanged.
- blocked-sandbox remains. Existing external installed pins must reject this changed helper until a separately reviewed version is installed and verified. No actual queue/model run, scheduler registration, API activation, #294 attempt reset, merge or Production change.


## 2026-09-07 aggregate process boundary / policy pin follow-up

- Independent review5133673789 at a0f3af0820d4924042b98a06b09b36a41d0c74b9 found aggregate anonymous/memfd memory, swap, PID and CPU limits absent, plus a checkout-controlled privileged AppArmor policy load. Queue remains blocked-sandbox.
- CI81234138966447 at that old HEAD succeeded: ordinary unit314/314, browser237 PASS/existing1skip, lint/typecheck/build/performance; the real application sandbox also succeeded. That does not prove the newly identified resource/policy requirements.
- New candidate launches the trusted helper in a systemd cgroup: memory6GiB, swap0, tasks1024, CPU200%, group OOM kill, original1200s runtime. The helper checks actual kernel controller files before each bwrap process. Missing systemd user manager/delegation fails closed; no sudo fallback on operator hosts. Repository mounts cannot reach or write cgroups.
- Disposable CI uses a system service with the runner UID, same properties and explicit public runtime paths. Public negative probes exercise four-child anonymous/memfd exhaustion, aggregate pids, CPU throttling, each missing controller, plus immutable-policy hash tampering before privileged parsing.
- Policy is downloaded from immutable a0f3af0 source with SHA256 5569873ac76c043f90aa14292b77109177b30d3b5c2f90fa28fa0b91a6688b35. The PR checkout policy is no longer parsed by root.
- No repository npm on the credential-bearing host, no actual queue/model/API activation, no original dirty10 or external trusted-install overwrite. Only git diff --check has run for this candidate; new full CI/resource attacks/independent QA remain pending. No test deletion, skip, timeout/worker/viewport/budget relaxation.

## 2026-09-07 CPU probe quoting and public diagnostic follow-up

- CI813 run34140349915 at3904798a0d4b9523e78a332e8b97862a72b7e1d5 passed lint/typecheck/unit314, bootstrap tamper checks, filesystem/HOME/network/tmpfs probes and aggregate anonymous-memory/memfd/PID attacks. The CPU child program contained an interpreted newline in a nested quoted string and did not execute; this is a failed probe, not a CPU boundary PASS.
- The public probe now retains the intended literal escape, compiles each fixed probe string before launch, and saves allowlisted CPU return code, cpu.max and before/after nr_throttled metrics. CI preserves that JSON even on failure. Raw stderr and host credentials are not copied into the artifact.
- The existing throttling assertion is retained and an exact25% cpu.max assertion added. No quota, timeout, worker, viewport, assertion or performance-budget relaxation. Full application sandbox at the prior HEAD remains running at this checkpoint; fresh candidate validation is pending.
- No repository npm/scripts executed on the operator host. The changed CPU string was extracted using the Python standard-library AST and compiled without executing repository code. Original dirty10 and external pins remain unchanged. Actual queue, publish, model/API and scheduler activation remain blocked-sandbox pending independent same-HEAD QA.

### CI819 aggregate workspace diagnosis and budget repartition
- Actual338e411 failure samples prove /workspace2147483648bytes/available0 while tmp still425–495MB free, home536MBfree,shm536MBfree and~1.99Minodesfree. Full artifacts retained; failOnFlakyTests correctly fails retry-only success.
- Repartition the existing candidate3.5GiB allowance: workspace2816MiB (+768),tmp256MiB(-256),home384MiB(-128),shared128MiB(-384). Outer coordinator temp remains512MiB; total4GiB is unchanged. Home retains space for script-disabled npm cache. No trace/screenshot deletion, performance-budget increase, worker/timeout/assertion change or paid-resource activation.
- A pre-execution aggregate guard rejects any positive increase to any mount; public synthetic commands check real kernel mount sizes. Existing aggregateENOSPC, network/filesystem, process budget, artifact symlink and four-shard tests retained. New immutable helper distribution and new CI/independent QA required; not yet a validated fix or queue activation.

### CI821 temporary rendering capacity follow-up

- CI821 run34150233692 at8af3bf119c6e38d7dd01e747484cd356936c4747 failed. Quality passed: unit/contract613, lint/typecheck/build, both dependency audits0 and unchanged bundle budgets (CSS69.80/70KiB, planner269.96/270KiB). Ordinary browser/axe passed379desktop/378mobile with the existing1skip and no flaky results. Sandbox1 passed190; sandbox2 had187PASS/3FLAKY; sandbox3 had167PASS/15FAIL/7FLAKY; sandbox4 reached the unchanged20-minute boundary without an E2E final summary. All available logs/artifacts are preserved in `D:/wave-resume-20260907-347/ci-821-all-sandbox` and `ci-821-all.log`. No overall success claim.
- The earlier256MiB temporary mount coincided with Chromium screenshot/renderer crashes. Playwright1.62.1's official `chromiumSwitches.ts` enables `--disable-dev-shm-usage`, so temporary backing storage matters even though `/dev/shm` remains unused. A separate public-only reproduction actually wrote two160MiB files in that namespace: old helper returned ENOSPC. This establishes an insufficient temporary-capacity case; a fresh full application run must still determine whether it explains every observed failure.
- Restore the original512MiB temporary allowance and allocate128MiB to the isolated home. Workspace2816MiB/shared128MiB/coordinator512MiB remain unchanged; total4GiB, memory6GiB/swap0, CPU/PID/runtime and per-file limits are not raised. Trace/screenshot retention, workers, viewport/DPR, timeout, assertions, performance budgets and failOnFlakyTests are unchanged.
- The reviewed public-only copy at `D:/wave-resume-20260907-347/sandbox-public-temp-restored` passed11 real boundary groups under systemd/bubblewrap (exit0,4m27.886s). Includes fully written concurrent temporary buffers, all six synthetic commands/four shards, host/HOME/network denial, negative controls, aggregate ENOSPC and safe artifact export. This is not an application or queue smoke. Original10dirty files still match every preserved raw SHA256.
- Exact8af Preview `hhemae8l7` is READY. Actual KO320/EN320+1366 keyboard regional search, two KTO places, ODsay47/52-minute legs, region Cancel/Add/New, reload, archive restore and explicit public-ID-empty recovery through regional search were inspected. Landing11viewports had no overflow/error logs. Remaining: stale not-found text after successful regional recovery, partial English travel-book, primary Kakao map delay, actual public-ID/car success and human accessibility checks. No Production/008/queue/model/API activation. Independent receipt5134499306 remains PENDING; new immutable pins/full CI/Preview/independent review are still required.

### CI822 installation cache boundary correction

- CI822 run34152174098 at831c863de344d4ed226c3919f375d048bfcfeae3 failed in all four actual sandbox installations with npm ENOSPC before application checks. Quality/public boundary succeeded; ordinary browsers were still running when the correction was prepared. Separate QA5134633507 correctly marks this HEAD P1 FAIL. All four install artifacts are preserved under `D:/wave-resume-20260907-347/ci-822-sandbox`. No actual831 Preview deployment was created: its unfinished creation dialog was cancelled after the failure.
- The128MiB home allocation did not fit real npm installation. Installation now retains the previously successful temporary256MiB/home384MiB allocation in its existing script-disabled, credential-free namespace. Every subsequent repository command has a new network-isolated namespace with temporary512MiB/home128MiB. Both phases keep workspace2816MiB/shared128MiB/coordinator512MiB and the same4GiB total ceiling. No cache moves to a host/unbounded mount, and the install cache disappears with its namespace.
- Added pre-execution aggregate checks for both phase budgets, individual-increase rejection for both new constants, actual mount capacity checks, a200MiB fully written public install cache and proof it is absent from the subsequent execution namespace. The external public-only suite `sandbox-public-phase-budget` passed12groups, exit0,4m29.162s. This covers synthetic commands and boundary behavior; the new real npm install/full application CI is still pending.
- Actual CI821 artifact review also found three desktop retry failures (late-location panel, archived-trip restore, map provider button) and a shard4 hard deadline without final E2E counts. They are not all proven to share the temporary-space cause. Keep failOnFlakyTests, preserve artifacts and investigate any recurrence. Do not raise deadlines or weaken locators/assertions.

### CI823 remaining touch-target setup race

- CI823 run34152798505 at529b1ea948c0da04bc3b7b05c3e498b5184684ff completed FAILED solely on one sandbox4 retry-flaky touch-target test. Quality613unit/contract, lint/typecheck/build/audit0/performance and ordinary379desktop/378mobile/existing1skip passed. Actual sandbox shards:190PASS(16.1m),190PASS(17.4m),189PASS(13.0m),187PASS/1FLAKY/1existingSKIP(16.9m). Aggregate756PASS/1FLAKY/1SKIP; no full PASS. All four actual installs succeeded. The prior installation ENOSPC and Chromium crash cascade did not recur.
- `touch-target-contract.spec.ts` waited a fixed2s before an immediate reconnect-button count. Its failure-time resource sample had workspace809MB/tmp507MB free; the subsequent error-context snapshot already contains the reconnect control. This is a race with the asynchronous fallback map, not evidence that the44px control was removed. The screenshot and trace remain in `D:/wave-resume-20260907-347/ci-823-shard4`; all logs/artifacts are also in `ci-823-all-sandbox` and `ci-823-all.log`.
- Planner setup now reaches the map and asserts the fixture's actual osm state plus visible reconnect button before retaining the original immediate DOM-count, visibility, elementFromPoint coverage,44px and total-count assertions. Other-page2s settling remains unchanged. No test/selector/assertion deletion, new skip, timeout/worker/DPR/viewport/trace/performance or resource-limit change. This test correction still requires a fresh full CI.
- Exact529 Preview `levfej2zj` READY37s and actual KO320/EN320+1366 keyboard/region/ODsay/archive/recovery observations are recorded in PR334. Independent review5134661615 is PENDING, not PASS. Raw API smoke was unavailable behind Preview authentication/tool access; no authentication was copied. All remaining product/Production/human gates stay open.

## CI824: headless-shell crashes after successful Roadview assertions

At48717863d1e149426ee74f64431e4428d44e66d6, CI82434154515573 sandbox4 reports187PASS/1flaky/1existing skip. The touch-target readiness regression passes. The remaining Roadview English dark failure is browserContext.close after all UI,11viewport and axe assertions completed; trace test body completes in about10s, so this is not a45s assertion timeout. Headless-shell1234 emits SharedImageManager errors and SIGSEGV during context teardown. Public samples still have workspace1.39GB/tmp479MB available. Artifacts and raw trace are preserved under D:/wave-resume-20260907-347/ci-824-shard4. Other shard totals are pending; do not report overall success.

Use the same bundled Chromium revision via Playwright channel chromium (full Chromium new headless implementation), documented at https://playwright.dev/docs/browsers and https://github.com/microsoft/playwright/issues/33566 . No package/version change, no custom flags disabling assertions or graphics, no deleted tests/assertions, no new skip, no timeout/worker/DPR/viewport/trace or sandbox resource increase. Explicit executable overrides retain their existing contract. This is a candidate runtime correction, not yet proven; full fresh CI and browser verification remain mandatory. No host repository npm, queue tick, paid API, scheduler, merge,Production or008 execution.

Exact487 Preview2gPyTsp8SpBqzTtuhp3gPTqJo3Hp READY36s at https://wave-barrier-free-gyeongnam-2425rmgu1-jeongiryang-projects.vercel.app . Actual KO320 keyboard recommendation5 ->save2/date2026-09-08/order/map2; region Cancel returns focus and preservesChangwon, explicitAddJinju keeps2places, ENdark/reducedNewTripTongyeong+reload clears current itinerary. Car and transit both remain0/2unverified on this deployment; earlier52947/52min evidence is not reused. Runtime log connector403; no provider success claim. Production34e6021 unchanged, health200scopeconfiguration at2026-09-07T19:19:02.658Z. Latest independent QA5134759982 PENDING487; all original dirty10 raw hashes still match.

CI824 sandbox3 also completed with188PASS/1flaky, nearby dark multi-viewport case. Its trace/log likewise records headless-shell1234 SIGSEGV with the same null fault instruction suffix during teardown. Artifact D:/wave-resume-20260907-347/ci-824-shard3 is preserved. This independent second case supports investigating the shared browser process rather than altering individual assertions.

## Saved-place status after explicit regional recovery

Actual487 Preview at1366px ENdark shows2/2mapped places and preserved2026-09-08/date/order after explicit regional search, while both public-ID lookup entries still say not found. The component stored lookup outcomes independently of the current places. It now derives the visible status from the matching current place: a later restored coordinate gets a plain current-availability message, never a fabricated new official lookup success. Removed places have no stale result row; a formerly checked location that is no longer valid requests another check. The activated button stays mounted; no post-hoc focus movement or new fetch occurs. The region declares KO/EN and original place names keep their own language.

The existing KO/EN empty-lookup -> keyboard alternative -> explicit regional search E2E now asserts both the initial empty result and the restored availability, absence of obsolete empty/false official-success text, preserved disabled control and language metadata. Existing IDs/date/order/privacy/overflow/retry/focus assertions remain. Source review and git diff --check pass; no local app execution. Fresh full CI and actual Preview remain pending.

CI824 final failure: ordinary desktop379PASS18.8min/mobile378PASS20.7min/existing1skip; quality613PASS/0fail/0skip, both audits0,lint/typecheck/build/performance PASS. Two sandbox teardown flakes keep validate FAIL; no release or QA PASS.

## CI825: connected-map toolbar capacity and current-deployment assets

CI82534156023618 at664a1b340c930b2addb11707521c766caac0c3c9 FAILED: ordinary desktop378PASS/1FAIL/0flaky;mobile377PASS/1FAIL/1existing skip/0flaky. Both attempts fail the unchanged map-tools-reachable end-scroll assertion (4 hidden groups, required <4). Full Chromium exposes the classic-scrollbar width case. The screenshot has a partly clipped map-display button; final image/page-link checks pass. A fixed330px status reservation wastes actual space beside the short connected-map label. The connected state now gives label and controls a shared flex row at desktop widths, preserving control DOM across provider changes, font size, touch size, horizontal scrolling and fallback recovery layout. At320px the actual English Preview scroll rail is116.2px while Route points is138.2px; the small-screen expand control now uses its existing icon with the full screen-reader name retained, freeing room for the long tools. Added KO/EN320..1440 no-overlap, keyboard focus, full route/share visibility and44px checks. Every previous assertion, including the failing <4 threshold, remains unchanged. No skips/deletions/timeout/worker/budget changes. git diff --check PASS; full new CI/Preview pending.

All four actual sandbox jobs hit their existing20minute process-group boundary after install,lint,typecheck,unit,build,performance, without final E2E totals; these are failures, not completed suites. Artifacts preserve14failed traces in shard1. Full Chromium now requests the document icon: compact-landing and English-conditions traces identify https://wave-barrier-free-gyeongnam.vercel.app/favicon.svg with ERR_INTERNET_DISCONNECTED. This is a real cross-origin UI-asset dependency caused by metadataBase resolving metadata.icons. The follow-up keeps the same favicon through explicit origin-relative head links, with no network exception or console filtering. Public boundary and quality613PASS/0fail/0skip passed. Full log/artefacts: D:/wave-resume-20260907-347/ci-825-all.log and ci-825-all-sandbox; ordinary desktop HTML trace report ci-825-browser-1. No browser crash fix or full sandbox success is claimed from this run.

Exact664Preview3Wh1fGzCiLAz1TNoPTx93sbadWAL READY35s at https://wave-barrier-free-gyeongnam-4n92xhix6-jeongiryang-projects.vercel.app . Actual unmocked Changwon/access-paths/nature search yields5KTO places; Sahwa2784014 saved with2026-09-08, actual car17minutes/1of1, transit0of1unverified. Archive restore intentionally has map0 until explicit lookup; actual public-IDempty followed by explicit regional KTO search restores matching place/map1/date and shows truthful current-availability in KO/EN, never false official-success. ENdark/reduced, focused preserved recheck and11actual DOM viewport sizes320x568 through2560x1440:document/recovery overflow0. Initial new tab was958x854, not1366; only subsequent explicit viewport assertions establish the listed sizes. CUA screenshot capture did not match DOM scroll position, so those screenshots are not claimed as visual acceptance evidence. Independent QA5134870313 PENDING at664. Production/main34e6021,3human approvals,unresolved threads,008operational gate and blocked-sandbox remain unchanged. No local repository npm/queue/auth/paid model execution.

## CI826: retained full label and focused-tool reveal

CI82634157666889 at ebddb70443e75b748d2085ac2d32e46ea7e66778 FAILED. Quality and all four real sandbox jobs stop at the existing mobile-control source contract: splitting the expand icon from its hidden label removed the contiguous full-name literal. Added the unchanged KO/EN full accessible name explicitly as aria-label; no contract change. Ordinary desktop381PASS/1FAIL and mobile380PASS/1FAIL/1existing skip,0flaky. The original end-scroll <4 assertion and same-origin favicon regression PASS in both projects. The added KO layout test exposes partial clipping when focusing Route points from the end of the rail at1440px; retained screenshot/trace show its left edge remains outside. The component now scrolls only the horizontal tool rail by the missing distance on focus capture; it never calls focus, replaces a control, scrolls the page, or starts an asynchronous focus return. Existing focused-button/geometry/touch assertions remain unchanged. No new skip, test deletion, assertion relaxation, timeout/worker/browser/resource/performance change. Full new CI remains required; no overall sandbox success claim.

Artifacts: C:/Users/USER/Desktop/GitHub Repository/wave-resume-826-artifacts/browser-regression-{1,2}. Existing D:/wave-rc-integration-20260907 worktree retained after execution permissions changed to a managed workspace; no checkout/stash/reset/move. Exactebddb70 Preview DoPJ2eWJR46Nsaiau1w1n1TkdRkg READY34s at https://wave-barrier-free-gyeongnam-934ujw3zz-jeongiryang-projects.vercel.app ; real1366x768 Changwon explicit access-paths/nature search gives5KTOplaces and Sahwa2784014 adds to2026-09-08 withmap1. PrimaryKakao map not connected; alternate map remains usable. This is not a sameHEAD full journey PASS. Production/main remain34e6021,008andhuman gates and blocked-sandbox unchanged.

## CI827: measure displayed landing controls after streamed content is ready

CI827 at d06f5368f7812fa9cae1ed32e659ae3f85c3d1dc passed quality:613/613 unit-contract,0skip; lint0errors/2existing warnings;typecheck;Vercel build;production/development audits0;CSS69.95/70KiB,planner269.96/270KiB. Public sandbox-boundary passed. Actual sandbox shard3 completed190PASS/1FLAKY at the unchanged1363px 44px-control contract. The original trace shows every queried node, starting with the brand, has width/height0 because React streaming content is still in hidden div S:0 after load; the failure screenshot subsequently shows those controls. Added visible-brand and enabled-help readiness assertions before the existing bulk measurement. The original selector,minimum25targets and every44px width/height assertion remain unchanged. No fixed delay,timeout increase,skip,resource or browser relaxation. Other CI827 jobs were pending at edit time; full fresh CI is required.

Same d06 Preview6YtWPmyV2GwZXes8GsyCjnAVsXaD READY37s at https://wave-barrier-free-gyeongnam-isc1uoa4c-jeongiryang-projects.vercel.app. Live320x568 KO/EN reverse-Tab reaches fully visible Route points (KO112.34x52px,EN138.20x52px),no positive page overflow. KO screenshot confirms visible focus. New verification tab restored Sahwa2784014 on2026-09-08,map1;explicit all-leg car query returns1/1,23min Kakao Mobility. Primary map delayed and alternative map used;transit unverified. Console errors0 in this partial smoke;not full Preview PASS,not independent QA,not Production.

CI827 final FAILED:ordinary desktop/mobile jobs SUCCESS;actual sandbox shards1/2 each191PASS,shard3 190PASS/1FLAKY,shard4 189PASS/1FLAKY/1existing skip. Shard4 Roadview KO dark crashes full Chromium during the eleventh viewport change (2560x1440,Pixel7 DPR unchanged),after preceding sizes pass;only test.trace survives browser termination. Disk diagnostics show workspace1.397GB/tmp348MB available;no ENOSPC evidence. This remains unresolved and is not claimed fixed by landing readiness. Browser revision1234/full Chromium is unchanged. The next full run validates the concrete readiness correction while retaining the browser failure as a release blocker pending evidence.

## Full Chromium exit diagnosis (unresolved)

The independent QA FAIL on bfcbcc5 correctly retains the CI827 full Chromium crash as unresolved even if a later run passes. Add the official pw:browser process diagnostic before the installed @playwright/test/cli initializes, only in the existing /workspace+/browsers CI view. This selects logging, not a sandbox security assertion. The same process imports the same pinned official CLI and inserts its existing test subcommand;caller arguments,exit behavior,tests,workers,retries,timeouts,viewport/DPR,resources and assertions are unchanged. No pw:api/protocol,environment dump,auth copy,dependency upgrade or new paid service. The public CLI export is verified in Microsoft v1.62.1 package metadata;official diagnostic documentation:https://playwright.dev/docs/ci. This diagnostic is not a crash fix and requires actual full CI evidence.

CI828 actualsandbox shard2:190PASS/1FLAKY. Date legacy English-dark setup clicks preferences while the header remains scroll-hidden after Control+Home;45s log repeatedly reports outside viewport,screenshot remains at recommendation cards. Establish keyboard focus on the same summary and assert focused/in-viewport before the unchanged click and language selection. This uses the existing header focus-reveal behavior;date/place/order/calendar/console/axe assertions and limits are unchanged. No product focus-restoration workaround. Other shard results pending at edit time.

CI828 final FAILED at bfcbcc5d165f3e35785a5189aeae51e03a619e0c (run34169101977): ordinary desktop382PASS21.6m/mobile381PASS22.6m+1existing skip,0flaky;quality and public boundary PASS. Actualsandbox1:191PASS;2:190PASS/1FLAKY(date setup above);3:190PASS18.2m/1FLAKY(nearby dark context teardown, browser Received signal11 SEGV_MAPERR);4 stops at the existing1200second process-group boundary and exports only install/lint/typecheck/unit/build/performance logs, no E2E result. Shard4 E2E completion is unverified, never a PASS. Shard3 failure has workspace1.293GB/tmp528MB free after failure;full Chromium did not solve the crash. Added process diagnostics are for the next reproduction, not a proposed security-boundary or crash fix. Syntax-only node --check and git diff --check PASS; repository application code was not executed on the authenticated host.

Exact bfcb Preview CAyqfEj1zfyQtfzdB4Uvoyp5gSK3 READY33s at https://wave-barrier-free-gyeongnam-fhc2wmwox-jeongiryang-projects.vercel.app . Live neutral planner -> Changwon/access-paths/nature explicit search yields5KTOplaces -> Sahwa2784014/date2026-09-08/map1 -> Jinju region confirmation -> Cancel preserves previous itinerary. All-leg car1/1,22min;KO/EN320px reverseTab fully reveals52px route control,consoleerrors0. Primary map delayed/alternative usable;partial smoke only. New P1 observed for next unit: itinerary/map Sahwa29.9percent but Departure claims Checked Daesan Flower Land38.3percent (plan.crowd not matched to itinerary place/date). No fix or overall Preview PASS claimed. Independent QA bfcb FAIL2026-09-07T23:14:40Z retains unresolved browser crash;no sameHEAD independent PASS. Production/main34e6021,008operational evidence and three human approvals remain gates.

## Owner-directed RC convergence scope ? 2026-09-08 KST

Stop additional sandbox hardening/reproduction research. Preserve all40worktrees,dirty10,commits,logs,traces and current bootstrap/kernel/filesystem/network protections. Full application sandbox runtime CI827/828 failures remain historical unresolved infrastructure evidence, explicitly deferred POST-RC; they are not product regression failures and are not described as fixed. Move the prior complete CI YAML to .github/workflow-archive/ci-full-sandbox-pre-rc.yml (not executable by Actions). Keep quality, both full browser shards and sandbox-boundary jobs byte-equivalent in parsed YAML. validate now requires these three results, rejecting failed/cancelled/skipped/unknown results. Existing boundary job includes six bounded synthetic npm commands and real sentinel checks. No product tests removed or weakened; full hosted lint/typecheck/unit-contract/both audits/build/performance/Playwright-axe and failOnFlakyTests stay unchanged. Contract tests retain archived shard/runtime/bootstrap assertions and add active-vs-archive full-job equivalence.

Trusted-only policy: current immutable Owner work orders and same-repository/exact-HEAD checks remain; no external input becomes a command or trusted execution merely from a label/comment. Queue remains inactive; no model API false gate was enabled. Full trusted-only automation smoke is distinct from this RC CI simplification. Follow RC technical gates, exact Preview and independent QA, existing thread evidence, then actual repository merge policy and Production/migration safety. After RC, #353 design/service story/intro/media is next product work.

Local targeted validation: initial node --test tests/ci-completion-gate.test.mjs could not import js-yaml because this worktree had no installed dependencies (0pass/1loader failure); no assertion ran. npm ci --ignore-scripts prepares the reviewed lock without lifecycle execution. Subsequent node --test tests/ci-completion-gate.test.mjs tests/automation-control-plane.test.mjs:6PASS/0FAIL/0SKIP. This is a targeted contract result, not full CI or sandbox smoke. Full CI remains required on the next commit.

## RC product correction ? departure evidence identity (Refs #280)

Live bfcb Preview itinerary/map Sahwa2784014 was paired with Departure Checked Daesan38.3%. Root: DepartureReadinessCard always used plan.crowd (first recommendation), and assessment accepted any numeric rate without itinerary identity/date. Reproduced five new unit cases failing before the fix: KO/EN identity/date mismatch, ready-state false authorisation, ambiguous same-name places.

The card now consumes the selected route destination forecast with its place ID, or the plan forecast when no destination forecast exists. A rate can confirm only one uniquely matching saved place and its assigned date, with finite0..100 data and an explicit matching provider reference date. Wrong/removed/ambiguous place or other/missing date stays recheck without showing the unrelated percentage. One matching forecast among several itinerary places is partial. This does not claim the provider supports future date requests: no matching date evidence means recheck. Unqueried/empty ready transport never asserts API authorisation; individual lookup detail remains in navigation. Existing readiness and KO/EN calendar assertions remain, with success fixtures now specifying the actual place and visit date instead of stale August data.

Local trusted RC validation after the Owner scope reset: lint0errors/2existing warnings,typecheck PASS;full unit-contract619PASS/0FAIL/0SKIP. Targeted Playwright+axe on both original projects:30PASS46.0s/0FAIL/0FLAKY/0SKIP (departure identity, readiness, language;320/960/1366,light/dark,keyboard/focus,calendar success/failure/retry). Two new identity E2Es assert selected Lake31.5% rather than Museum24%, original-name language,focus,overflow0 and axe0. Public fixture screen captures retained under C:/Users/USER/Desktop/GitHub Repository/wave-resume-828-artifacts/departure-results;KO320 visually reviewed. These are mocked local results, not Preview provider evidence.

Build PASS; initial budget failure271.04/270KiB. Separating calendar serialization with a re-export still eagerly included it (271.11); a narrow assessment import and unchanged compatibility export isolated the calendar to explicit download. Removing cheap useMemo bookkeeping and counting all remaining providers yields269.99/270KiB. CSS69.95/70,largest95.92/110;no budget increase. Calendar implementation moved without behavior changes;public API remains. Both dependency audits0. New full hosted CI,exact Preview,independent QA and Production remain pending. Historical sandbox crashes are deferred per Owner scope, not fixed.
