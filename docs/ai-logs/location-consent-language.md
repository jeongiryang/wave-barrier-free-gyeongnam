# 현재 위치 사전 안내 언어 AI 작업 로그

- 작성자: jeongiryang / Codex Engineering executor
- 브랜치: fix/location-consent-language, base #334 c1bae6f
- 상태: 검증 중·main/Production 미반영. 사람은 필수 리뷰/운영·법적 최종 판단, AI는 승인된 구현과 기술 검증을 담당한다.
- Refs #285 #277 #11. 현재 위치 데이터 흐름의 법적 적합성을 확정하지 않는다.

## 재현과 수정

8ef047f 실제 Preview에서 영어 My location을 누르자 한국어 사전 설명이 나타났다. 부분 영어 지원 중 document.lang은 원문 데이터 때문에 ko를 유지하는데 공통 확인 함수가 이것을 UI 언어로 사용했다. 위치 권한은 승인하지 않았으며 실제 좌표를 읽거나 전송하지 않았다. 해당 CUA 탭의 native confirm 취소/재연결은 실패해 취소 성공으로 세지 않는다.

공통 확인 함수는 명시적 locale을 받고, 지도와 출발지 hook은 현재 환경설정 언어와 변경된 callback 의존성을 전달한다. KO/EN 외 값은 ko, SSR은 false. 기존 사전 설명 내용·취소·기기 권한 요청 순서·정확한 좌표의 서버 차단 경계는 유지한다. 기존 정적 계약의 indexOf(-1)가 통과할 수 있던 비교도 존재 여부를 함께 검사하도록 강화했다.

## 검증

- toolbar/panel × desktop/mobile4건 수정 전 영어 문구 assertion FAIL→4 PASS(9.6초). en→ko→en 런타임 변경, 원문 document.lang=ko, native confirm 거절, 버튼 focus, 좌표 요청0·route API0·저장 일정1 유지.
- 관련 단위/계약20 PASS, 전체unit497/lint/typecheck/Vercel production build/performance PASS.
- 관련 E2E52 PASS(2.2분): 새4 + 기존launch42 + 지도 실패6. 390/960/1366/1440 capture/overflow, pageerror0. 960/1440 직접 확인. SDK는 fixture이며 지도 실연동 성공 증거가 아니다. 기반c1의 다른 지도 영어 문구는 독립#344에서 수정 중이다.
- CSS69.82/70,planner269.47/270,landing115.12/155,최대chunk95.92/110KiB. 의존성 변화 없음. 테스트 삭제/새skip/timeout/기준완화 없음.
- 로그: 임시 wave-launch-20260906/location-before,location-after,location-ready,location-unit-related,location-{lint,typecheck,test,build-vercel,check-performance}.

## 남은 검증

새 HEAD 전체Playwright610개·CI·독립QA·통합Preview를 진행한다. main/Production34e6021·리뷰3건·008 운영 적용 게이트는 별도 미완료다. 실제 GPS·계정/DB 쓰기·유료모델API·비활성workflow·구독인증 복사는 실행하지 않았다. 자동화 종단간 증거는 #288/#294에서 별도로 연결하며 이 수동 구현을 무인 예약 성공으로 세지 않는다.
