# W.A.V.E Engineering 통합 감사 — 2026-09-05

현재 사용자가 관리하는 ChatGPT Work PM 채팅이 유일한 PM 관제 채널이다.
Engineering/Integration/QA Executor는 구현과 기술 증거를 제공한다.
공식 Notion/Gmail 조사, Compliance Matrix, AC/우선순위, Notion Control Center,
다음 작업 승인과 최종 Release Gate는 PM 소관이다. 이 기록은 GO 판정이 아니다.

## 비용 정책 정정 — 이후 지시가 우선

[구독 전용 실행 계약](subscription-only-automation.md)이 아래 API 설정/실동작 계획을 대체한다.
API 설계와 테스트는 보존하되 #296/#298/#300 전체 및 #302의 API notify를 비활성화했다.
Secret 발급·설정은 현재 작업이 아니다. 로컬 구독 smoke 1회 PASS, 실제 Scheduled 실행은 미검증이다.
전체 npm audit은 개발 도구 high 2/moderate 1로 실패했고 운영 의존성 audit만 0건이다.
이 항목은 미해결 기술 증거로 남기며 강제 framework 업그레이드로 감추지 않았다.

## 기준과 통합 방법

- main / GitHub Production deployment 6278499275: `34e6021265b16d046dca24feaa3ec2101fc977e2`.
- 감사 시작 #287: `a32a61a9fe5f9f967dc5064d655fdd549cd3b05b`, CI #645 SUCCESS.
- 원래 작업 트리는 보존하고 별도 worktree에서 #287과 자동화 PR 9개를 합성했다.
- 직접 파일 충돌은 없었다. 단독 PR의 green은 선행 파일/이벤트와의 통합 증거가 아니다.
- 기존 PR을 유지하고 아래 순서로 stack을 구성한다. 새 통합 PR이나 기존 PR 종료는 없다.
- 부모를 squash 병합하면 첫 자식의 base를 최신 main으로 바꾸고 main을 안전하게 포함한 후
  새 HEAD에서 전체 CI를 다시 실행한다. 오래된 성공 check를 재사용하지 않는다.
- 모든 PR은 필수 승인 3건과 `validate`를 만족해야 한다. 관리자 우회는 금지한다.

| PR | 역할 | 논리적 선행 조건 | 실행/활성화 경계 |
| --- | --- | --- | --- |
| #287 | Release Candidate 제품 회귀와 008 migration | 최신 main | 승인 전 미배포 |
| #289 | 역할·gate·정적 검사·통합 운영 계약 | #287 | 코드/문서 계약; PM gate 미평가 |
| #291 | 실패 run → 중복 방지 Issue 기록 | #289, 기존 CI/CD 이름 | default branch 병합 전 미활성화 |
| #293 | Issue 상태 → agent queue | #291 | PM 우선순위를 추정하지 않음 |
| #296 | Issue 및 CI/QA 완료 → 현재 Work PM | #293, PM API channel | 202는 accepted; 완료 미검증 |
| #298 | 승인 → 생성 → 무자격 증명 검증 → 게시 | #296, PM actor/handoff, Codex/publish 설정 | 민감 변경은 artifact만, 수동 게시 |
| #300 | 독립 AI diff 검토 | #298, base 정책, Codex 설정 | GitHub 승인·Release GO가 아님 |
| #302 | CD → Production read-only smoke | #300, #296 notifier, 성공한 배포 record | 성공/실패 모두 PM 증거, alias 변경 감시 |
| #304 | Compliance 역할·baseline | #302, PM의 공식 조사 | 문서 계약만; 실행 workflow 없음 |
| #306 | Submission/Judge 역할·canonical 입력 | #304 | 문서 계약만; 자료 생성/제출 안 함 |

각 PR의 정확한 수정 SHA, CI run, 현재 승인/미병합 상태는 해당 PR AI 로그 보충 댓글과
Epic #288에 기록한다. 이 표를 활성화 완료 체크리스트로 사용하지 않는다.

## 발견 및 수정한 결함

| 우선도 | 기존 문제와 증거 | 수정/검증 |
| --- | --- | --- |
| P0 | #296, #298, #300의 YAML 밖 heredoc 본문. actionlint가 각각 57/300/54 부근에서 파싱 실패. #300에는 startup failure run 33964539077도 있음 | YAML을 유효한 block scalar로 정리하고 CI에 checksum으로 고정한 actionlint 1.7.12 추가. inline github-script 컴파일 계약도 실행 |
| P0 | Worker가 생성 작업이 수정 가능한 prompt 파일의 `ALLOW_SENSITIVE...`를 다시 읽음 | 별도 authorize job의 immutable output으로 검증. 게시 직전 최신 PM handoff와 main 재확인. 생성/검증/게시 job 분리 |
| P0 | Secret 보유 QA가 PR HEAD를 checkout하므로 PR의 설정/지시 파일을 실행 환경으로 사용 | trusted `pull_request_target` base workflow, same-repo/신뢰된 actor 조건, base checkout + API로 읽은 inert diff, 별도 temp 입력, read-only/drop-sudo. PR install/build/test를 실행하지 않음 |
| P0 | 생성된 민감 workflow 또는 symlink/config가 publish credential 경계에 도달할 수 있음 | symlink/submodule/환경·Git 설정 거부. 민감 자동화 경로는 승인돼도 자동 게시하지 않음. 신뢰된 검사기를 patch 적용 전에 temp로 복사. Git hook/서명 비활성화, token URL 제거 |
| P1 | label은 GITHUB_TOKEN으로 생성되지만 다음 Issue workflow는 이를 받지 않음. CI 완료 성공 경로의 PM 환류 없음 | 명시적인 workflow_run feedback을 #296에 연결. PM connector actor는 추정하지 않고 사용자 설정 allowlist로 검증 |
| P1 | 동일 실패 이벤트 재전달마다 comment 추가, 서로 다른 PR 실패 혼합 | run ID/attempt receipt, workflow+PR/branch scope, 신뢰된 bot 작성 기록만 재사용. 실제 mock API에 중복 이벤트 실행 |
| P1 | 늦은 label/QA/Worker recovery가 최신 PM 상태와 HEAD를 덮어쓸 수 있음 | 현재 상태/HEAD/승인 revision 재확인. 새 QA 시작 시 이전 HEAD label 무효화 |
| P1 | Production QA가 read-only라는 설명만 있고 method 차단/배포 SHA 확인 없음 | 브라우저/API write method 차단, 서비스워커 차단, canonical origin 제한. smoke 전후 최신 성공 deployment record 확인 |
| P1 | 실제 평가 전 engineering/production gate가 PASS 값으로 시작 | 예상 값과 관측 값을 분리해 관측은 UNKNOWN. GO는 PM 전용 |
| P1 | Node 22.13.0 고정이 #287의 현재 빌드 요구와 불일치 | 기존 주버전 22의 지원 patch 사용. 새 자동화 action은 조회한 기존 major의 commit SHA로 고정 |

현재 Production smoke에서 단계 안내 문구 `#5e7b88` / `#f8fcfe`의 대비 **4.36:1**을
데스크톱·모바일 모두 재현했다. #287의 다른 안내형 단계에서도 같은 결함을 재현했고,
`#426574`로 보강하고 기존 launch-integrity의 footer axe 범위를 넓혔다.
Production의 실패를 제외하지 않으며 수정본 병합/배포 후 다시 확인해야 한다.

## 보존된 과거 API 설정 계약 — 현재 발급·설정·활성화 금지

| Secret / Variable | 사용하는 경로 | 최소 권한/설정 | 미설정 시 동작 | rotation과 smoke 증거 |
| --- | --- | --- | --- | --- |
| `WAVE_PM_AGENT_TRIGGER_ID` | #296 dispatcher, #302 notify-pm | 사용자가 지정한 현재 PM API channel의 `agtch_...`; 다른 PM Agent 생성 금지 | `not_configured`, GitHub 증거 보존, PM 완료 주장 안 함 | 채널 변경 시 ID/token 함께 교체. Actions accepted + SOURCE_EVENT가 있는 PM GitHub 답변을 별도 확인 |
| `WAVE_PM_AGENT_ACCESS_TOKEN` | 위와 동일 | 해당 PM Workspace Agent trigger를 호출할 수 있는 최소 Workspace Agents scope; 앱 관리자 설정은 사용자 | 호출 안 함 | 사용자 발급/교체→제어된 smoke→기존 token 폐기. 오류 본문/헤더/값을 출력하지 않음 |
| `OPENAI_API_KEY` | #298 generate, #300 review의 공식 codex-action proxy만 | 별도 OpenAI project/service account, 필요한 model/Responses 사용 권한과 비용 한도; 관리 API 권한 불필요 | Worker blocked-human, QA NEEDS_HUMAN; 미검증 PASS 금지 | 새 key 교체→안전한 handoff smoke→기존 key 폐기. action accepted가 아니라 artifact/검증/PR/QA HEAD 증거 확인 |
| `WAVE_GITHUB_AUTOMATION_TOKEN` | #298 publish만 | 이 저장소에 한정한 fine-grained credential: contents write, pull requests write, issues write, metadata read. administration/actions write 불필요. 민감 workflow 자동 게시 금지이므로 workflows write도 부여하지 않음 | publish 실패와 GitHub recovery, PR 완료 주장 안 함 | 사용자 교체→안전한 일반 코드 patch PR 생성과 repository CI 발생 확인→기존 credential 폐기. token을 Git remote URL에 넣지 않음 |
| `WAVE_PM_GITHUB_ACTORS` (Variable) | #298 authorize/publish/recover | 명시적인 JSON identity 목록. 기본은 `["jeongiryang"]`; 실제 Work connector/App actor와 handoff comment 작성자를 확인한 뒤 필요한 identity만 추가 | 기본 owner만 허용; 다른 App은 fail closed | 연결 identity 변경 시 목록 재검토, 허용/비허용 actor fixture 및 실제 comment/label 이벤트 증거 |
| `WAVE_PUBLISH_GITHUB_ACTOR` (Variable) | #300 same-repo bot PR 검토 | 별도 publish credential이 사용하는 정확한 bot login. 모든 bot 허용 금지 | OWNER/MEMBER/COLLABORATOR PR만 대상 | 게시 identity 변경 시 갱신. 생성 PR 작성자와 QA 실행 주체 확인 |

실제 Secret 값은 읽거나 이번 로컬 검증에 사용하지 않았다. Secret 존재 여부를
종단간 연결 성공으로 취급하지 않는다. fork PR은 Secret 보유 QA에서 제외되고,
workflow_run feedback은 원본 코드를 실행하지 않고 trusted default branch helper만 실행한다.
Worker validation은 OpenAI/publish Secret 없이 수행하며 생성 코드가 만드는 npm cache도 저장하지 않는다.

## 보존된 과거 API smoke 계약 — 실행 금지

1. 사용자/승인된 connector가 안전한 테스트 Issue를 만들면 router의 status/agent와 PM dispatcher run을 확인한다.
2. PM API는 `accepted`만 기록한다. `completed`/GitHub 결과는 별개다. PM의 GitHub 댓글에
   `SOURCE_EVENT`, 원본 Issue/PR, 기준 SHA, 결정/AC가 있어야 업무 완료 증거가 된다.
3. 사용자가 실제 connector의 actor와 comment author를 확인한 뒤 allowlist에 반영한다.
   handoff는 수정 이력이 없는 새 댓글이어야 한다. 변경/철회는 새로운 marker 댓글로 남긴다.
   trusted marker 없이 ready-for-dev, 비허용 bot, revoked/중복 필드 handoff는 모두 차단돼야 한다.
4. 승인 handoff → generate patch → 별도 전체 검증 → 최소권한 publish → 같은 task revision의 PR 1개.
   재전달은 기존 PR을 찾고 새 PR을 만들지 않아야 한다. main/PM handoff가 바뀌면 게시하지 않는다.
5. 새 PR의 repository CI와 독립 QA를 확인한다. stale HEAD의 PASS가 현재 HEAD label이 되면 실패다.
   CI 완료가 PM feedback run과 GitHub PM 결과로 이어지는 것을 확인한다.
6. 테스트 실패는 같은 run/attempt의 receipt 1개만 남고 새로운 attempt는 같은 범위 Issue에 기록한다.
   router는 자기 자신을 감시하지 않는다. 실패/취소 기록만으로 코드 수정이나 Issue 종료를 승인하지 않는다.
7. #287와 이후 PR은 사람이 필수 리뷰를 충족한 뒤 순차 병합한다. 보호 규칙을 바꾸지 않는다.
8. CD 성공 → Production QA에서 성공한 deployment SHA를 smoke 전후 확인한다.
   browser/API write 시도는 차단하고 실패로 기록한다. Production failure도 PM에게 전달한다.
   workflow_run 연결 길이 제한을 피하려고 Production QA 결과는 notify job에서 직접 PM으로 전달한다.
9. Production alias와 GitHub deployment record의 수동 외부 변경 가능성은 운영 확인에 남는다.
   smoke의 기대 SHA와 배포 record 증거를 구분해 기록하고 불일치 시 PASS로 표시하지 않는다.

## 검증과 미완료 구분

로컬 통합 검증은 실제 자격 증명 없는 fixture/계약과 deterministic 제품 회귀 검증이다.
18개 자동화 계약은 YAML/JS, 중복·stale 이벤트, 승인/actor, symlink/config, 202/오류 응답,
Secret/job 경계, readonly method와 배포 상태를 검사한다. actionlint와 ShellCheck도 별도로 실행한다.
정확한 전체 카운트·명령·최종 SHA/CI는 Epic #288 및 각 PR의 최종 AI 로그 보충 기록을 따른다.

기존 Production API/페이지 smoke와 실제 browser smoke는 별도로 기록한다.
기존 main의 browser 대비 실패는 #287 배포 전까지 미해결이다.
이번 검증은 PM/Workspace Agent 게시, Admin token 발급, Gmail/Notion 연결, 법적 판단,
실제 공모전 제출, Release GO를 포함하지 않는다. 관련 Issue는 실동작 AC가 남아 있으므로 Open이다.

## 공식 기술 근거

- [GitHub workflow trigger와 GITHUB_TOKEN 이벤트 제한](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [workflow_run 기본 브랜치·권한·연결 길이 제한](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_run)
- [Codex GitHub Action의 proxy와 권한 경계](https://learn.chatgpt.com/docs/github-action)
- [Workspace Agent trigger와 202/상태 조회 계약](https://developers.openai.com/workspace-agents/trigger-runs)
- [actionlint 1.7.12](https://github.com/rhysd/actionlint/releases/tag/v1.7.12)
- [ShellCheck 0.11.0](https://github.com/koalaman/shellcheck/releases/tag/v0.11.0)
