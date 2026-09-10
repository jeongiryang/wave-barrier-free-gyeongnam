# 카카오 공유 SDK 초기화 순서 수정

- 도구: Codex, 공식 SDK 2.8.3 코드, 실제 Production Chrome, Playwright, GitHub CLI.
- #457 운영 배포 뒤 실제 카드 생성은 성공했으나 공유 버튼이 비활성화되는 문제를 발견했다. 공식 SDK는 `init(appKey)` 안에서 `this.Share`를 등록한다. 기존 loader가 init 전 Share 존재를 검사해 정상 SDK를 거절했다.
- SDK 객체 확인 → 필요 시 init → Share 확인 순서로 수정한다. SDK 타입의 초기 상태도 반영하고 최종 공유 클릭은 Share 존재를 확인한다.
- 브라우저 fixture도 처음부터 초기화된 SDK 대신 init 후 Share가 생기는 공식 lifecycle을 모델링한다. 팝업은 최종 사용자 클릭에만 열린다는 기존 assertion을 유지한다.
- 관련 desktop 브라우저 2개, unit 798개, typecheck/build/성능 예산 통과. lint 0 errors, 기존 warning 13개. 화면 구조/CSS/서버 권한/의존성/배포 설정 변경 없음.
- Owner의 전체 기능 구현·merge/deploy 요청을 완료하기 위한 직접 장애 수정이다. 필수 CI 성공 후 병합하고 Production의 실제 공유 창을 다시 확인한다. ODsay #454 hold 유지.
