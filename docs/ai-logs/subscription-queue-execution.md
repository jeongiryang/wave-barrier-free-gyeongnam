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
