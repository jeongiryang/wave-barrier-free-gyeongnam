# ODsay 경로 신뢰 경계 — 2026-09-07

관련 범위는 #251/#277의 기존 API·이동 구간 검증이다. 원본 #336 b7ddf92를 보존한 별도 `fix/odsay-route-integrity`에서 작업했다. 모든 상류 응답 테스트는 가짜 검증용 값으로 실행했으며 실제 모델 API·Secret·상류 인증키를 사용하거나 출력하지 않았다.

## 원인과 변경

누락된 봉투는 정상 빈 결과로, 누락된 소요시간은0분으로, 누락된 거리는 요청 직선 거리로 보정되어 configured 경로가 됐다. 필수 정류장 좌표·교통수단·구간 시간도 검증하지 않았다. ODsay 원 오류 메시지와 임의 코드를 공개 provider detail에 복사했다. 실제 비밀 유출이 관측됐다는 뜻은 아니다.

`readOdsayResponse`는 손상된 봉투를 오류로 구분한다. 도시 간 결과는 터미널 앞뒤 이동이 추가로 필요하므로 전체 구간의 confirmed 대안으로 표시하지 않고 외부 지도에서 이어지는 이동 확인을 안내한다. 정상 no-route 코드는 ready, 내부/입력/형식 오류는 error로 구분하며 원 오류 문자열은 공개하지 않는다.

`fetchOdsayRoutes`는 도시 내 경로의 시간·거리·도보·교통수단·정류장 좌표를 검사한다. 총 거리 누락 때는 실제 교통 거리+도보 거리만 합산하며 직선 거리로 대체하지 않는다. 잘못된 대안은 제외하되 완전한 다른 대안은 보존한다. 도보 환승0분 및 선택적 도보 정류장 좌표 부재는 허용한다. 정류장 연결 도형은 도로선이나 무장애 이동 증거가 아니다.

공유 `lib/map-coordinates.js`로 route API의 위도30~40·경도120~135 좌표 범위를 적용한다. 이는 대한민국/경남 행정경계 판정이 아니다. (0,0)·지원 범위 밖 정류장은 실제 경로로 통과시키지 않는다.

## 근거와 검증

[ODsay v1.8 공식 계약](https://lab.odsay.com/guide/releaseReference?platform=web)의 도시 내 info/subPath, 도시 간 searchType, 추가 터미널 연결 필요, 오류 코드 구분을 대조했다. 도보 sectionTime은0일 수 있으므로 양수를 강요하지 않는다.

- 신규25건: 수정 전3 PASS/22 FAIL. 첫 수정 후 기존 응답 계약 포함31 PASS.
- 실제 handler 합성4건과 지원 지역2건을 추가했다. 최종 전체unit360 PASS, lint/typecheck/Vercel build/performance PASS.
- 첫 수정본의 desktop/mobile 전체237 PASS/기존skip1(5.3분). 이후 지원 지역 방어를 추가했으므로 최종 SHA의 전체 결과로 재사용하지 않는다.
- 구형 '빈 객체/원문 오류 노출' 계약은 오류 분리·원문 비노출 assertion으로 강화했으며 테스트 삭제/skip/timeout 확대가 없다.
- 최초 PowerShell Stop 설정이 빌드의 stderr 경고를 예외로 처리했다. 종료코드를 기준으로 다시 실행한 Vercel build와 performance는0으로 통과했다.

## 경계와 재개

로그는 임시 `wave-launch-20260906/odsay-*` 및 `wave-odsay-route-integrity-final-*`에 보존했다. 원본 및 통합의 새 CI/전체 회귀와 read-only Production 검증은 별도로 필요하다. 도시 간 첫/마지막 이동을 모두 연결하는 구현은 현재 완료가 아니며 이 PR은 그 누락을 숨기지 않는 수정이다. main/Production34e6021, 사람 승인3건·Preview·008 운영 검증 Gate를 유지한다. 해당 Issue를 닫거나 배포/런칭 완료로 표시하지 않는다.
