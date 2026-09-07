# W.A.V.E 실행 체크포인트 — 2026-09-06

전체 요청은 미완료다. 커밋/CI/문서 존재를 운영 반영으로 세지 않는다. Release GO는 PM 판단이며
현재 미배포 보안/UX 수정, Production route 계약 실패와 미완료 검수 때문에 기술 상태는 NO-GO다. 관광 추천은 16:56 재검사에서 회복됐다.

## 2026-09-07 04:27 UTC 실행 증거

전체 요청은 미완료다. 원격 Open PR42·Issue49를 다시 조회했다. main/Production `34e6021265b16d046dca24feaa3ec2101fc977e2`, GitHub배포6278499275/Vercel `DpUP8LhruYLeXs6N5Nxqrk3JoD6G` 유지. #287 b803b80은 Ready지만 승인0/3·REVIEW_REQUIRED/BLOCKED다. 보호 규칙·사람 리뷰·008 운영 스키마/백업/적용·최종 운영 게이트는 우회하지 않는다.

| 범위 | 정확한 근거 | 상태와 다음 조치 |
| --- | --- | --- |
| #334 통합 | c1bae6f, unit491/기본검사/audit0, 로컬605 PASS/기존skip1(14.2분), [CI34078864255](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34078864255)605 PASS/기존skip1/flaky0 | Draft. 이후 실제 Preview에서 발견한 포커스와 사진 결함을 #342/#343에서 처리 |
| #339 날짜 | c789bc6, unit491/관련40/로컬·CI605 PASS | GitHub03:12:28에 ae5f5b2 포함 통합 base push로 MERGED 표시. **main 병합·Production 반영 아님**. 자동 삭제된 원격 원본 branch를 c789bc6로 복원. 이전 미병합 표시는 이 기록으로 정정 |
| #341 팀원 문서 | afb78cf, unit261/기본검사/CI201 PASS; 로컬199 PASS/기존skip1/대비2 FAIL | Draft. 문서 계약과 실제 랜딩 구현은 구분. #340 및 기존 랜딩 요구 대조 계속 |
| #342 검색·구간 포커스 | 최신12dc50d, unit498/관련82 PASS/기본검사PASS, planner269.75/270KiB | 전체634개/[CI34082319923](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34082319923) 진행 중. 이전00e6344 로컬621 PASS와 CI620 PASS/flaky1/기존skip1은 별도 |
| #342 실패 분석 | 실제 Preview 검색·단계 focus와 URL 수정 확인 후 구간조회 body focus 재현. 새12 FAIL→기존launch포함70 PASS. CI의 일정추가 click 때 scrollTop1911→1870/저장0 trace 확인 | 로딩/취소 focus와 중복요청 guard, 비동기 결과 공개 정적 이동 보강. 재시도 통과를 무결한 성공으로 세지 않음 |
| #343 사진 | 최신3560f1d(앱6ab7b57 동일), unit491/기본검사/audit0/관련42 PASS. 신규24 FAIL→24 PASS | 첫전체·CI627 PASS/기존skip1/오래된 문구2 FAIL. 핵심 여정의 새 문구 exact 계약 보완 후 전체630개/[CI34082854123](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34082854123) 진행 중 |
| 격리 합성 | `audit/focus-photo-qa-20260907` cef3ef4, 앱c70539d. unit498/기본검사PASS, CSS69.83/70·planner269.87/270KiB | source PR의 base #334를 전진시키지 않았다. 원본 리뷰 상태 보존. 이전 전체는 알려진 문구 실패 후 중단했고 새 계약 포함658개를 처음부터 실행 중 |
| #335/#336/#338 | f6e451b CI555/8231464 CI237/b6a7f77 CI237 PASS | Ready·main 미병합·Production 미배포, 원본 보존 |

**실제 Preview:** [합성 c70539d 배포](https://vercel.com/jeongiryang-projects/wave-barrier-free-gyeongnam/CXxvGDrb1izgpKWvxEbjJvAfxAbz), [화면](https://wave-barrier-free-gyeongnam-29iuzgs9r-jeongiryang-projects.vercel.app/), 04:17:13 UTC Ready/36초. 기존 Hobby 프로젝트 일회성 Preview다. 영어 중립조건→명시적 KTO추천7곳→영어 사진alt/원문 안내→두 장소 일정→실제 Kakao20분/21분2구간·ODsay38분 대안이 표시됐다. 결과/일정 제목과 조회 대기 focus를 확인했다. 실제 취소는 응답이 먼저 완료되어 실행 증거로 세지 않고 로컬12건으로 구분한다. 지도 SDK는 대체지도이고 일부 지도 기능명/상태/혼잡 문구가 한국어로 남아 `fix/map-status-language`에서 별도 확인 중이다. 실제 모바일 Preview·전체 콘솔/API smoke 완료가 아니다.

이전 c1 Preview03:15와00e Preview는 각각 KTO추천5곳·ODsay47/52분, 검색/일정 focus·Kakao32분/ODsay68분 증거가 있다. 외부 자동 Preview smoke는 보호401, 직접health경로는 ERR_BLOCKED_BY_CLIENT였으며 우회하지 않았다. 실제 API 전체검증이나 Production 성공으로 세지 않는다. Production02:50 API13+HTML14 응답검사,02:52 390/1366 추천3·로컬저장1·복원1/console·pageerror·overflow·실패GET0이지만 최초선택1/자동요청2·새provider계약FAIL은 운영 잔여다.

모델 API workflow3개 disabled_manually를04:05 원격 재확인했다. 실제 API 과금은 확인 불가이며 추정하지 않는다. 기존 구독 예약5개/로컬CLI/리뷰환류의 부분 증거만 있고 전체 자동화 완료는 아니다. 신규예약·모델API·과금자원·Secret/구독인증 복사 없음. 기존4187/4213 소유 서버만 종료했고4215/4217/4219 검사와 다른 작업자는 보존했다.

정확한 재개: #34212dc 전체634·CI → #343356 전체630·CI → cef3 합성658·실제 Preview 잔여 → 리뷰 승인3건과008/운영 게이트. 대기 중 영어 지도 상태/버튼·모바일 추천 이동 위계, 기존 #340과 랜딩 기능 차이, 제출/운영 문서를 이어서 처리한다. 원본 PR을 닫거나 합성 base로 밀어 리뷰를 대신하지 않는다. 로그는 `journey-focus-*`, `photo-*`, `focus-photo-*`, `ci342-00e-success.log`, `ci343-6ab-failed.log`에 보존한다.

## 이전 실행 증거 — 2026-09-06 23:38 UTC

- **지도 실패 #329 `43ebf0812450512663b3f939657688fdb7dad5e1`, Ready**:
  열린 panel/pick/roadview 정리·부분 map 제거·외부 focus/늦은 위치 callback 가드를 유지했다.
  이전7f53de4 source/CI439 성공 뒤 자식48f3f40의 [CI34059135961](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34059135961)는
  462 pass/기존skip1/모바일 focus1 fail(첫 실행·재시도 모두)로 실패했다. CPU4배 지연에서도2 FAIL/2 PASS였으며,
  한 번 실행한 requestAnimationFrame이 React 오류 버튼 commit보다 먼저 실행된 trace를 확인했다.
  새 hook이 교체 전 focus를 기억하고 commit 뒤 useLayoutEffect에서 복구한다. 새/외부 focus를 빼앗지 않고 버튼을 가운데 드러낸다.
  hook4+위치3 계약, CPU4배 지연6 E2E×3회=18/18, unit314·lint/typecheck/Vercel build/performance PASS.
  전체 source439 pass/기존skip1/실패0(10.0분), [CI439 pass/기존skip1/flaky0(18.2분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34060718068).
- **이미지·페이지 링크 #330 `21fdbd674d8a36a1e9dc3f59186cc0cb45f831c3`, Ready**:
  실제 PNG 다운로드 시작·오류/취소/재시도, 안내도/추정값/무장애 이동 미보장, 출발지 잘림과 tablet drawer 폭·대비를 수정했다.
  페이지 링크에 일정이 포함되지 않는 범위를 명시한다. 부모43ebf08을 합치며 action 상태와 availability/focus 가드를 보존했다.
  unit320·관련38·lint/typecheck/build/performance PASS, 전체 source463 pass/기존skip1/실패0(10.5분),
  [CI463 pass/기존skip1/flaky0(18.2분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34060894554).
  양 PR은 미병합·미배포이며 리뷰를 임의 승인/resolve하지 않았다.
- **이전 합성 검증 `8e33414845ea10520be67094edce88c45e0670c6`**:
  #33021fdbd6까지 기존 제품·보안·자동화 stack에 합쳤다. unit350·lint/typecheck/build/performance·audit0 PASS,
  CSS69.85/70·랜딩114.34/155·플래너268.87/270KiB. 전체475 pass/기존skip1/실패0(11.1분).
  이전d4c4911의346/475 성공이 놓친 focus race는 위 새 검사로 재현/수정했다. 로컬 검증을 CI/Preview/Production으로 세지 않는다.
- **#258 소개 지도**: `fix/landing-region-boundaries`는 #320을 보존한 별도 worktree다. 기존 SGIS2020의 실제18경계,
  대한민국 위치 안내,44px 목록·KO/EN·사진/모듈 실패 대안·지연 로딩을 구현했다. 최신2025 경계를 적용했다고 표시하지 않는다.
  호버 미리보기로 높이가 변하면서 scroll anchoring이99px 왕복하는 실제 실패는 위쪽 정렬로 수정했다.
  unit282·기본검사·반복54·관련34 PASS. 첫 전체263 pass/기존skip1/2 fail은 고정4173 캘린더 URL이었다.
  기존 a62886a의 baseURL assertion을 재사용해 관련4/4·전체265 pass/기존skip1/실패0(5.7분)을 확인했다.
  [#331](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/331) `cc5db1102d8585d2066d8a0037c2f8fa2d8f6861`로 clean/push,
  [CI34063758123](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34063758123) 265 PASS/기존skip1/flaky0로 성공·Ready·미병합·미배포다.
  390/1366px 각각18개 touch 선택·링크/경계 동기화·빈 사진 fixture·console/overflow0을 직접 검증했다.
  로컬 키 미설정 사진503은 별도 실패 기록이며 실제 API 성공으로 세지 않는다.
- **이전 주변 검색 #332 `0884ceffd658364ce45d106a5d202516b8a3fb47`**: #330의 자식 PR이다.
  오류/빈 결과·늦은 응답·빈 좌표·중복 재시도·지도 교체 취소와 15개 결과를 일치시켰다.
  KO/EN·대비·단일 스크롤·44px 링크, 11개 지정 viewport의14개 분류와15번째 결과까지 키보드 접근을 검증했다.
  최초 hook2 PASS/7 FAIL→16/16, 지도 교체4 FAIL 및 링크 높이4 FAIL도 재현·수정했다.
  독립 리뷰의 실제 반경 P1은18 PASS/2 FAIL로 재현했다. 요청 중심·10km(+최대50m 계산 차이)로 검증하고 정상0m를 유지한다.
  이후 hook21/21·unit341·기본검사·주변34/34 PASS, 전체 source497 pass/기존skip1/실패0(12.3m).
  [CI34066732365](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34066732365)의 현재 결과는 PR에서 확인한다.
  e51cad8 CI34066049407은 후속 push로 취소됐고 e51cad8/78144e8 로컬 전체는 P1 수정 전 중단해 PASS로 세지 않는다.
  원본 audit high2/moderate1은 #309 미포함 개발 의존성이다.
- **이전 통합 `1d3638ec418371706e89872207927a6831cb9a91`**: #3320884cef까지 충돌 없이 합쳤다.
  unit373·lint/typecheck/Vercel build/performance·audit0 PASS, 전체523 pass/기존skip1/실패0(12.8m).
  CSS69.75/70·landing115.13/155·planner268.59/270KiB. 직전ff7a207의unit352·전체489 성공도 보존한다.
  로컬 통합 성공은 Preview/병합/Production 성공이 아니다. source PR와 실제 사람 리뷰를 유지한다.
- **문서 정합성 추가 수정**: `competition-operation-policy.md`에 남은 과거 부문·지정과제,
  모든 좌표의 기기 내부 처리와 매번 최신 장소 호출 보장을 정정했다. PR-028/151은 폐기 판단 안내만 덧붙였다.
  2026-09-06 이후 공모전/관광데이터/위치정보지원센터 Gmail 검색0건을 확인했다. 검색 범위 밖 메일 부재를 단정하지 않는다.
  공식 Notion 최신 웹 재조회는 접근 정책에 막혀 새 본문을 확인하지 못했다. 우회하지 않고 이전 확보한 공식 자료·사용자 정정을 유지한다.

- #332 worktree `wave-nearby-integrity` / `fix/nearby-query-integrity`, source0884cef·clean/push.
- 지도 설정의 이전 미커밋 작업은 위 #333으로 보존·검증했다.4207은 종료했고 새 통합 검증 위치는 위 재개 절을 따른다.
- #329 worktree `wave-map-controls-language` / `fix/map-load-recovery`, #330 `wave-map-export-recovery` / `fix/map-export-recovery`는 clean/push다.
- 통합 worktree `wave-launch-integration` / `audit/launch-integration-20260906`는 clean/push다. #258 worktree는 `wave-landing-boundaries`다.
- main/Production34e6021265b16d046dca24feaa3ec2101fc977e2·배포6278499275, #287 승인0/3. Preview/008 운영 스키마·백업·복원 확인과 적용은 미완료다.
- Production20:22:04.532Z 이전 진단27/27 PASS지만 최신 후보 check-production-apis는 route queryStatus/resultCount 계약 FAIL이다.
- 모델 API3workflow disabled_manually, 새 유료 실행/예약/인증 복사 없음. 기존 웹 Scheduled5개와 로컬 구현→별도 QA 전체 자동화 미검증은 구분한다.
- 소유 서버4187(통합)·4203(#258)·4205(#332)를 유지하며4199/4201은 종료했다. 실패 artifact와 로그는 TEMP의 `wave-launch-20260906` 아래 보존한다.
  `ci330-merged-artifacts`, `map-focus-ci-before-artifacts`, `landing-boundary-clean-failures`, `boundary-pointer-measured-artifacts`,
  `boundary-stability-first-artifacts`, `boundary-threepx-artifacts`, `landing-boundary-full-port-failures`를 삭제하지 않는다.
- 다음: #332 최신 CI·diff 재검토→Ready 판단, 이 문서의 CI와 통합 반영→공용 원장을 갱신한다. 주변 검색을 중복 구현하지 않는다.
  병행 중인 지도 설정 worktree의 변경/실패 artifact를 보존하고 재적용·언어·브라우저 검증부터 이어간다.
  이후 지도·주변 보강정보·인증/정책 KO/EN, 실제200%/실기기/낭독기/Web Vitals·Preview/008·Production·제출/자동화 검증을 이어간다.
  사람 Gate 때문에 독립 코드 작업을 중단하지 않는다. 부모 병합 후 자식의 최신main/diff/전체CI/필수 승인을 다시 확인한다.

## 과거 실행 상태 — 아래 대기 수치는 이후 결과로 대체됨 — 2026-09-06 지도 오류·공유 복구

- #329 `7f53de47eb035c398d5b4bdb1baa2cc5d1537da0`, worktree `wave-map-controls-language`, branch `fix/map-load-recovery`, clean/push·Draft.
  최초 모듈 오류2 FAIL, 최초 전체427 pass/6 fail(HMR query fixture 미가로채기) 뒤 source/CI433 통과한3022fc2를 보존한다.
  이후 독립 리뷰의 열린 panel P1을2 FAIL로 재현했다. 지도 전용 panel/pick/roadview/부분 지도 정리, 내부 focus 복구·외부 focus 보존,
  늦은 위치 callback 차단을 추가했다. 실제 renderer/위치 action 계약6·관련84·캡처6·unit310·기본검사PASS.
  이 HEAD의 전체 source439 pass/기존skip1/실패0(9.7m), CI34058720475 진행 중이다. 이전433/통합445를 P1 해결 증거로 재사용하지 않는다.
- #330 `48f3f409f8678b7af8093272be8a0694213212a1`, worktree `wave-map-export-recovery`, branch `fix/map-export-recovery`, clean/push·Draft.
  이미지 변환 완료 전 저장 성공과 공유 오류 무시를 계약5 FAIL/browser2 FAIL로 재현해 수정했다. 추가 출발지 잘림 계약1 FAIL도 수정했다.
  실제 PNG 다운로드·오류/취소/재시도·중복/focus·KO/EN·44px·axe·tablet drawer 폭/대비/지도 zoom 겹침·페이지 링크의 범위를 검증했다.
  첫 b456754 source457 pass/기존skip1/실패0(10.3m), unit313/관련48. 부모7f53de4를 합치며 action 상태와 availability guard를 모두 보존했다.
  첫 합성37 pass/1 fail의 mobile 하단 내비게이션 뒤 복구 버튼은 focus 시 가운데로 드러내는 제품 수정 후38/38 PASS.
  현재 unit316/316·lint/typecheck/Vercel build/performance PASS, CSS69.46/70·planner268.80/270KiB. 새 전체와 CI34059135961은 진행 전/중이다.
- 보존된 통합8fe80acb2d9987debcfc0a5b9e288cc0da07a3cd는 unit337/audit0/전체445 pass·기존skip1·실패0(10.3m).
  fd3e3d8은 b456754까지 합친 unit343/audit0·기본검사PASS지만 열린 panel P1은 미포함이다. 최신48f3f40을 합친90f855b5f9ec3a9ad0f3191e046422b1c2db6fa2는 clean/push, unit346/346·기본검사/audit0 PASS(CSS69.85/70·planner268.86/270KiB), 전체 검증을 이어간다.
- Production 2026-09-06T20:22:04.532Z: 이전 진단27/27 PASS로 route 응답도 회복했다. 최신 후보의 공식check-production-apis는
  queryStatus/resultCount가 있는 교통 실조회 증거 계약에서 route FAIL이다. 두 검사 기준을 섞지 않으며 이전26/27 등의 실패도 보존한다.
  main/Production34e6021265b16d046dca24feaa3ec2101fc977e2·배포6278499275, #287 승인0/3, 008 운영 미적용/스키마·백업·복원 확인 불가.
- 모델 API3workflow disabled_manually 재확인, 유료 실행/새 예약/인증 복사 없음. 기존 웹 Scheduled5개·GitHub→Notion 감시 근거와
  로컬 구현→별도 QA 전체 자동화 미검증 경계를 #294에 보존한다. Chrome 내부 배율 설정은 Browser 보안 정책 차단으로 우회하지 않았다.
- 소유 서버4187(통합),4199(#329),4201(#330). 전체 Playwright는 원본과 통합을 순서대로 실행한다. 실제 실행 중 세션/완료 로그는 TEMP 아래 확인한다.
  `map-load-first-full-artifacts`, `map-export-before-artifacts`, `map-export-final-first-artifacts`, `map-export-parent-before-artifacts`,
  `map-open-panel-before-artifacts`와 각 `*-full.log`·`*-related.log`·CI 로그를 보존한다. 중단된 실행을 PASS로 세지 않는다.
- 다음: 최신 #329/#330 전체·CI→통합 후보와 문서 합성·전체 검증→독립 재검토/Ready 판단과 공용 원장 갱신.
  이후 지도 전체 KO/EN·주변 보강정보·인증/정책, 실제 행정경계·확대·실기기/낭독기·성능·Preview/008·Production·제출 문서 등 기존 승인 목록을 계속한다.
  사람 Gate 때문에 다른 코드 작업을 중단하지 않으며 부모 병합 후 자식 최신main/diff/전체CI/필수 승인도 다시 확인한다.

## 이전 실행 스냅샷 — 2026-09-06 19:48 UTC

- 최신 통합 **b05bc78dea3d3f2a0bdd3c1e67cd19bbfb208862**, clean/push. unit334/334·lint/typecheck/build/performance PASS·audit0.
  CSS69.80/70·planner268.85/270KiB. 전체437 pass/기존skip1/실패0(9.8분).
- #328 **84491e58e92cb32b7e77d536441d4102d8cac8be**, wave-weather-language / fix/weather-language, clean/push·Ready.
  관련92·unit304·전체source425 pass/기존skip1·CI34053139108도425 pass/기존skip1/flaky0 성공.
  이전 통합42ecfae 전체429 pass/기존skip1/실패0(9.7분), unit331/audit0. 새 P1/P2 후속은 이 결과에 포함되지 않는다.
- #325 **a461c8bd8dc40862bf823c3ed7ef0d4f392c90ef**, wave-route-language / fix/route-language:
  RC-14 같은 이동수단 숨은 활성 경로 수정. baseline2FAIL·관련94·unit286·전체source373 pass/기존skip1(8.2분).
  CI34054721820도373 pass/기존skip1/flaky0(16.7분) 성공. 실제 확인된 유한 양수 시간만 표시·집계·선택·일정 구간에서 사용한다.
- #316 **c6e0354baeb9c023f253521d0c641f318e47125f**, wave-transport-response / fix/transport-response-validation:
  remote fix/public-transport-provider-boundary. RC-15 정류장 식별자 누락의 query/model 의존 실패 수정.
  baseline2FAIL·관련14·unit292·CI34054278433 247 pass/기존skip1/flaky0(10.1분). 실제 도착 API 미호출 fixture 포함.
- #315 **8c8f85aae5838449e205f76ff1ce01a4ea20c15a**, wave-intro-status / fix/intro-replay-focus:
  반복 status 안내 P2 수정. baseline2FAIL·관련44 및 추가 영어 포함intro6·unit280·기본검사PASS.
  CI34054686832 251 pass/기존skip1/flaky0(10.0분) 성공·Ready. 첫 exact 문구/포커스/reduced-motion/44px/axe 유지, 2·3회 live-region 실제 변경 확인.
- 새 PR은 늘리지 않았다. 기존 리뷰 thread에 수정/실행 근거를 답했고 독립 리뷰를 임의 resolve하지 않았다.
  모든 열린 PR 담당자·라벨·적격 검토자3명 요청을 보완했다. 승인 수를 바꾸거나 보호 규칙을 우회하지 않았다.
- 공식 Chrome ChatGPT Scheduled에서 기존5개·현재 활성 상태·최근 queue/PR검수 결과를 직접 읽었다.
  queue 매시간·실행 중, PR 이벤트 감시 대기0/최근#327 결과. 공지/위치정보센터/배포점검도 모니터링 중.
  #294 갱신. 새 예약·계정 설정·모델 API 실행 없음. 웹 검수→GitHub/Notion 기록과 로컬 구현/독립 테스트 자동화를 구분한다.
- 현재 원자적 작업은 wave-map-controls-language / fix/map-load-recovery(#328 84491e5 기반), 아직 미커밋·미PR다.
  대체 지도 모듈까지 실패하면 unhandled rejection이 조건 조작까지 가리는 baseline2FAIL. 명시적 오류/KO·EN 재로딩,
  저장 일정 유지·stale 요청 무효화 수정 후 새 UI8/8·실제 renderer effect 계약3/3 PASS. 관련/전체 검증 진행 중이다.
  map-load-before.log/아티팩트, 첫4pass4fail의 화면 밖 환경설정 locator 이력, map-load-final-ui.log(8PASS)을 보존한다.
  다음은 관련/전체·lint/typecheck/unit/build/perf→현재 수정 diff/화면 확인→커밋/PR/CI→통합이다. 지도 영어와 행정경계는 별개다.
- 소유 테스트 서버는 통합4187과 지도 실패 복구4199다. 날씨4193·경로4195·인트로4197 및 이전4191은 종료했다.
  TEMP/wave-launch-20260906의 candidate-review-full.log, rc14-full.log, ci316-rc15.log, ci328-completed.log와
  rc14-before-artifacts·intro-status-before-artifacts·weather-language-before/after-artifacts를 보존한다.
- 내부 Chrome 배율 설정 URL은 Browser 보안 정책 차단. 우회하지 않았고 실제200% 검증은 미완료로 유지한다.
- 다음: 지도 실패 복구 원자적 작업 완료→새 통합/CI 확인과 PR/공용 원장/Notion 갱신→지도 SDK·주변 보강정보·
  인증/정책 KO·EN, 실제 확대·성능·Preview/008·Production 검수 등 기존 목록을 계속한다.
  부모 병합 후 자식에 최신 main을 반영하고 diff/전체CI/독립리뷰를 다시 확인한다.
- main·Production34e6021·배포6278499275·ruleset20970955 승인0/3·validate strict 유지.
  Production 최신 전체26/27·route1FAIL, 17:29 익명390/1366 저장/복원·콘솔/overflow0.
  유료 모델 API3개 disabled_manually, 구독 인증 복사/추가 과금/새 예약/운영쓰기/병합/배포/008 적용 없음.

## 이전 실행 스냅샷 — 2026-09-06 18:39 UTC

- 최신 통합 **04375f5aebe579a5f73059e4fda3d516445bfb2e**, clean/push. 전체415 pass/기존skip1/실패0(9.2분),
  unit328/328·lint/typecheck/build/performance PASS·audit0. CSS69.78/70·planner269.58/270KiB.
- #327 **579cd82ced3bcc70e84fce5565cf129ff3b68c06**, wave-transport-display / fix/transport-evidence-language,
  clean/push, Ready. Base#326 + parser#316. 관련112·신규22·unit301·전체source411 pass/기존skip1/실패0,
  CI34051397198도411 pass/기존skip1/flaky0 성공. 운영 미반영이다.
- #313 ea2a62b CI34049310748 247 pass/기존skip1, #316 9792cbf CI34048864949 247 pass/기존skip1,
  #319 be9e908 CI283, #325 aa48328 CI367, #326 0a8df96 CI389: 모두 성공·Ready·미배포.
- **현재 원자적 작업:** wave-weather-language / fix/weather-language는579cd82 기반이며 직접 만든 미커밋 변경을 보존한다.
  날씨 응답 검증/실제 날짜/날씨만 재조회/KO·EN/밝은 화면 대비와 일정 영향 문구 작업이다.
  수정 전 E2E6 FAIL과 trace/error-context/화면은 TEMP/wave-launch-20260906/weather-language-before-artifacts에 있다.
  unit304·lint/typecheck/build/performance PASS(CSS69.41/70·planner268.82/270), 새12개 E2E의 첫 결과는4 pass/8 fail이며 복구/대비/테스트 locator 원인을 분리해 수정 중이다.
  아직 전체·CI·PR·통합 성공으로 세지 않는다. 서버4193은 이 작업 소유이며4191/4187은 종료했다.
- 다음 순서: 날씨 새 E2E 실패 분석→관련여정→전체 검증→커밋/PR/CI→통합 검증. 지도 SDK/주변 보강정보/인증·정책
  KO·EN, 실제200%·실물기기/화면낭독기·Production/Preview·008 검증 등 기존 열린 목록을 계속 진행한다.
- main/Production34e6021·배포6278499275·ruleset20970955의 승인0/3·validate strict 유지.
  모델 API workflow3개 disabled_manually. 새 키/과금 호출/예약/Secret 복사/운영 쓰기/병합/배포 없음.

## 이전 실행 스냅샷 — 2026-09-06 17:38 UTC

- 보존된 최신 검증 후보 **954da148c4a20f0929f3fd17c1dc17b858ddec1c**: 전체 **393 pass/기존 skip 1/실패 0 (9.2분)**,
  unit 320/320, lint/typecheck/build/performance PASS, audit 0. CSS 69.72/70·planner 269.68/270 KiB.
- 후속 통합 **1fda5f3a4215c66a7e35b17a5b2c98f9d83b20e3**는 #316 9792cbf까지 merge/push했다.
  기본 검증한 d0a5bc1과는 로그만 다르고 코드는 동일하다.
  unit **324/324**, lint/typecheck/build/performance PASS, audit **0**. 전체 브라우저는 source 검사 뒤 단독 실행한다.
- #325 **aa48328cc616b10baacfad4ded81e71d33d0ecb2**, `wave-route-language`, `fix/route-language`:
  CI 34046440171 **367 pass/기존 skip 1/flaky 0**, Ready. source 로컬 마지막 366 pass/1 fail은 초기 page.goto
  ERR_NO_BUFFER_SPACE이며 보존한다. 초기 CI 4건 잘림은 대체 글꼴 72px/58px로 재현 후 줄바꿈으로 해결했다.
- #319 **be9e908dc91fccfb6d99373de47232507685f3c8**, `wave-help-focus`, 로컬 `fix/help-focus-restore` → 원격 `fix/preferences-help-language`:
  도움말 표시 전 focus/trap 설정. 진짜 baseline 4 FAIL → 관련14/14, unit280, 전체 로컬/CI **283 pass/기존 skip 1**, Ready.
  CI 34046824130. 초기에 #318 잘못된 base에서 시행한 버튼 locator 실패는 제품 재현으로 세지 않는다. #318은 수정하지 않았다.
- #326 **0a8df96d52c3908addc5cb5a5f8fa0dba8083d4c**, `wave-map-journey-language`, `fix/map-journey-language`:
  Base #325 + #319 be9. 검색 상태/취소/중복/pending focus/KO·EN/44px/긴 이름·실제 Tab·스크롤.
  관련122/122, 신규18/18, unit287, 전체 로컬/CI **389 pass/기존 skip 1**, Ready. CI34047189164.
- #316 **9792cbfda99ab7ed083002a88e39062ab7ab199e**, `wave-transport-response`, 로컬 `fix/transport-response-validation`
  → 원격 `fix/public-transport-provider-boundary`: 공식 명세와 전용 응답 검증. 8 pass/2 fail →10/10, unit290,
  lint/typecheck/build/performance PASS. 7c6d0e1 CI34048166351은247 pass/기존skip1 성공. 최신 부모 #311까지 합쳐
  CI34048864949는 진행 중이며 전체 source는 **247pass/기존skip1/실패0(5.6분)**이다.
  source 첫 전체237pass/2fail은 포트4189/기대4173 불일치이며 자료를 보존하고 기본4173으로 재검증했다.
  smoke·기존 assertion 조건 변경 없음.
- #324 c81e68f CI349, #323 e358e0f CI327, #313 4cc52aa CI247(각 기존 skip1), Ready다. 이 문서는 그 뒤의 실행 기록이다.
- Production **16:56:46 UTC 26/27**, route만 실패. 17:02 cache MISS 실제 경로5·정류장6, 도착/KORAIL0 ready는
  앱의 해석으로 기록한다. 잘못된 응답도 0건이던 경계는 #316에서 보완했고 운영 미반영이다.
- Production 17:29:55 브라우저390/1366은 추천3·탐색3·error0, pageerror/console/GET 실패/overflow0.
  `production-card-journey.mjs`에서 실제 장소 카드로 범위를 한정해 두 폭 모두 일정 추가/새로고침 복원을 확인했다.
  첫 데스크톱 탐색의 넓은 버튼 선택은 제품 실패로 세지 않는다. 새 캡처는 기존 PDF/10:25 스냅샷을 덮어쓰지 않는다.
  자동 추천/1곳100% 운영 회귀는 후보에서 이미 수정한 범위다.
- 다음 실행: source #316 전체/CI 확정 → 최신 문서 합성 → 통합 후보 전체를 단독 실행한다.
  로컬 전체 동시 실행은 초기 ERR_NO_BUFFER_SPACE 관찰 때문에 피하되 timeout·worker2·범위는 유지한다.
  그 뒤 교통 상세의 error를 빈 결과로 보여주는 UI, ready를 이용 가능/목록을 운행 확인이라 부르는 문구, 누락 도착시간의 운행 중 표시를
  실제 fixture와 UI로 재현하고 최소 수정한다. 지도 SDK/날씨 상세/인증·정책 KO/EN·실제200%도 남는다.
- 현재 main/Production34e6021, Issue47/PR28, #287승인0/3, 008미적용, 유료 모델3workflow disabled_manually.
  Preview/Neon 운영 접근·백업/복원·계정/법적/실기기/구독 queue/실제 제출은 사람·도구 Gate와 분리한다.

로컬 로그는 `%TEMP%/wave-launch-20260906`의 `candidate-map-*`, `transport-response-*`, `candidate-transport-*`,
`production-diagnostic-after-route.json`, `production-recovered-journey.json`, `production-card-journey.json`에 있다. Secret/원본 API 응답 대신 상태·개수만 보존한다.
기존 브랜치·사용자/팀원 변경·실패 이력은 보존했으며 force push/새 통합 PR/Issue 종료는 없다.

## 이전 재개 우선점 — 2026-09-06 15:46 UTC

- #324 `c81e68ff6de8bbeb594983b6bee3834407751e30`, worktree `wave-departure-language`, branch `fix/departure-language`.
  #323 기반이며 기존 worktree를 변경하지 않았다. KO/EN 출발 카드·원문 언어·영어 ICS, pending 포커스와
  늦은 일정 렌더링 후 화면 밖으로 밀리는 키보드 조작을 수정했다. 휠·터치 등 수동 이동 후에는 추적을 중단한다.
  관련 **66/66**(신규 22), unit **283/283**, lint/typecheck/Vercel build/performance PASS.
  전체 로컬 **349 pass/기존 skip 1/실패 0 (7.6분)**.
  [CI 34043069596](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34043069596)는 진행 중이다.
  이 브랜치의 audit high 2/moderate 1은 #309가 아직 합쳐지지 않은 기준 결과이며 통합 audit 0과 구분한다.
- 통합 `d7782cf2eab30f032864e8baec333881df0fd4ef`: #324와 문서 #313 `19476bc`까지 충돌 없이 합성·push했다.
  unit **316/316**, lint/typecheck/build/performance PASS, audit **0**; CSS 69.64/70·planner 267.26/270 KiB.
  전체 브라우저는 source 검사 종료 후 실행한다. 이전 SHA의 331건을 새 SHA의 통과 수로 쓰지 않는다.
- #323 `e358e0f` CI 34040324753은 **327 pass/기존 skip 1/재시도 없음**으로 성공했다. Ready로 전환했다.
  로컬 전체 2회는 각 326 pass/1 fail/기존 skip 1: 서로 다른 초기 page.goto ERR_NO_BUFFER_SPACE였다.
  기존 flaky·두 실패 artifact를 보존하고 해당 두 spec을 재검증해 **52/52 PASS**를 확인했다.
- #313 `19476bc` CI 34040847625는 **247 pass/기존 skip 1** 성공, Ready다. 이번 파일은 후속 실행 기록이다.
- 원격 최신 main/Production은 여전히 `34e6021`, 배포 6278499275. 열린 Issue 47/PR 26, #287 승인 0/3이다.
  모델 API workflow 3개 disabled_manually를 재확인했다. 병합·배포·008 실행·유료 모델·새 예약은 없다.
- 최신 전체 Production 진단 **15:46:38 UTC 21/27 PASS, 6 FAIL**: route·추천 KO/EN·관광 보강·장소 사진·집중률.
  지역 사진과 나머지 페이지/공개 API 경계는 통과했다. 기존 재시도/계약은 유지했으며 이전 22/27을 대체하는 최신 결과다.
- 다음 미완료 코드 범위: 경로 상세·날씨/혼잡 상세 → 인증 폼·정책 KO/EN. 실제 200%·운영 API 원인·Preview/008·구독 queue도 남는다.
  #324 전체/CI·통합 결과를 먼저 확정하고 문서/GitHub/Notion의 같은 항목을 갱신한다. 새 승인 요청은 필요 없다.

## 이전 재개 기록 — 14:51 UTC 이후

- #323 최신 `e358e0fcc36554984018702b63ead02fbecaee7e`, 통합 `88ae5e8e1decbbe59471274a48a09e46737e3b47`.
  검색 후 자동 스크롤의 다음 입력 취소·지도 준비/실제 높이 일치·경로 선택 `aria-pressed`/체크 표시를 추가했다.
  별도 지연 검사는 수정 전 6 fail/2 pass → 수정 후 관련 34/34. 390/768/1366px 화면·held click·focus·axe를 확인했다.
- 이전 #323 CI 34037880762는 success지만 **314 pass / 1 flaky / 기존 skip 1**이었다.
  core-journeys:78의 클릭 전후 스크롤 이동을 artifact/trace에서 확인했다. 같은 로컬 20회와 CPU 감속 6회는 통과했다.
  위 경계 결함을 별도로 재현/수정했으며 원격 사례의 유일 원인을 확정하지 않는다. 재시도 이력을 지우지 않는다.
- 새 [CI 34040324753](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34040324753)는 확인 중이다.
  통합 **88ae5e8은 331 pass / 기존 skip 1 / 실패 0 (8.4분)**, unit 313/313,
  lint/typecheck/Vercel build/performance PASS, audit 0이다. CSS 69.64/70·planner 265.64/270 KiB.
  #323 첫 전체 로컬은 **326 pass / 1 fail / 기존 skip 1**: returning itinerary의 `page.goto`에서
  Chromium `ERR_NO_BUFFER_SPACE`가 발생했다. 앱 진입 전 빈 화면·trace를 보존했다. 병행 브라우저 검사를 종료한 뒤
  같은 전체 범위·worker 2·기존 timeout으로 단독 재실행 중이며 최초 실패를 성공으로 세지 않는다.
  단위 280/280과 lint/typecheck는 성공했다. 결과를 새 CI와 함께 같은 PR에 기록한다.
- #313 `947d704` CI 34038501253은 **247 pass / 기존 skip 1**로 성공했다. 아래 과거 수치는 해당 시점의 기록이다.
- 14:17 UTC 지역/장소 사진 출처 후속 단일 요청은 각각 30초 안에 응답을 받지 못했다.
  재시도 조건이 다른 부분 점검이며 14:02 전체 22/27을 대체하지 않는다. 사진 장기 안정성은 미확정이다.
- 원격 CI와 이 원자적 변경의 검증을 먼저 마무리한다. 다음 코드 범위는 경로 상세·출발 확인 KO/EN → 인증 폼·정책 KO/EN이다.
  새로운 언어 작업 브랜치나 PR은 아직 만들지 않았다. 실제 200%·Preview/008·운영 API 원인·구독 queue도 남는다.

## 보존한 브랜치와 결과

| Worktree / 원격 PR | 현재 변경 | 상태 |
| --- | --- | --- |
| wave-barrier-free-gyeongnam / #287 | b803b80, 런칭 흐름·008 등록 | CI 성공, Ready, 승인 0/3, 미병합 |
| 보존된 #311 | 93d1058, 질문 Gate·EN 접근성·대비 | unit 280, 관련 E2E 50, 전체 247 pass/기존 skip 1 |
| wave-ui-regression / #314 | 6f9fc54, hydration 전 인증 보호·위치 처리 안내 | 관련 단위 16, 인증 E2E 40, lint/typecheck/build/performance PASS |
| 보존된 #312 | 7af38df, 부분 제공처 실패 캐시 차단 | CI 성공, 미배포 |
| 보존된 #315 | a62886a, 실제 인트로 다시보기·focus 유지 | CI 34025137035 성공, 미배포 |
| 보존된 #316 | a4ce81e, 공공교통 키·미조회 상태 | CI 34024622262 성공, 미배포 |
| wave-submission-docs / #313 | ecf90b3 이후 최신 실행표·운영 응답 보완 | CI 34035647731 성공. 이 체크포인트는 후속 문서 변경 |
| 보존된 #317 | 6f4d999, 영어 조건·저장/검색 안내 | unit 280, 전체 253 pass/기존 skip 1, CI 34028553188 성공 |
| 보존된 #318 | 7e6c1ed, 내비게이션 언어·추천 상태 | #314 포함. unit 280, 전체 267 pass/기존 skip 1, CI 34029670552 성공 |
| 보존된 #319 | 8eb38c5, 설정·도움말 언어/접근성/성능 | #315 포함. unit 280, 전체 279 pass/기존 skip 1, CI 34030742378 성공 |
| 보존된 #321 | 272bf681a2a7c41fdd66eca0360d29b272998498, 추천 상세·후기 실패·대비 | #319 기반. unit 280, 전체 295 pass/기존 skip 1, CI 34032622064 성공·Ready |
| 보존된 #322 | 0b916a4cbb9e5ce1b5a615d16f827e934e2e266b, 공유 스냅샷·복사·포커스 | #321 기반. unit 280, 전체 303 pass/기존 skip 1, CI 34036478371 성공·Ready |
| wave-transport-integrity / #323 | e358e0f, 일정 KO/EN·오디오/편집기 지연 로딩·경로 상호작용 | #322 기반. unit 280, 최신 CI 327 pass/기존 skip 1, Ready. 이전 flaky/환경 실패는 보존 |
| wave-departure-language / #324 | c81e68f, 출발 KO/EN·영어 ICS·키보드 가림/지연/수동 스크롤 | #323 기반. 관련 66/66, unit 283, 전체 349 pass/기존 skip 1, CI 진행 중·Draft |
| wave-landing-compact / #320 | bfeda5f54206a66d7d97ae1532df5854760ecc00, 팀원 변경과 도식·시각 보완 | 로컬 fix/compact-landing-visual-audit → 원격 feat/compact-landing-content push. unit 280, 전체 251 pass/기존 skip 1, CI 34034203872 성공·Ready |
| wave-integration-audit / #289 | acb7dab, 기존 예약 receipt·비용 문서 | 단위 287/287; API workflow 활성화 없음 |
| wave-automation-stack / #306 | d78b2e2, 자동화 stack 보존 | 기존 green, 미병합/미활성 |
| wave-launch-integration | d7782cf2eab30f032864e8baec333881df0fd4ef | #324·#313 19476bc·#309/자동화 전체 merge 합성. unit 316, lint/typecheck/build/performance PASS, audit 0. 전체 브라우저 예정. 원격 push |

최신 원격 확인 후 재개한다. 다른 작업자가 추가한 커밋은 보존한다. 개별 브랜치를 force push하지 않는다.
통합 브랜치는 검증용이며 거대 대체 PR을 만들거나 기존 PR을 닫지 않았다. 사람 리뷰 비용을 줄이려고
보호 규칙을 바꾸지 않는다. 부모 PR squash 병합 후 자식에 최신 main을 병합하고 diff·CI를 다시 확인한다.

## 확인한 기술·운영 경계

- #322 포함 **c904ec0b4798fcf8697ee91fe5fb979d625b9094**: unit 313/313, 전체 Playwright·axe
  **307 pass / 기존 skip 1 / 실패 0 (7.5분)**, lint/typecheck/build/performance PASS, audit 0.
  CSS gzip 69.42/70 KiB, planner JS 268.58/270 KiB. #322 CI도 성공했으며 Ready/미배포다.
- #323은 영어 일정 편집·저장·원문 표시, 런타임 안내 언어, 오디오 미제공/재생 거부/모듈 실패,
  실제 지연 로딩과 dark 대비를 구현했다. 320px 캡처의 DAY 2/Earlier 잘림은 추가 수정 후 재검수했다.
  320/960/1366×light/dark 편집·저장 12개 고유 화면과 레이블 폭·44px·axe 검사를 추가했다.
  초기 JS 270.55→265.39/270 KiB. 전체 315 pass/기존 skip 1/실패 0 (8.0분).
  통합 bf2cfe8은 전체 319 pass/기존 skip 1/실패 0 (8.1분), unit 313/313, audit 0,
  lint/typecheck/build/performance PASS, CSS 69.61/70·planner JS 265.40/270 KiB다.
- 이전 통합 **3bc4abe8dacbf57d55784baddd93aec01022ebb5**: lint/typecheck, unit/contract **313/313**,
  Vercel production build·성능 예산 PASS, 전체 audit **0**, 전체 Playwright·axe **279 pass / 기존 skip 1** (2.3분).
  CSS gzip 68.81/70 KiB, landing JS gzip 112.82/155 KiB, planner JS gzip 268.55/270 KiB.
  E2E fixture와 실제 Production 실호출 결과는 아래처럼 분리한다. 검사 범위를 줄이지 않았다.
- 최신 #321 포함 통합 **5fdd1e6c82aa0ff3f5c018ba00485277b5289dbb**: lint/typecheck,
  unit/contract **313/313**, Vercel production build·성능 예산 PASS, 전체 audit **0**.
  전체 Playwright·axe **295 pass / 기존 skip 1 / 실패 0 (6.8분)**. 모든 검사는 이 SHA 기준이다.
- #321 단독 전체 295 pass/기존 skip 1, 관련 56/56, 최종 새 회귀 16/16. 상·하단 각각 axe와
  CI artifact 캡처가 있다. 실제 320/390/960/1440px × light/dark × 근거/제보 16화면의
  콘솔/document·dialog overflow/화면 밖 배치 0. 초기 JS 270.07→268.25/270 KiB.
- 12:12:45 UTC 운영 부분 응답 확인: Kakao/ODsay 경로는 연결, KORAIL/TAGO 일부 timeout.
  KO 추천 HTTP 200/cache MISS는 장소 0개·8개 제공처 error의 fallback. 전체 성공 재검증이 아니다.
- 최신 #320 합성 **a4e6b61d7731ae0325170dc1f8787c44970259ed**: unit 313/313,
  lint/typecheck/build/performance PASS, audit 0. CSS gzip 69.38/70 KiB, landing JS 114.19/155 KiB,
  planner JS 268.26/270 KiB. 전체 Playwright·axe **299 pass / 기존 skip 1 / 실패 0 (7.1분)**.
- #320 단독 전체 251 pass/기존 skip 1. 원격이 진행 중이어서 507c85e·b1eb3c0을 먼저 보존했다.
  충돌한 대비 selector는 두 쪽 모두 유지했다. 기존 비주얼을 숨기는 검사만 두지 않고 새 도식 7개의
  의미·caption 대비·5개 폭·44px·포커스 가림·axe·20개 고유 화면을 추가했다. PM 디자인 재검토는 남는다.
- 이전 5db27a2의 요청된 11개 viewport 랜딩/중립 플래너 22화면: 콘솔/넘침/자동 추천 0, h1 폭 안에 표시.
  320/768/2560 대표 화면 직접 확인. 전체 상태/200%/실기기 검수는 계속 필요하다.
- **최신 Production 재진단 14:02:46 UTC: 22/27**, 실패 5건(route, KO/EN 추천, 보강, 집중률).
  지역/장소 사진은 이번 응답 계약을 통과했다. 11:36의 20/27과 08시의 23/27은 이력이다.
  검토 PDF는 10:25 당시 사진 실패를 포함한 스냅샷이므로 제출본 확정 전에 최신 상태와 캡처를 갱신한다.
- #318 12개 폭(11개 요구 + 960)×light/dark 영어 중립 24화면은 콘솔/넘침/44px/제목 잘림/자동 검색 0.
  #319 320/390/960/1440×light/dark×설정/도움말 16화면은 패널 경계/콘솔/넘침/한국어 잔여 0.
  390px 패널 x=-1을 발견해 수정했다. 환경설정·도움말 16화면은 전체 영어 여행 완료를 의미하지 않는다.
- #318 첫 전체에서 인증 준비 전 GET 제출 2건과 개발 서버 ECONNRESET 1건을 보존한 뒤,
  기존 #314를 merge하고 전체 267 pass/기존 skip 1로 검증했다. #319는 270.82 KiB 성능 초과를
  도움말 지연 import로 해결했다. 파일 로딩 실패 → 설명 → 새로고침 복구를 포함해 관련 56/56.

- 이전 통합 eee1208: unit/contract 313/313, Playwright·axe 249 pass/기존 skip 1,
  lint/typecheck·Vercel build·performance·actionlint PASS, shellcheck 47 scripts/0 fail, audit 0.
- #311 첫 전체 246 pass/1 fail/기존 skip 1의 실패는 Chromium ERR_NO_BUFFER_SPACE였다.
  trace를 보존하고 자체 브라우저 작업을 정리한 뒤 동일 범위 전체 247 pass/기존 skip 1을 확인했다.
- 기존 Production SHA 34e6021265b16d046dca24feaa3ec2101fc977e2, deployment 6278499275.
  /api/health HTTP 200은 configuration 범위다. 실제 API·페이지 진단 23/27, route·KO/EN 관광 추천·보강 실패.
  신규 캐시 MISS 관광 요청도 0개/제공처 error였다. 키 오류·rate limit·상류 장애 중 원인은 미확정이다.
- #309의 image-size-next fork는 출처/유지보수/호환성과 악성 입력을 검토했다. audit 0을 장기 안전성 보장으로
  해석하지 않는다. 실제 Preview 함수 동작과 추후 upstream 전환 검토는 남는다.
- 008 migration: 코드상 등록/트랜잭션/적용 경계 확인. 실제 운영 스키마·영향 행 수·백업/복원 접근 미확인,
  적용하지 않았다. Production CD를 Preview 대용으로 실행하지 않았다.
- 구독 local read-only smoke와 공식 Scheduled #294 receipt는 확인했다. 현재 구독 Executor의 GitHub→Notion
  기록도 실제 수행·재조회했다. 예약 queue→구현→독립 QA 종단간 자동화는 미검증이다.
  API workflow 3개 disabled_manually, 모델 API/새 과금 자원/인증 복사 없음. 청구 내역은 확인하지 못했다.

## 정확한 재개 순서

1. 현재 main, 25 PR/47 Issue 수의 변동, 최근 CI, Production SHA, 다른 작업자 댓글과 worktree status 재조회.
   wave-transport-integrity의 현재 fix/itinerary-language는 #323 e358e0f로 push했다.
   #321 fix/recommendation-language 272bf68과 #322 fix/shared-trip-snapshot 0b916a4도 보존했다.
   #323 CI 34040324753·최종 전체 브라우저와 88ae5e8 합성 결과를 확인한다.
   #313 947d704 CI 34038501253은 성공했고 이 체크포인트가 후속 문서 변경이다.
   #320은 팀원 변경과 P1 보완을 같은 PR에 보존했다. bfeda5f의 CI 34034203872는 성공했다. 추가 원격 커밋과
   PM 디자인 재검토를 확인한다. 이 보완 이후 합성에 포함했으며 이전 P1 미해결 이력과 구분한다.
2. #317~#319/#321~#323의 조건·내비게이션·설정·도움말·추천 상세·공유·일정을 중복 구현하지 않는다.
   다음 영어 범위는 경로 상세·출발 확인 → 인증 폼·정책 본문이다. 원문 관광 데이터가
   한국어만 제공되는 경우 UI 번역과 구분하고 그 사실을 표시한다. 전체 언어 여정을 완료 처리하지 않는다.
3. 200% 검증은 CSS zoom 숫자만으로 통과 판정하지 않는다. 현재 CSS zoom 진단의 잘림을 실제 브라우저
   확대/레이아웃 viewport와 구분해 320~2560 요구표에 기록하고 수정한다. 기본 390/1366 새 Gate는 콘솔/넘침 0.
4. Preview·Neon 관리 접근이 확보되면 안전한 운영 사전 조회 → 008 영향·복구 확인 → Preview 핵심 여정 검증.
   필수 리뷰 3건이 충족된 PR만 dependency 순으로 병합하고 main CI/CD·Production을 SHA로 연결한다.
5. 관광 추천/KORAIL/TAGO 실호출 실패 원인을 운영 로그에서 확인한다. 테스트 timeout 증가나 가짜 결과로 숨기지 않는다.
6. 기존 공식 Scheduled 목록·현재 상태를 확인할 관리 도구가 없으므로 중복 예약을 만들지 않는다.
   기존 queue의 실제 안전 작업 하나를 구현→별도 QA→GitHub/Notion 기록까지 검증할 실행 경로를 연결한다.
7. 공식 ① 양식의 최종 운영 캡처·실제 낭독기 검수·사람 확인 후 제출본을 완성한다. 최종 제출 버튼은 사람이 실행한다.

현재 PR 소유자가 아닌 팀원 unknownamed의 #311도 수정·검증했고 GitHub 기존 댓글과 Notion을 갱신했다.
이 구독 Executor의 실제 왕복 기록은 확인했지만 예약 queue의 무인 구현·독립 QA 완료는 아니다.
자체 임시 개발 서버는 검수 후 종료했다. 다른 사용자의 Code/ChatGPT/Codex 프로세스는 종료하지 않았다.
wave-integration-audit의 untracked `playwright-production-report/`, `test-results-production/`는
2026-09-05 생성된 이전 검증 산출물로 확인했으며 삭제·커밋하지 않았다. 새 무인 실행 증거로 세지 않는다.
위치 경계: GPS 경로 API는 차단, 공개/직접 고른 출발·도착은 서버 경유, 지도 화면/IP·주변 검색은
외부 처리 가능. CLAUDE의 포괄적인 기기 내 처리 안내를 실제 코드/개인정보 안내에 맞췄다.

## 사람만 처리할 사항

필수 사람 리뷰(요청 reviewer syt83/unknownamed/ginaginaring), 접근 권한이 필요한 Preview/운영 스키마와
백업 확인, 기존 Scheduled 관리 화면, 참가 팀명 WAVE/접수 메일 W.A.V.E 차이와 최종 팀원/이력,
법적 위치정보 확인, 실제 메일 수신·Neon 사용자 삭제/백업/PITR/복원, 운영자·연락처, 당사자/실기기/낭독기,
최종 제출·접수 증빙. 이 항목들은 코드가 있다는 이유로 완료 처리하지 않는다.
