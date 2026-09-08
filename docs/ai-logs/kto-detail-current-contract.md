# KTO 상세 조회와 저장 일정 위치 복원 계약

- Owner 위임 Engineering; #281, #288. 기준 main `bc948bb4444531dacbce18d719ad14509f56bcc0`.
- 실제 Preview 후속 진단으로 발견한 P1이다. #363의 스타일/개발 연결/실패 환류 변경과 별도이며 원본 PR/커밋/worktree/증거는 보존한다.

## 원인과 공식 근거

2026-09-08 exact-c21 Preview에서 사화공원(공개 ID2784014)을 기기 저장 후
복원하면 위치 재조회가 `empty`로 표시됐다. 장소·날짜·순서는 보존됐지만
지도는 0/1이었다. 이를 정상 공식 빈 결과로 해석한 과거 판단은 폐기한다.

[한국관광공사 공식 국문 관광정보 Swagger](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101578)의
`detailCommon2` 요청은 MobileOS, MobileApp, _type, contentId, numOfRows,
pageNo, serviceKey만 제공한다(2026-09-08 직접 열어 확인, 페이지 수정일2026-02-26).
기존 defaultYN/mapinfoYN 및 공유 복원의 추가 YN 필드는 현재 계약에 없다.

07:01:28Z 보호된 비운영 진단 Preview에서 같은 고정 공개 ID를 두 번 비교했다.

| 요청 | 실제 응답 | 결과 |
|---|---|---|
| 기존 defaultYN/mapinfoYN 포함 | HTTP200, flat resultCode10, invalid-parameter marker | 오류 응답에 body가 없는데 파서가 empty로 처리 |
| 공식 현재 필드만 사용 | HTTP200, header/body resultCode0000 | 결과1, 요청 ID 일치, 좌표 쌍 제공 |

진단은 비밀값·원본 provider 메시지/URL을 반환하지 않았고 DB write/ODsay 호출은
없었다. 진단용 deployment는 릴리스 SHA 증거가 아니며 Production으로 승격하지 않는다.

## 변경과 사용자 동작

- `place-coordinates.ts`, `shared-plan-restoration.ts`: 폐기된 선택 필드를 제거한다.
  공개 ID와 표준 공통 필드는 유지한다. 사진 상세 조회는 이미 현재 필드만 사용하여 재작업하지 않았다.
- `provider-normalizers.ts`: HTTP200의 flat 오류도 실패로 처리한다. 성공 header/body,
  목록과 총량의 정합성을 확인하고 잘못된 응답을 빈 성공으로 만들지 않는다.
  정상적인 zero-result 표현은 보존한다. 오류에 임의 provider 원문을 노출하지 않는다.
- 공개 ID와 반환 ID/좌표의 일치 검사, 날짜·순서 보존, 선택적 재조회와 키보드 포커스,
  정상 빈 결과/좌표 미제공/제공처 오류의 서로 다른 UI는 그대로 유지한다.

## 검증

- 새 wire-response 계약 처음7건: baseline1PASS/6FAIL → 수정7PASS.
- 공유 복원 계약1건 추가 후 관련 새8건+기존위치14건 = **22PASS**, fail/skip0.
  현재 URL 필드로 실제 tourism fetch→normalizer→복원 handler를 실행하고,
  flat 오류가 HTTP502/provider-error로 전달되는 것을 검사한다. 키·응답은 fixture이며 실호출 증거와 구분한다.
- `npm ci`:618packages, 성공. lint 오류0/기존warning2, typecheck 성공.
- 전체 unit/contract **644PASS**, fail/skip0. Vercel build/performance 및 production/all audit 성공(취약점0).
- 전체 Playwright/axe, exact-HEAD CI, 새 Preview와 독립 QA는 PR에서 결과를 연결한다.
- 테스트 삭제·신규skip·assertion/locator/timeout/workers/retry/성능 기준 완화 없음.
- Production은 아직34e6021,008미적용. 알려진 P1이 있는 bc948bb의 CI는 끝까지
  수행하되 CD/승격은 수정 후보 검증 전 진행하지 않는다. 운영 완료를 주장하지 않는다.
- 원래 사용자10dirty파일/원본40worktree/기존 모든 artifact 보존.
  작업용 새 worktree `D:/wave-kto-detail-20260908`, 전체45개.

## 재개

동일 최종 HEAD의 전체 CI/Preview에서 실제 공개 ID 위치가 회복되는지 확인한다.
독립 QA 이후 최신 main에 병합하고 기존 CD008/Production exact-SHA 및 실제 회귀를 검증한다.
ODsay 운영 제약과 trusted-only automation/canary/#353은 별도 미완료다.
