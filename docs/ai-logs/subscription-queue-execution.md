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
