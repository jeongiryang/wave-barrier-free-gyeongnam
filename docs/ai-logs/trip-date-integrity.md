# #337 날짜·저장·실제 화면 정합성 — 2026-09-07

팀원 ginaginaring의 Production 제보 #337을 최신 통합 `a03529a5408f5261a1737b885b36e3e649b3ffbd`와 대조했다. main/Production은34e6021이다. 기간 밖 장소를 별도 목록에 남기고 지도에서 제외하는 기존 #287 이후 구현과 회귀는 재구현하지 않았다. 새 종료일 상한·변경 안내·여행집 저장의 남은 결함만 수정했다.

## 재현과 변경

- hook: 기간 축소 보존1 PASS, 7일 초과/도착일 자동 변경 안내/긴 저장 기간/실제 달력 날짜/잘못된 재배정5 FAIL →6 PASS. `lib/trip-dates.js`의 달력 검증과7일 범위를 입력·저장 복원·URL 진입에 일관되게 적용한다. 기간 보정은 안내하고 장소의 원래 날짜는 유지한다.
- 여행집: 기존3 PASS/신규2 FAIL →5 PASS. 새 기록은 잘못된 기간·7일 초과·미해결 장소 날짜를 저장하지 않는다. 오래된 기록의 유효한 원래 날짜는 범위 밖이어도 보존한다. 기존 정리 테스트는 legacy sanitizer에 유지하고 새 snapshot 거부를 추가했다. 사용자 날짜를 첫날로 바꾸는 과거 assertion은 원래 날짜 보존 assertion으로 강화했다.
- 두 날짜 입력 위치에 도착일 max와 한국어/영어 안내를 연결한다. 장소 날짜 선택에 DAY 번호와 실제 날짜를 함께 표시한다. 기간 밖 장소가 남으면 저장·공유를 차단하고 날짜 선택/제외를 안내한다. 날짜가 정해진 장소 수에는 기간 밖 장소를 포함하지 않는다.
- 브라우저 첫 실행의 한국어2 FAIL은 max 없음, 영어2 FAIL은 테스트가 아래로 이동한 뒤 환경설정 위치를 잘못 가정한 설정 문제였다. 기존 키보드 Home 흐름을 적용했다. 첫 후속 실행의 저장 확인 오류는 잘못된 저장소 키 이름을 실제 키로 정정했다. assertion을 제거하지 않았다.
- 실제 outside-date 상태의 axe가 h2→h4 제목 단계 누락을 발견해 h3로 수정했다.
- 관련28 PASS 뒤 **직접 캡처에서 일정이 투명한 것을 발견했다**. 정상 motion에서 lazy editor가 최초 observer 등록 이후 마운트되는 결함이었다. opacity 검증을 추가해4 FAIL을 재현하고 `usePlannerChrome`이 뒤늦은 DOM도 등록하도록 수정했다. 한 번 표시한 내용을 다시 숨기지 않고, 키보드 포커스가 들어오면 부모를 표시한다. 긴 일정에도 동작하도록 교차 임계값을0으로 둔다. reduced-motion/observer 미지원에서는 정적으로 표시한다.
- 실제 표시가 복구되자 빈 날짜 안내 대비 오류4 FAIL이 드러났다. muted 테마색으로 수정했다. 직접 캡처에서 기간 밖 장소명이23px 순번 칸으로 축소된 것도 발견했고, 넘침 assertion2 FAIL을 추가한 뒤 기존 CSS의 `.day-planner li`를 `.day-planner-grid li`로 좁혔다. 신규 기준을 낮추지 않았다.

## 검증 증거와 범위

- 계약11 PASS, 전체unit491 PASS.
- lint/typecheck/Vercel production build/performance PASS.
- performance: CSS69.82/70, landing115.11/155, planner269.46/270KiB, 최대chunk95.92KiB. 예산을 변경하지 않았다.
- 최종 관련40 PASS(1.2분): 새24건과 기존 일정 언어/여행집16건. desktop/mobile·KOEN·light/dark,390/1366 화면, 저장 차단→사용자 날짜 선택→저장/새로고침, 긴 URL 복원, opacity·가로/이름 넘침·axe·console/pageerror0을 검증했다.
- 수정 전 투명 캡처, 표시 복구 후 잘린 이름, 최종390/1366 실제 캡처를 직접 확인했다. fixture 데이터이며 실제 Production 반영으로 주장하지 않는다.
- 전체606개 Playwright·axe와 새 CI는 이 로그 커밋 후 실행한다. 아직 최종 전체/CI/배포가 완료되지 않았다.

## 보존과 재개

별도 `fix/trip-date-integrity`/`wave-trip-date-integrity`, 로컬4213 서버에서 작업했다. 모든 기존 원본 브랜치·사용자 변경을 보존했다. 로그/캡처/trace는 임시 `wave-launch-20260906/trip-date-*`에 있으며 실패 이력도 남겼다. 부모 통합a035는 unit484/로컬581 PASS(13.2분)/CI34076185336 581 PASS·기존skip1·flaky0이다. 새 날짜 변경의 성공으로 부모 결과를 재사용하지 않는다.

다음: 이 PR 최종 전체606개/CI → 통합 #334 합성·전체 재검증 → Production 읽기 QA. #337의 사진/가독성/문구/요약 제안은 기존 관련 이슈의 구현·운영 근거와 대조하고 부분 완료로 유지한다. source/통합/Production을 구분하며 사람 승인3건·Preview·008/운영·실물·공모전 Gate를 우회하지 않는다. 유료 모델 실행/Secret·구독 인증 복사/새 예약/신규 과금 자원이 없다.
