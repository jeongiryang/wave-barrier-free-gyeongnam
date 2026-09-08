> Current RC scope, Owner instruction 2026-09-08 KST: product quality and the complete Playwright/axe suite run in the ordinary GitHub-hosted quality/browser jobs. The frozen sandbox-boundary job retains immutable bootstrap verification, credential/filesystem/network/resource checks and its existing six-command bounded synthetic npm smoke. The four duplicate full-application sandbox shards are preserved in `.github/workflow-archive/ci-full-sandbox-pre-rc.yml`, outside the active workflow directory. Their CI827/828 timeout/SIGSEGV evidence remains unresolved POST-RC runtime history, not a repaired product defect or a release requirement. No product test, assertion, skip, timeout or performance limit changes.
>
> Local automation remains inactive until a trusted-only real smoke is verified. The present pinned executor accepts only immutable Owner work orders and same-repository, exact-HEAD PRs. There is no implicit collaborator/App trust or external-input promotion. External/fork/arbitrary-code inputs are read/triage only. Before activation, recheck task and code provenance; retain the current false gates, cost policy and installed isolation. The historical four-shard local publication path below is frozen, not an active zero-touch completion claim.

# 구독 실행 대기열과 실제 실행 검증

Refs #288, #294, PR #289. 2026-09-07 기술 구현 기록. 전체 자동화 완료 선언이 아니다.

## 기존 구성과의 관계

- #288의 소유자 작성 `wave-work-queue:v1` 댓글은 제품 우선순위와 기존 담당을 유지한다.
- 새 `automation/queue-state` 브랜치는 실행 잠금·HEAD·검증 receipt만 저장한다. main/제품 브랜치를 대체하지 않는다.
- `wave-work-order:v2`는 기존 Issue 안의 작고 승인된 범위 한 개를 실행에 연결한다. 다른 작성자의 제안도 감지하지만 그 본문을 실행 권한으로 취급하지 않는다.
- #296/#298/#300의 API workflow는 원격 disabled_manually, 관련 job은 false를 유지한다. 이 실행기는 GitHub Actions에 구독 인증을 전달하지 않는다.
- 구현과 QA는 서로 다른 도구 없는 ephemeral Codex CLI 프로세스다. GitHub 게시를 담당하는 로컬 조정기는 모델에게 GitHub credential을 넘기지 않는다.

## 현재 구현 경계

| 구성 | 구현 | 실제 활성/실행 판정 |
| --- | --- | --- |
| 전체 작성자 Issue/PR·최근 CI 실패 감지 | `subscription-queue-cli.mjs scan` | 읽기 전용 실제 조회 확인; Issue 49/PR 44, 실패 조회 창 100건. 전체 과거 실패 전수 조회와 구분 |
| 공식 메일·Production 버그 | 기존 Work 예약에서 GitHub Issue로 인계 | 로컬 실행기가 Gmail 인증을 읽거나 복사하지 않음; 실제 최신 인계 receipt 필요 |
| 승인 범위 | 수정되지 않은 소유자 댓글의 구조화 작업 명세 | 일반 Issue/메일/댓글은 권한 없음. 임의 shell·경로·validation 명령 거부 |
| 공용 잠금 | Contents SHA 비교, 30분 임대, 단계별 최대 2회 | 경합/만료/이전 소유자 차단은 계약 테스트; 실제 GitHub 경합 시험 별도 기록 |
| 코드 제안 생성 | 구독/포함 한도 확인, 도구 없는 파일 제안 | 실행 직전마다 확인. API·credit fallback은 없음 |
| 무인 문서 작업 | 별도 worktree에서 수정·기존 전체 검사·원자적 게시 | #294 명세→구독 수정 d58e893→기존 #289 atomic push→CI 성공 실제 확인. 재실행은 modelCalls 0. 후속 QA FAIL로 아직 완료 아님 |
| 일반 애플리케이션 작업 | 범위·상태 계약 존재 | `blocked-sandbox`: 생성 코드를 인증이 있는 PC에서 실행할 격리 검증이 아직 없음. 문서 smoke로 코드 실행까지 완료했다고 하지 않음 |
| 별도 QA | 새 CLI 프로세스·CI/HEAD 고정·GitHub receipt | d58e893의 실제 별도 QA가 과도한 완료 표현을 발견해 FAIL과 수정 대기열 기록. 최초 준비 실패도 QA 시도 횟수에 포함하며 임의 초기화하지 않음 |
| Notion 환류 | HEAD/digest가 고정된 미확인 보고 상태 | 무료 block 한도 응답으로 쓰기 중단. 최종 QA 보고는 미확인 상태이며 ack하지 않음; 로컬 CLI에 Notion credential 없음 |
| 병합/배포 | 기존 CI/CD 보존 | 사람 승인 3건과 보호 규칙, Preview·Production gate 유지 |

## 작업 명세

현재 사용자에게 위임된 범위를 #288 담당 기록과 대조한 뒤 기존 Issue에 다음 형식으로 한 번 기록한다.
명세 댓글을 수정하면 실행은 거부된다. 변경은 새 명세 댓글로 남기며 기존 이력을 보존한다.
`baseSha`는 대상 PR의 현재 HEAD, `scope`는 기존 파일의 정확한 경로 목록이다.

````text
<!-- wave-work-order:v2 -->
```json
{
  "version": 2,
  "issue": 294,
  "priority": "P1",
  "baseSha": "대상 PR의 40자리 HEAD",
  "branch": "chore/automation-control-plane",
  "pullRequest": 289,
  "scope": ["docs/subscription-only-automation.md"],
  "acceptance": ["확인한 예약 근거와 미검증 범위를 구분해 오래된 설명을 수정한다."],
  "validation": "documentation"
}
```
````

작업 명세에는 메일 원문, 개인 이메일, 신청자 정보, 인증키나 비밀번호를 넣지 않는다.
현재 정책상 신뢰된 댓글 작성자는 `jeongiryang`이다. 새로운 GitHub App actor를 임의로 신뢰 목록에 넣지 않는다.

## 명령과 중단 후 재개

대상 PR 안에서 `node scripts/...` 또는 Python helper를 실행하는 과거 진입 방식은 폐기했다. 검토된 실행기 12파일을 체크아웃 밖에 고정하고 manifest의 SHA256을 외부 예약 설정에 pin한다. [설치 신뢰 경계](subscription-trusted-installation.md)를 먼저 적용한다. 아래 변수는 외부 설치 경로·pin·대상 저장소·공식 Codex 경로이며 인증 파일 내용은 전달하지 않는다. 현재 예약 등록과 실제 tick은 차단 상태다.

```powershell
python -I "$install/scripts/subscription-launch.py" --manifest "$install/manifest.json" --pin "$manifestPin" --repository "$repository" --verify-only
python -I "$install/scripts/subscription-launch.py" --manifest "$install/manifest.json" --pin "$manifestPin" --repository "$repository" --phase queue --command scan
python -I "$install/scripts/subscription-launch.py" --manifest "$install/manifest.json" --pin "$manifestPin" --repository "$repository" --phase implementation --issue 294 --codex "$codex"
python -I "$install/scripts/subscription-launch.py" --manifest "$install/manifest.json" --pin "$manifestPin" --repository "$repository" --phase qa --issue 294 --codex "$codex"
python -I "$install/scripts/subscription-launch.py" --manifest "$install/manifest.json" --pin "$manifestPin" --repository "$repository" --phase tick --codex "$codex"
```

- `scan`은 읽기만 한다. `observe`는 성공적으로 조회한 이벤트 키만 저장하며 같은 입력의 재실행은 추가 상태 커밋을 만들지 않는다.
- 일반 댓글/updated_at은 이벤트 키에서 제외한다. 승인 명세 댓글만 별도 revision으로 감지한다.
- 구현 결과와 실행 상태는 **같은 atomic Git push**로 갱신한다. 둘 중 하나라도 최신 ref와 충돌하면 둘 다 실패하며 강제 push/부분 게시로 전환하지 않는다.
- 마지막 검사 전 lease를 갱신한다. 프로세스가 중단되면 30분 뒤 새 실행이 최대 두 번째 시도로 소유권을 얻는다. 이전 token의 결과는 거부한다.
- CI 실패/QA 실패는 증거를 보존하고 15분 뒤 한 번만 재시도할 수 있다. quota/auth/외부/격리 문제는 자동 재시도하지 않는다.
- 운영자가 원인을 해결했다면 고정 launcher의 `--phase queue --command resume --issue 294`로 명시적으로 재개한다. 횟수는 초기화되지 않는다. 다음 실행에서 인증·한도·HEAD·격리를 다시 검사한다.
- 격리 worktree와 로컬 실패 로그는 보존한다. 사용자 작업 폴더나 실행 중인 다른 프로세스를 삭제·종료하지 않는다.
- 같은 구현 결과의 재실행은 `duplicate: true, modelCalls: 0`으로 끝나야 한다. 실제 결과는 첫 smoke receipt에 기록한다.
- `tick`은 승인 명세 감지 → 등록 → 기존 CI/HEAD 갱신 → 우선순위 순 한 작업만 실행한다. 한 번 끝나면 종료하며 자체 예약이나 무한 poll을 만들지 않는다.
- Notion의 실제 갱신과 재조회 후 `ack-report ISSUE DIGEST`를 실행한다. 최신 PR HEAD가 다르면 거부한다. 이 명령 자체는 Notion에 쓰지 않는다.

## 기존 예약에 연결할 설정

새 예약을 중복 생성하지 않는다. 2026-09-07 현재 Work PM 채팅의 기존 예약 상세를 읽을 수 있었고
독립 AI QA는 PR·리뷰·PR/리뷰 댓글·커밋 이벤트를 감시했다. 설정 변경 없이 조회했다.
대기열 예약은 매시간 실행으로 표시됐고, 조회 중 목록의 이름이 `W.A.V.E AI Release Owner`로 바뀌었다.
다른 PM 작업이 설정을 갱신 중일 수 있으므로 현재 목록을 다시 조회한 뒤 아래 로컬 연결을 반영해야 한다.
이 관찰은 전체 계정 예약 목록을 확정한 것이 아니다.

1. 기존 웹 예약: GitHub #288 우선순위·담당 확인 → 승인 범위의 immutable v2 명세 → 확정된 GitHub 상태만 Notion 반영.
2. 로컬 프로젝트 예약: 기존 항목이 있는지 먼저 확인. PC 켜짐·앱 실행·프로젝트 경로·네트워크·ChatGPT 로그인·포함 한도를 조건으로 매시간 한 작업만 처리한다.
3. 로컬 명령: `scan` → 신규 work_order의 `enqueue` → `implementation`; ci-pending은 다음 조회의 `refresh` 후 별도 `qa`. blocked/active lease이면 아무 구현도 하지 않는다.
4. 공식 웹 이벤트는 로컬 PC를 호출하지 못한다. 이 둘 사이의 프로젝트 예약은 관리 UI에서 실제 등록·수동 실행·예약 실행을 각각 확인해야 한다. CLI 파일 작성은 예약 등록이 아니다.
5. QA의 GitHub receipt와 HEAD가 현재 PR과 일치할 때만 기존 Notion 항목을 갱신한다. 새 실패/해결/사람 조치 외에는 알림하지 않는다.

현재 Executor는 로컬 예약 관리 UI를 통해 등록하지 않았다. 별도 Windows 서비스, 모델 API, 클라우드 유료 실행기를 추가하지 않는다.

## 비용과 검증 증거

### 격리 실행기 재개 후보 (비활성)

문서 작업도 호스트 npm 실행을 허용하지 않는다. `scripts/subscription-sandbox.mjs`와 `.py`는 검증된 bubblewrap 경계를 사용한다. Windows는 기존 WSL의 `/usr/bin/python3` bridge로 호출하며 Linux Node가 필요하다. 호스트 검사 fallback은 없다. 기본 설정이 없으면 `BLOCKED_SANDBOX`다.

저장소 밖 설정 파일은 version=1과 Linux 절대 경로 `bwrap`, `runtime`(Node 배포 루트), `browsers`(사전 준비된 Chromium), `scratch`(보존할 시험 로그), 검증한 바이너리 `bwrapSha256`, `nodeSha256`만 받는다. `WAVE_VALIDATION_SANDBOX_CONFIG`에는 그 로컬 설정 파일 경로만 지정한다. 인증·Secret·토큰 값은 설정에 넣지 않는다. 설정을 준비한 것과 예약 환경에 등록한 것은 별개다.

활성화 전 CI의 공개 canary 정상/비격리 대조/가짜 종료0/악성 npm 검사와 bootstrap 변조 검사를 모두 확인한다. 로컬 probe도 별도로 검토해 외부에 복사한 설치물을 사용하며, 대상 PR의 test/helper를 호스트에서 직접 실행하지 않는다. 합성 보안 시험은 제품 lint·unit·Playwright 성공이 아니다. 전체 제품 검증에는 같은 helper로 모든 명령의 성공이 추가로 필요하다. 별도 최신 HEAD QA PASS와 #294의 시도/재개 조건도 필요하며, 실패 횟수를 초기화하거나 자동 재시도를 늘리지 않는다. 현재는 실제 queue tick을 실행하지 않는다.

Chromium 준비, 최종 전체 검증과 독립 QA는 아직 완료되지 않았다. 기존 문서 smoke 이력으로 이 경계를 통과한 것처럼 표시하지 않는다. 실제 준비·실행·차단 근거는 [AI 로그](ai-logs/subscription-queue-execution.md)의 최신 격리 절에 연결한다.

초기 2026-09-07 공식 로컬 app-server quota 검사는 모델 turn 0이었다. 이후 실제 구현/QA는 각각 별도
ChatGPT 구독 프로세스로 실행했다. 아래 실제 증거와 fixture 검증을 구분한다.
GitHub 저장소는 public이다. [표준 GitHub-hosted public runner는 무료](https://docs.github.com/en/billing/concepts/product-billing/github-actions)이나
계정 billing usage 조회는 HTTP 404로 접근 불가였다. 저장소 공개 여부만으로 공유 저장소 용량·모든 서비스 비용이 0이라고 단정하지 않는다.
기존 표준 runner와 artifact 보관 정책을 유지하며 유료 larger runner를 도입하지 않는다.

## 2026-09-07 실제 실행과 중단 경계

- 승인된 기존 작업: [#294 명세](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/294#issuecomment-5566069634).
  문서 한 파일을 수정한 `d58e893d17e8d880aee42a12cb62aec83deca934`를 기존 #289에 원자적으로 게시했다.
  로컬 lint/typecheck/unit306/Vercel build/performance, 전체 Playwright237 PASS/기존skip1/실패0,
  [CI34091892987](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34091892987) 성공이다.
  같은 구현 실행을 반복했을 때 `ci-pending`, `duplicate:true`, `modelCalls:0`, 새 PR 0이었다.
- 첫 QA 준비는 git worktree 생성에서 실패했고 모델은 실행되지 않았다. 원래 Git 오류 상세가 남지 않아
  원인을 추정하지 않는다. 같은 fetch/worktree 생성의 수동 점검은 성공했으며, 안전한 오류 분류를 추가하고
  횟수를 유지한 명시적 resume 후 별도 QA를 실행했다.
- [실제 QA FAIL](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/289#issuecomment-5566335607)은
  기술 재개 항목의 Notion 완료 표현을 지적했다. 15분 대기와 수정 대기열 복귀를 확인했다.
  실패 지적을 receipt에 저장하고 같은 HEAD의 과거 URL-only receipt를 검증해 읽는 경로를 보완했다.
  다른 작성자·HEAD의 댓글을 작업 권한으로 읽지 않는다. QA 시도 2회 소진은 유지하며 새 명세로 우회하지 않는다.
- 초기 metadata 전용 브랜치에 `vercel.json`이 없어 **불필요한 Preview 14건이 실패**했다.
  원격 상태 브랜치에 `git.deploymentEnabled:false`를 추가한 `2d1322cd6da389ffae34d00e41aaa03aad0dc681`을 보존한다.
  초기 브랜치 첫 커밋부터 이 설정을 포함하고, 상태 쓰기와 atomic publish 직전에도 검사하도록 수정했다.
  07:18 UTC Vercel 목록 재조회에서 queue 배포는 여전히 14건이며 마지막은 수정 전 `382b4fa`였다.
  이후 QA claim/실패 환류/두 번째 구현 claim에도 추가 metadata Preview가 생성되지 않았다.
  실패 기록은 삭제하지 않는다. 이는 모델 API 실행이 아니며 추가 과금 유무는 확인되지 않았다.
- Notion은 06:35 UTC 무료 block 한도 도달 응답(표시된 유예 종료 2026-09-08 11:21:22 UTC) 이후 쓰기를 중단했다.
  업그레이드·다른 페이지로 우회하지 않는다. 최종 QA→Notion 갱신/재조회/ack는 미완료다.
- 설치된 Codex 0.130.0의 Windows sandbox를 공개 시험 파일과 로컬 시험 서버만으로 검사했다.
  작업 폴더 내 쓰기/외부 쓰기 차단은 성공했으나 외부 시험 파일 읽기와 로컬 연결은 허용됐다.
  실제 인증 파일은 읽지 않았고 모델 호출은 0이다. 이 구성으로 일반 생성 코드를 실행하지 않는다.
  `blocked-sandbox`를 유지하며 읽기·쓰기·네트워크를 모두 제한하는 실행 환경 증거가 필요하다.

실행 script, 현재 웹 감시 task, 실제 로컬 예약 등록, 무인 종단간 성공은 각각 다른 상태다.
아직 일반 코드 작업·최종 별도 QA PASS·Notion 반영·로컬 프로젝트 예약 실행까지 연결된 성공 증거는 없다.

[공식 Scheduled 조건](https://learn.chatgpt.com/docs/automations), [ChatGPT 인증](https://learn.chatgpt.com/docs/auth),
[포함 사용량 정책](subscription-only-automation.md), [Control Plane](automation-control-plane.md).
# Aggregate storage boundary candidate — 2026-09-07

CI810 exposed Ubuntu AppArmor's intentional denial of nested user namespaces in the default bwrap child profile. The disposable CI runner now installs the same verified bwrap bytes at `/opt/wave-quota/bwrap` with `.github/security/quota-owner.apparmor`, and supplies the optional absolute `quotaBwrap` configuration. Both executables must match `bwrapSha256`; an arbitrary owner binary is rejected. No global AppArmor/sysctl setting is disabled. Local WSL can retain the default when this restriction is absent; no profile or installed pin is changed on the user's PC by this repository change.

The dedicated profile belongs to the trusted mount owner and lets its pinned helper construct the inner namespace. It inherits into its descendants; task confinement therefore explicitly relies on the kernel bwrap mount/network boundary, zero permitted/effective/bounding capabilities, and `--disable-userns --assert-userns-disabled`. Public per-command tests verify zero caps, failed additional unshare, read-only root/dev, and bounded auxiliary tmpfs. Do not apply this owner profile as a substitute for the inner launcher, or approve local activation from a workflow file alone. Exact-head CI and independent review remain required.

The external helper creates bounded kernel tmpfs mounts for the full dependency/install/check/export lifetime. After CI819 measured workspace exhaustion, the same total capacity is repartitioned: workspace 2816MiB, temporary 512MiB, home-cache 128MiB and shared memory 128MiB (candidate total 3.5GiB); the coordinator temporary mount remains 512MiB. The public buffer reproduction accompanying CI821 showed that the intermediate 256MiB temporary allocation cannot hold concurrent rendering buffers. Repository execution returns to the original512MiB temporary capacity. Script-disabled dependency installation uses a successive, separate namespace with temporary256MiB/home384MiB, because CI822 exhausted a128MiB install cache. The two phase-specific budgets each remain4GiB; installation cache files do not cross into repository execution. The aggregate 4GiB ceiling, cgroup memory 6GiB, zero swap, CPU/PID/runtime limits and test coverage are unchanged. Every aggregate-capacity increase is rejected before execution, and public probes check the actual mount sizes and two fully written temporary rendering buffers. No trace or screenshot is discarded to make space. Repository execution sees a read-only root and `/dev`; it cannot create an unbounded sibling file or access the host scratch parent. Per-file rendering capacity remains 512MiB. The trusted outer mount owner executes only the pinned helper; all repository commands enter the inner filesystem/network namespace with further user namespaces disabled. A plain host directory is rejected by a real mount/type/capacity check. This layout requires a fresh immutable distribution and independent QA before queue activation.

Quota exhaustion fails validation and therefore blocks publish/queue progression. A stricter32MiB public fixture writes several16MiB files (each below the per-file cap) and receives ENOSPC, with no PASS receipt or data files on the host scratch volume. Safe logs/artifacts are exported with their existing independent caps after repository processes exit. The trusted mount owner is not a permission to execute PR helpers outside the inner boundary.

This candidate still requires exact-HEAD full application CI, independent QA and newly pinned external-install verify-only. The existing installed version/pins and original dirty10 remain preserved. Keep `blocked-sandbox`; do not run a queue tick or copy credentials. It is not proof of whole-queue E2E or a general memory/CPU denial-of-service certification.


## Aggregate process resource prerequisite (candidate, not activated)

The externally pinned helper now requires a real cgroup v2 with memory.max <=6GiB, memory.swap.max=0, pids.max<=1024, cpu.max<=200%, and memory.oom.group=1 before invoking any checkout command. Per-file limits and tmpfs quotas remain additional independent restrictions. The same1200s deadline is retained; larger suites must be safely partitioned without reducing tests or raising timeouts.

The local bridge requests a transient systemd user service with those properties. A Windows/WSL installation without a running user manager and delegated memory/pids/cpu controllers is blocked-sandbox. It must not invoke the helper directly, request host sudo, change global sysctls/AppArmor, copy authentication into a runner, or fall back to a paid API. Current external installation pins are older and intentionally unchanged; install/verify-only requires independent review of this new candidate first.

Disposable CI creates the cgroup as runner UID, never runs app code as root, and tests public memory/memfd/PID/CPU attacks. The quota-owner AppArmor profile comes from immutable commit a0f3af0820d4924042b98a06b09b36a41d0c74b9 and must match SHA256 5569873ac76c043f90aa14292b77109177b30d3b5c2f90fa28fa0b91a6688b35 before parser execution. Checkout profile changes cannot affect this installed policy. A future policy update requires a separately reviewed immutable source and matching pin; do not accept a task-provided hash or path.

Actual queue smoke, new external pin verification, independent latest-HEAD PASS, schedule registration and Notion acknowledgement remain incomplete. CI812 success covers the previous boundary, not these additional resource/policy gates.

## Complete RC validation under the existing process-group cap

The trusted coordinator now validates four fixed browser shards sequentially. Each fresh isolated process group retains MemoryMax6GiB, swap0, TasksMax1024, CPUQuota200% and RuntimeMaxSec1200. Each shard also runs lint, typecheck, unit/contract, build and performance checks. No partial shard is a full validation receipt: all indices1–4, exact commands and isolated filesystem/network declarations must match before publication. A failure stops subsequent shards; preserve logs/checkpoint and do not retry unboundedly or run host npm.

CI runs the same four shards on credential-free disposable jobs, with fail-fast disabled so each result remains visible. The protected validate gate also requires normal quality/browser and public boundary jobs. The source pin changes with the bridge; keep existing external installations unchanged until separate QA reviews and verifies a new fixed release. Actual scheduling and queue activation are separate, still blocked pending that evidence.
