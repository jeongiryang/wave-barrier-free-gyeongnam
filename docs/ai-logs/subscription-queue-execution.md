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

- `4cf713d` CI #797 및 `f24fa94` CI #798은 lint/typecheck/unit 314건까지 성공했지만 실제 sandbox probe에서 실패했다. #798은 `namespace-permission`으로 분류했으며 브라우저/build 단계는 실행되지 않았다.
- `ddf0608` CI #799에서 runner의 배포판 정책 파일이 없어 `test -f`가 실패했다. 기존 파일 존재를 가정한 접근을 대체해 AppArmor upstream의 고정 commit 정책과 SHA256을 검증한 뒤 일회성 CI runner에만 로드한다. 자식 capability 제한을 포함하며 전역 AppArmor/user namespace 보호와 로컬 PC 정책은 변경하지 않는다.
- 근거: [Ubuntu의 프로그램별 namespace 정책](https://ubuntu.com/blog/ubuntu-23-10-restricted-unprivileged-user-namespaces), [AppArmor upstream bwrap/child profile](https://gitlab.com/apparmor/apparmor/-/blob/8e431ebcd915216a03ebc8d01e72b1741bb2f855/profiles/apparmor/profiles/extras/bwrap-userns-restrict).
- 실제 queue 실행·독립 QA PASS·전체 애플리케이션의 sandbox 통과를 주장하지 않는다. `blocked-sandbox`를 유지하며 새 HEAD에서 CI probe와 기존 전체 회귀를 다시 확인한다.
