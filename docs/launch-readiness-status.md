# 전체 실행 목록과 운영 반영 상태

## 2026-09-09 07:11:25 KST — #378 반영 사실 대조

- #375 첫 소개 개선은 Production `9caca69fd5db24ed0bc741ad68ffef0d00ffe3ee` / `dpl_Bmz6cMJ6ySEe45FRLS3TwTzWRRWL`로 배포됐다([CD218](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34256433331)). 아래 f4/0116·초기 Open/PR 수는 당시 이력이다.
- #377 날씨 연결 수정은 main `81b88e4f6bf69c4811d458fbe2639a87e885a84b`에 병합됐다. #378 후보 `9f83fb920343cec31abfa3de04cc6414e43e3728` 이후 새 main은 `eab2442f90b72441fd311db13dd8bb935723527f`이다. main CI/CD 근거: [main CI868 attempt2](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34277144002/attempts/2) SUCCESS(고유838: 837 PASS·기존skip1·fail/flaky0), [CD221](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34282029576) SUCCESS.
- 실제 Production: `eab2442f90b72441fd311db13dd8bb935723527f` / `dpl_GVGVzh2TahHEDKDJHUp6vCN9FaGJ`. canonical READY·SHA/조회 시각 근거: 2026-09-09 06:45:02.580 및 07:01:03.532 KST 독립 canonical 조회에서 같은 SHA/배포의 READY·production을 전후 확인했다([독립 Production 검증 범위](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788)). 독립 Production 확인 범위와 남은 항목: [독립 Production 검증 범위](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788): 2026-09-09 06:46–07:01 KST 공개 여정의 제한된 PASS. 74개 관찰에서 처리되지 않은 페이지 오류0건, 실제 Kakao 날짜별 표지·날씨 상세 초점·기기 저장의 장소 ID/날짜/순서 복원을 확인했다. route/ODSay 전송0건이며 전체 제공처·모든 설정 복원·#353 완료를 뜻하지 않는다. health 키 설정·fixture·Preview·배포 완료를 전체 제공처/여정 PASS로 확대하지 않는다.
- CI868 attempt1의 25분 job 취소·browser(2) artifact 미보관 이력을 보존한다. attempt2에서 browser(2)·validate만 새로 실행했고 quality·boundary·browser(1)은 같은 SHA의 이전 성공/동일 로그와 artifact를 상속했다. 단일 재시도 성공은 job budget 원인 수정 증거가 아니다. #357은 별도 incident 원장을 따른다. CD221 사전 점검은 8 total/1 active/008 영향0, migration 경로001–008 성공을 확인했다. [PostDeploy12](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34282190225)는 hosted browser8 PASS/26초이나 기존#372 hold로 전체 FAILURE이며 live API smoke0회다. #359/#372의 외부 제한을 UI 회귀나 전체 제공처 성공으로 바꾸지 않는다.
- 독립 공개 여정은1366×900/390×844에서 날짜별 사진·순위 표지/가림0·pageerror0을 확인했다. 실제 plan1/weather1/spot-photo2/crowd1/enrich1/map-config15가 허용됐으며 crowd는 응답 관찰 전 중단됐다. HTTP200 응답 20건은 새 upstream 시설 검증/과금 집계가 아니다. 자동 route7건 등 guard 차단을 보존하고 route/ODsay·서버쓰기0을 유지했다. 복원한 ID/날짜/순서와 좌표 제거·미확인 위치/달라진 도착 추정을 구분한다. 기존 early-input 관찰과 Leaflet Preview 실패는 이 Kakao 여정으로 자동 해소하지 않는다.
- #379는 다른 실행이 소유한 외부 Draft PR이다. 이 작업에서 생성·push·검토·병합하지 않았으며, CI869 green을 현재 Production 변경이나 CI868 attempt2의 원인 수정으로 세지 않는다.

- #353 **ACTIVE**: eab의 실제 두 장소·편의 근거 상세·마지막 출처 CTA는 배포 포함 코드다. 같은 공개 세션의 날짜 변경→날짜별 일정/실제 Kakao 지도 원본도 확보됐다. 이를 연결하는 새 3가지 상태 소개와 기존 6개 도구의 native 접기/본문 16px은 `feat/service-story-days-353`의 **로컬 미커밋 구현**이며 후보/Production 검증·최종 제출 캡처가 남는다. 기존9caca의 별도02:29/03:08 촬영은 보존하며 연속 근거로 바꾸지 않는다. Owner의 #21 일반 모션 약화 거부와 OS/앱 감소 모드, 기존 D41–D46 canonical 이관은 유지한다.
- 새 날짜·지도 화면은 eab의 같은 세션에서 06:55:25.855–06:58:13.668 KST에 촬영한 6개 정수 crop/무손실 WebP, 총978,798 bytes다. [timeline-manifest.json](../public/media/wave-journey/timeline-manifest.json)에 원본/파일 SHA·날짜·장소ID·순위·뷰포트·출처를 보존했다. 자산 원본은 실제 Production이고 이를 사용하는 새 소개 UI는 아직 로컬 후보라는 차이를 유지한다.
- 공식 원본 9장·최대 5핵심 기능과 기능 슬라이드 복제 허용에 따라 현재 초안은 13장이다. 13장은 공식 필수·상한이 아니다. reviewed-v4 캡처는 **18/26 반영·8 대기**, 별도 지도 1개는 확보·미삽입이다. 새 export와 실제 낭독기/최종 제출은 별도다.
- #372 ODsay hold, #350 cloud sync, #351 Kakao Login, #373/자동화 POST-RC의 남은 범위를 이 배포로 자동 종료하지 않는다. 최종 팀원·원 신청 계정·제출은 사람 확인이며 테스트 계정은 심사 기능에 별도 로그인이 필요할 때의 조건부 항목이다.

## Historical — 2026-09-09 00:09~00:35 감사 원문

아래 수치·상태·미커밋/미배포 표현은 당시 기록이며 최신 판정은 위 절과 각 Issue의 요구별 원장을 따른다. 기존 66개 표와 원문/이관 링크를 보존한다.

**00:35 KST 요구 보존 재감사:** 최근 닫은 제품 Issue 14개의 본문·후속 댓글 132항목을 `IMPLEMENTED` 51 / `TRANSFERRED` 48 / `DEFERRED-IDEA` 16 / `REJECTED` 17로 매핑했다. 잔여 64항목을 기존 Open Issue 16곳에 실제 이관한 뒤 원본·대상 댓글 30개를 다시 읽어 확인했다. 아래 초기 DONE 표기는 **원 Issue의 모든 아이디어가 구현됐다는 뜻이 아니다.** 각 행의 최신 요구별 매핑이 항목 수준의 확정 상태이며, 이관된 필수 조건은 대상 Open Issue에서 계속 해결해야 한다. 대량 reopen이나 새 중복 Issue는 만들지 않았다.

#353은 한국어 화면 우선의 로컬 WIP다. 기존 Production과 새 디자인을 구분한다. 첫 인트로가 이미지에 가려지는 결함을 실제 화면으로 재현한 뒤 독립된 Hero 영역에서 파도→접근성 형상→W.A.V.E를 표시하도록 수정했다. 작은 프레임의 확장과 4단계 여행 예시를 실제 DOM으로 구현 중이며, 최종 CI·Preview·Production·제출 캡처는 아직 필요하다. #21의 일반 모션 약화 제안은 최신 Owner 결정으로 REJECTED이며, 접근성 감소 모드는 별도로 유지한다.

<!-- wave-current-issue-audit:20260909:f4d5d97 -->

확인: **2026-09-09 00:09 KST**. 원래 열린 Issue **66개**(제품38 + 운영26 + #288/#353)를 실제 본문/고유 감사 댓글과 대조했다. **DONE16·SUPERSEDED5를 종료해 현재 Open45**이며, #260/#262 같은 감사 전 Closed는 66개에 포함하지 않는다. 표의 Issue 링크는 가능하면 해당 판정 댓글을 가리킨다. 기존 기록은 아래 Historical에 원문 그대로 보존하며 과거 미병합/미배포/DB 차단을 현재 상태로 반복하지 않는다.

- **main/Production:** 원격 main을 다시 조회해 `f4d5d9757451c5086aabaf78ee6ff31086c37368`를 확인했다. Production도 **2026-09-09 00:06:03.435 KST** metadata 재확인에서 같은 SHA, canonical deployment `dpl_H5bVpVcrFXzRHW9oZajfgmzB9ree`, READY/production이다. [CD217](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34236269553) SUCCESS. Health는 설정 확인이며 실제 provider 성공 증거가 아니다.
- **PR/소스 정리:** 포함/중복 근거를 보존해 원래 source PR41개를 모두 종료했다. 현재 열린 PR은 **2개**: [#349](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/349) 문서·현재 위치정보 경계 정합성 재조정, [#373](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/373) Draft/POST-RC. #373의 전체 자동화/Fast Gate 변경은 #353에 합치지 않는다. #353은 `feat/service-story-353`의 **미커밋 구현/검증 진행 중**이며 새 HEAD·Preview·Production 완료가 아니다.
- **M/C/P/S 증거 분리:** M은 위 배포에 포함된 제품 코드(#334→#356→#363→#364→#369→#370), C는 [#370 CI855](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34227284864)의 unit696·desktop399·mobile398 PASS/기존skip1/실패·flaky0 및 기존 회귀다. C의 fixture는 실제 provider 성공이 아니다. P는 **0116ef9**에서 수행한 실제 핵심 여정(명시적 검색→추천5/탐색7→일정/지도→날짜 재배정→저장/복원, 실제 Kakao/날씨)의 제한된 기록이다. **f4에서 P 전체를 다시 실행하지 않았다.** [공통 상세 증거](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5587171149).
- **현재 운영 smoke:** S=[f4 Post-Deploy8](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34236448981)의 read-only browser/axe **8 PASS**·전후 배포 SHA 확인이다. 기존 #372 hold를 지켜 **실 API 호출0, 전체 run FAILURE/blocked-external**이다. [Router42](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34236610176)는 duplicate/code-fix loop를 만들지 않았다. Preview·fixture·browser8을 전체 Production/provider PASS로 확장하지 않는다.
- **#365 최소 경계 완료 / 고급 POST-RC:** quota 분류·warm-instance cooldown/coalescing·KO/EN 정직한 안내·persistent hold·mixed-failure 분리·no-loop는 완료다. API7은 당시 **Production5e7ec6b/workflowf4**에서 제한을 기록했고, 이후 실제 f4 PostDeploy8은 추가 API0으로 hold를 유지했다. 계정 한도/reset은 #372, cold-start/account-wide/opaque SDK 고급 보강은 POST-RC다. 이 감사와 문서 갱신에서 provider API를 재호출하지 않았다.
- **Engineering과 Human/External:** Engineering은 구현·코드/fixture·실제 브라우저 증거를 담당한다. 사람/외부 확인은 실제 계정/권한/reset·참가자/법적 판단·실물 낭독기/기기·최종 제출이며 #11/#372와 해당 QA 잔여로 분리한다. 이 원장은 **최종 QA PASS·Release GO·자동화 activation**을 선언하지 않는다.

| Issue / 감사 근거 | 현재 판정 | 충족 / 남은 AC | 코드·테스트·Production 범위 |
| --- | --- | --- | --- |
| [#11](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/11#issuecomment-5587029911) | BLOCKED-EXTERNAL-HUMAN | 참가/팀·법적/운영자·탈퇴/메일·실물·최종 제출 확인 잔여 | 008/binding/restore 완료; 실제 ODsay 상태 #372 |
| [#251](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/251#issuecomment-5587204076) | ACTIVE | 날짜·지도·저장 복구 반영; 영어·도움말·확대/종합 QA 잔여 | planner/date/recovery 회귀; M/C, P 제한 여정 |
| [#252](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/252#issuecomment-5587204405) | ACTIVE | 복수 테마 검색·병합 완료; 공유/여행집 선택 상태 복원 잔여 | usePlannerCriteria/plan-builder/travel-book; C |
| [#253](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/253#issuecomment-5587204680) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/253#issuecomment-5587680806) | DONE · Closed | 한 질문/전체 보기·선택 유지·키보드·명시적 검색 완료 | PlannerConditionsPanel; condition/planner E2E, P |
| [#254](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/254#issuecomment-5587205317) | ACTIVE | stale 완료 방지 구현; 기존 일정 접근 유지와 원문 잠금 AC 정리 | useJourneyProgress available≠complete; C |
| [#255](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/255#issuecomment-5587207843) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/255#issuecomment-5587681056) | DONE · Closed | 핵심 편의/CTA 우선·보조 정보 접기·역할 분리 완료 | PlannerServiceStatus/TravelSignalsPanel; C/P |
| [#256](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/256#issuecomment-5587208502) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/256#issuecomment-5587681357) | DONE · Closed | 날씨 시각·7일 비교·텍스트 대안·실패/모바일 완료 | WeatherVisual; weather-language/integrity, P |
| [#257](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/257#issuecomment-5587209213) | ACTIVE → #353 | 단일 CTA 반영; 큰 관광 장면·소개 흐름·상세 보기 잔여 | LandingHero/ProductStories; M/C |
| [#258](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/258#issuecomment-5587209451) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/258#issuecomment-5587681640) | DONE · Closed | 실제 경남/전국 위치·18시군·map/list·실패 대안 완료 | SGIS2020 경계; landing-boundaries E2E, #331→#334 |
| [#259](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/259#issuecomment-5587210123) | ACTIVE → #353 | 작은 정적 시각 반영; 동일 장소 날짜→일정→경로 장면 잔여 | CompactJourneyVisual; compact-landing-visuals |
| [#261](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/261#issuecomment-5587210476) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/261#issuecomment-5587684081) | DONE · Closed | 중립 진입·명시적 검색·dirty/abort/race·profile 정책 완료 | usePlanRequest; launch-integrity/search-focus, P |
| [#263](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/263#issuecomment-5587215212) | ACTIVE | 완료 하위 기능 인정; 소개/상세/최종 접근성·반응형 잔여 | 하위 AC 댓글; #353/#267/#279/#285/#286 |
| [#264](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/264#issuecomment-5587215616) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/264#issuecomment-5587684340) | DONE · Closed | 날짜별 일정/지도 순서·전체 leg·stale/좌표 누락 처리 완료 | itinerary-route-sync; #364 공개 ID 복구, P |
| [#265](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/265#issuecomment-5587216427) | ACTIVE | 핵심 용어 개선; 실제 도움말/랜딩의 구형·자동 재계산 문구 잔여 | tour-content/landing copy; #353/#283 |
| [#266](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/266#issuecomment-5587216912) | POST-RC | 일부 정리·예산 준수; #353 DOM 확정 후 전체 스타일 정리 | 현재 styles/숨겨진 preview 소스; #355 |
| [#267](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/267#issuecomment-5587217329) | ACTIVE | 자동화/제한 실제 여정 확보; 최종 이해도·전 환경 QA 잔여 | C/P 범위 구분; #353/#285/#286 |
| [#268](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/268#issuecomment-5587217681) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/268#issuecomment-5587684626) | DONE · Closed | 시설 분류/실제 field·중복 제거·profile·근거 연결 완료 | catalog/accessibility-model; profile/score tests, P |
| [#269](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/269#issuecomment-5587218355) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/269#issuecomment-5587684978) | DONE · Closed | 사진·확인 편의·추가 CTA·탐색 위계·근거 의미 완료 | RecommendationCarousel; photo/evidence tests; #363, P |
| [#270](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/270#issuecomment-5587219186) | ACTIVE → #353 | 이미지 출처/실패 기반 있음; 섹션별 실제 관광 미디어 적용 잔여 | SmartSpotImage/assets-and-licenses; #284 |
| [#271](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/271#issuecomment-5587219465) | ACTIVE → #353 | 기존 장소 modal 구현; 소개 장면 자세히 보기 계약 잔여 | NativePlaceDecisionDialog; 기존 focus 회귀 |
| [#272](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/272#issuecomment-5587219796) | ACTIVE | URL/history/focus 구현; refresh의 criteria/현재 질문 복원 잔여 | usePlannerCriteria/question clamp; C |
| [#273](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/273#issuecomment-5587223275) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/273#issuecomment-5587685308) | DONE · Closed | 18시군/전체 map/list·키보드·landing region 전달 완료 | GyeongnamRegionPicker; region/condition E2E, P |
| [#274](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/274#issuecomment-5587224162) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/274#issuecomment-5587687653) | DONE · Closed | field별 confirmed/unknown/negative·집계/legacy/언어 완료 | accessibility-model/score; evidence/partial tests, P |
| [#275](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/275#issuecomment-5587224902) | ACTIVE | 날짜 보존·enrichment 반영; 정책 명시·행사 overlap 회귀 잔여 | criteriaSignature/fetchRegionalEvents; date tests, P |
| [#276](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/276#issuecomment-5587225195) | ACTIVE | 지도 도구/복구 기능 있음; 기본 9도구의 핵심/고급 계층 잔여 | MapCommandBar; map-tools 도달성 회귀 |
| [#277](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/277#issuecomment-5587225493) | ACTIVE | 이동 접근성 과장 방지 구현; provider별 capability 감사표 잔여 | route coverage/order/departure; transport truth tests |
| [#278](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/278#issuecomment-5587196501) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/278#issuecomment-5587688210) | SUPERSEDED · Closed | 4개 고유 viewport·회전·공통 페이지·WebKit을 #286에 보존 | 이관 댓글 먼저 재조회; 품질 DONE 아님 |
| [#279](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/279#issuecomment-5587225800) | ACTIVE | screenshot/trace는 있음; baseline/pixel-diff CI 미구현 | toHaveScreenshot/toMatchSnapshot 계약 없음 |
| [#280](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/280#issuecomment-5587226174) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/280#issuecomment-5587688543) | DONE · Closed | 완료율/전체 경로/이동 편의/날씨/예측 상태 분리 완료 | useJourneyProgress/departure assessment; C, P 2/4→4/4 |
| [#281](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/281#issuecomment-5587226932) | ACTIVE | atomic 여행 경계·충돌/복원 구현; 새 여행의 선택 활동 reset 잔여 | current-trip-storage/useRegionChange; C/Preview, P Cancel |
| [#282](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/282#issuecomment-5587227264) | ACTIVE | partial/quota/no-loop 반영; plan timeout/server 사용자 상태 구분 잔여 | usePlanRequest/provider failure; #369/#370 C |
| [#283](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/283#issuecomment-5587227571) | ACTIVE | focus/resize 개선; 누락/잘못된 target과 고정 anchor 계약 잔여 | tour-content/useHelpTour; #265/#353 |
| [#284](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/284#issuecomment-5587234766) | ACTIVE | CSS/JS 예산 통과; #353 전후 실제 mobile Web Vitals 측정 잔여 | CI855 69.96/70·269.74/270KiB; 실제 INP 증거 아님 |
| [#285](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/285#issuecomment-5587235046) | ACTIVE + HUMAN | axe/키보드/대비 개선; 실제 확대·낭독기·실물 검증 분리 | C/P 제한 범위; CSS zoom≠실제 browser zoom |
| [#286](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/286#issuecomment-5587185101) | ACTIVE + HUMAN | 선택 화면 검증됨; 전체 상태/확대/rotation/WebKit·실물 잔여 | #278 고유 AC 이관; C 11viewport 일부, P 320/1366 |
| [#288](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/288) | POST-RC · 자동화 / ACTIVE · 제품 | 실행 원장 유지; 자동화 설치/tick/canary/확장 보류, #353 제품 우선 | 기존 #294 generation/attempt/receipts 및 보호 경계 보존 |
| [#290](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/290#issuecomment-5587011181) | DONE · Closed | 실패→기존 Issue 환류·중복 방지·provider-only 분리 완료 | #334/#363; Router42 실제 no-loop |
| [#292](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/292#issuecomment-5587011610) | POST-RC | 기본 router 운영; ready-for-dev/blocked-human 종단간 전환 잔여 | Issue Router1/2/3·bot triage; label/race 계약 |
| [#294](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/294#issuecomment-5587012056) | POST-RC | 구독 문서 실행 일부; Engineering→QA→PM/Notion 전체 미완료 | generation5·impl2/QA2 보존; 설치/tick/canary 중지 |
| [#295](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/295#issuecomment-5587012587) | POST-RC | PM dispatcher 소스 포함; 구독 event→PM/Notion 환류 잔여 | workflow350876230 disabled_manually/API job false |
| [#297](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/297#issuecomment-5587013151) | POST-RC | Engineering worker 계약 포함; 실제 자동 구현/QA/게시 잔여 | workflow350879491 disabled_manually; #294 경계 보존 |
| [#299](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/299#issuecomment-5587013627) | POST-RC | QA 계약/별도 실제 리뷰 있음; 전 trusted PR 자동 QA/환류 잔여 | workflow350883236 disabled_manually/API job false |
| [#301](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/301#issuecomment-5587014151) | POST-RC | CD 후 read-only smoke 운영; PM/Notion 자동 acknowledgement 잔여 | PostDeploy8 SHA/browser8 PASS, API0 blocked; notify-pm false |
| [#303](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/303#issuecomment-5587014685) | POST-RC | 공식 원문/allowlist/agent 계약 있음; Gmail/Notion 자동 종단간 없음 | .wave/agents/compliance.md; PM/#11 별도 |
| [#305](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/305#issuecomment-5587015119) | POST-RC | submission schema/역할 계약 있음; 자동 감사/생성/Judge 환류 없음 | 기존 원고≠최종 제출; #353/#11 우선 |
| [#308](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/308#issuecomment-5587015606) | DONE · Closed | 정확한 개발 의존성 override·악성 이미지 회귀·런타임 호환 완료 | #309→#334; dev-toolchain-security/audit, f4 browser8 |
| [#310](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/310#issuecomment-5587197308) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/310#issuecomment-5587688835) | SUPERSEDED · Closed | Owner 부분 채택 참고 범위를 #353에 보존; 원안 완료 아님 | Owner 댓글5556558869/이관 read-back |
| [#337](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/337#issuecomment-5587235435) · [요구별 구현·이관](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/337#issuecomment-5587689079) | DONE · Closed | 7일/날짜 보존·자동 보정·저장/복원 오류 해결; UI는 #340 | 작성자 범위 분리; #339→#334, C/P |
| [#340](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/340#issuecomment-5587236203) | ACTIVE → #353 | 날짜 데이터 해결; 관광 장면·문구·크기·날짜 변경 취소 UX 잔여 | #341은 문서; #337 분리, P 날짜 보존 |
| [#347](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5587171149) | ACTIVE + EXTERNAL/HUMAN | P0/008 해결 반영; 전체 실제 계정/공유/확대/기기 QA 잔여 | M/C/P 분리 원장; f4 browser8≠전체 Post-Deploy PASS |
| [#350](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/350#issuecomment-5587019723) | POST-RC | 계정 cloud sync/import·격리·충돌·삭제/다중 기기 미구현 | server/trips/database.ts 만료형 공유≠계정 동기화 |
| [#351](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/351#issuecomment-5587020215) | POST-RC | Login ON/Secret 활성 보고 보존; callback/연결/탈퇴 실검증 잔여 | OIDC 마지막OFF; #354 고유 상태 보존; 재설정 요청 없음 |
| [#352](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/352#issuecomment-5587020646) | POST-RC | API 신기능 후보 대기열; 가치/비용/약관/실데이터 승격 심사 잔여 | 설정 존재≠사용자 가치; 신규 작업 시작 안 함 |
| [#353](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5587185468) | ACTIVE · 미커밋 구현 중 | 서비스 소개·관광 미디어·연결 장면 구현; 전체 검증/QA/배포 미완료 | feat/service-story-353 작업 트리; #310 참고 범위 보존 |
| [#354](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/354#issuecomment-5587021069) | SUPERSEDED · Closed | Login ON·Secret 활성·OIDC OFF/미검증 callback을 #351로 통합 | #351 comment5571080699; 인증 출시 완료 아님 |
| [#355](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/355#issuecomment-5587021515) | POST-RC | 근거 기반 refactor/측정 프로그램; 전체 조사/전후 비교 잔여 | #353 필수 최소개선·기존 예산만 유지 |
| [#357](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/357#issuecomment-5587022007) | ACTIVE | streaming 경합 실제 재현; #353의 제한 readiness 수정 미커밋 검증 중 | CI856 최초398PASS+1flaky 보존; 새 로컬76PASS+2flaky FAIL |
| [#358](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/358#issuecomment-5587022477) | SUPERSEDED · Closed | CI 선행실패/Owner hold CD 사건 종료; 후속 실제 배포 확인 | #364 수정 후 CD213/214/215/217; provider gate 별도 |
| [#359](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/359#issuecomment-5587022852) | BLOCKED-EXTERNAL-HUMAN | 기존 실제 route 실패/현재 hold 유지; 계정/reset 전 재호출 금지 | PostDeploy8 API0/browser8; Router42, 운영 대표 #372 |
| [#360](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/360#issuecomment-5587023227) | SUPERSEDED · Closed | 폐기 HEAD의 cancelled CI836; 최종 #356 성공/병합으로 대체 | CI837 exact88a0969; 원본 취소 증거 보존 |
| [#365](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/365#issuecomment-5587023624) | 최소 DONE / 고급 POST-RC | classification/cooldown/coalescing/UI/persistent hold/no-loop 완료; 고급 보호 잔여 | #369/#370; API7 당시Prod5e/workflowf4, 이후 f4 API0·Router42 |
| [#367](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/367#issuecomment-5587027891) | DONE · Closed | immutable bootstrap pin 실제 실패 수정·후속 main/배포 완료 | #366 exact3ea542d CI847→mainCI848/CD214 |
| [#368](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/368#issuecomment-5587028296) | POST-RC | Fast/Full #373 Draft; 중복 trigger/canary/전후 측정 미완료 | FullCI858 PASS≠출시; #374, Preview/activation 보류 |
| [#371](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/371#issuecomment-5587028704) | DONE · Closed | pin/artifact 실패 이력 보존; 최종 별도 HEAD 성공/배포 확인 | #370 exactf1c60b3 CI855→f4; 무조건 retry 정당화 아님 |
| [#372](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/372#issuecomment-5587029111) | BLOCKED-EXTERNAL-HUMAN | ODsay plan/호출량/원인/reset 확인 전 hold 유지·재호출 금지 | PostDeploy8 추가API0/Router42 no-loop; hold 해제≠PASS |
| [#374](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/374#issuecomment-5587029511) | POST-RC | opened+ordinary label 중복 시작/취소 결함 잔여 | CI857 취소·CI858 green≠수정; #373 canary/재시도 중지 |

#278은 네 고유 viewport(393×852/667×375/1024×1366/1440×960), 회전 복구, 공통 페이지, WebKit 대체 검증을 #286에 **먼저 기록·재조회**한 뒤 통합 종료했다. #310도 Owner의 부분 채택 참고 범위를 #353에 먼저 보존했으며 원안 전체 완료가 아니다. #337의 날짜 오류 종료와 작성자가 분리한 #340/#353 디자인/날짜 안내 UX는 구분한다.

#357은 후속 로컬 #353 검증에서 hidden SSR와 live DOM이 함께 존재하는 streaming 경합을 실제 재현했다(76 PASS/2 flaky FAIL 보존). visible main·유일한 committed tree·7개 caption readiness의 제한된 수정만 미커밋 검증 중이며, 기존 assertion/timeout을 유지한다. #373 전체를 가져오거나 #357을 종료하지 않는다.

---

<details>
<summary>Historical — 아래 전체는 과거 시점의 실행 기록이며 현재 상태는 위 2026-09-09 감사가 우선합니다.</summary>

**아래의 모든 SHA·Open 수·미병합/미배포·DB/사람 Gate·다음 실행 순서는 당시 기록이다. 원문을 삭제하지 않았으며 현재 작업 지시나 최신 Production 판정으로 사용하지 않는다.**

# 전체 실행 목록과 운영 반영 상태

확인일: 2026-09-07. GitHub Issue/PR가 작업 원장이고 Notion은 같은 근거를 보여주는 관제 화면이다.
담당의 Engineering/QA는 위임된 구현·검증 역할, PM/운영자는 사람 확인 역할을 뜻한다.


원격 전수 조회: 2026-09-07 03:09 UTC, PR41·Issue49. 원본40개 PR과 팀원 #337/#340을 보존해 추적한다.

## 2026-09-07 03:09 UTC 실행 증거

전체 요청은 미완료다. main/Production은 `34e6021265b16d046dca24feaa3ec2101fc977e2`다. GitHub 배포6278499275와 Vercel 대시보드의 현재 배포 `DpUP8LhruYLeXs6N5Nxqrk3JoD6G`가 같은 SHA임을 확인했다. 원격41 Open PR·49 Open Issue를 조회했고 새 팀원 #340/#341도 포함했다. 기존 원본40개 PR의 변경을 보존한 로컬 합성 앱은 `c279f2292ad5e5c46e6915d3d8dbc91dcdcca239`다. main 병합이나 Production 배포가 아니다.

| 범위 | 실제 증거 | 현재 상태·남은 조치 |
| --- | --- | --- |
| #334 직전 검증 | `a03529a5408f5261a1737b885b36e3e649b3ffbd`, unit484, 앱동일92be654 로컬581 PASS/기존skip1(13.2분), [CI34076185336](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34076185336) 581 PASS/기존skip1/flaky0 | 날짜·실제 표시 결함을 발견해 Draft로 유지하고 #339를 합성함 |
| #335 RC-19 | `f6e451beedcec969c7a879a9d360825e1a7ced32`, hook14/unit368/관련56 PASS, [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34076016081) 555 PASS/기존skip1/flaky0 | Ready·미병합·미배포, 지원 범위 밖 Roadview와 Escape focus 수정 포함 |
| #336 RC-20 | `82314645616e1f1c4e3f2705abcaaaaef998bc50`, 계약53/unit333/로컬전체237 PASS, [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34075800244) 237 PASS/기존skip1/flaky0 | Ready·미병합·미배포, 요청과 무관한 도형 거부. 1km는 제품 허용 오차이며 경로 접근성 보장 아님 |
| #338 ODsay | `b6a7f77cb8b760ee77843699f0387e6a1e9b9e25`, 부모합성unit364 PASS, [CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34075953741) 237 PASS/기존skip1/flaky0 | Ready·미병합·미배포. 도시 간 첫/마지막 이동이 빠진 경로를 확인 완료로 승인하지 않음 |
| #337/#339 날짜 | `c789bc6e91b17581f237a5aef71467c7bc9a1d96`, 계약11/unit491/관련40 PASS, 로컬전체605 PASS/기존skip1(13.5분), [CI34077578690](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34077578690) 303+302 PASS/기존skip1/flaky0 | Ready·미병합·미배포. 기존 범위 밖 장소 목록은 재구현하지 않고 7일 상한·변경 안내·저장/공유 경계·지연 일정 표시·대비/이름 잘림을 수정 |
| #340/#341 팀원 제안 | `afb78cfd3c3d33fd5cd53da390f0b7458e91dbf8`, 원본098ae41 보존. lint/typecheck/unit261/build/performance PASS. [새 CI](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34078628027)·전체202개 실행 중 | Draft, 접근성 리뷰3946236024의 회전 정지·포커스·live 계약 보완. 제안 문서이며 새 랜딩 UI 구현 완료 아님 |
| 최신 통합 | 앱 `c279f2292ad5e5c46e6915d3d8dbc91dcdcca239`에 #339/#341 포함 | 이 체크포인트 추가 HEAD에서 기본검사·전체606개·CI를 새로 실행. 이전 source 성공을 통합 최종 성공으로 세지 않음 |
| Production 읽기 QA | 02:50 API13개+HTML14개 응답 검사 성공. 02:52 390/1366에서 추천3·저장1·새로고침1, console/pageerror/overflow/실패GET0 | 최신 provider 계약FAIL, 첫 선택1·검색 전 자동요청2는 이전 운영 상태. Preview/Production 수정본 검증 아님 |

비용: 모델 API3workflow `disabled_manually` 유지. Secret·구독 인증 복사/새 예약/새 과금 자원 없음. 기존 구독 예약5개와 로컬 CLI의 부분 증거만 확인했고 전체 자동화 완료는 아니다.

Preview: 기존 탭 제어는 Debugger unattached였으나 새 연결로 기존 Hobby 프로젝트 대시보드를 읽고 Create Preview Deployment 입력창에 접근했다. 아직 생성하지 않았다. Git 자동 배포 설정·Production 승격·Secret 열람 없이 검증된 후보 SHA의 일회성 Preview를 다음으로 진행한다. 008 운영 스키마·영향 행 수·백업·복구 확인과 적용은 여전히 미완료다.

정확한 재개: 이 체크포인트 HEAD의 통합 기본검사/전체606개/CI → Preview 생성·실제 API/브라우저 → 사람 리뷰3건/008 게이트. #341의 최종 전체/CI와 리뷰 회신, #337 부분 완료 체크리스트, Notion을 같은 증거로 갱신한다. 임시 로그는 `trip-date-*`, `ci339-c789-success.log`, `landing-contract-*`이며 원본 worktree·실패 캡처를 보존했다. 완료한4187/4209 서버만 종료했고4213과 #341 Playwright 소유4173은 작업 중 유지했다.

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
| #337 날짜 정합성·UI | Engineering/QA | 진행 중(코드·회귀 PASS) | #339 c789bc6, unit491/관련40/로컬·CI605 PASS | 운영 반영·사진/가독성/문구 잔여는 #340/#257/#270/#278과 연결. 기존 기간 밖 목록을 재구현하지 않음 |
| #340 메인화면 제안 | Engineering/QA/PM | 진행 중(문서 계약) | #341 afb78cf, 접근성 회전 계약 보완 | 기존 랜딩 기능과 제안 차이 대조, 작은 구현 단위·실제 시각 검증·Production |

## 실제 차단과 계속 가능한 일

1. 필수 사람 승인 3건: 병합만 차단. 기존 PR 회귀·문서·시각 QA를 계속한다.
2. Preview/DB 관리 접근: Vercel Chrome 대시보드와 기존 프로젝트의 Preview 생성 입력창 접근은 확인했다. CLI/Neon 관리 도구는 확인되지 않았다.
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

1. #339 날짜·#341 팀원 문서까지 포함한 제품·#309 보안·자동화 stack의 최종 합성 SHA를 전체 검증하고 원격에 보존한다.
2. 제품·보안·자동화 합성 후보의 전체 검사와 실제 Preview를 SHA로 연결한다.
3. Production 제공처별 실패 진단, 008 운영 사전 점검, KO/EN·전 뷰포트 잔여 QA를 처리한다.
4. 이 표의 각 Issue AC에 운영 증거를 연결해 완료/부분/중복을 확정한다. 증거 없이 닫지 않는다.
5. 공식 양식 검토 PDF를 최종 배포 화면으로 교체하고 구독 queue 종단간 안전 작업을 마무리한다.

</details>
<!-- wave-current-issue-audit:20260909:f4d5d97:historical-end -->
