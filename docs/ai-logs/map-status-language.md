# 지도 조작·상태 언어와 키보드 취소 AI 작업 로그

## 최신 독립 QA 보완 — 2026-09-07 05:23 UTC

- #34443050e6의 [CI34085085072](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34085085072)는617 PASS/기존skip1/flaky0. 로컬 전체는616 PASS/기존skip1/1 FAIL(14.5분)이었고, 실패는 지도 설정 테스트의 최초 page.goto에서 `ERR_NO_BUFFER_SPACE`였다. 이후 언어 수정의 전체 검사는 동시 로컬 전체 실행을 줄여 다시 수행하며 기존 실패를 PASS로 세지 않는다.
- 독립 리뷰5128194567의 P1을 확인했다. 지도 전체 `lang=en` 상속을 제거하고, 번역된 조작·상태/패널·로딩과 원문을 구분했다. 원문 제공처 안내와 출발/목적지 이름은 `lang`을 가진 별도 span이며, 장소 상세·혼잡도 영역의 이름은 혼합 언어가 없는 안내명으로 바꾸고 원문 장소명은 별도 언어로 읽힌다. 지도 canvas 이름은 언어가 지정된 label을 참조하고 SDK 자식 전체의 언어를 바꾸지 않는다.
- 실제 MapCommandBar 컴포넌트를 렌더링한 provider/선택 상태 언어4 E2E는 보완 전4 FAIL. 기존 앱 여정 검사에 상세/혼잡/지도 이름의 언어 경계를 추가한 최종 관련 **58 PASS(2.3분)**. 제공처 임의 상태는 테스트 전용 컴포넌트 fixture이고 Production API가 이를 반환했다고 주장하지 않는다. 원문과 상태 textContent도 유지한다.
- 새 span에 과거 장식용 span CSS가 적용되는 대비4.32 문제를 axe가 잡아 해당 CSS를 직접 자식 상태 점에만 적용했다. 390px 최종 캡처에서 수정 상태를 직접 확인했다. 테스트 harness의 `module` 변수는 lint 규칙에 맞춰 이름을 바꿨다. 기준·skip·timeout을 완화하지 않았다.
- lint/typecheck/unit495/Vercel build/performance PASS. CSS69.88/70, planner269.47/270, landing115.12/155, 최대chunk95.92/110KiB. 이 증분 전체622개·새 CI·합성 Preview·독립 재판정은 아직 남았다. 아래 기록은 이전 실행 시점이다.

- 브랜치: `fix/map-status-language`, base #334 `c1bae6f80f58fb2ec58d7e00160ad7869f2bdeef`
- 작성자: jeongiryang / Codex Engineering executor
- 확인: 2026-09-07 04:58 UTC. Draft 후보, 아직 main·Production 미반영.
- Refs #276, #277, #278, #285. 사람은 필수 리뷰·최종 릴리스 판단, AI는 승인된 구현과 기술 검증을 수행한다.

## 재현과 변경

실제 c70539d Preview의 영어 여정에서 지도 조작·연결 상태·혼잡 예측이 한국어로 고정돼 있었다. 코드에서 출발/목적지와 장소 패널도 같은 누락을 확인했다. 표시 단계에서 KO/EN을 선택하고 지도·일정 상태와 제공처 원문은 보존한다. 언어 전환은 지도 재생성이나 네트워크 재조회 조건에 추가하지 않는다. 지도 영역 언어와 장소 원문의 언어도 지정한다.

새 키보드 검사에서 위치 선택 후 Escape가 선택 상태만 지우고 패널을 남겼다. 먼저 실행된 지도 shell의 상태 갱신이 나머지 Escape listener를 같은 이벤트 중 해제했다. `useEffectEvent`로 최신 상태를 읽되 listener는 계속 유지하도록 수정했다. 전체화면에서는 표시 state만 지우는 대신 실제 fullscreen을 종료하고 fullscreenchange를 따른다. 선택 취소 안내도 실제 취소 상태를 표시한다.

실제 캡처에서 긴 영어 버튼명과 상태 안내가 잘려 버튼을 `Route points`로 줄이고 상태 줄바꿈을 허용했다. 새로 검사한 장소/좌표/선택 버튼 설명의 대비3.31~4.41 및 선택·hover 상태1.57 문제는 기존 색 토큰과 상태별 상속으로 보완했다. 가짜 지도 데이터나 경로를 추가하지 않았다.

## 검증

- 새 E2E 12개: 기존 앱 c70539d에서12 FAIL(지도 코드는 c1과 동일), 수정 후12 PASS. 영어 light/dark × desktop/mobile, 실제 언어 변경·지도 유지·로딩·OSM 전환·장소 상세·Escape·전체화면 종료·포커스 복귀·axe·overflow.
- 관련 `map-status-language`, `map-load-recovery`, `map-layer-state`, `accessibility-final`: **54 PASS (1.2분)**. 390/960/1366/1440 캡처 및 기존 지도 설정11뷰포트 검사 포함. 390/1366 캡처를 직접 확인했다. 지도 자체는 SDK fixture이므로 Production SDK 성공 증거는 아니다.
- 초기 테스트 작성 중 패널 자체 대신 닫기 버튼으로 진입하는 기존 포커스 계약, 언어 변경 뒤 추천 재검색 필요, 확장 후 변경되는 버튼 이름을 확인해 setup/선택자를 바로잡았다. 이후 제품 대비·취소·전체화면 결함을 실제로 수정했다. assertion 삭제·skip 추가·timeout 증가 없음.
- lint/typecheck/**unit495**/Vercel production build/performance PASS. CSS69.88/70, planner269.46/270, landing115.11/155, 최대chunk95.92/110KiB. 의존성 변경 없음.
- 최신 전체 Playwright618개·CI는 다음 검증 단계다. 앞서 전체 검사는 캡처에서 발견한 잘림·취소 문구 보완을 위해 중단했으며 PASS로 기록하지 않는다.

## 남은 작업

전체 회귀와 최신 HEAD CI, 통합 후보 Preview에서 실제 렌더링 및 재검토. 지도 SDK가 생성한 일부 마커의 원문, 나머지 주변 관광 분석 화면의 언어 전수 검사는 전체 요청 목록에서 계속 추적한다. #342의 독립 QA P1 두 전환 경로는 별도 source PR에서 수정한다. #343의 새 4c46f29는 보존했고 최신 CI629 PASS/기존skip1이며, 합성 후보·Preview의 재검증이 필요하다.

main/Production34e6021, 필수 사람 승인3건, 008 운영 스키마·백업·적용 증거는 별도 미완료다. 유료 모델/API 실행, 차단 workflow 활성화, 인증 복사, 신규 예약, Production 쓰기, 운영 migration, 최종 GO/제출을 실행하지 않았다.
