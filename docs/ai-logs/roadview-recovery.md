# 로드뷰 선택·초기화·오류 복구

2026-09-07 Engineering/QA. #251·#271·#277·#285의 남은 지도 사용자 흐름을
`fix/roadview-recovery` worktree에서 처리한다. 부모 #333 `1d358909ff6240111c6fee7bd399711d4ec99613`을 보존했다.
동시에 통합 #334 `322ecbc06c0b737a6fc192cf951e78c079051e19`의
[CI34071014088](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34071014088)는
quality/browser2shard/validate 전체 성공, 547 PASS·기존skip1·flaky0로 확인해 Ready로 전환했다.
기존 35개 원본 PR은 폐기하거나 닫지 않았다. 사람 승인·Preview·Production은 별개다.

## 원인과 변경

- 기존 로드뷰는 지도 클릭만 안내했다. 선택 날짜의 일정 장소를 명시적으로 고르는 label/select와
  열기 버튼을 제공한다. 기본 선택·자동 요청 없이 취소/닫기 후 실행 버튼으로 돌아간다.
- React commit 전에 예약한 frame에서 컨테이너를 찾았고 SDK 예외·무응답·오래된 callback을 처리하지 않았다.
  commit 후 effect에서 요청하고, 닫기/새 요청/unmount 시 기존 응답을 무효화한다.
  검색과 초기화 전체의 10초 응답 기한, 빈 결과/오류 구분, 중복 callback 차단, 영속 재시도 버튼을 추가했다.
- [Kakao 공식 SDK 문서](https://apis.map.kakao.com/web/documentation/#Roadview)의
  `getNearestPanoId`는 ID 검색이고 `init`는 초기화 완료 이벤트다. `setPanoId` 반환만으로 성공 표시하지 않는다.
  실제 영상의 최신성·장애물·무장애 경로를 보증하지 않는다는 안내를 유지한다. 영상 타일 전체 로딩을 검증했다고 주장하지 않는다.
- 한국어/영어 로드뷰 제목·선택·빈 결과·오류·재시도를 연결했다. locale 변경은 새 SDK 요청을 만들지 않는다.
- 모바일 하단 단계 바가 재시도를 가리는 문제를 재현해 키보드 컨트롤을 화면 중앙으로 드러낸다.
  아이콘용 44px 고정 규칙은 닫기 버튼에만 적용하고 텍스트 버튼은 전체 폭을 사용한다.
- 주변 패널의 뒤늦은 frame이 다음 로드뷰 버튼의 포커스를 훔치는 경합을 발견했다.
  지도 패널의 진입/복귀는 commit 후 처리하고 이미 다른 요소로 이동한 포커스를 덮어쓰지 않는다.

## 재현과 검증

- 실제 hook을 실행하는 제어 SDK 테스트: 기존 8 FAIL → 수정 후 11 PASS.
  예외3종, 검색 성공/초기화 분리, 검색/초기화 무응답, 닫기/unmount/새 요청, 중복 응답, 언어 변경을 검사한다.
- 기존 통합322ecbc에 새 키보드 계약을 실행해 desktop/mobile 2 FAIL을 재현했다.
- 명시적 label 연결 후 기능10 PASS, 화면8 FAIL → 실제430px 하단 가림 수정 후18 PASS.
- 직접390/1366 screenshot 검토가 텍스트 버튼 세로 잘림을 발견했다.
  세로 overflow assertion을 추가해2 FAIL 재현 후 아이콘 CSS 적용 범위를 수정했다.
- 49 PASS/1 FAIL에서 드러난 패널 닫기/다음 조작 focus 경합은 frame을 제어한 별도2 FAIL로 고정했다.
  임의 sleep·timeout 증가·assertion 약화로 해결하지 않았다.
- 화면 크기 변경 뒤 이미 focus된 요소에 focus를 다시 호출하면 실제 키보드 탐색이 일어나지 않는다.
  화면 검사 setup은 Tab/Shift+Tab으로 진입하도록 고쳤고 44px·실제 hit 대상·가로/세로 overflow·axe 기준은 유지했다.
- 최종 lint/typecheck·전체 unit365·Vercel build·performance budget PASS.
  관련 로드뷰/지도 설정52/52 PASS(1.3분): KO/EN·밝음/어두움·11viewport·44px·Tab/Shift+Tab·runtime reduced-motion·axe·console/pageerror0.
  전체 Playwright, 새 PR CI와 통합 검증은 최종 실행 로그 및 PR에 이어 기록한다.
- 원본 branch 전체 audit는 기존 개발 의존성 high2/moderate1이다. 새 패키지/override는 추가하지 않았다.
  #309가 포함된 통합 #334의 전체/운영 audit0과 구분하고 새 통합에서도 다시 검사한다.

## 운영 경계와 재개

테스트는 관광 API/지도 SDK fixture다. 실서비스 Roadview 영상·Preview 성공이 아니다.
main/Production `34e6021`, 배포6278499275, #287 필수 승인0/3, Preview 접근·008 운영 확인은 미해결이다.
모델 API3workflow 비활성을 유지하며 유료 모델 실행·Secret/구독 인증 복사·예약 추가가 없다.
로그/화면/trace는 로컬 임시 `wave-launch-20260906/roadview-*`에 보존했다.
현재 통합4187/로드뷰4209 개발 서버와 기존 모든 worktree를 보존한다.
이 PR의 최종 CI → 통합 #334에 합성한 새 SHA의 전체 검증 → Production 접근 가능한 범위의 읽기 QA 순서로 이어간다.
사람 승인 없이 병합·배포·완료·Release GO로 표시하지 않는다.

## RC-19 추가 리뷰 대응 — 2026-09-07

통합 #334 댓글3945944310의 P1을 재현했다. 세계 범위 검사만으로 (0,0)이나 서비스 좌표 범위 밖의 저장 장소가 선택되고 SDK 조회까지 실행됐다. 기존hook11 PASS에 신규3 FAIL, 통합d7a의 desktop/mobile 신규4 FAIL을 남겼다. 공유 `lib/map-coordinates.js`로 route API와 같은 위도30~40·경도120~135 범위를 적용해 선택지와 SDK 호출 직전을 함께 방어한다. 이는 행정경계 판정이 아니다. 유효한 위치가 없는 일정에는 다른 장소나 지도 선택 안내를 표시한다.

hook14/unit368 PASS, lint/typecheck/Vercel build/performance PASS. 새 desktop/mobile 및 기존 지도 레이어를 포함한 최종56건은 `roadview-rc19-verified.log`에서 PASS(1.4분)다. 첫 실행52 PASS/4 FAIL은 좌표 차단 이후 Escape 포커스 복귀에서 실패했다. `useMapShell`과 `useMapAccessibility`가 같은 Escape에서 선택 모드를 닫으며 focus 복귀가 빠지는 충돌이었고, 로드뷰 취소를 접근성 hook 한 곳으로 모아 수정했다. assertion을 그대로 둔 대상4건과 최종56건이 통과했다. 이전b10fe9c의 CI551 PASS와 새 수정본의 성공을 구분한다. fixture에 손상된 장소 좌표를 명시적으로 주입해 정상 경남 좌표의 기존 테스트를 그대로 유지한다. 새 CI·통합·Production 검증은 아직 완료가 아니다.
