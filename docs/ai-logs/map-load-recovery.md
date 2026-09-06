# 지도 전체 로딩 실패의 복구 — 2026-09-06

## 독립 리뷰 P1 — 이미 열린 지도 패널의 실패 경계

[리뷰](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/329#discussion_r3945104534)는 모듈 로딩 중 출발·도착 패널을 연 뒤 실패시키면 패널이 오류 안내 위에 남고 내부 위치/선택 조작이 살아 있음을 지적했다. `3022fc2` source433/CI433과 통합8fe80ac445 성공 뒤 이 누락을 확인했고 Ready를 Draft로 되돌렸다. 해당 성공을 P1 해결 증거로 재사용하지 않는다.

desktop/mobile2 FAIL로 재현했다. 최종 provider error 전환에서 지도 전용 panel, pick/roadview ref와 state, 부분 지도 instance를 정리한다. 해당 패널 안에 있던 focus만 복구 버튼으로 옮기고, 지도 밖의 사용자 focus는 유지한다. export panel은 지도가 없어도 쓸 수 있는 텍스트/이미지 기능이어서 유지한다. 위치 요청의 시작과 늦은 성공/실패 callback, 기존 지도 선택 callback을 가드해 실패 뒤 출발지나 오류 안내가 덮이지 않게 한다.

- 패널 내부/외부/pending 위치3상황×desktop/mobile6건과 기존 모듈 실패8건:14/14 PASS. 오류 안내 hit-test·기기 일정·axe·선택 모드 정리와 밖의 focus 보존 포함.
- renderer 및 실제 위치 action 계약6/6, 전체 unit310/310·lint/typecheck/Vercel build/performance PASS, 관련 전체84/84 PASS(2.0분).
- renderer는 상태값만 발행하므로 `setProvider` 타입을 그 실제 계약으로 좁혔다. 최초 typecheck의 React updater signature 불일치를 any/cast 없이 해결했다.
- CSS69.45/70·planner268.81/270 KiB. 이 후속의 전체/새 CI는 PR에 실제 완료 후 연결한다. #330과 통합 후보도 부모 수정을 합친 새 SHA로 다시 검증한다.

## 최초 수정 및 보존한 검증 이력

- 기준 #328 `84491e58e92cb32b7e77d536441d4102d8cac8be`, 격리 worktree `wave-map-controls-language`, 브랜치 `fix/map-load-recovery`.
- 관련 #251 #282 #285. 지도 영어 검수 중 발견한 실제 실패 경계를 먼저 처리하며 전체 지도 번역·새 기능은 포함하지 않는다.

## 근본 원인과 변경

`useMapRenderer`는 Kakao 실패를 대체 지도로 넘겼지만 `renderLeafletMap`의 모듈 로딩 거부는 `void render()` 밖으로 전파했다. 대체 모듈 요청을 차단하자 desktop/mobile 두 건에서 unhandled rejection과 개발 오류 화면이 조건 버튼 클릭을 가렸다. Production에서 장애를 유발하지 않았으며, 운영에서는 같은 예외 경로의 로딩 상태가 문제다.

최종 실패를 명시적 error 상태로 전달하고 spinner를 끝낸다. 일정·텍스트 경로는 유지하며 KO/EN으로 페이지·지도를 다시 불러오는 버튼을 제공한다. 이미 실패한 모듈을 재사용하는 대신 페이지 재로딩임을 명시하고, 저장한 일정이 재접속 뒤 유지됨을 검사한다. 지도 선택·현재 위치처럼 지도가 필요한 조작은 실패 중 비활성화한다. 취소된 설정 요청과 오래된 renderer 실패는 최신 상태를 바꾸지 않는다.

## 실제 검증

- 최초 모듈 실패 2 FAIL, trace/스크린샷/error-context 보존.
- 첫 확장 결과4 pass/4 fail은 새 영어 테스트가 화면 밖 상단 환경설정을 누르던 순서 문제였다. Home 키로 메뉴를 드러내는 실제 조작을 반영했고 assertion/timeout은 유지했다.
- 새 UI8/8 PASS: KO/EN × light/dark × desktop/mobile, 실패 안내·로딩 종료·44px·키보드 재로딩·저장 일정 유지·텍스트 경로·axe/overflow·pageerror0.
- 실제 renderer effect를 실행한 모듈 실패/설정 취소/stale 거부 계약3/3, 관련 여정76/76 PASS.
- 전체 unit·contract307/307, lint/typecheck, Vercel build/performance PASS. CSS69.45/70 KiB, planner268.81/270 KiB.
- 신규 테스트의 변수명 `module`은 lint 규칙에 따라 `compiledModule`로 수정했다. 규칙 예외/disable은 추가하지 않았다.
- 1366px light English와390px dark English 실패 안내 캡처 직접 확인. 기본 지도 조작/혼잡 범례의 기존 한국어는 후속 번역 범위다.
- 전체 source Playwright·axe와 새 HEAD CI는 진행 상태를 PR에 연결한다. 이전 HEAD의 성공을 새 HEAD 결과로 세지 않는다.
- 최초 전체 검사는427 pass/6 fail/skip1이었다. 6건 모두 지연 지도 fixture가 실제 `RouteMap.tsx?t=…` 요청을 가로채지 못했다. trace의200 응답과 사라진 placeholder로 확인했다. 모듈 경로의 query를 허용하고 실제 가로채기 수 assertion을 추가했으며, 기존 레이아웃/held-click/포커스/axe assertion과 timeout은 그대로 유지했다. 관련20/20 PASS 후 전체 검사를 다시 실행한다.

## 운영과 인계

API/SDK는 합성 응답과 모듈 실패 주입으로 검증했다. 실제 인증값·유료 모델 호출·서버 쓰기·위치 권한 요청·배포 없음. 브라우저의 주입된 모듈 네트워크 오류와 제품의 unhandled pageerror를 구분한다. #315/#316/#325 후속 수정은 별도 통합 후보에서 합성하며 원래 PR·브랜치를 보존한다. 승인3건·독립 재검토·Preview·008·Production 검증 전 운영 해결/GO로 선언하지 않는다.
