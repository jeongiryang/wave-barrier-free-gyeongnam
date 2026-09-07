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
| 무인 문서 작업 | 별도 worktree에서 수정·기존 전체 검사·원자적 게시 | 첫 실제 작업 실행 전. 존재만으로 성공 처리하지 않음 |
| 일반 애플리케이션 작업 | 범위·상태 계약 존재 | `blocked-sandbox`: 생성 코드를 인증이 있는 PC에서 실행할 격리 검증이 아직 없음. 문서 smoke로 코드 실행까지 완료했다고 하지 않음 |
| 별도 QA | 새 CLI 프로세스·CI/HEAD 고정·GitHub receipt | 실제 최신 HEAD CI 이후 실행 필요. 사람 승인 대체 불가 |
| Notion 환류 | HEAD/digest가 고정된 미확인 보고 상태 | 연결된 Work/Executor가 기존 대시보드 갱신 후 재조회하고 acknowledge해야 함; 로컬 CLI에 Notion credential 없음 |
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

설치된 공식 Codex 실행 파일 절대 경로를 전달한다. 새로운 API key, 로그인 파일 또는 유료 서비스는 필요하지 않다.

```powershell
node scripts/subscription-queue-cli.mjs init
node scripts/subscription-queue-cli.mjs scan
node scripts/subscription-queue-cli.mjs observe
node scripts/subscription-queue-cli.mjs enqueue 294
node scripts/subscription-run-once.mjs implementation 294 '<설치된 codex.exe 절대 경로>'
node scripts/subscription-queue-cli.mjs refresh 294
node scripts/subscription-run-once.mjs qa 294 '<설치된 codex.exe 절대 경로>'
node scripts/subscription-queue-cli.mjs show 294
node scripts/subscription-run-once.mjs tick '<설치된 codex.exe 절대 경로>'
```

- `scan`은 읽기만 한다. `observe`는 성공적으로 조회한 이벤트 키만 저장하며 같은 입력의 재실행은 추가 상태 커밋을 만들지 않는다.
- 일반 댓글/updated_at은 이벤트 키에서 제외한다. 승인 명세 댓글만 별도 revision으로 감지한다.
- 구현 결과와 실행 상태는 **같은 atomic Git push**로 갱신한다. 둘 중 하나라도 최신 ref와 충돌하면 둘 다 실패하며 강제 push/부분 게시로 전환하지 않는다.
- 마지막 검사 전 lease를 갱신한다. 프로세스가 중단되면 30분 뒤 새 실행이 최대 두 번째 시도로 소유권을 얻는다. 이전 token의 결과는 거부한다.
- CI 실패/QA 실패는 증거를 보존하고 15분 뒤 한 번만 재시도할 수 있다. quota/auth/외부/격리 문제는 자동 재시도하지 않는다.
- 운영자가 원인을 해결했다면 `node scripts/subscription-queue-cli.mjs resume 294`로 명시적으로 재개한다. 횟수는 초기화되지 않는다. 다음 실행에서 인증·한도·HEAD·격리를 다시 검사한다.
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

2026-09-07 공식 로컬 app-server quota 조회는 포함 한도 조건을 통과했고 모델 turn은 0이었다.
실행기 테스트의 model 결과는 fixture이며 실제 구독 구현/QA 성공으로 세지 않는다.
GitHub 저장소는 public이다. [표준 GitHub-hosted public runner는 무료](https://docs.github.com/en/billing/concepts/product-billing/github-actions)이나
계정 billing usage 조회는 HTTP 404로 접근 불가였다. 저장소 공개 여부만으로 공유 저장소 용량·모든 서비스 비용이 0이라고 단정하지 않는다.
기존 표준 runner와 artifact 보관 정책을 유지하며 유료 larger runner를 도입하지 않는다.

[공식 Scheduled 조건](https://learn.chatgpt.com/docs/automations), [ChatGPT 인증](https://learn.chatgpt.com/docs/auth),
[포함 사용량 정책](subscription-only-automation.md), [Control Plane](automation-control-plane.md).
