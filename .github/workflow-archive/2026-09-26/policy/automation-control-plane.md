# W.A.V.E Automation Control Plane

## 목적

W.A.V.E의 개발·QA·공모전 규정 확인·배포·제출 준비를 사람의 채팅 복사/붙여넣기에 의존하지 않는 이벤트 기반 운영 구조로 전환한다.

핵심 원칙은 **AI끼리 별도 채팅을 공유하는 것이 아니라 GitHub라는 공용 상태를 읽고 쓴다**는 것이다.

## 권한

- 정이량 (`jeongiryang`): Repository Owner / Product Owner / PM / Release Authority
- 팀원: Contributor. Issue/PR/Review를 제출한다.
- PM Agent: 정이량의 PM 업무를 보조하고 triage·우선순위·compliance·release gate를 관리한다.
- Engineering Agent(Codex): `ready-for-dev` 작업을 구현하고 PR과 검증 증거를 남긴다.
- QA Agent: 구현 에이전트와 독립적으로 PR/Production을 검증한다.
- Compliance Agent: 공식 공모전 Notion/Gmail/공고 변경을 감시하고 compliance 상태를 갱신한다.
- Submission Agent: 최신 Production 사실을 기준으로 README·소개자료·시연·제출 체크리스트를 생성/검증한다.

## 시스템 구조

```text
공식 공모전 Notion / Gmail / 공고
            |
            v
     Compliance / PM Agent
            |
            v
팀원 ---> GitHub Issues <---- Production QA
            |
            v
       ready-for-dev
            |
            v
          Codex
            |
            v
            PR
            |
            v
     GitHub Actions CI
            |
         PASS/FAIL
        /         \
       v           v
 QA/Review      Issue 환류
       |
       v
     Merge
       |
       v
 Vercel Candidate -> Smoke -> Promote -> Production
       |
       v
 Production QA / Release Gate
       |
       v
 GitHub 상태 -----> Notion Control Center
                       |
                       v
                    정이량 PM
```

## GitHub를 공용 버스로 사용하는 규칙

### Issue

모든 신규 문제·기능·공모전 규정 변경·QA 실패의 표준 입력이다.

팀원이 해야 하는 최소 작업은 Issue 또는 PR 제출까지다. 사람이 AI에게 다시 전달할 프롬프트를 작성하지 않는다.

Issue triage 결과에는 장기적으로 다음 machine-readable 정보가 있어야 한다.

- priority: P0/P1/P2/P3
- type: bug/ux/accessibility/security/compliance/docs/feature/qa
- status: lifecycle state
- owner-role: pm/engineering/qa/compliance/submission/human
- release-blocker: true/false
- human-gate: true/false
- acceptance criteria
- evidence / reproduction

### PR

PR은 단순 코드 묶음이 아니라 다음 단계로 넘길 handoff object다.

필수 정보:

- 연결 Issue
- 해결하려는 사용자/제품 문제
- Acceptance Criteria 충족 근거
- 테스트 결과
- UI 변경이면 대표 viewport 검증
- 데이터/공모전 영향
- 알려진 제한사항
- QA가 다시 확인할 항목

### Actions

기계적으로 판정 가능한 것은 AI 의견보다 CI를 우선한다.

현재 저장소가 이미 검사하는 항목:

- dependency audit
- lint
- typecheck
- unit/contract test
- Playwright + accessibility E2E
- Vercel build
- performance budget

CD도 candidate deploy -> health -> migration -> production promote -> health failure rollback 구조를 유지한다.

## 자동화 단계

### Phase 0 — Control Plane Foundation

- `AGENTS.md`: 모든 에이전트의 공통 권한/SSoT/hand-off 계약
- `.wave/control-plane.yaml`: machine-readable 역할/상태 계약
- `.wave/release-gate.yaml`: GO/CONDITIONAL_GO/NO_GO 계약
- 본 문서
- Notion `W.A.V.E Control Center` 생성

### Phase 1 — Issue State Machine

현재 `issue-triage.yml`을 확장한다.

목표:

1. 새 Issue 수신
2. 기본 type 지정
3. `triage` 상태 지정
4. PM Agent가 재현성/중복/정책/공모전 영향 검토
5. priority와 owner-role 확정
6. Acceptance Criteria 보강
7. 구현 가능하면 `ready-for-dev`
8. 사람이 해야 하면 `blocked-human`

기존 #287이 `issue-triage.yml`을 수정 중이므로 해당 PR 병합 후 최신 main에서 구현한다.

### Phase 2 — Codex Execution Queue

목표 이벤트:

`Issue status=ready-for-dev && owner-role=engineering`

Engineering Agent는:

1. 최신 main 확인
2. Issue + `AGENTS.md` + `.wave/` + `CLAUDE.md` 읽기
3. 재현
4. branch
5. 구현
6. 테스트
7. AI log
8. PR
9. Issue를 `in-review`로 전환

한 작업 단위 한 PR 원칙을 유지한다.

초기에는 사람/PM이 Codex 실행을 시작하되, Issue가 유일한 handoff가 되도록 만든다. 안정화 후 GitHub 이벤트 기반 원격 실행을 추가한다.

### Phase 3 — PR/QA Loop

PR open/ready 시:

- CI 실행
- PM/QA가 Issue AC와 diff를 비교
- 실패 시 PR에 근거를 남기고 `in-progress`로 환류
- CI green + QA 대상 준비 시 `ready-for-qa`

Merge 후:

- Production CD 완료 확인
- Production smoke
- 핵심 사용자 여정 필요 시 QA
- PASS면 Issue `verified -> closed`
- FAIL이면 원 Issue reopen 또는 회귀 Issue 생성

### Phase 4 — Compliance Event Loop

공식 공모전 메일/Notion/공지에 변경이 감지되면:

1. 기존 compliance 상태와 diff
2. 서비스 영향 판정
3. 영향 없으면 감사 로그만 남김
4. 영향 있으면 GitHub compliance Issue 생성/갱신
5. 코드 작업이면 engineering queue
6. 제출 자료 작업이면 submission queue
7. 사람 확인이면 `blocked-human`

공식 원문을 GitHub가 대체하지 않는다. GitHub에는 해석 결과와 근거 링크/날짜를 기록한다.

### Phase 5 — Notion PM Dashboard Sync

Notion은 GitHub의 복제된 수동 backlog가 아니라 PM용 관제층이다.

최소 표시:

- Overall Release: NO_GO / CONDITIONAL_GO / GO
- P0/P1/P2/P3 개수
- Human Action Required
- CI/CD/Production health
- Compliance PASS/PARTIAL/FAIL/UNKNOWN
- Submission readiness
- 현재 작업 중 Agent/Issue/PR
- 최근 배포/QA 시각

우선은 Agent가 GitHub를 읽어 Notion을 갱신하고, 이후 안정화 시 API/워크플로 기반 동기화를 붙인다.

## Notion에 두면 안 되는 것

- GitHub와 다른 우선순위 진실
- 별도로 수동 관리되는 Issue 상태
- 코드에 없는 기능을 완료로 표시한 문서
- Production에 없는 기능을 제출 완료로 표시한 설명

## Human-in-the-loop 정책

자동화의 목표는 인간을 제거하는 것이 아니라 PM의 메시지 중계 업무를 제거하는 것이다.

정이량에게 올라와야 하는 것은 다음 종류로 제한한다.

- 제품 방향이 실제로 갈리는 결정
- 공모전 참가/제출의 최종 확인
- 비용 발생
- 외부 서비스 관리자/파괴적 작업
- 법적/개인정보 관련 최종 판단
- Release GO

나머지는 GitHub 기록과 자동 gate로 처리한다.

## 1차 구현 순서

1. #287 병합/종결 전: Control Plane 문서/상태 계약만 독립 적용
2. #287 병합 후 최신 main: issue state machine / agent label bootstrap
3. Work: Gmail/GitHub 이벤트 기반 PM/Compliance 작업 연결
4. Codex: `ready-for-dev` Issue를 입력 계약으로 통일
5. PR/CI -> QA handoff 자동화
6. Production smoke -> Release Gate 갱신
7. Notion dashboard 동기화
8. Submission generator와 독립 Judge/Consistency check 추가

## 성공 기준

다음 상황에서 정이량이 프롬프트를 중계하지 않아도 된다.

- 팀원이 Issue를 올림 -> triage -> 개발 -> PR -> CI -> QA -> 배포 -> 종료
- Production smoke 실패 -> Issue -> 수정 루프
- 공모전 규정 메일 도착 -> 영향 분석 -> compliance/update Issue
- Release Gate 변경 -> Notion에서 PM이 한눈에 확인
- 제출 직전 -> 최신 GitHub/Production/compliance 기준으로 제출 자료 재생성 및 검증
