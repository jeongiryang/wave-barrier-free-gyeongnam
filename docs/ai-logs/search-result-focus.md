# 검색 결과·단계 이동의 포커스와 늦은 응답 — 2026-09-07

## 재현과 원인

실제 Preview `c1bae6f80f58fb2ec58d7e00160ad7869f2bdeef`에서 검색과 다음 단계 이동 뒤 포커스가 body로 돌아갔다. 같은 배포에서 중립 상태→실제 KTO 추천5곳→공식 상세→일정2곳→ODsay47분/52분2구간→로컬 여행집 저장은 동작했다. 자동 smoke는 Vercel 보호401이고 직접 health 페이지는 ERR_BLOCKED_BY_CLIENT여서 전체 API 검증으로 세지 않았다. 기본지도 대체 전환·현장 후기 조회 실패는 원인 미확정으로 남겼다.

- `runPlan`은 스크롤만 취소했지만 `generatePlan`이 성공 후 무조건 결과 단계로 이동해, 응답을 기다리다 돌아간 질문을 숨겼다.
- 명시적 단계 이동은 스크롤/URL만 갱신하고 제목에 포커스를 주지 않았다. 검색 후 URL도 이전 조건 단계에 남았다.
- 대기 중 검색 버튼의 native disabled가 키보드 포커스를 잃게 했다.

## 변경

- 응답 반영과 자동 화면 이동을 구분한다. 새 결과는 저장하되 이후 키보드·포인터·휠·터치 조작이 있었으면 화면과 포커스를 바꾸지 않는다.
- 검색의 결과 이동 callback을 같은 취소 경계에 넣는다. 명시적 단계 이동은 URL을 갱신하고 React DOM commit 뒤 제목에 포커스를 준다. 단순 스크롤 관찰·초기 렌더·모션 설정 변경으로 포커스를 이동하지 않는다. 뒤로가기는 기록을 새로 만들지 않고 표시된 제목으로 복귀한다.
- 검색 중에는 aria-disabled/aria-busy와 실제 중복 실행 guard를 사용한다. 조건이 부족하면 기존 native disabled를 유지한다. 같은 버튼에서 Enter/Space를 반복해도 추가 요청을 만들거나 의도한 결과 이동을 취소하지 않는다.

## 검증

- 최초6 FAIL 중2건은 실제 포커스/지연 응답 문제였고4건은 새 테스트가 hydration 전에 지역을 누른 설정 문제였다. 기존 테스트와 같은 hydration 준비 조건을 추가했다. 첫 수정 후43 PASS/5 FAIL 역시 그 설정 문제였다.
- 준비 조건을 고친16건은14개의 제품 실패와2개의 잘못된 영어 버튼 이름으로 실패했다. 실제 이름 Itinerary를 확인한 뒤 이전 앱에서 영어2건의 포커스 실패도 별도로 재현했다. 제품과 테스트 오류를 섞지 않았다.
- pending 포커스 고정 후 반복 Enter가 결과 공개 취소로 처리되어54 PASS/4 FAIL이었다. 반복 활성화와 다른 행동을 구분해 수정했다.
- 최종 관련58 PASS(1.3분): 새16건과 기존 launch-integrity42건. KO/EN·desktop/mobile·390/1366, 검색 대기/중복 방지/결과 제목/URL/뒤로가기/지연 응답/모션 감소·axe·console/pageerror0·가로 overflow0. 직접 확인한390/1366 캡처에서 결과 제목의 포커스 표시가 보였다.
- 실제 hook 실행 계약7 PASS, 전체unit498 PASS, lint/typecheck/Vercel production build/performance PASS. 기존 정적 onClick 계약은 guarded handler와 조건 disabled/로딩 aria-disabled 검증으로 강화하고 실제 중복 Enter1요청 E2E를 추가했다.
- CSS69.82/70, 랜딩115.11/155, 플래너269.73/270KiB, 최대chunk95.92/110. 예산·timeout·skip을 늘리지 않았다.
- 전체622개 Playwright/axe와 새 CI는 이 로그 커밋 뒤 실행한다. 아직 전체·CI·Preview 수정본 성공은 아니다. 이전 c1의 로컬/CI605 PASS·기존skip1/flaky0를 새 결과로 세지 않는다.

## 보존과 재개

`fix/search-result-focus`/별도worktree, 로컬4215에서만 수정했다. 원본 #339는 통합 브랜치가 base여서 ae5f5b2를 포함한 push 때 GitHub가 MERGED로 표시했다. main 병합/Production 반영은 아니며 자동 삭제된 원격 원본 브랜치를 c789bc6로 복원했다. main34e6021의 사람 승인3건·008·운영 게이트는 유지한다. 새 source의 base를 진행시켜 리뷰 전에 같은 자동 병합 표시를 만들지 않고, 먼저 source 검증·리뷰를 보존한다.

다음: 전체622개/CI → 이 source SHA의 실제 Preview 검증 → 통합·리뷰 게이트. 직접 캡처에서 영어 사진 fallback의 한국어 안내와 밝은 사진 위 지역 badge의 식별성도 발견했다. 이번 포커스 PR에 섞지 않고 #269/#270/#285 및 기존 언어 요구의 다음 작업으로 실제 재현·수정한다. 로그/trace/캡처는 임시 `wave-launch-20260906/search-*`에 보존했다. 모델 API/유료 대체/Secret·구독 인증 복사/새 예약은 없다.
