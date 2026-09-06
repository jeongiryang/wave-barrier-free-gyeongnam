# 지도 이미지·페이지 링크의 실제 결과와 복구

## 부모 #329 P1 후속 통합

첫 `b456754` 전체 source457 pass/기존skip1/실패0(10.3분)를 확인했다. 그 뒤 #329 독립 리뷰의 열린 panel/늦은 위치 응답 결함을 수정한 `7f53de47eb035c398d5b4bdb1baa2cc5d1537da0`을 병합한다. controller의 actionNotice/actionPending 반환과 isMapAvailable 인수 충돌은 양쪽을 모두 보존해 해결했다. 기존 전체457 결과를 이 새 merge HEAD의 결과로 세지 않고 기본검사·관련·전체·CI를 다시 확인한다.

첫 부모 통합 관련37 pass/1 fail은 새 tablet/mobile drawer 배치에서 focus 복구 버튼이 고정 하단 내비게이션 뒤로 가려지는 실제 hit-test 실패였다. 스크린샷으로 확인했고 내부 focus를 복구할 때 브라우저 기본 스크롤 대신 버튼을 즉시 화면 가운데로 드러낸다. 외부 focus는 건드리지 않는다. 기존 hit-test assertion/timeout을 유지해 재검증한다.

보완 후 관련38/38 PASS(56초), unit316/316·lint/typecheck/Vercel build/performance PASS. CSS69.46/70·planner268.80/270 KiB. 이 merge HEAD의 전체/CI는 별도 진행하며 과거457 결과와 구분한다.

- 기준: #329 `3022fc222f8298ec6642c0c52f41a0a4f08852cd`, 격리 `wave-map-export-recovery` / `fix/map-export-recovery`.
- 관련: #251 #277 #282 #285 #286. 사람은 요구·필수 승인·Release 판단, Engineering은 재현·수정·자동 검사와 실제 캡처 검토를 담당했다.

## 근본 원인과 변경

`exportRouteImage`가 비동기 `toBlob` 전에 true를 반환해서 null 결과에도 저장 완료를 표시했다. 공유는 모든 예외를 취소로 삼켜 clipboard 부재·권한 거부를 알리지 않았다. 실제 내보내기 함수를 실행한 새 계약5건이 모두 실패했고, 브라우저의 이미지 실패 안내도 desktop/mobile2건 모두 실패했다.

이미지 변환과 다운로드 요청을 기다린 뒤 다운로드 **시작**만 알린다. null/예외/다운로드 요청 실패는 복구 안내로 전달하고 임시 URL을 해제한다. pending 중 ref로 중복 실행을 막고 aria-disabled로 초점을 유지한다. 공유의 AbortError만 사용자 취소로 구분하고, 나머지 오류는 재시도·주소 직접 복사를 안내한다. 페이지 링크에 저장 일정이 포함되지 않음을 정확한 버튼 이름과 KO/EN 설명으로 밝힌다.

이미지 자체도 실제 길 안내·무장애 이동 보장이 아닌 장소 안내도로 표시한다. 추정 시간·원문 장소명·지도 배경 미포함을 구분한다. 실제 PNG 검토에서 출발지 표식이 잘리는 문제를 추가 발견했고, 경로 범위 밖의 출발지를 포함하는 계약을 재현(1 FAIL)해 범위 계산에 반영했다.

태블릿의 단일 열 지도에서 drawer가 grid-column:2를 유지해 화면 가장자리에 찌그러졌다. 모바일 media에서 전체 열로 고치고 폭·내부 잘림을 검사한다. 설명 대비3.48:1을 디자인 토큰으로 수정했다. 지도 zoom control이 drawer 위로 올라오는 현상은 지도 canvas 안에 stacking context를 만들어 막고 실제 hit-test를 추가했다.

## 검증과 실패 이력

- 계약 최초5 FAIL→5 PASS, 추가 출발지1 FAIL→최종6 PASS. 전체 unit·contract313/313 PASS.
- lint/typecheck/Vercel build/performance PASS. CSS69.46/70 KiB, planner268.81/270 KiB. #309를 포함하지 않는 source와 audit0인 통합 후보를 구분한다.
- 새 브라우저24건: null 변환·지연/중복·재시도·실제 PNG 다운로드, KO/EN·light/dark, clipboard 부재·권한 거부·native 취소/성공, toolbar 안내·focus·저장 일정 유지.
- 320/390/768/960/1366/1440px에서 panel 폭·overflow·44px·axe와 지도 control 겹침을 검사한다. 실제 PNG, 390px English light 및1366px English dark 패널을 직접 검토했다.
- 첫 확장14 pass/8 fail은 설명 대비 문제였고, 실패 화면에서 tablet drawer 축소도 발견했다. 다음27 pass/1 fail은 기존 랜딩 touch 검사의 일시적인 중복 DOM strict locator였다. 원인 확정 없이 trace 보존; 해당 파일 재검사4/4 PASS. 전체에서도 다시 확인한다.
- 첫 관련46 pass/2 fail은 기존 keyboard test가 과거 `공유` 이름을 찾았기 때문이다. 실제 버튼은 일정과 구분되는 `페이지 링크`로 바뀌었으므로 기존 focus/수평 도달 assertion은 그대로 두고 정확한 accessible name을 검증한다. 진행 중 재검사 한 번은 같은 알려진 fixture 실패를 피하기 위해 중단했으며 성공으로 세지 않는다.
- 최종 관련48/48 PASS(1.7분). 전체/CI 결과는 해당 HEAD의 PR 본문에 연결한다. 새 skip·timeout 증가·assertion 삭제/완화는 없다.

## 운영 경계와 재개

지도/관광 API는 fixture, clipboard/share/encoding 실패는 브라우저 안에서만 주입했다. 최종 성공 경로의 PNG는 실제 canvas→Blob→브라우저 download로 받았다. Secret·유료 모델 호출·실제 위치 요청·서버 쓰기·병합·배포는 없다. 필수 사람 리뷰3건, Preview·008 운영 확인·최종 Production 검증은 남아 있다. 현재 부모들에 독립적으로 추가된 #315/#316/#325의 수정은 통합 후보에서 별도로 합성하며 원래 브랜치를 보존한다.
## CI 후속 — 오류 DOM commit 이전 포커스 복구

48f3f40 로컬 전체는463 pass/기존skip1/실패0(10.2분)이었으나 CI34059135961에서462 pass/기존skip1/모바일 panel focus1 fail(최초·재시도 모두)로 실패했다. CI의 이후 build/performance는 실행되지 않았다. source 성공이나 통합d4c4911의475 pass를 최종 해결로 대체하지 않는다.

CI 스크린샷/error-context/trace와 CPU 4배 지연 모바일4회의2 fail/2 pass를 분석했다. 복구 프레임이 React commit보다 앞서 실행되어 버튼이 아직 없었다. 부모 #329의43ebf0812450512663b3f939657688fdb7dad5e1에서 오류 전 내부 focus를 기억하고 layout effect로 복구하도록 수정했다. 기존 child의 즉시 가운데 스크롤도 이 hook에 보존했다. 부모 merge 충돌에서는 이전 프레임을 제거하고 이미지/공유 action 상태·위치 guard를 모두 유지했다.

이 합성에서 unit320/320·lint/typecheck/Vercel build/performance PASS, 관련38/38 PASS(1.5분). CPU 지연은 기존 desktop/mobile panel/outside/pending-location6건에 적용했고 assertion/timeout/skip을 완화하지 않았다. 최신 전체·CI·독립 재검토·사람 승인·Production은 실제 결과를 PR에 갱신한다.
