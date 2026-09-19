# CI 대기 단축

- 사람: 정이량이 마감 전 작업시간 단축 적용을 요청.
- AI: Codex가 최근 Actions 실행과 기존 PR #373을 조사하고, 8 shard 분산·완전성 증명·대체된 취소 이슈 억제를 구현.
- 범위: CI workflow와 failure router, 관련 증명 및 회귀검사. 제품 코드와 검사 기준은 변경하지 않음.
- 검증: CI gate/reuse/router 집중 회귀 55개 통과. 전체 단위검사, lint(기존 경고 14개), typecheck, Vercel 빌드, 성능 예산 통과. 실제 Playwright 목록 1,536개를 16 shard의 합집합과 대조하여 누락·중복 없이 각각 96개임을 확인. 최종 원격 Actions는 PR의 실행 결과로 기록.
- 로컬 harness 수정: DB preflight 테스트의 URL pathname 직접 사용을 fileURLToPath로 바꿔 한글·공백 경로에서 실행 실패하던 문제를 해결. DB 검사 조건은 유지.
- 제한: parallel runner 준비 비용이 추가되며 동시 실행 여유에 따라 단축 효과가 달라짐. 실패·취소된 검사는 병합 근거로 인정하지 않음.
