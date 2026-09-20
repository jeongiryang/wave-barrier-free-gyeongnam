# 신규 팀원 PR 독립 검토 — 2026-09-20

후속 통합 결과: 아래 표는 원 PR 검토 당시 상태다. 발견한 SQL 제약/목록·공식 시설 훅·마커 유지·라벨·UI 진입점·나루 Context·대비 문제는 통합 브랜치에서 수정했다. 원 커밋 22개 PR 분량을 모두 반영했으며 검증과 잔여 외부 제약은 [통합 작업 기록](ai-logs/2026-09-20-design-b-integration.md)을 따른다. 원 PR의 과거 실패를 우회 병합하지 않고 통합 후보 전체 CI를 요구한다.

검토자: 구현 담당과 분리된 Codex 하위 QA. 범위: 열린 PR 620–642 중 22건(626 제외)의 diff, PR 본문/기준 SHA, GitHub Actions 실패 로그, 현 로컬 마이그레이션. PR 코드 실행·checkout·병합·원격 변경은 하지 않았다. 검토 PR 22개를 현재 작업에 첨부했다.

검토 시점 validate **성공 10 / 실패 12**. 모든 실패가 npm 외부 장애라는 근거는 없다. 구현 오류, 기존 테스트의 고정 수/목록 기대, 일부 개발 모듈 네트워크 오인이 섞여 있다. 성공한 개별 PR의 결과는 통합 tree의 CI 성공을 대신하지 않는다.

| PR | 범위 | 실제 구현 상태 | 통합 전 조치 |
|---|---|---|---|
| [#620](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/620) (FAILURE) | 저상버스 도착 레이어 | 기존 TAGO 재사용, 실제 제공처 통합 가능 | 공식레이어 0개라는 오래된 E2E 기대 + crowd-shortcut focus timeout; 하위 정류장 조회가 전부 실패해도 empty로 처리하는 경계 수정 |
| [#621](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/621) (SUCCESS) | 출입문 문의·현장 요청 | 기능 구현 | 622와 PlaceInquiryCard/Dialog, communication 옵션 의미 병합 |
| [#622](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/622) (FAILURE) | 직원 주문 문의 | 기능 구현 | landing-regions 클릭 가림 단일 실패; door와 kiosk suggestedOption 둘 다 보존 |
| [#623](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/623) (SUCCESS) | 현장 음성→큰 글자 | 브라우저 지원 시 기능 구현 | 권한·언마운트 정리 있음. 실제 사람 음성 정확도 미검증; 영어 모드 고지/오류는 한국어 고정 |
| [#624](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/624) (FAILURE) | 여행 대비 체크리스트 | 기능 구현 | mobile-touch-targets 버튼수 6→10 기대 갱신; parking privacy에서 모듈 네트워크 오인 가능; 635/636와 의미 병합 |
| [#625](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/625) (FAILURE) | 여성용품 장소 레이어 | API 계약, 운영 URL 미확인 | provider inventory 누락 + 공식레이어 0개 E2E. 오류 payload를 빈 배열로 정규화하는 문제, endpoint 실제 표본 확인 필요 |
| [#627](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/627) (SUCCESS) | 여행 취향 요약 | 로컬 저장 여행 2개 이상일 때 구현 | 628 선행. 시작 버튼 실패가 화면에 보이는지 보강 필요; 최대 3개 편의만 제안함을 명시 |
| [#628](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/628) (SUCCESS) | 내 여행 2개 비교 | 627 의존, 로컬 데이터 비교 | base가 codex/spec-40-travel-taste. 627 이후 적용; facilityKeys가 영문 내부키로 그대로 표시되는 부분 한글라벨화 |
| [#629](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/629) (SUCCESS) | 공식 금연구역 레이어 | API 구현, 해당 API 활용승인 미확인 | 620/625/638 공통 훅 하나로 통합; 도착지 선택 제외 및 location-unconfirmed 보존 |
| [#630](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/630) (FAILURE) | 인구감소지역 안내 | 공식 정적 11개 지역, 선택 재정렬 | 랜딩 카드 레이아웃/대비 실제 회귀. 새 소개 시안으로 통합하면서 출처와 나머지 7개 지역 보존 |
| [#631](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/631) (FAILURE) | 당일 진행 판 | 기존 TripProgress 파생 UI | device-location-privacy가 TripBoardView.tsx 개발 모듈 다운로드를 정보전송으로 오인. cursor 이후 현재 칸 의미도 확인 |
| [#632](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/632) (SUCCESS) | 경남 지역 방문 기록 | 기기 내 기록 파생 | 미방문/완료 표시는 직접 누른 기록만. 627/628/634와 travel-book 통합 |
| [#633](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/633) (FAILURE) | 여행 이야기·질문 | 커뮤니티 category 추가 | P1 migration-handler SQL 등록 누락; 017 카테고리 충돌 해소 필수 |
| [#634](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/634) (SUCCESS) | 지역 상품 안내 | 방문 기록이 있는 지역의 공식몰 링크 | e경남몰 링크만. 기부/결제 기능은 구현되지 않음 |
| [#635](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/635) (SUCCESS) | 공공 동행 지원 | 빈 정적 레지스트리 + 컴포넌트 계약 | 승인된 프로그램 0개로 현재 UI 없음. 실제 동행지원 안내 완료라고 보고하면 안 됨 |
| [#636](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/636) (SUCCESS) | 날씨 실내·실외 안내 | 기존 예보·공식 overview 근거 조합 | indoor만 실제 판정 가능. clear+outdoor 등 미근거 상태는 숨김; 624 assistant safetyRules 함께 보존 |
| [#637](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/637) (FAILURE) | 브랜드 뜻·소개 문구 | 정적 문구/메타데이터 | dark closing brand-meaning 대비 1.39. 최신 사용자의 Design B 문구 우선, 브랜드 뜻은 적절한 구역에 통합 |
| [#638](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/638) (FAILURE) | 쓰레기통 레이어 | API 계약, 경남 실제 endpoint 미확인 | P1 완료 controller 미정리로 핀 선택 시 마커 제거. 공식레이어 0개 E2E + trash marker timeout; serviceKey 이중 인코딩 수정 |
| [#639](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/639) (FAILURE) | 기능 8개 소개 | 정적 기능 안내 | production-hardening 컴포넌트 고정순서 기대 누락. 최신 소개 시안에 내용 통합 |
| [#640](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/640) (FAILURE) | 지역 문화 이야기 | 공식 국가유산 정적 6개 링크 | region 카드 링크 클릭 가림/사진실패 회귀. 레이아웃 분리 후 실제 hit target 검증 |
| [#641](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/641) (SUCCESS) | 지역 배경 소리 | 빈 레지스트리 + 플레이어 계약 | 승인 음원 0개, 현재 UI 없음. allowed=false 최초렌더 후 observer effect가 root를 관찰 못하는 잠재 P2 |
| [#642](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/642) (FAILURE) | 현장 접근성 게시판 | 플래그 WAVE_FIELD_REPORT_BOARD 기본 off | 633 이후; category union 필요. off에도 2번째 API 호출, 후기 실패대기/호출횟수 회귀 |

## 배포 차단 수준의 구체적 문제

### P1 — #633 마이그레이션 실행 목록 불일치
`lib/deployment/migrations.js`는 `017_community_travel_talk.sql`을 추가하지만 `server/deployment/migration-handler.ts`에는 raw import와 orderedMigrationStatements 입력이 없다. 실제 quality 로그에서 `tests/migration-preflight-handler.test.mjs:74`가 “Production migration 원문을 모두 확인하지 못했습니다.”로 실패한다. 목록과 실제 실행 SQL을 함께 등록해야 한다.

### P1 — 카테고리 제약을 그대로 합치면 게시글/배포가 깨짐
현재 로컬 `017_community_categories.sql`은 general/place/review/tips/together만 허용한다. #633의 별도 017은 travel-talk만 추가하고 tips/together를 제외한다. #642의 018도 general/place/review/travel-talk/field-report만 허용한다. DB에 tips/together 행이 하나라도 있으면 새 제약 VALIDATE가 실패한다. 그 행이 없어도 기존 시안 탭의 글쓰기가 실패한다.

이 저장소의 migration handler는 매 배포 전체 SQL 체인을 다시 실행한다. 그러므로 **맨 마지막 SQL만 superset으로 고치는 것으로 충분하지 않다**. 중간 017도 기존 모든 카테고리 행을 수용해야 한다. 017 이름 중복을 구분하고, 적용 순서·raw import·레지스트리·부트스트랩 CREATE/ALTER·TS union·검증·UI 탭을 같은 category 집합으로 맞춰야 한다. 현재 두 017은 아직 배포되지 않았다는 전제는 배포 담당이 다시 확인해야 한다.

### P1 — #638 성공한 쓰레기통 마커가 선택 도중 제거됨
`useFacilityLayers.ts` 새 공식요청은 controllers에 넣은 AbortController를 성공/실패 settle 후 제거하지 않는다. `cancelFacilityRequests`는 controllers의 모든 key를 loading으로 간주하여 failFacilityLayer를 호출한다. `useRouteMapController.ts`는 패널을 바꾸는 모든 경로에서 이를 부르므로 완료된 레이어도 실패로 되돌려 핀을 지운다. CI `trash-bin.spec.ts:36`은 카드 내용 표시까지 성공한 뒤 같은 marker.boundingBox를 찾지 못해 timeout한다.

같은 generation의 controller만 settle/finally에서 정리하고, 취소 함수는 실제 loading 상태만 정리해야 한다. 핀 클릭 → 정보 카드 → 닫기 → 다른 레이어를 추가해도 완료 마커가 유지되는 회귀가 필요하다.

### P1 통합 차단 — 4개 공식 지도 레이어 훅은 서로 교체하면 안 됨
620/625/629/638은 모두 `constants.ts`, `useFacilityLayers.ts`, `FacilityLayerPanel.tsx` 같은 한 개의 공식 데이터 분기를 각자 구현한다. 단순 ours/theirs 선택은 다른 3개 레이어를 지운다. 620은 TAGO stops/routes 계약, 625는 여성용품 items, 629는 kind=no-smoking, 638은 kind/locationNote items라 공통 타입 하나를 억지로 쓰면 응답 해석도 틀린다. **layer.id별 adapter + 공통 취소/generation/상태/마커 상한 경계**로 통합 권장.

### P2 — #638 encoded key를 다시 인코딩
`fetchTrashBinData`의 URLSearchParams.set('serviceKey', TOUR_API_SERVICE_KEY_ENCODED)는 이름/기존 다른 제공처 경로 기준 이미 percent-encoded key를 받는다. %2B가 %252B로 변한다. raw 또는 encoded key를 1회만 인코딩하도록 기존 제공처 함수와 같은 처리를 재사용하고 테스트해야 한다. 실제 운영 endpoint가 아직 없으므로 현재 prod 실패로 확정하지는 않는다.

### P2 — #620 제공처 장애가 빈 결과로 바뀜
기초 정류장 조회는 status를 검사하지만 각 정류장의 후속 조회는 null을 {}로 바꾸고 바로 lowFloorArrivalMarkers로 넘긴다. 4개 도착 조회가 모두 실패해도 “현재 확인된 저상버스 없음”이 된다. 전부 실패/부분 실패/정상이나 미확인 차량을 구분해야 한다.

### P2 — #642 후기 실패 복구 및 기능 플래그
PlaceCommunityStories는 플래그와 무관하게 일반 목록과 field-report 목록을 Promise.all로 요청한다. off 환경에서도 매번 불필요한 404가 발생하고 기존 1회 retry가 2회 요청으로 바뀐다. report 요청이 늦으면 일반 후기 실패도 기다리게 된다. 서버에서 enabled 값을 전달하거나 공용 응답 metadata로 기능 여부를 알려 조건부 요청하고, 두 목록의 오류/로딩을 독립시키는 것이 좋다. 일반 page limit 3 후 field-report를 걸러내면 실제 후기가 밀려 사라질 수 있으므로 서버 필터/쿼리도 분리해야 한다.

### P2 — #641 음원 공개 전 observer 수명 수정
AvailableRegionSoundPlayer는 초기 allowed=false로 null을 렌더링한다. IntersectionObserver effect는 [source, stop]만 의존하여 root.current가 null일 때 실행되고, allowed가 true가 되어 root가 생겨도 다시 관찰하지 않는다. 현재 registry가 비어 영향은 없으나 음원 공개 전에 allowed/root mount와 observer 수명을 연결해야 한다.

## CI 실패의 분류와 근거

- #633 run 35499881388: 실제 migration handler 소스 수 불일치.
- #625 run 35499041630: provider-budget-inventory가 sanitary-supply.ts 신규 전송 파일 미등록 검출. provider boundary 함수는 사용하지만 inventory도 추가해야 한다.
- #639 run 35500748310: production-hardening.test.mjs의 랜딩 컴포넌트 정확 목록에 LandingFeatureList가 없다. 새 소개 구성에 맞춰 고정 배열 기대 대신 구조·핵심 경계 검증을 유지한다.
- #620/#625/#638: facility-layers.spec.ts:134의 “공식 데이터가 0개” 기대가 새 레이어 등록과 충돌. #629가 이미 관련 E2E를 수정하므로 모든 레이어를 반영한 한번의 의미 검증으로 합친다.
- #624 run 35498927044: mobile-touch-targets.spec.ts:57은 버튼/링크 수 6을 기대하지만 체크리스트 링크 4개가 추가되어 10. 44px 검사는 모든 실제 링크에 유지한다.
- #631 run 35499521000: device-location-privacy에서 추가 URL은 localhost/features/planner/components/TripBoardView.tsx. API/외부전송/요청body 검증은 유지하고 JS 모듈 로드는 개인정보 전송으로 세지 않는다.
- #624 parking-alternatives privacy 실패는 총 요청 수가 340→341. 실제 추가 URL을 좁혀 본 뒤에만 테스트 필터 조정한다. 이 검토에서 모든 추가 요청 내용을 확정하지 않았다.
- #637 run 35500499062: closing brand-meaning 한국어 문구 dark 대비 1.39.
- #630 run 35499502262: simple-region-link 이미지가 카드보다 44px 또는104.89px 작음, 밝은 화면 지역명/사진제목 대비1.
- #640 run 35500978626: 지역 링크 중앙 hit test 및 click timeout 다수. 카드 culture aside 추가 후 실제 링크 영역 가림.
- #642 run 35501496566: recommendation-language retry calls expected2/received4, invalid result 시8초 후에도 loading. 단순 호출수 기대 변경만으로 끝내면 오류대기 회귀가 남는다.
- #622 run 35498750514: landing-regions 1440px 링크 중앙 hit test 실패. 변경 범위 밖이지만 최종 소개 디자인에서 다시 검증해야 한다.
- #620 crowd-shortcut의 .impact-response h3 focus timeout은 별도 재현 필요. 현재 diff만으로 cause 확정 불가.

## 권장 통합 순서

한 통합 브랜치에서 각 PR의 의도를 보존하는 작은 커밋으로 정리하고 최종 tree에 전체 CI를 한 번 수행한다. 원 PR과 통합 커밋을 정확히 매핑하며, 실패한 원 PR의 validate를 우회해 직접 병합하지 않는다. 원 PR을 각각 병합해야 한다면 먼저 통합 수정이 반영된 최신 기준으로 재검증해야 하므로 CI 반복 비용이 더 크다.

1. 621 → 622 → 623 현장 문의/음성.
2. 624 → 635 → 636 출발 준비/날씨. assistant safetyRules의 두 변경을 합친다.
3. 627 → 628 → 631 → 632 → 634 여행집/당일 기록. 628은627 기반 stacked PR.
4. 620 → 625 → 629 → 638 지도 공식 레이어. 훅을 adapter 구조로 한 번 통합하고 provider inventory/상태/취소를 같이 검증한다.
5. 633 → 642 커뮤니티. 로컬 tips/together와 SQL superset을 먼저 확정.
6. 637 → 639 → 630 → 640 → 641 소개. 최신 사용자의 Design B 시안/카피가 우선이며 기존 소개 문구를 그대로 덮어쓰지 않는다. 공식 지역·문화 출처와 기존 기능 연결은 새 카드에 보존한다.

635·641은 승인된 콘텐츠가 각각 0개라 현재 화면에 나타나지 않는 계약 구현이다. 625·638은 운영 endpoint 미확인,629는 해당공공API 승인 미확인이므로 UI/코드 병합과 실제 데이터 운영완료를 구분해 보고해야 한다. 공개되지 않은 음원/제도/좌표를 임의로 만들어 채우지 않는다.

검토는 원 PR SHA 기준 정적 독립 리뷰이며 통합본 실행/실제 제공처/Production 검증은 아직 수행하지 않았다.

## 사용자 진입점과 노출 조건

| PR | 진입점 | 노출 조건/남은 연결 |
|---|---|---|
| 620 | planner → 지도 → 편의 표시 → 현재 확인된 저상버스 | 노출; 기존TAGO응답에 명시된 차량만 핀 |
| 621 | 장소 상세 → 입구 미리보기 → 문의 카드/현장에서 화면 요청 | 노출 |
| 622 | 장소 상세 → 시설 미리보기/방문전 문의 → 무인주문·직원주문 | 노출 |
| 623 | 현장 의사소통판 → 직원 답변 → 말한 내용을 글자로 보기 | SpeechRecognition 지원 브라우저에서만 노출 |
| 624 | planner → 출발 전 확인 → 여행 대비 확인 4항목 | 노출 |
| 625 | 지도 → 편의 표시 → 여성용품 / 화장실 대안 안내 | 노출하지만 SANITARY_SUPPLY_API_URL 없으면 실제 결과 없음/오류 |
| 627 | 여행집 → 내 여행 취향 정리 | 정상 로컬 여행2개이상일 때 노출 |
| 628 | 여행집 → 카드비교선택 → 선택한 여행2개비교 | 여행2개이상일 때노출 |
| 629 | 지도 → 편의 표시 → 금연 구역 | 노출하지만 실제데이터 API 활용승인 확인전 |
| 630 | 소개 지역카드/설계 지역찾기 → 이 지역들 먼저 보기 | 노출, 선택재정렬 |
| 631 | 여행 중 안내 → 기본 보기 → 전체 보기 | 일정있을때노출 |
| 632 | 여행집 → 경남 지역 기록 | 기기 내 직접 완료기록으로 파생; 18지역표시 |
| 633 | 커뮤니티 글쓰기 category → 여행 이야기와 질문 | 새디자인 수동탭배열에도 travel-talk를 통합해야함 |
| 634 | 여행집 → 이 지역 상품 보기 | visited 책의 경남 city가 있을때 공식몰링크 |
| 635 | 출발 전 확인 → 동행 도움이 필요하다면 | registry=[]이므로 현재진입점없음(계약만) |
| 636 | 추천장소/날씨화면 → 날씨+장소설명 안내 | 예보와공식indoor조건이맞을때만노출 |
| 637 | 서비스소개 hero/closing 및 guide | 정적문구 |
| 638 | 지도 → 편의 표시 → 쓰레기통 | 노출하지만 WASTE_BIN_API_URL 없으면실제결과없음/오류 |
| 639 | 서비스소개 → WAVE로 할 수 있는 일8카드 | 노출; 최신DesignB와구성통합필요 |
| 640 | 서비스소개 → 해당지역카드 → 문화이야기 | 6지역만노출 |
| 641 | 서비스소개 → 지역소리재생 | registry=[]이므로 현재진입점없음(계약만) |
| 642 | 커뮤니티 → 현장에서확인한정보 / 장소상세 | WAVE_FIELD_REPORT_BOARD=enabled일때; 현재기본off |


## 검토 SHA와 원 커밋

원 PR diff는 아래 head SHA 기준이다. #628만 #627의 head를 base로 한다. 나머지는 c019af6acc7b4ce2ca098807c4b24c7e2fdfbf8b의 main 기준이다.

| PR | Head SHA | 원 PR 커밋(순서) |
|---|---|---|
| #620 | `e9ecafe7208ba26cf60a0e08c6962149ab7572bc` | `e9ecafe7208ba26cf60a0e08c6962149ab7572bc` |
| #621 | `f8492086e6a6566a89ef7b532d6c204ee5cf77b3` | `c488453a6faa9e805bac5e4be6a001670513938d` → `f8492086e6a6566a89ef7b532d6c204ee5cf77b3` |
| #622 | `5bc08a43399abb06c2f7dd62f8b130473ad66186` | `5bc08a43399abb06c2f7dd62f8b130473ad66186` |
| #623 | `ebf13d84db64b51008d94bb8ba7502fc64b28b7b` | `1adbb22bf899570011408c9681b4853559f45d68` → `ebf13d84db64b51008d94bb8ba7502fc64b28b7b` |
| #624 | `2cc0c923de5a0bdfa8fb7da686bc9436dbc38dc0` | `cb0672892a1b7f49eef044c29394312e1cb695c7` → `2cc0c923de5a0bdfa8fb7da686bc9436dbc38dc0` |
| #625 | `734fe320376f4a1381cdf675c3d1a1ad98d993a8` | `734fe320376f4a1381cdf675c3d1a1ad98d993a8` |
| #627 | `10fd8de79025292eb9e1d53a6bfe07c7dbb8b64d` | `10fd8de79025292eb9e1d53a6bfe07c7dbb8b64d` |
| #628 | `799d28350a26f00ec9b905dd8c51387bcca1a9fd` | `799d28350a26f00ec9b905dd8c51387bcca1a9fd` |
| #629 | `5a5604a776c2744bc4c3c76433ee1541a3978835` | `c5868301dac96b4cf8142166d6ca1bfd2ab6cab0` → `5a5604a776c2744bc4c3c76433ee1541a3978835` |
| #630 | `cb60a48af8d5062f11db309c946c1b18df0b4eef` | `c58919465df279717e73888840dee4b311b1f739` → `cb60a48af8d5062f11db309c946c1b18df0b4eef` |
| #631 | `13ce61e41cb30121f886c557986e041482fc65f4` | `13ce61e41cb30121f886c557986e041482fc65f4` |
| #632 | `9498d935fefdb5b91cb84dc6032032f62004bc0d` | `9498d935fefdb5b91cb84dc6032032f62004bc0d` |
| #633 | `7e80a55c3c1caf01875141c359570239443d21a4` | `7e80a55c3c1caf01875141c359570239443d21a4` |
| #634 | `3e3c4ffd4d1b5f45c63612c97933cdfa1ebfbba7` | `3e3c4ffd4d1b5f45c63612c97933cdfa1ebfbba7` |
| #635 | `c5f12d86ac5dff9fad9712a5c9778ef9f1c029d8` | `1bf846f36d5c53c5eef9948bebb374f6a267ca01` → `c5f12d86ac5dff9fad9712a5c9778ef9f1c029d8` |
| #636 | `809a00ee4a8b47486f2bb88ca8efec0950f75c3a` | `809a00ee4a8b47486f2bb88ca8efec0950f75c3a` |
| #637 | `201bf85c1700c01caa8d526836f857264d25ab81` | `201bf85c1700c01caa8d526836f857264d25ab81` |
| #638 | `c7a9ca43acf92deb720f5c90ff09881202231ec4` | `c7a9ca43acf92deb720f5c90ff09881202231ec4` |
| #639 | `ec75833c2089f977be12be95816741a3152190bf` | `ec75833c2089f977be12be95816741a3152190bf` |
| #640 | `a5f1b89b8fc80e8e3d8784fcb91c4f805f7b9140` | `a5f1b89b8fc80e8e3d8784fcb91c4f805f7b9140` |
| #641 | `3d7decf87e5c265bdedd36a5dc8d822e70d069cb` | `3d7decf87e5c265bdedd36a5dc8d822e70d069cb` |
| #642 | `73e80e109cb5a5c4e8526c8a08ac5d0d06a2b2c1` | `73e80e109cb5a5c4e8526c8a08ac5d0d06a2b2c1` |
