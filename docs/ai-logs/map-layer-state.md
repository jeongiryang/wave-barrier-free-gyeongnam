# 지도 설정과 실제 지도 인스턴스 일치

Refs #251 #276 #285. 부모 #332의 주변 검색 작업을 보존한 별도 `fix/map-layer-state` worktree다.

## 재현과 수정

- 기존 hook은 React state updater 안에서 SDK를 호출했다. updater 재실행 시 중복 호출되고 SDK 예외가 이벤트 밖으로 나왔다.
  실제 hook 최초4건은 정상1 PASS/결함3 FAIL이었다. 일정 변경으로 지도를 새로 만들면 화면만 스카이뷰/교통 선택으로 남았다.
  desktop/mobile의 기본 지도·레이어 재생성/예외8건 모두 FAIL로 재현했다.
- `useMapLayers.ts`는 요청한 설정과 실제 적용한 설정을 분리한다. SDK 호출 성공 뒤 state를 확정하며,
  새 지도에 설정을 한 번 적용한다. 부분 실패는 성공한 항목만 표시하고 실패한 요청은 재적용을 위해 보존한다.
  대체/실패 지도에서는 카카오 적용 표시를 지우고 재연결 뒤 원래 선택을 다시 적용한다.
- `useRouteMapController.ts`, `RouteMap.tsx`, `MapCommandBar.tsx`는 provider 변화·오류·재시도를 연결한다.
  지도 전체 실패가 레이어 오류에 가려지지 않는다. 재시도 버튼을 복원 후에도 유지해 키보드 focus가 사라지지 않는다.
- `MapLayerPanel.tsx`는 KO/EN 이름·상태와 페이지 링크의 정확한 의미를 제공한다. 대체 지도에서는
  레이어 조작을 aria-disabled로 유지하고 SDK를 호출하지 않는다. 패널 내부에도 재연결을 제공해
  모바일 패널 뒤에 가려진 외부 복구 버튼에 의존하지 않는다. 재연결 후 내부 버튼 focus도 유지한다.
- CSS/키보드 검사로320px 하단 메뉴의 대상 가림, 제목 대비3.48/3.47, 복구 버튼 크기를 수정했다.
  desktop에서 열린 패널과 명령 바가 외부 재연결 버튼을 덮는 경우도 확인해 상태 배지를 아래로 배치했다.

## 실제 검증 기록

- hook8/8 PASS: updater replay·연속 조작·SDK 예외·단일 복원·부분 실패·대체 지도 재연결.
- 초기 브라우저8 FAIL→8 PASS. 언어/테마/11개 viewport/44px/Tab/hit/axe 추가8건은
  첫 실행 focus 가림, 다음 실행 대비 부족으로 FAIL했다. 수정 뒤16 PASS.
- 대체 지도 재연결은 desktop 외부 버튼 가림1 FAIL→mobile 패널 가림1 FAIL을 확인했다.
  패널 내부의 영속적인 재연결 버튼과 화면 배치를 수정했다. 마지막 관련20/20 PASS(47.4초).
- 일시적인 잘못된 handler 이름은 typecheck 전에 바로 수정했고, 이미 오류가 난 개발 서버에서 실행하던
  중간 검증은 중단·보존했다. 서버 재시작 후 위20건을 처음부터 실행했다. 중단 실행은 PASS로 세지 않는다.
- source lint/typecheck·전체unit349·Vercel build·performance budget PASS. 추가 버튼 이후20건에 포함해 확인했다.
- 390px/1366px KO/EN 패널 screenshot을 직접 확인했다. SDK 제어와 관광 정보는 fixture이다.
- 기존 구조 계약의 정적 한국어 aria-label 검사는 한국어/영어 두 이름을 모두 요구하도록 갱신했다.
  실제 브라우저에서도 region 이름·버튼 이름을 각각 검사한다. assertion 삭제·timeout 증가·신규 skip은 없다.

부모 #332 후속 `d87e35a`의 CI 분할/글꼴 수정도 합성 후 새 SHA에서 전체 검증한다.
전체 Playwright·CI·통합 후보 검증은 아직 별도로 진행해야 하며 이 로그는 완료 선언이 아니다.
main/Production `34e6021`, #287 승인0/3, Preview/008 운영 확인 경계를 유지한다.
Secret·구독 인증 복사 및 유료 모델 API 실행은 없다.
