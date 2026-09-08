# TAGO 철도 도시 목록 응답 계약 복구

- 관련: #347 Production 회귀, #334 이후 교통 실호출 검증
- 작성: Codex Engineering, Owner 위임 실행
- 기준: main `0c060350656ee2bd65da048da82fd80a725e232d`
- 상태: 로컬 구현·검증 완료. 최신 HEAD CI/Preview/독립 QA/Production 검증은 아직 대기.

## 재현과 근거

2026-09-08T04:24Z, #334의 `17038c8` Production 환경 미승격 후보에서 변경하지 않은
`scripts/check-production-apis.mjs`가 route 계약에 실패했다. Kakao 자동차 경로는 유효했지만
TAGO 철도 도시 목록은 공통 응답 파서에서 거부됐다. ODsay 오류도 별도로 관찰됐으며,
이 변경이 ODsay 오류까지 해결했다고 주장하지 않는다.

[국토교통부 공식 TAGO 열차정보 OpenAPI](https://www.data.go.kr/data/15098552/openapi.do)의
`GetCtyCodeList_response`는 `header.resultCode`와 `body.items.item.citycode/cityname`을
정의하며 `totalCount`, `pageNo`, `numOfRows`를 정의하지 않는다. 기존 공통 파서는 모든
공공교통 응답에 페이지형 `totalCount`를 요구했다. 공식 구조를 사용한 새 회귀 검사에서
수정 전 18개 중 3개 실패/15개 통과를 확인했다. 실제 인증키나 원문 운영 응답은 저장하지 않았다.

## 변경

- TAGO의 정확한 TrainInfo/GetCtyCodeList 호출에만 비페이지형 도시 목록 계약을 적용한다.
- 성공 봉투, 도시 코드·이름, 코드 중복과 항목 수를 검증한다. 관찰된 목록 크기를 사용하며
  제공되지 않은 전체 운행 수나 실시간 철도 경로로 표시하지 않는다.
- 해당 API에 불필요한 페이지 매개변수를 보내지 않는다.
- 페이지형 응답은 기존 `totalCount` 검증을 유지한다. 오류·불명확한 봉투를 빈 성공으로 바꾸지 않는다.
- 원본 Production smoke, 기존 테스트·assertion·skip·timeout·workers·예산은 변경하지 않았다.

## 실제 로컬 검증

작업 경로: `D:/wave-tago-city-catalog-20260908`.

- `npm ci --ignore-scripts`: 성공.
- `node --test tests/public-transport-boundary.test.mjs tests/production-transport-contract.test.mjs`:
  수정 후 20 PASS, 실패/skip 0.
- `npm run lint`, `npm run typecheck`: 성공.
- `npm test`: 633 PASS, 실패/skip 0.
- `npm run build:vercel`: 성공.
- `npm run check:performance`: 성공. CSS gzip 69.95/70 KiB, planner 초기 JS gzip 269.97/270 KiB.
- `npm audit --omit=dev --json`: 취약점 0.

로그와 수정 전 실패 근거는 저장소 밖 `D:/wave-db-binding-preflight-20260908/tago-*.log`에 보존했다.
모의 응답 계약 검사는 Production TAGO 실호출 성공의 대체 증거가 아니다. 병합 전 전체 hosted
Playwright/axe와 독립 QA, 이후 동일 SHA 운영 실호출로 실제 연결 상태를 확인해야 한다.
