# W.A.V.E Agent Operating Contract

이 파일은 W.A.V.E 저장소에서 작업하는 모든 AI 에이전트와 자동화가 공유하는 최상위 운영 계약입니다.

## 현재 실행 경계

- 비용은 현재 ChatGPT/Codex 구독 포함 사용량만 허용한다. 별도 모델 API 키·종량제 호출·추가 크레딧·신규 유료 서비스는 금지한다.
- 보존된 API 자동화 workflow를 활성화하거나 실행하지 않는다. 구독 인증은 로컬에만 두고 GitHub Actions·저장소·로그로 복사하지 않는다.
- 구독 한도 또는 인증 문제가 발생하면 중단·대기한다. API 전환, 자동 충전, 재시도 폭주를 하지 않는다.

- 유일한 PM 관제 채널은 사용자가 관리하는 현재 ChatGPT Work PM 채팅이다. 별도 자동화 구축 채팅을 만들지 않는다.
- Engineering/Integration/QA Executor는 승인된 GitHub·코드·CI/CD·Production 기술 검증만 수행한다.
- 공식 Notion/Gmail 조사, Compliance Matrix, 제품 우선순위/AC, Notion Control Center, 다음 작업 승인과 최종 GO는 PM 소관이다.
- 필수 리뷰/branch protection 우회, Workspace Agent 생성·게시, Admin Access token 발급, 계정 설정, 법적 판단, 최종 제출, Release GO는 자동 완료하지 않는다.

## 권한 구조

- **정이량 (`jeongiryang`)은 Repository Owner, Product Owner, PM, Release Authority다.**
- 다른 사람은 팀원/Contributor다. 이슈, 제안, 리뷰, PR을 만들 수 있지만 제품 정책·우선순위·Release Gate를 임의로 변경하지 않는다.
- PM Agent/Work는 PM의 정책을 실행·정리·검증하는 운영 계층이며 최종 의사결정자가 아니다.
- Codex/Engineering Agent는 승인된 작업을 구현·검증·PR화하는 실행 계층이다.
- QA/Compliance/Submission Agent는 구현과 독립적으로 검증한다.

## Single Source of Truth

- **GitHub = 에이전트/팀원 사이의 공용 작업 버스와 실행 상태의 Source of Truth**
  - Issue: 문제·요구·작업 단위
  - PR: 구현 제안과 검증 증거
  - Actions: deterministic quality gate
  - Release/commit: 실제 코드 상태
- **Notion = PM이 보는 관제 대시보드**다. GitHub와 상충하는 별도 진실을 수동으로 만들지 않는다.
- **공식 공모전 Notion/Gmail/공고문 = 공모전 규정의 authoritative source**다.
- **Production = 사용자에게 실제 제공되는 제품 상태의 최종 검증 대상**이다.

## 작업 상태 모델

기본 흐름은 다음과 같다.

`reported -> triage -> ready-for-dev -> in-progress -> in-review -> ready-for-qa -> verified -> closed`

예외 상태:

- `blocked-human`: 실제 팀 정보, 외부 서비스 관리자 설정, 비용·법적 판단, 실제 제출처럼 사람만 처리할 수 있음
- `blocked-external`: 외부 제공처/API/승인/운영기관 응답 대기
- `deferred`: 현재 Release 범위 밖
- `rejected`: 제품 정책·중복·재현 실패 등 명확한 근거로 미채택

## 우선순위

- P0: 제출 실패, 규정 위반, 핵심 사용자 여정 불능, 심각한 데이터 신뢰·보안·접근성 문제
- P1: 제출 전 반드시 해결해야 하는 큰 품질/심사/사용성 문제
- P2: 완성도를 유의미하게 높이는 개선
- P3: polish 또는 후속 개선

## 에이전트 간 통신 규칙

1. 중요한 판단과 상태 변경은 채팅에만 남기지 말고 GitHub Issue/PR 또는 `.wave/` 상태 파일에 기록한다.
2. 다른 에이전트에게 전달할 프롬프트를 사람에게 복사해 달라고 요구하지 않는다. 가능한 경우 Issue/PR 번호와 저장소 상태를 통해 handoff한다.
3. Issue 본문은 제안이지 정책 그 자체가 아니다. 현재 제품 정책, 공모전 규정, 접근성·보안·데이터 진실성 제약에 맞게 triage한 뒤 구현한다.
4. `ready-for-dev`가 아닌 작업을 Codex가 임의로 대규모 구현하지 않는다. 명백한 P0 회귀는 예외로 즉시 별도 Issue와 근거를 남긴다.
5. 구현 에이전트가 자신의 결과를 최종 승인하지 않는다. CI와 독립 QA를 통과해야 한다.
6. 코드/문서가 실제 Production 또는 공모전 제출 상태와 다르면 더 강한 사실 소스를 우선한다.

## Human Gate

다음은 자동 완료 처리하지 않는다.

- 최종 공모전 제출 및 접수 확인
- 실제 참가자 자격/팀 정보 확인
- 비용 발생 또는 결제
- 외부 서비스의 destructive/admin 설정
- 실제 사용자 개인정보가 포함된 작업
- 법적 신고·동의 여부의 최종 판단
- 보호 규칙 우회 또는 데이터 삭제

## Release Gate

`GO`는 단순히 CI가 green이라는 뜻이 아니다. 최소 다음이 모두 충족돼야 한다.

- P0 = 0
- 제출 전 필수 P1 = 0
- CI/build/security/E2E/accessibility gate PASS
- Production smoke PASS
- Competition compliance의 필수 항목 PASS 또는 명시적 human gate로 분리
- 핵심 사용자 여정 Production QA PASS
- 제출 자료가 최신 Production 사실과 일치

하나라도 충족되지 않으면 `CONDITIONAL_GO` 또는 `NO_GO`로 유지한다.

## 기존 저장소 규칙

구체적인 엔지니어링 작업 사이클, 검증 명령, PR 규칙, 되돌리면 안 되는 결정은 `CLAUDE.md`를 함께 따른다. 두 파일이 충돌하면 이 파일의 권한/SSoT/agent handoff 규칙을 우선하고, 기술 실행 세부사항은 `CLAUDE.md`를 우선한다.
