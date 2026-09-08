# 경로 비교 언어·확인 상태·복사 안내 정합성

- 기준: #324 `c81e68ff6de8bbeb594983b6bee3834407751e30`, 별도 `fix/route-language` worktree. 기존 작업자 변경 보존.
- 관련: #251 #264 #265 #267 #277 #285 #286. 운영 완료·Issue 종료·Release GO가 아니다.

## 재현 및 수정

1. 영어 이동수단·시간·요금·빈 상태가 한국어로 남았다. 데스크톱/모바일 초기 6건 실패 → 수정 후 6건 통과. 언어 변경은 재조회/선택 초기화를 유발하지 않는다.
2. `configured: true` 응답의 모든 대안을 실제 경로로 세어 직선 미리보기와 시간 0도 포함했다. 확인된 예상 시간이 있는 대안만 세고, 휠체어 통행 보장과 구분한다. 원래 혼합 응답은 3개 실제 경로로 표시됐으나 확인 대상은 1개다.
3. Clipboard API가 없어도 optional chaining의 `await undefined` 뒤 성공을 알렸다. API 미지원·권한 거절은 실패 및 직접 입력 안내로, 실제 완료만 복사 성공으로 표시한다. 외부 사이트 로딩은 확인하지 못하므로 열렸다고 단정하지 않는다. 2·3의 추가 브라우저 재현 8건 실패.
4. 조회 완료한 일정 구간을 지도에 다시 표시할 때 경로 목록만 바꾸고 이전 개수 안내를 유지했다. 신규 회귀 2건에서 1개 구간을 열어도 2개 안내가 남음 → 목록/안내를 같은 저장 응답으로 갱신. 추가 요청 없이 선택된 18분 경로와 1개 안내를 확인한다.

UI 메시지는 KO/EN을 함께 보관하여 런타임 언어 변경 후에도 같은 상태를 표시한다. 제공처 오류의 내부 문자열 대신 재시도/외부 지도 행동을 안내한다. 앱이 만든 알려진 경로 제목만 번역하며, 임의 노선·정류장·출발/도착 원문과 언어 표시는 보존한다. ODsay 출처와 실제/직선 미리보기 구분을 유지한다.

## 검증

- `npm ci` 완료. lint, typecheck, 전체 unit·contract **285/285**, Vercel production build, performance PASS.
- `e2e/route-language.spec.ts`, `launch-integrity.spec.ts`, `route-selection-stability.spec.ts`, `core-journeys.spec.ts`: **86/86 PASS**.
- 뷰포트/콘솔 검사 추가 후 `e2e/route-language.spec.ts`: **16/16 PASS**. 320/390/768/1024/1366px, 밝음/어두움, reduced motion, 영어, 키보드 선택/포커스, 44px, 문구 겹침/가로 overflow, axe 위반 0. 일반 비교 흐름에서 캡처 전 console error/pageerror 0. 320·390 light 및 1366 dark 캡처 직접 확인.
- 테스트 작성 과정의 신규 Walking locator가 경로 카드의 Walking 항목까지 일치한 2건 실패는 이동수단 group으로 범위를 지정해 해결했다. 동작/assertion을 제거하지 않았다.
- CSS gzip **69.25/70 KiB**, planner initial JS gzip **268.55/270 KiB**. 기준을 늘리지 않았다.
- 전체 브라우저 및 새 HEAD CI는 실행 중. 최종 결과는 PR과 Epic #288에 연결한다. 원래 skip 1개 외 신규 skip/timeout 증가/기존 assertion 완화 없음.
- 이 브랜치는 #309 보안 의존성 변경을 포함하지 않는다. source audit와 #309를 합성한 통합 후보 audit를 구분한다.

## 남은 범위

### CI 34045028862 후속 수정

초기 c3d7287 전체 로컬은 365 pass/기존 skip 1이었으나 CI는 361 pass/4 fail/기존 skip 1이었다. 4개 light/dark·desktop/mobile 사례 모두 320px 이동수단 셀의 이름 잘림 검사에서 실패했고 기존 1회 재시도에서도 실패했다. 로그·실패 화면·error-context 및 보고서 artifact를 내려받았다. 화면은 검사 당시 스크롤된 위치이므로 해당 캡처만으로 셀 배치를 확정하지 않았다.

넓은 대체 글꼴로 로컬 재현 시 이름에 필요한 72px에 대해 58px만 남는 2건 실패를 확인했다. `Time unavailable`의 nowrap을 해제하고 너비를 제한하여 이름과 시간 모두 영역 안에서 줄바꿈하도록 수정했다. 기존 잘림 assertion은 유지하며 대체 글꼴 경계 검사 2건을 추가했다. 관련 30/30, lint/typecheck, unit 285/285, Vercel build/performance PASS. CSS 69.27/70 KiB, planner 268.55/270 KiB. 새 HEAD CI와 전체 회귀 결과는 PR에 이어서 기록한다.

통합 후보 458bf7d는 별도의 도움말 재열기 focus trap 1건으로 368 pass/1 fail/기존 skip 1이었다. 이전 f78e11e의 353 pass 결과와 구분하고 #318에서 원인을 조사한다.

지도 조작/출발·도착 검색, 교통·날씨/혼잡 상세, 인증/정책 본문의 영어는 후속 범위다. 실제 Provider 호출·오류 원인은 별도 Production 진단을 따른다. main/Production `34e6021`, 필수 리뷰 0/3, Preview/008 운영 스키마·영향/백업·복원 접근은 미해결이다. 모델 API workflow 3개 비활성 유지, 유료 호출/인증 복사/새 예약/운영 쓰기 없음.
# RC-14: 보이는 경로와 활성 경로 일치 — 2026-09-06

독립 검토 `pullrequestreview-5125947535`를 실제 최신 `aa48328`에서 재현했다. 동일 이동수단 응답의 0분·직선 미리보기·정상 25분 순서에서 화면에는 25분만 있지만 활성 ID는 0분이었다. 신규 데스크톱·모바일 2건 실패, 저장 구간의 기존-ID 무효/부재 사례 4건은 기존 실제 UI 흐름에서도 통과했다. 이 차이를 보존하고 이미 통과한 기능을 재구현하지 않았다.

`hasJourneyEstimate`가 configured=true·유한한 양수 시간만 인정하도록 했다. 최초 응답 선택, 이동수단 집계/필터, 표시 카드, 경로 개수 안내와 일정 구간에서 같은 기준을 쓴다. 현재 이동수단에 유효한 기존 ID가 없으면 첫 보이는 경로를 선택하고, 유효한 경로가 없으면 activeRoute=null이다. NaN/Infinity/음수/문자열/미리보기도 단위 검사한다. 기존 테스트 삭제·skip·timeout 증가·assertion 완화 없음.

- 관련 unit 7/7 및 E2E·axe 94/94 PASS. 전체 unit·contract 286/286, lint/typecheck, Vercel build/performance PASS.
- 전체 source Playwright·axe **373 pass / 기존 skip1 / 실패0 (8.2분)**. CSS69.27/70 KiB, planner268.57/270 KiB.
- 새 HEAD CI와 #326/#327/#328·보안/자동화 합성 후보는 별도 검증 후 PR에 연결한다. 독립 재검토·사람 승인·Production 반영은 미완료다.
