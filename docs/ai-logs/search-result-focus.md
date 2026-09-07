# 검색 결과·단계 이동의 포커스와 늦은 응답 — 2026-09-07

## 최신 독립 QA 수정 — 2026-09-07 05:11 UTC

- 이전12dc50d의 전체633 PASS/기존skip1(18.1분), [CI34082319923](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34082319923)633 PASS/기존skip1/flaky0를 확인했다. 하지만 독립 리뷰5127999969의 P1 두 사용자 전환이 남아 있었으므로 완료/Ready로 판정하지 않았다.
- 출발 확인에서 주변 장소 경로 보기·혼잡 대안 교체를 실행하면 `changeStep`의 기본 무포커스 계약을 사용해 숨긴 버튼에 포커스와 이전 URL이 남았다. 새 KO/EN·desktop/mobile 8개 모두 같은 focus assertion에서 FAIL → 수정 후8 PASS(24.1초).
- 같은 호출 형태의 날씨 대안 재검색도 추가4개 모두 조건 제목 focus 검사에서 FAIL. 명시적인 세 사용자 전환만 `navigate=true`로 바꾸고, 표시된 섹션으로 제목 포커스와 정적 스크롤을 맞췄다. 주변 장소 호출의 별도 navigation 스크롤은 제거해 제목을 화면 밖으로 다시 밀지 않는다. 내부 상태 동기화·observer는 기존 무포커스 경계를 유지한다.
- 최종 관련 search-result-focus/launch-integrity/route-selection-stability **94 PASS(3.0분)**, unit498/lint/typecheck/Vercel build/performance PASS. CSS69.82/70, planner269.74/270, landing115.11/155, 최대chunk95.92/110KiB. 새12건은 확인 대화·일정 ID/교체·지연 요청·제목 가시성·URL·실제 뒤로가기를 검사한다. 날씨 검사 작성 중 한국어 재조회 버튼명을 실제 계약으로 바로잡았으며 기준·timeout·skip은 완화하지 않았다.
- 이 증분의 전체646개·새 HEAD CI·최신 합성 Preview·독립 재판정은 다음 검증 단계다. 아래 이전 실행 대기 기록은 당시 상태이며 이 최신 결과와 구분한다. source #3434c46f29 및 #34443050e6는 보존했고 #334 base는 리뷰 전 진행시키지 않는다. Production34e6021/사람 리뷰3건/008 운영 게이트는 그대로다.

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

## 실제 Preview 후 추가 검증 — 2026-09-07 04:15 UTC

- `00e63440292548d260fcafbd81b4528849065cd6` 로컬전체621 PASS/기존skip1(14.9분). CI34080658948은 SUCCESS지만 정확히620 PASS/기존skip1/flaky1이다. flaky는 desktop `route-selection-stability:79`의 최초 일정 추가가 반영되지 않은 경우이며 재시도로 숨겨진 실패를 완료로 세지 않았다.
- 실패 artifact `browser-screenshots-1`의 screenshot/error-context/trace를 확인했다. 클릭 input snapshot의 scrollTop1911이 mouseup 뒤1870으로 바뀌었고 일정은0개였다. CPU4배 같은 시험8회는 로컬에서8 PASS로 불규칙성을 확인했다. 비동기 검색 결과를 보여 줄 때 smooth 이동을 끝내기 전에 카드를 누를 수 있는 경합을 없애기 위해 결과 공개 이동은 정적으로 마친다. 사용자 주도 단계·지도 이동의 설정은 유지한다. 이 변경의 최종CI 결과는 따로 확인한다.
- 기존 Hobby 프로젝트 Preview `EtW9tQiVFMnYy4g9X2x2vpKvEQHz`, URL https://wave-barrier-free-gyeongnam-cvo33mqoo-jeongiryang-projects.vercel.app/ 에00e6344가37초 빌드로 Ready. 실제 KTO추천5곳, 결과제목 focus+URL#places, Tab 다음버튼, 장소추가 후 일정제목 focus+URL#itinerary를 확인했다. Kakao자동차32분과 대중교통68분 실응답이 표시됐으며 지도SDK는 대체지도였다. 키보드 Alt+ArrowLeft 입력은 브라우저 이동이 일어나지 않아 실제 Preview 뒤로가기 PASS로 세지 않는다. 로컬의 뒤로가기 검증과 구분한다.
- 이어서 실제 모든 구간 조회를 누르자 native disabled 때문에 focus가 body로 떨어졌다. 신규12건 모두 FAIL → 수정 후 기존launch 포함70 PASS. 조회버튼은 focus를 유지하고 controller ref로 중복 요청을 막는다. 취소버튼 cleanup은 해당 버튼이 실제 focus를 갖고 사라질 때만 조회버튼으로 돌려주며 다른 곳으로 이동한 사용자는 건드리지 않는다.
- 추가12건은 KO/EN·desktop/mobile의 대기/중복Enter/취소/완료/다른컨트롤이동/재시도/axe를 검사한다. 최종관련82 PASS(2.2분), unit498/lint/typecheck/build/performance PASS, planner269.75/270KiB. 최초typecheck의 중복요청 guard 뒤 불필요한 abort 호출은 제거했다. 신규skip/timeout/기준완화 없음.
- 이 추가 커밋의 전체634개·CI·새 Preview는 아직 실행 전이다. 이전00e6344의621/CI성공과 섞지 않는다. 사진PR#343은 독립6ab7b57이며 기존통합 base는 리뷰 전 전진시키지 않는다.

## 보존과 재개

`fix/search-result-focus`/별도worktree, 로컬4215에서만 수정했다. 원본 #339는 통합 브랜치가 base여서 ae5f5b2를 포함한 push 때 GitHub가 MERGED로 표시했다. main 병합/Production 반영은 아니며 자동 삭제된 원격 원본 브랜치를 c789bc6로 복원했다. main34e6021의 사람 승인3건·008·운영 게이트는 유지한다. 새 source의 base를 진행시켜 리뷰 전에 같은 자동 병합 표시를 만들지 않고, 먼저 source 검증·리뷰를 보존한다.

다음: 전체622개/CI → 이 source SHA의 실제 Preview 검증 → 통합·리뷰 게이트. 직접 캡처에서 영어 사진 fallback의 한국어 안내와 밝은 사진 위 지역 badge의 식별성도 발견했다. 이번 포커스 PR에 섞지 않고 #269/#270/#285 및 기존 언어 요구의 다음 작업으로 실제 재현·수정한다. 로그/trace/캡처는 임시 `wave-launch-20260906/search-*`에 보존했다. 모델 API/유료 대체/Secret·구독 인증 복사/새 예약은 없다.
