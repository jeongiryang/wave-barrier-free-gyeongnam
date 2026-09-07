# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-07. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.


원격 전수 조회: 2026-09-07 02:24 UTC, PR39. 원본38개 PR을 보존한 통합 후보와 새 팀원 Issue #337을 추적한다.

## 2026-09-07 02:24 UTC 실행 증거

전체 요청은 미완료다. main/Production `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포6278499275를 다시 확인했다. 원격39 Open PR의 최신 HEAD가 통합에 포함된다(통합 자체+원본38). 새 팀원 Issue #337도 실행 목록에 포함했다. 사람 승인·Preview·008·운영 검증을 완료로 대신하지 않는다.

| 범위 | 실제 증거 | 현재 상태·남은 조치 |
| --- | --- | --- |
| #334 직전 검증 | `d7a71a76b73bf9122cb12c8c34da06f6ab6700ed`, unit446, 로컬577 PASS/기존skip1(12.8분), [CI34074133044](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34074133044) 289+288 PASS/기존skip1/flaky0 | CI 성공 후 추가 P1 리뷰 RC-19/20을 확인해 다시 Draft. 성공이 모든 결함 부재를 뜻하지 않음 |
| #335 RC-19 | `f6e451beedcec969c7a879a9d360825e1a7ced32`, hook14/unit368/관련56 PASS(1.4분), 기본검사PASS | 지원 범위 밖 일정/SDK 좌표 차단. Escape 이중 처리의 focus 누락도52 PASS/4 FAIL→56 PASS로 수정. [새 CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34076016081) 대기·Draft |
| #336 RC-20 | `82314645616e1f1c4e3f2705abcaaaaef998bc50`, 계약49 PASS/4 FAIL→53 PASS, unit333/로컬전체237 PASS·기존skip1/기본검사PASS | 지원 좌표 범위+요청 출발/도착과 도형 양끝1km 대응검사. 합성 끝점 없음. [새 CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34075800244) 대기·Draft |
| #338 ODsay | `b6a7f77cb8b760ee77843699f0387e6a1e9b9e25`, 최초25건 중22 FAIL 재현, 최종 부모합성unit364 PASS | 누락 데이터·도시 간 미완성 경로를 confirmed로 승인하지 않음. 원문 오류 비노출·정상no-route 구분. [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34075953741) 대기·Draft. 첫237 PASS는 최종 좌표 방어 전 증거 |
| #334 새 앱 합성 | `6dd908aef686a6b4d3f8cf712375d6d45b23c5d5`, unit484/lint/typecheck/Vercel build/performance/전체audit0 PASS | 이 문서만 추가한 최종 HEAD에서 전체 Playwright·axe/CI 재실행. 새 변경의 전체 성공은 아직 아님 |
| #337 팀원 제보 | 기간 축소 시 날짜 재배치,7일 제한/여행집 불일치,자동 날짜 변경 안내 및 기존 UI 요구 | 최신 후보 hook도 종료일 상한/범위 밖 배정 처리가 없어 재현·수정 필요. 정상 범위 확대/복원은 유지. 중복 구현 없이 기존 요청과 연결 |
| Production | 01:29 읽기진단26 PASS/route1 FAIL,01:32 재조회응답. 새provider 상태 계약FAIL | 기존 운영의 실패 원인 미확정. 수정본 실배포·Preview·008 적용 없음 |

비용: 모델 API3workflow disabled_manually를 유지한다. 추가 과금/Secret·구독 인증 복사/예약 신규 생성 없음. 공식예약5개·구독 로컬 CLI의 부분 검증과 전체 자동화 실동작 미확인을 구분한다.

정확한 재개: #334 `audit/launch-integration-20260906`의 이 체크포인트 HEAD→전체 회귀/CI 확인, RC-19/20 리뷰에 근거 회신, #338 CI 확인, #337 날짜 정합성 재현/수정. 원본/사용자 worktree를 보존한다. 로그는 임시 `wave-launch-20260906/candidate-rc20-*`, `roadview-rc19-*`, `kakao-rc20-*`, `odsay-*`다. 종료한 이전4187 서버의 과거 hydration 경고 출력과 새 테스트의 console assertion을 혼동하지 않는다.

## 이전 검증과 판정 방법

- main·Production `34e6021265b16d046dca24feaa3ec2101fc977e2`, 배포6278499275. 열린 Issue47·PR35.
  #287 b803b80은 Ready·CI 성공·MERGEABLE이나 승인0/3·REVIEW_REQUIRED/BLOCKED다.
  모든 열린 PR의 누락 담당자·라벨·검토자 요청을 보완했다. 작성자를 제외한 3명에게 요청했으며 실제 승인은 별도다.
- 통합 후보는 `audit/launch-integration-20260906`에 기존 제품·보안#309·자동화 stack을 보존해 합성한다.
  기존 PR 폐기·강제 push·거대 대체 PR·보호 규칙 우회·병합·배포·008 적용은 없다.
- **날씨 #328 `84491e58e92cb32b7e77d536441d4102d8cac8be`, Ready**:
  잘못된 날씨 응답의 플래너 오류, 독립 재조회·pending focus, 실제 예보 날짜, 날씨/일정 영향 KO·EN, 대비를 수정했다.
  관련92/92·unit304/304·lint/typecheck/build/performance PASS. 전체 source425 pass/기존skip1/실패0(9.3분),
  [CI425 pass/기존skip1/flaky0(20.0분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34053139108).
  첫 관련90 pass/2 fail은 기존 비 예보 fixture의 필수 region 누락이었다. 실제 handler 계약에 맞춰 region만 추가하고
  기존 재검색·저장·편의조건 assertion과 timeout은 유지했다. 신규 region 누락 거부 단위 검사도 추가했다.
- **날씨까지 합친 `42ecfaefba66b5502749bc11893cf42ee6d2acb3`**:
  unit331/331·기본검사PASS·audit0, 전체429 pass/기존skip1/실패0(9.7분), CSS69.80/70·planner268.81/270KiB.
  이 검증 뒤 독립 검토의 RC-14/15와 반복 재생 P2를 수정했으므로 아래 새 후보와 구분한다.
- **RC-14 #325 `a461c8bd8dc40862bf823c3ed7ef0d4f392c90ef`**:
  동일 이동수단의 0분/미리보기 선행 응답에서 보이는 25분 경로가 활성화되지 않는 desktop/mobile2건을 재현했다.
  표시·집계·선택·일정 구간에 동일한 configured=true·유한 양수 시간 기준을 적용했다.
  저장 구간의 기존-ID 무효/부재4건은 원래도 통과했고 보존했다. 관련94/94·unit286/286·기본검사PASS,
  전체 source373 pass/기존skip1/실패0(8.2분), [CI373 pass/기존skip1/flaky0(16.7분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054721820), Ready.
- **RC-15 #316 `c6e0354baeb9c023f253521d0c641f318e47125f`**:
  HTTP200 envelope가 유효해도 개별 정류장에 cityCode/nodeId가 없으면 도착 조회를 할 수 없다.
  query와 기존 snapshot→model을 공통 검사해 provider/dataset error를 전파한다. 실제 도착 API 미호출을 고정했다.
  신규2 FAIL→관련14/14·unit292/292·기본검사PASS, [CI247 pass/기존skip1/flaky0(10.1분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054278433).
  정상 정류장0건과 실제 도착조회0건, 의존 실패 계약은 모두 유지한다.
- **반복 재생 #315 `8c8f85aae5838449e205f76ff1ce01a4ea20c15a`**:
  첫 실행 이후 boolean이 바뀌지 않아 live region 안내가 멈추던 P2를 desktop/mobile2건으로 재현했다.
  첫 정확한 문구 assertion은 유지하고, 반복 횟수로 두 번째·세 번째 status 텍스트를 갱신한다.
  관련여정44/44, 영어 반복 추가 intro6/6·unit280/280·기본검사PASS, [CI251 pass/기존skip1/flaky0(10.0분)](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34054686832), Ready.
- **후속 세 수정을 합친 `b05bc78dea3d3f2a0bdd3c1e67cd19bbfb208862`**:
  교통 import 및 환경설정 status 충돌을 양쪽 기능을 보존해 해결했다. unit334/334·lint/typecheck/build/performance PASS,
  audit0·CSS69.80/70·planner268.85/270KiB. 전체 Playwright·axe **437 pass/기존skip1/실패0(9.8분)**.
  source PR의 과거 HEAD와 새 후보 결과를 섞지 않는다. 독립 재검토·Preview·Production 확인은 별도다.
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

- 보존된 Ready: #327579cd82 전체 로컬/CI411, #3260a8df96 389, #319be9e908 283,
  #324c81e68f CI349, #323e358e0f CI327, #320/#321/#322. 모두 기존skip1이며 미배포다.
  #313의 직전c55f688 [CI247 pass/기존skip1/flaky0](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34063892487)도 성공했다. 이 갱신의 새 문서 CI는 별도다.
  source audit high2/moderate1은 #309 미포함 개발 의존성이고, 보안 변경을 합성한 audit0과 구분한다.
- Production 20:22:04 UTC 이전 진단27/27 PASS로 route 응답도 회복했다. 하지만 최신 후보의 공식check-production-apis는 queryStatus/resultCount 교통 조회 증거 계약에서 route FAIL이다. 설정/legacy ready를 실제 확인으로 세지 않는다. 이전16:56:46 UTC26/27 PASS·route1 FAIL 이력도 보존한다. 17:29:55 익명390/1366에서 카드3개·일정 추가/새로고침 복원,
  pageerror/console error/GET 실패/overflow0. GPS·서버쓰기·mock 없이 검증했다. 기존 자동 추천/장소1개100% 회귀는 운영에 남는다.
  18:46 health HTTP200은 설정 확인이며 전체 API 성공 증거가 아니다. 새 계약만으로 기존 route 실패를 해결 처리하지 않는다.
- 공식 ChatGPT 웹 Scheduled에서 기존5개를 읽었다. 대기열은 매시간/실행 중, PR 검수는 GitHub PR·리뷰·댓글·커밋 이벤트 감시다.
  최근 #327 검수와 RC-14/15 실제 GitHub 리뷰가 대응한다. 공지·위치정보센터·배포점검도 모니터링 중이며 새 예약/설정 변경 없음.
  #294에 증거를 반영했다. 웹 감시·GitHub/Notion 환류와 로컬 구현→별도 QA 전체 자동화는 구분한다.
  모델 API3개 disabled_manually 유지, 로컬 Codex ChatGPT 로그인 확인, 실제 과금 내역/잔여 한도는 이번 조회로 확정하지 않는다.
- 실제 Chrome의 내부 배율 설정 페이지는 브라우저 보안 정책이 차단했다. 우회하지 않았으며 200% 검증 완료로 세지 않는다.
  11개 뷰포트·키보드·axe 결과와 실제 확대/낭독기/실기기 검증은 별개다.
- 전체 요청은 미완료다. 지도 SDK/주변 보강정보·인증/정책 KO·EN, 실제200%·실기기/낭독기·성능,
  Preview·008 운영 스키마/영향/백업·복원, 최종 Production 여정·사람 리뷰/공모전 확인이 남는다.
- 지도 표시 설정의 최신 구현/검증은 위 #333에 기록했다. 초기 미커밋 상태는 커밋·push로 보존했고 운영 검증 전 Open이다.

이전 수치·실패 artifact·보존 브랜치는 [체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)와
[이전 실행표](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/blob/1ac5ccf31eb03deaedc550b26728a6973037b8a6/docs/launch-readiness-status.md)에 보존했다.

## 요구사항 → 이슈 → 구현·근거 → 남은 조치

모든 행은 최종 운영 검증 전이므로 Open을 유지한다. 대표 반응형 작업은 #286으로 모으며
#278의 추가 뷰포트·가로모드·확대 요구를 #286 증거에 포함한 뒤 중복 종료를 판단한다.

| Issue | 담당 | 상태 | 관련 PR·코드·검증 | 남은 조치·의존성 |
| --- | --- | --- | --- | --- |
| #251 일정·지도·날씨·언어 | Engineering/QA | 진행 중 | #287/#307/#311/#317~#319/#321~#330/#332/#333/#335/#336, `e2e/itinerary-language.spec.ts`, `e2e/departure-language.spec.ts`, `tests/weather-integrity.test.mjs` | #327~#330/#332/#333/#335/#336 교통·날씨·지도·주변 검색 운영 검증, 남은 지도 SDK·보강정보·인증/정책 영어 |
| #252 복수 테마 | Engineering/QA | 진행 중 | #287, `tests/plan-locale-theme.test.mjs`, `server/tourism/` | 다중 테마·부분 실패 실호출 및 운영 저장·복원 |
| #253 단계형 조건 | Engineering/QA | 진행 중 | #287/#311, `PlannerConditionsPanel.tsx`, `e2e/fixtures.ts` | 지역→편의→활동→날짜→명시적 검색 최종 회귀 |
| #254 빈 추천·단계 잠금 | Engineering/QA | 진행 중 | #287/#307, `useJourneyProgress.ts`, `e2e/evidence-truthfulness.spec.ts` | 기존 일정 열람과 현재 추천 준비율을 구분해 AC 정리 |
| #255 기능 위계 | Engineering/QA | 진행 중 | #287/#311, `app/planner/page.tsx`, `e2e/planner-product-flow.spec.ts` | 실제 좁은 화면·짧은 높이·첫 행동 검증 |
| #256 날씨 시각화 | Engineering/QA | 진행 중 | `features/planner/components/WeatherBoard.tsx`, `tests/weather-integrity.test.mjs` | 예보 밖 날짜·영어·빈 상태·운영 예보 확인 |
| #257 소개 문구 | Engineering/QA | 진행 중 | #311, `features/landing/components/`, `e2e/landing-regions.spec.ts` | 실제 사용자 이해·공식 사진·KO/EN 잔여 문구 |
| #258 경남 지도 | Engineering/QA | 진행 중(코드·로컬 PASS) | #331 cc5db11, 경계/목록·지연/실패14 E2E, 전체/CI265·Ready·합성523/audit0 | Preview·병합/Production·실기기 |
| #259 캘린더·지도 소개 | Engineering/QA | 진행 중 | #287/#311/#315, `LandingProductStories.tsx`, `e2e/reduced-motion-scroll.spec.ts` | 다시보기 계약은 후보 회귀 검증, 실제 운영 반영·시각 검수 |
| #261 중립·명시적 검색 | Engineering/QA | 진행 중 | #287/#311, `usePlanRequest.ts`, `e2e/launch-integrity.spec.ts` | 모든 진입 경로·프로필 적용·운영 요청 증거 |
| #263 UX Epic | Engineering/QA/PM | 진행 중 | 본 실행표, #287/#307/#311 | 개별 AC 완료와 운영 반영을 함께 집계 |
| #264 일정·지도 단일 기준 | Engineering/QA | 진행 중 | #287, `tests/itinerary-legs.test.mjs`, `e2e/itinerary-route-sync.spec.ts` | 날짜·순서·수단 변경 무효화와 배포 확인 |
| #265 용어·CTA | Engineering/QA | 진행 중 | #311/#317~#326, `e2e/planner-step-copy.spec.ts`, `e2e/departure-language.spec.ts` | 교통·날씨 상세·인증/정책의 한국어 잔여·내부 용어 |
| #266 CSS 정리 | Engineering/QA | 진행 중 | `app/styles/`, `tests/module-reachability.test.mjs` | obsolete 규칙의 실제 도달성·시각 회귀 대조 후 최소 삭제 |
| #267 첫 사용자 전체 QA | QA | 진행 중 | #314 인증 제출 보호, `e2e/core-journeys.spec.ts`, `e2e/auth-hydration.spec.ts` | Preview·Production 비회원/인증 전체 여정, 실패 시나리오 |
| #268 필요한 편의 선택 | Engineering/QA | 진행 중 | #287/#311, `PlannerAccessibilityProfiles.tsx` | 유형 단정 없는 문구·복수 선택·KO/EN 운영 검수 |
| #269 추천 카드 | Engineering/QA | 진행 중 | #287/#311/#321, `RecommendationCarousel.tsx`, `PlaceDecisionDialog.tsx` | 공식 사진·원문 출처·배포 후 확인 |
| #270 공식 사진 | Engineering/QA | 진행 중 | `features/tourism/components/SmartSpotImage.tsx`, `scripts/check-photo-coverage.mjs` | API별 실제 표출·사용 조건·이미지 LCP 확인 |
| #271 상세보기 | Engineering/QA | 진행 중 | #287/#321, `e2e/recommendation-language.spec.ts`, 한국어·영어 포커스·상하단 axe | 랜딩 패턴 통합·실제 확대·운영 확인 |
| #272 URL·뒤로가기 | Engineering/QA | 진행 중 | #287/#311, `usePlannerStageView.ts`, `e2e/planner-product-flow.spec.ts` | 질문 단계 URL·직접 진입·새로고침 전체 조합 |
| #273 18개 시·군 | Engineering/QA | 진행 중 | #287, `components/GyeongnamRegionPicker.tsx`, `e2e/mobile-touch-targets.spec.ts` | 지도 실패 대안·지역 사진·짧은 화면 |
| #274 편의 근거 상태 | Engineering/QA | 진행 중 | #287, `tests/accessibility-score.test.mjs`, `e2e/evidence-truthfulness.spec.ts` | 공식/미확인/불일치/사용자 제보 Production 대조 |
| #275 날짜 영향 | Engineering/QA | 진행 중 | #287/#311, `PlannerConditionsPanel.tsx`, `tests/itinerary-schedule.test.mjs` | 날짜는 예보·행사·일정용이라는 안내와 API 영향표 최종 대조 |
| #276 지도 단순화 | Engineering/QA | 진행 중 | #307/#311/#329/#330, `features/routing/components/`, `e2e/map-tools-reachable.spec.ts` | 모든 도구의 실기능·실제 SDK·텍스트 대안 |
| #277 장소/경로 접근성 | Engineering/QA | 진행 중 | #287/#330, `tests/transport-capability-truth.test.mjs`, `tests/map-export-recovery.test.mjs` | 경로 접근성 미확인 표시·외부 지도 범위 운영 확인 |
| #278 반응형 | QA | 진행 중·중복 통합 후보 | #286과 본문 비교, `e2e/launch-integrity.spec.ts` | #286에 고유 요구를 보존한 뒤 중복 종료 판단 |
| #279 화면 회귀 | QA | 진행 중 | E2E screenshot·trace, `e2e/planner-product-flow.spec.ts` | 핵심 화면별 baseline·픽셀 변화 사람 검토 |
| #280 준비율·출발 확인 | Engineering/QA | 진행 중 | #287/#307/#324, `useJourneyProgress.ts`, `e2e/launch-integrity.spec.ts`, `e2e/departure-language.spec.ts` | 새 SHA 운영 반영·전체 구간과 별도 확인 절차 |
| #281 여행 lifecycle | Engineering/QA | 진행 중 | `tests/travel-book.test.mjs`, `e2e/travel-book.spec.ts` | 새 여행 초기화의 모든 저장 키·세션·URL 교차 검증 |
| #282 느린 네트워크 | Engineering/QA | 진행 중 | #312 캐시·#316 교통 경계·#328~#330 오류/재시도, `lib/request-budget.js`, `e2e/slow-upstream.spec.ts` | Production KTO/KORAIL/TAGO 지연 원인·배포 후 복구 재검증 |
| #283 도움말 | Engineering/QA | 진행 중 | `components/HelpCenter.tsx`, `e2e/help-public-pages.spec.ts` | #311 DOM 변경 후 모든 안내 대상·포커스 재검증 |
| #284 성능 | Engineering/QA | 진행 중 | `scripts/check-performance-budget.mjs`, `e2e/performance-boundaries.spec.ts` | 현재 전송량 예산 PASS. 실제 LCP/CLS/INP·느린 기기 측정 미완료 |
| #285 WCAG 2.2 AA | QA/운영자 | 진행 중 | axe·대비·44px·포커스 회귀 | 자동 테스트 외 화면 낭독기·당사자 검증; 완전 준수 선언 금지 |
| #286 전 구간 반응형 | QA | 진행 중 | #278 통합 대표, `e2e/launch-integrity.spec.ts` | 320×568~2560×1440·가로·200%·safe-area·소프트키보드 전체 증거 |
| #288 자동화 Epic | Engineering/QA | 진행 중 | #289~#306 stack·CI, 구독 smoke 이력 | 실제 queue→구현→별도 QA→기록→Notion의 종단간 실행 |
| #290 실패 라우터 | Engineering/QA | 진행 중 | #291·contract CI | main 미병합·실제 중복 이벤트/실패 환류 |
| #292 Issue lifecycle | Engineering/QA | 진행 중 | #293·contract CI | 팀원 포함 실제 Issue smoke·중복 방지 |
| #294 구독 실행 Gate | PM/Engineering | 진행 중 | 실제 웹 예약5개·매시간 queue·GitHub 이벤트 검수·기존 read-only receipt·로컬 smoke | 구현→독립 QA 전체 자동화·한도/PC/앱 조건; 유료 경로 비활성 |
| #295 PM dispatch | Engineering/PM | 실제 차단 | #296 비활성 API 경로 보존 | 구독 기반 인계 검증; API Secret 활성화 금지 |
| #297 Engineering worker | Engineering/QA | 진행 중 | #298 비활성 API 경로·로컬 구독 smoke | 실제 안전한 queue 작업 구현·PR 증거 |
| #299 독립 QA | QA | 진행 중 | #300 비활성 API 경로·정적 계약 | 별도 검증 실행 근거, 자기승인을 사람 승인으로 계산 금지 |
| #301 배포 후 QA | Engineering/QA | 진행 중 | #302 읽기 전용 fixture·SHA guard | main 미병합·실제 CD 환류·운영 smoke |
| #303 Compliance agent | PM/Engineering | 진행 중 | #304는 실행 구현이 아닌 역할 계약 | Gmail/Notion 수동 연결 확인. 구독 예약 실행 미검증 |
| #305 제출·심사 agent | PM/Engineering | 진행 중 | #306은 역할 계약, 공식 원본·제출 원고 확보 | 실제 자동 생성·검수·PDF·최종 운영 대응 |
| #308 의존성 보안 | Engineering/QA | 진행 중 | #309, exact alias·악성 입력·audit 0 | 커뮤니티 포크 유지보수 위험·Vercel 실제 함수 smoke·사람 리뷰 |
| #310 UI 참고 | Engineering/QA | 진행 중 | #311·PM 부분 채택 기록 | 실제 회귀 수정·검증; 원 시안 전체 복제/자동 완료 금지 |
| #11 공모전·운영 | PM/운영자/Engineering | 진행 중·사람 확인 분리 | [정합성](contest-compliance.md), [원고](submission/development-entry-draft.md) | 팀명 충돌·개인 자격·법적 검토·운영 계정·백업·최종 제출 |
| #337 날짜 정합성·UI | Engineering/QA | 진행 중 | 팀원 실제 Production 재현, `features/planner/hooks/useTripSchedule.ts` 감사 | 기간 밖 장소의 자동 재배치 방지,7일 기간 계약,변경 안내를 재현/수정·KOEN/여행집 회귀. 사진/가독성은 기존 #257/#270/#278과 대조 |

## 실제 차단과 계속 가능한 일

1. 필수 사람 승인 3건: 병합만 차단. 기존 PR 회귀·문서·시각 QA를 계속한다.
2. Preview/DB 관리 접근: 현재 로컬 Vercel CLI 로그인·연결된 Vercel/Neon 도구가 확인되지 않았다.
   운영 Secret은 출력·복사하지 않는다. 기존 Production CD를 Preview용으로 실행해 운영을 변경하지 않는다.
   008의 트랜잭션·등록·앱 호환은 코드 검토했고 실제 스키마·백업·복원·영향 행 수는 별도 확인한다.
3. 구독 자동화: API workflow 3개는 `disabled_manually`. 기존 웹 예약5개·queue/PR검수 최근 결과를 읽었다.
   웹 이벤트 검수·GitHub/Notion 환류는 확인했지만 사용자 PC 구현·독립 테스트 전체 연결은 미검증이다.
   로컬 프로젝트 예약은 PC·앱·파일 접근이 필요하며 웹 작업은 연결 도구 범위다. 새 예약/인증 복사/유료 전환은 없다.
4. 공모전: 부문·마감·예비 합격은 확인 완료. 팀명·최종 팀원·이력·법적 의무·실제 제출은 사람 확인.
5. 독립적으로 계속할 제품 작업: #317~#319/#321에서 조건·내비게이션·설정·도움말·추천 상세를 수정했다.
   영어 일정·경로·인증 폼·정책 본문과 전체 언어 상태별 QA가 남는다. #320은 보완 코드·로컬 회귀
   증거와 CI 성공을 추가했고 PM 재검토·배포 증거가 남는다.
   390·1366px 기본 배율에서 새 활동 Gate는 넘침 없이 보였지만 CSS zoom 2 진단은 잘림이 있어
   실제 브라우저 200% 확대 검증을 완료로 세지 않는다. #251/#265/#286에서 검증·수정을 이어간다.

정확한 worktree·SHA·미완료 범위는 [실행 체크포인트](ai-logs/launch-execution-checkpoint-20260906.md)를 따른다.

## 다음 실행 순서

1. #311~#316 제품 후보·#309 보안·자동화 stack의 최종 합성 SHA를 전체 검증하고 원격에 보존한다.
2. 제품·보안·자동화 합성 후보의 전체 검사와 실제 Preview를 SHA로 연결한다.
3. Production 제공처별 실패 진단, 008 운영 사전 점검, KO/EN·전 뷰포트 잔여 QA를 처리한다.
4. 이 표의 각 Issue AC에 운영 증거를 연결해 완료/부분/중복을 확정한다. 증거 없이 닫지 않는다.
5. 공식 양식 검토 PDF를 최종 배포 화면으로 교체하고 구독 queue 종단간 안전 작업을 마무리한다.
