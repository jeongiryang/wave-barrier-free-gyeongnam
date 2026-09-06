# 주변 검색의 응답·지도 생명주기·키보드 접근성

- 작성일: 2026-09-07 KST
- 담당: 위임된 Codex Engineering/QA. 사람 리뷰·운영 설정·Release GO는 PM/검토자 담당이다.
- 관련: #251, #277, #282, #285. 부모 #330 `21fdbd674d8a36a1e9dc3f59186cc0cb45f831c3`를 보존한 `fix/nearby-query-integrity`.
- 작성 시점 상태: 로컬 구현·관련 검증 완료, 전체 회귀/CI 대기. 미병합·미배포. 후속 결과는 PR 본문과 실행 원장에 기록한다.

## 재현과 수정

기존 SDK callback은 정상 빈 결과와 오류를 같은 문구로 표시했고, 이전 분류의 늦은 응답이 새 분류를 덮어썼다.
응답이 없으면 대기가 끝나지 않고 빈 좌표는 Number 변환으로 0이 됐다. 15곳 안내와 12곳 렌더링도 달랐다.
실제 hook을 실행하는 최초 9개 계약은 정상/빈 결과 2 PASS, 결함 7 FAIL이었다.

- `useNearbyPlaces.ts`: idle/loading/success/empty/error 구분, 10초 응답 기한, 중복 재시도 방지,
  세대·지도 인스턴스 검사, 완료/취소/unmount 후 callback 무효화와 marker 정리.
- `nearby-place-data.ts`: 유효 ID·명칭·좌표·거리 검사, 중복 제거, 불완전 응답 안내,
  Kakao 장소 도메인의 숫자 경로만 HTTPS 링크로 허용. 명시적인 0은 보존하고 빈 값을 0으로 만들지 않는다.
- `useRouteMapController.ts`: Escape/다른 도구/장소 선택 시 취소. 일정/경로 변경으로 지도 재생성이 시작되어도 초기화.
  이 마지막 경계는 대기/완료 상태 각각 desktop/mobile 4 FAIL로 별도 재현했다.
- `NearbyPlacesPanel.tsx`와 관련 CSS: KO/EN 분류·상태·재시도, 원문 명칭/주소 안내, 실제 15개 결과,
  시설 접근성 별도 확인 안내, 단일 스크롤 영역, 대비·44px 링크. 키보드 focus를 옮기지 않고 현재 조작을 중앙에 드러낸다.

공식 SDK는 OK/ZERO_RESULT/ERROR를 구분한다:
[Kakao Maps services.Status](https://apis.map.kakao.com/web/documentation/#services_Status).
주변 시설 존재만으로 무장애 장소/이동 경로를 보증하지 않는다. 선택 장소의 접근성 score는 null이다.

## 실패를 포함한 검증 기록

- `node --test tests/nearby-query-integrity.test.mjs`: 최초 2 PASS/7 FAIL → 최종 16/16 PASS.
- `npm test`: 336/336 PASS, skip 0.
- 신규 주변 E2E 첫 실행 5 PASS/17 FAIL, 두 번째 12 PASS/10 FAIL, 세 번째 17 PASS/5 FAIL.
  대비 부족, 중첩 overflow:hidden으로 잘린 결과·재시도, 하단 단계 메뉴의 키보드 대상 가림을 수정했다.
  연속 resize 후 이미 focus된 요소에 focus()를 반복하면 스크롤되지 않는 설정은 실제 Tab 이동으로 바꿨다.
  기존 재시도 hit/44px assertion을 유지하고 각 화면의 14개 분류 focus·hit 검사를 추가했다.
- 그 뒤 신규22/22 PASS, 기존 지도 오류·저장·도구를 포함한 관련46/46 PASS(1.5분).
  지정된 11개 viewport의 너비와 높이, 밝음/어두움, KO/EN, axe, 가로 넘침을 검사했다.
- 지도 교체 4 FAIL 수정 뒤 신규26/26 PASS(38.2초).
- 마지막 15번째 결과까지 Tab 이동하는 추가 4건은 링크 높이 부족으로 전부 FAIL했다. 링크의 44px 영역을 수정했다.
  이 수정 전 전체 실행은 중단했으며 완료 결과로 세지 않는다. 새 전체 실행에서 다시 검증한다.
- 390px/1366px 패널 캡처를 직접 확인했다. SDK·관광 응답은 fixture이며 Production 화면 증거와 구분한다.
- 원본 의존성 audit는 기존 개발 의존성 high2/moderate1을 보고한다. #309 포함 통합 후보 audit0과 혼동하지 않는다.
- timeout/기준 증가, 테스트 삭제, assertion 제거, 신규 skip은 없다. 새 10초는 제품 SDK 대기 기한이다.

## 다음 확인과 운영 경계

### 독립 검토 P1: 실제 검색 반경

e51cad8을 대상으로 한 [독립 리뷰](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/332#discussion_r3945565596)가
전 지구 좌표 검사만으로는 경남 중심 10km 검색에 0,0/반경 밖 장소를 허용한다고 지적했다.
실제 hook에서 18 PASS/2 FAIL로 재현했다. 좌표 0을 무조건 결측으로 취급하는 대신 요청 시점의 중심·반경을 고정하고
구면 거리로 응답 위치를 검증한다. 10km 경계의 거리 계산/반올림 차이에 대한 허용 범위는 최대50m이며
10,025m 허용·10,075m 제외 계약으로 고정했다. 지도를 응답 전에 옮겨도 원래 요청 중심으로 판정한다.
경남 중심에서 0,0과20km 밖 응답은 목록·marker·선택 대상이 되지 않고, 중심의 정상0m 결과는 유지한다.
이후 hook21/21 PASS다. SDK 중심 fixture도 실제 getLat/getLng 계약에 맞췄다.
이 수정 전 e51cad8/78144e8 로컬 전체 실행은 중단·보존했으며 PASS로 표시하지 않는다.
직전 완료된 전체 통합 검증은 ff7a207의489 PASS/기존skip1이고 P1 해결 증거로 재사용하지 않는다.

e51cad8의 주변 E2E30/30 PASS(40.0초)·기본검사 성공은 P1 수정 전 기록이다.
P1을 포함한 주변 E2E·전체 Playwright·axe·기본검사와 CI는 PR 본문/실행 원장에 새 SHA와 실제 결과를 연결한다.
부모 #330과 최신 통합 후보에 함께 적용한 회귀 결과도 별도로 기록한다.
main/Production `34e6021`, #287 승인0/3, Preview 접근 및 008 운영 스키마·백업/복구 확인은 별도 차단 사항이다.
실제 SDK 운영 호출, 화면 낭독기·실물 기기, 브라우저 실제200% 확대는 이 fixture 검증으로 대신하지 않는다.
유료 모델 API·추가 서비스·Secret 복사/출력은 사용하지 않았다. API 기반 자동화 세 workflow의 비활성 상태를 유지한다.
