# 자동차 경로 응답 신뢰 경계

2026-09-07 Engineering/QA. #251·#277의 경로 접근성/실제 경로 구분과 API 최종 감사에 해당한다.
`fix/kakao-route-integrity`는 #287 `b803b80caa1462ae873f406e03e7ffc2cb3dec5e` 기반의 별도 worktree다.
수정 전 자동차 provider 코드는 통합 #334 `0da99d699133bd119b880e1b56f807ce38e815f7`과 동일함을 확인했다.
기존 #335 로드뷰/통합 CI는 변경하지 않았으며 원본 브랜치·미병합 작업을 보존한다.

## 근본 원인과 수정

- HTTP 200 안의 `routes[0]`만 있으면 결과 코드가 실패여도 성공 경로를 만들었다.
  누락된 시간은0→최소1분, 누락 거리는 직선 거리로 대체했다. 도로 좌표가 없어도 출발/도착을 이어 확인된 자동차 경로로 반환했다.
- [공식 자동차 길찾기 계약](https://developers.kakaomobility.com/guide/navi-api/directions)과
  [결과 코드 레퍼런스](https://developers.kakaomobility.com/guide/navi-api/reference.html)를 확인했다.
  성공0만 처리하고 문서에 명시된1/101~107은 현재 조건의 경로 없음으로 구분한다. 알 수 없는 코드·잘못된 JSON/스키마는 오류다.
- 양수 숫자 시간/거리와 각 도로의 짝수·유한·범위 안 좌표를 확인한다. 부분 도로 자료가 잘못되면 전체를 검증된 경로로 사용하지 않는다.
  반환 geometry에는 제공처 도로 좌표만 쓰고 요청한 출발/도착까지의 직선을 임의로 붙이지 않는다.
- 유효한0원은 유지하고 누락·음수·잘못된 통행료는 미확인(null)이다. 요금 문제만으로 정상 도로 경로를 버리지 않는다.
- handler의 사용하지 않는 직선 거리 인자를 제거했다. 정상 대체 경로가 없으면 기존 미확인 preview 계약을 유지한다.

## 증거

- 수정 전45개 provider 검사 중10 PASS/35 FAIL. 수정 후45 PASS.
- 실제 handler에 실제 provider 결과를 합성하는4개 검사 추가: 정상만configured car, no-route/malformed는unconfirmed preview.
  전체 계약49 PASS, 전체unit329 PASS, lint/typecheck PASS. Vercel build/performance PASS(서버 코드 변경으로 초기 화면 자산 증가 없음).
- 기존 요금 누락 정적 검사의 이전 구현 패턴1 FAIL은 새 finite/nonnegative/null 계약으로 갱신했다.
  실행 검사에서도 undefined/null/빈값/음수/NaN 및 정상0을 검증한다. assertion 삭제·skip·timeout 증가는 없다.
- source 전체 Playwright/axe와 새 PR CI, 통합 후보의 새 검증은 별도 진행·PR에 기록한다.
  이 로그의49개 provider/handler 검사는 모의 upstream이며 실제 인증키를 쓰지 않았다.

## Production 관측과 한계

main/Production `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포6278499275를01:28 UTC에 재확인했다.
01:29:33 기존 읽기 진단은26 PASS/route1 FAIL이었다. 원 응답을 저장하지 않아 당시 어느 제공처가 실패했는지는 확정하지 않는다.
01:31/01:32 재조회는자동차/대중교통 경로와 기존provider ready/connected 상태를 반환했다.
01:32:35 자동차7분·실제 반환geometry76점, ODsay4개 대안14/19/35/36분·geometry4/4/8/8점이다.
ODsay 점은 정류장 연결이며 도로선/휠체어 통행 가능 증거가 아니다.
첫 진단 helper가 잘못된 필드명을 읽어geometry없음으로 기록한 결과는 폐기하고 실제geometry/totalTime 필드로 바로잡았다.
최신 후보가 요구하는 KORAIL/TAGO queryStatus/resultCount는 현재 Production에 없어 계약FAIL이 계속된다.
이 간헐적 운영 실패의 원인이 위 malformed-provider 결함이라고 단정하지 않는다. 수정 코드의 실운영 적용·raw upstream 검증도 아직 아니다.

유료 모델API3workflow 비활성, Secret/구독 인증 복사 금지, 필수사람승인3·Preview·008 운영 확인 경계를 유지한다.
현재 source4211·로드뷰4209·통합4187 서버를 보존한다. 로그는 임시 `wave-launch-20260906/kakao-route-*`에 남긴다.
전체 source/CI가 끝나면 새 후보에 합성하고 전체 회귀·읽기 Production 재검증을 이어간다. Issue는 운영 근거 전 닫지 않는다.

## RC-20 추가 리뷰 대응 — 2026-09-07

통합 #334 댓글3945997945의 P1을 재현했다. 세계 범위만 검사하면 (0,0), 일본 좌표, 요청과 무관한 국내 경로, 반대 방향 도형도 승인됐다. 기존49 PASS에 신규4 FAIL을 확인한 후 공유 `lib/map-coordinates.js`로 공개 route API와 같은 좌표 범위를 검사하고, 반환 도형의 처음/끝이 요청의 출발/도착에서 각각1km 이내인지 검사한다. 1km는 도로에 맞춘 위치 보정을 허용하는 제품의 보수적 한도이며 공식 보장 거리나 행정경계가 아니다. 원래 도형을 보존하고 합성 끝점을 넣지 않는다.

계약53 PASS, 전체unit333 PASS, lint/typecheck/Vercel build/performance PASS. 기존b7ddf92의 로컬·CI237 PASS/기존skip1과 새 수정본의 전체 실행은 구분한다. 새 전체는 `kakao-rc20-full.log`에서 진행 중이며 새 CI/통합/Production은 아직 완료가 아니다. 로컬4173은 이 PR 검증용이고 자동 종료되는 Playwright webServer다. 사람 승인과 #334 Draft를 유지한다.
