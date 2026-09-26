# September delivery harness rebuild — 2026-09-26

사용자 목표: 9월30일까지 제출 기능을 완주하기 쉬운 프론트로 완성하고 AI 나루에 집중한다. 먼저 느린 CI/CD·기존 자동화를 재구축하고 rollback을 보존한 뒤 기존 PR #709를 검증·병합한다.

## 구현

- CI: 전체 품질/단위/보안/빌드/성능 유지 + 핵심27여정 ×2기기,4개 browser job. main도 재검사하며 이전 증명 재사용 폐기.
- Release Audit: 전체 E2E 두 기기16개 shard의 별도 수동 검증. 빠른 CI를 최종79요구의 통과로 대체하지 않음.
- CD: 현재 main의 정확한 SHA와 최신 CI의6개 job을 두 번 검증. 후보와 Production health의 실제 commit 일치를 확인. 기존 inspect/migration/promote/rollback 유지.
- 실제 Naru 의도·일정안·한글 수량 검증과 deployed commit을 기록. HTTP 실패·빈 draft·error 이벤트·늦은/로컬/다른커밋 보고서가 출시 근거로 통과하지 않음.
- 기능설명서31쪽의 원문 텍스트와79요구,공사 API16개,UI 도구28개,전문 역할7개 및 작업 CLI.
- 12개 기존 workflow 원문과 .wave/AGENTS/CLAUDE/운영정책 보존. 자동 routing/dispatch/worker/릴리스 발행9개를 active workflows에서 퇴역. 기존 자동화 테스트는 보관 원문을 대상으로 유지,현재 게이트에는 별도 실패 회귀 추가.

## 검증

- 전체 단위1,685/1,685,skip0,약10초.
- 빠른 실제 브라우저54/54,약1.7분(2 workers,fixture계정·제공처; 실제 제공처 인증으로 표시하지 않음).
- lint0오류/기존25경고,타입,build,성능 예산,actionlint1.7.12(SHA검증다운로드),npm audit 두범위0취약점.
- 기존 Production 실제 나루: 준비의도3401ms,공식장소3곳 일정안3616ms,한글세곳/통영2152ms. 이 실측은 재구축 배포 이전이며 새 commit binding이 없는 이전 결과이므로 새 배포 완료의 증거로 재사용하지 않는다.
- 독립 QA: 최신 main CI 판정·report timestamp/origin/commit 빈틈을 발견해 수정했고 남은 P0/P1 없음. 실제 Actions/CD roundtrip은 후속 원격 결과로 확인한다.

## 보존과 미완료

- 원격 태그 backup/pre-release-harness-20260926 → 8e23a9781f4d0ba151e9dd1c91559bd08792b41f.
- operations/pre-release-harness-20260926.zip SHA256 a53efba8d9b1684f7d2aa301a12a0126f5e5f9e3644c83e33a6cdf7dfd2313f6.
- rollback은 이 재구축의 squash커밋을 revert한PR로 처리하며 이후 제품변경을 reset하지 않는다.
- ODsay provider hold #454는 별도 외부 제약으로 남아 있다.79개 요구의 실제 최종사용성/현장/계정/API 증거는 전부 완료됐다고 주장하지 않는다.

## PR #709의 새 검증 체계 통합

기존 PR #709 UI를 최신 main의 하네스와 통합했다. 소스 충돌은 없었으며 기존 원본별 반영 기록을 유지한다. 전문 역할 선택을 AGENTS에 연결하여 이후 작업에서 관련 역할/요구만 읽도록 한다. 통합 코드 단위1,685개와 빠른브라우저54개(로컬1.8분)가 통과했다. #713 health환경 연결 수정 후 관련18개를 추가 확인했다. 기존 UI 전체 CI의 근거는 36151024884이며 새 head의 CI와 운영 배포는 별도로 확인한다.

#714는 실제 CD에서 발견한 승격 직후 커밋 전파 검증과 암묵적 rollback 대상 선택을 보완했다. 최대60초 제한과 이전 canonical 배포 ID 보존, 잘못된 API 응답 거부를 독립 검토했고 관련24개 검사가 통과했다. main/PR #709에 같은 수정을 반영하며 새 CI/CD 결과를 확인한 뒤 기존 UI PR을 병합한다.
