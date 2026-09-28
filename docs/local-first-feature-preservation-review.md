# 로컬 우선 통합: 제출 기능 보존 독립 검토

상태: 변경 영향에 한정한 읽기 검토. **79개 요구의 전수 실행 통과 또는 출시 승인을 뜻하지 않는다.**

## 검토 기준과 결론

- 비교 기준: main `db3d202` → 검토 시 HEAD `61f45c935d0b6fd887b08f1de55c5487894c1025` 및 당시 작업 트리. 통합 중인 파일은 이후 달라질 수 있다.
- 디자인 우선순위: Owner가 확인한 로컬 `0388daa` 및 이후 명시 요청. 백업 `backup/owner-local-20260929`. 제출 기능의 진입·행동·상태 보존은 별도 조건이다.
- 원문: `harness/submission-pages.json` 31쪽과 `harness/features.json` 79개 요구. 추출본 SHA-256 `d04f0eec02b18bee5b46f0853c2100fba143c9f6da4654665a6d7667a644442e`는 features.source와 일치한다. 이 검토에서 PDF·Notion 원본을 다시 조회하지는 않았다. 그 대조 기록은 `docs/integration-local-first-20260929.md`에 있다.
- 범위: 변경된 진입·표현·포털·상세·일정 계산을 제출 약속과 대조했다. 외부 제공처 전체, 계정 보안 전체, 변경 없는 알고리즘 전체를 새로 감사하지 않았다. 소스와 검사는 수정하거나 재실행하지 않았다.

이 범위에서는 **남아 있는 P0/P1 제출 기능 삭제를 확인하지 못했다.** 이는 미실행 항목의 통과 판정이 아니다. 전체 감사에서 새 실패가 발생하면 구형 문구/구조 가정과 실제 행동 실패를 분리해야 한다. 연결된 검사 파일이 존재하거나 28개 도구가 열린다는 사실만으로 모든 요구를 통과 처리해서는 안 된다.

## 삭제된 표현과 유지된 행동의 대조

| 변경 | 원문·Owner 기준 | 현재 진입과 보존 판단 |
|---|---|---|
| 목록/격자 전환 제거 | p6: “실제 관광 사진을 격자 또는 목록으로 비교하고 상세 확인과 일정 담기로 이어갑니다.” Owner는 목록 제거·격자 유지를 명시했다. | `RecommendationWorkspace`는 격자로 사진·장소·시설 근거를 비교하고 상세·담기·더보기로 이어진다. 원문은 두 보기 방식 동시 제공이나 전환 버튼을 요구하지 않는다. 하네스가 이를 “격자·목록” 모두로 강제하던 부분은 더 강한 해석이었다. |
| PR760 축약 상세 대신 전체 상세 | p8·20·26의 편의 근거, 문의, 음성·대본과 p22의 방문 정보가 필요하다. | `app/planner/page.tsx`의 `inspectPlace`는 나루를 닫지 않고 `PlaceDecisionDialog`를 연다. `PlaceDecisionContent`의 기본정보·이용과 편의·후기, 문의/현장 대화/도움, 해설, 시설 제보, 담기를 유지한다. ID별 최신 evidence를 표시와 담기 모두에 사용한다. 축약 상세의 기능 누락을 그대로 수용하지 않았다. |
| 탭·도구 이름 및 나루 사이드바 단순화 | p10: 대화·도구·저장 영역과 같은 여행 상태로 돌아오는 흐름. | 이름은 `직접 골라서 하기`·`저장한 여행`으로 바뀌었다. `전체`와 검색에 28개 도구가 남아 있다. 안정된 portal host를 이동하며 입력을 재생성하지 않고, 전체 상세는 위에 겹쳐 열린다. 첫 목적 카드에는 지역·날짜·동행 요청 폼이 복구되어 있다. |
| 중복 체류·다음 장소 문구 제거 | Owner는 카드의 도착 표시를 이동만 계산하도록 요청. p14–15는 실제 체류·휴식·고정 방문 시간표를 약속한다. | 일정 계산의 기존 `arrivesAt`/`startsAt`/`endsAt`은 유지하고 `movementArrivesAt`을 추가했다. 카드에는 `이동 기준 도착`, 별도 `방문 시간표`에는 실제 관람·휴식이 나온다. StopEditor와 운영시간 충돌·저장·캘린더는 실제 방문 시간표를 쓴다. 두 시각을 같은 뜻으로 보고 교체하면 안 된다. |
| 이용시간·해설 펼치기/반복 재시도 버튼 축소 | Owner는 카드 선택 후 즉시 표시를 요청. p8·18은 없음과 실패 구분, 확인 경로를 요구한다. | 상세를 열면 이용시간/해설 조회가 시작된다. `시간 정보 없음`과 `시간 확인 불가`는 구분된다. 다른 일정/도구의 조회·재시도와 문의 경로는 남아 있다. 이 검토는 실제 제공처 오류의 모든 복구 경우까지 실행하지 않았다. |
| 문의 기능의 교차 버튼 제거 | p20: 질문 작성·검토·직원에게 보여주기·답변 수신. | `PlaceInquiryCard`의 방문 전 문의/현장 화면 대화/도움 요청으로 목적별 진입한다. 복사·이미지 저장·큰 글씨·회전·직원 답변과 입력은 유지된다. 목적별 진입이 달라진 것을 기능 삭제로 간주하지 않는다. |
| `사진으로 코스 찾기` 저장 카드 버튼 제거 | Owner가 제출본 명시 여부를 확인 후 제거 요청. p26 PhotoGallery 조회와 일정 복원은 서로 다른 기능이다. | 이 개별 버튼은 원문 필수 약속이 아니다. 나루 사진 입력은 유지되고 `/photo-course`의 `사진으로 여행 찾기` 진입도 여행 보관함 하단에 남아 있다. 공식 사진 조회·오디오 자료를 함께 제거하지 않았다. |
| 반복 정책·날짜 미정·시연 안내·장식 사진 제거 | Owner의 명시적인 정보 축소 요청. p8·22의 근거 구분은 필요하다. | 공식 근거 상태/출처·조회 시각과 후기 영역은 구분되어 있으며 `정보 이용 안내`와 운영정책에 설명이 모여 있다. 날짜가 없는 경우 가짜 날짜를 만들지 않는다. 지역 체크의 개발용 3지역 예시는 실방문 데이터의 증거가 아니다. |
| 랜딩 사진 확대/예시 적용, 축제 하단 장식 카드 제거 | 제출본은 여행 탐색·실제 일정 담기·축제 방문일 선택을 요구한다. | 실제 탐색·나루·축제 상세/방문일 연결은 남아 있다. 삭제된 랜딩 데모 조작과 실제 일정 기능을 혼동하지 않는다. 예시 여행 데이터가 없을 때 숨기는 동작은 실 API 성공의 대체가 아니다. |

주요 읽기 대상: `features/planner/components/{PlannerAssistant,PlannerToolSurface,PlaceDecisionDialog,PlaceDecisionContent,PlaceEvidenceSummary,PlaceInquiryCard,PlaceAudioGuide,VisitHoursCard,PlannerItineraryBoard,StopEditor,RecommendationWorkspace,NaruJourneyProposal,NaruPlaceTools}.tsx`, `features/planner/optimization/itinerary-schedule.js`, `app/planner/page.tsx`, `app/travel-book/page.tsx`, `features/trips/components/{TravelProfileSummary,RegionRecordList}.tsx`.

## 실제 실행 근거의 범위

이번 문서 작성에서는 검사를 실행하지 않았다. 같은 독립 QA 담당자가 바로 앞 단계에서 실행한 다음 결과만 재사용한다. 모두 합성 fixture 기반 Chromium이며 실제 휴대전화·화면낭독기·제공처 응답 검증과 다르다.

- **B78**: 8개 spec의 기존 38개 시나리오를 desktop/mobile 양쪽으로 실행한 76개 + 1920·2560px desktop 2개 = 고유 78개 통과. 대상은 `naru-help-hub`, `naru-keyboard-layout`, `naru-workspace-visual`, `review-select`, `readiness-pointer-focus`, `service-diagnostics-loading`, `naru-tool-migration`, `planner-conversation`이다. 28개 도구 진입·복귀, 대화/입력 유지, 도움 선택, 내부 지도/날짜 진입, 진행 되돌리기, 200% 글자·측정 키보드·사진 입력 접근성 등을 확인했다. QHD 2개를 mobile까지 실행한 것으로 세지 않는다.
- **B66(앞선 단계)**: `naru-workspace`, `naru-tool-completion`, `submission-ui-completion`, `naru-trip-upgrade`의 33개 시나리오 × 2기기. 준비 요청·적용/되돌리기·저장·전체 상세·도구 작업 연결의 한정된 합성 사례다. 이후 소스 수정이 있는 최종 후보 전체의 통과를 보장하지 않는다.
- **B16(앞선 단계)**: onsite-communication/speech의 14개 및 해당 현장 흐름 위치 프라이버시 2개. 목적별 복귀, 복사·이미지·답변·오프라인·입력 보존을 확인했다.
- 관련 단위 60개는 앞선 독립 QA에서 지도 키보드·선택/초안·합성 GPS 제외·viewport/오래된 요청 보호 등을 검증했다. 이 문서의 79개 요구를 모두 대표하지 않는다.

B78 로그: `tmp/agent-naru-remaining-desktop.log`, `tmp/agent-naru-other-desktop.log`, `tmp/agent-naru-next-desktop.log`, `tmp/agent-naru-final-desktop.log`, `tmp/agent-naru-remaining-mobile.log`, `tmp/agent-naru-pending-fixed.log`, `tmp/agent-naru-map-fixed.log`, `tmp/agent-keyboard-second-fixed.log`, `tmp/agent-keyboard-flow.log`, `tmp/agent-keyboard-mobile-final.log`, `tmp/agent-naru-qhd.log`. 초기 실패 로그도 그대로 남아 있다. 고유 시나리오 기준으로 후속 통과를 대조했으며 각 로그의 passed 숫자를 단순 합산한 값이 아니다. 첫 실행의 실제 키보드 글자 잘림/짧은 화면 CSS/지도 진입 오류는 소스 수정 후 영향 범위에서 다시 통과했다. trace HTML 감시로 인한 HMR 실패는 제품 기능 통과/실패와 따로 분류했다.

B66 로그: `tmp/agent-desktop.log`, `tmp/agent-mobile.log`, `tmp/agent-affected.log`. B16 로그: `tmp/agent-onsite.log`, `tmp/agent-onsite-privacy.log`. 로그·화면 파일은 로컬 근거이며 정식 evidence 등록이나 최종 커밋 Release Audit을 대신하지 않는다.

## 79개 요구별 영향과 남은 확인

표의 `S`는 소스/원문 대조, `U`는 이 범위에서 실행하지 않음, `B`는 위 합성 검사에서 해당 행동의 일부를 실제 확인했다는 뜻이다. **어느 표시도 해당 요구 전체의 PASS를 의미하지 않는다.** `B78 진입`만 있는 도구는 열기·왕복의 증거이며 도구별 계산/API/파일/권한까지 증명하지 않는다. 마지막 열은 features.json에 이미 연결된 후속 검사 경로이며, 파일 존재 자체는 실행 근거가 아니다.

| 요구 ID / 쪽 | 변경 영향·유지 경로 | 실제 확인 범위 | 남은 범위 / 기존 검사 |
|---|---|---|---|
| `spec-integrity` / 1,2,3,4,31 | 소개·내비게이션·데모 표현 재배치; 핵심 탐색→일정→저장 경로 유지 | S: 원문·추출본 해시; B78: 나루 경로 일부 | 공개 URL·원본 대표 이미지·최종 Production 전체<br>`tests/presentation-release.test.mjs`<br>`e2e/public-presentation-release.spec.ts`<br>`e2e/service-story.spec.ts` |
| `region-exploration` / 5,6 | 18개 지역 탐색과 나루 조건 연결, 카드 재배치 | S; B78: 지역/도구 선택 일부 | 18개 지역 및 포함·제외·지연 응답 전수<br>`tests/region-plan-reset.test.mjs`<br>`tests/assistant-origin-grounding.test.mjs`<br>`e2e/region-change-boundary.spec.ts`<br>`e2e/landing-regions.spec.ts` |
| `facility-selection` / 5,6,19,31 | 맞춤 도움 opt-in, 조건 도구는 같은 선택 상태 사용 | S; B78: 도움 선택/재열기; B66: 조건 작업 | 모든 시설 조합·빈 결과·지연 요청<br>`tests/facility-selection.test.mjs`<br>`tests/plan-response-integrity.test.mjs`<br>`e2e/condition-prerequisites.spec.ts`<br>`e2e/plan-request-failure.spec.ts` |
| `place-comparison` / 4,6,9 | 격자 유지; 사진·근거→전체 상세→담기 | S: p6 또는 해석; B66: 상세/담기 일부 | 최종 사진/시설 비교와 더보기·모바일 전체<br>`e2e/place-view-modes.spec.ts`<br>`e2e/place-content-loading.spec.ts`<br>`e2e/place-detail-decision.spec.ts` |
| `official-place-identity` / 7,17 | 최신 evidence를 동일 장소 ID에 연결 | S; B66: 동일 상세 진입 일부 | 실제 검색 후보 확정·좌표/ID/저장 복원 연속성<br>`tests/location-official-identity.test.mjs`<br>`tests/place-identity.test.mjs`<br>`e2e/place-search-identity.spec.ts`<br>`e2e/place-identity-continuity.spec.ts` |
| `facility-evidence` / 5,8,19,31 | 반복 정책 문구 이동; 상태·출처·담기 조건 유지 | S: 전체 상세/시설 근거 | 최종 실응답의 있음/없음/미확인/오류 및 최신성<br>`tests/facility-evidence-api.test.mjs`<br>`tests/facility-evidence-text.test.mjs`<br>`e2e/facility-evidence.spec.ts`<br>`e2e/evidence-truthfulness.spec.ts` |
| `responsive-journey` / 9,31 | 나루 폭·키보드·글자 확대 및 페이지 CSS 변경 | B78: 두 기기, 200%, 키보드, desktop FHD/QHD | 나루 외 페이지 전체·실기기<br>`e2e/planner-workspace-responsive.spec.ts`<br>`e2e/naru-keyboard-layout.spec.ts`<br>`e2e/mobile-design-b.spec.ts`<br>`e2e/community-density.spec.ts` |
| `naru-workspace` / 10,31 | 친숙한 이름·목적 카드·stable portal·전체 상세 | B78/B66: 도구·대화·초안·왕복 | 최종 후보의 장기 세션·실계정<br>`tests/naru-workspaces.test.mjs`<br>`e2e/naru-workspace.spec.ts`<br>`e2e/simple-naru-conversation.spec.ts` |
| `naru-grounded-request` / 11,12,30 | 첫 목적 카드에서 지역·날짜·동행 요청 폼 복구 | B66: 요청/제안 합성; B78: 진입/오류 복구 | 실제 로컬 모델의 근거/제약 응답<br>`tests/assistant-grounding.test.mjs`<br>`tests/naru-journey.test.mjs`<br>`e2e/naru-trip-upgrade.spec.ts` |
| `naru-apply-undo` / 12,30,31 | 기존 제안 적용/되돌리기 연결과 상태 유지 | B66: 적용/되돌리기; B78: 진행 되돌리기 일부 | 모든 제약 조합·실모델 제안<br>`tests/naru-journey.test.mjs`<br>`tests/trip-command.test.mjs`<br>`e2e/naru-trip-upgrade.spec.ts`<br>`e2e/naru-workspace.spec.ts` |
| `naru-gentle-adjustment` / 13,15,31 | 조정안은 실제 선택·체류/휴식 조건 유지 | S; B66: 합성 조정안 일부 | 고정/축제/동행 조건 조합 전수<br>`tests/naru-gentle-plan.test.mjs`<br>`e2e/naru-trip-review.spec.ts`<br>`e2e/naru-trip-upgrade.spec.ts` |
| `itinerary-map` / 14 | 이동 표시 별도 필드, 실제 방문 시간표·수정·지도 유지 | S; B78: 내부 지도/도구 이동 | 최종 시간 산술·내보내기 일치·모든 정렬/삭제<br>`tests/itinerary-schedule.test.mjs`<br>`tests/itinerary-legs.test.mjs`<br>`e2e/itinerary-route-sync.spec.ts`<br>`e2e/itinerary-edit-controls.spec.ts` |
| `fixed-time-conflicts` / 15 | 실제 시작/종료·기다림/지각 계산 유지 | S | 고정·빈 날짜·자정 초과·겹침 최종 실행<br>`tests/trip-time-constraints.test.mjs`<br>`e2e/trip-timing-confirmation.spec.ts`<br>`e2e/fixed-time-plan.spec.ts` |
| `visit-hours-conflicts` / 15,18 | 상세 자동 조회, 일정은 실제 방문 시각으로 판정 | S | 실운영시간·휴무·자정·오류/재조회<br>`tests/visit-hours.test.mjs`<br>`tests/trip-timing-hours.test.mjs`<br>`e2e/visit-hours.spec.ts`<br>`e2e/trip-timing-hours.spec.ts` |
| `festival-dates` / 4,5,16 | 장식 카드 제거; 축제 상세/방문일 연결 유지 | S | 실축제 기간·반영/취소·기존 일정 보호<br>`tests/festival-visit-confirmation.test.mjs`<br>`tests/festival-source-endpoint.test.mjs`<br>`e2e/festival-trip-upgrade.spec.ts` |
| `origin-route` / 17,29 | 실출발지명 표시와 출발지/목적지 행동 유지 | S; B78: 내부 지도 진입 | 실 Kakao/ODsay와 사용자 원점·정확도<br>`tests/place-coordinate-restoration.test.mjs`<br>`tests/route-coordinate-sinks.test.mjs`<br>`e2e/device-location-privacy.spec.ts`<br>`e2e/transport-evidence.spec.ts` |
| `departure-readiness` / 18,31 | 나루 점검 도구로 이동, 상태/다음 행동 유지 | B78: 체크·상세 왕복·초점 유지 | 실날씨/운영시간/편의 지연·오류 전수<br>`tests/departure-readiness.test.mjs`<br>`e2e/departure-readiness.spec.ts`<br>`e2e/naru-tool-migration.spec.ts` |
| `facility-alternatives` / 19 | 기존 대체 장소·조건 유지 연결 | S; B66: 도구 적용 일부 | 실대안 없을 때 보존·제약별 대체<br>`tests/trip-alternatives.test.mjs`<br>`tests/naru-unchanged.test.mjs`<br>`e2e/trip-alternatives.spec.ts`<br>`e2e/naru-evidence.spec.ts` |
| `onsite-inquiry` / 20 | 목적별 3진입; 문의/화면 대화/도움 기능 유지 | B16: 복사/이미지/답변/오프라인; S | 실기기 이미지 저장·회전·접근성<br>`tests/onsite-communication.test.mjs`<br>`e2e/onsite-communication.spec.ts`<br>`e2e/place-inquiry.spec.ts` |
| `offline-files` / 21 | 저장/파일 도구 진입 유지 | S; B78 진입; B16 현장 오프라인 일부 | 여행 파일 복원/내보내기와 지도 오프라인 전체<br>`tests/trip-recovery.test.mjs`<br>`e2e/restored-trip-export.spec.ts`<br>`e2e/map-export-recovery.spec.ts` |
| `calendar-export` / 21,24 | 실제 방문 시간표 사용, 별도 캘린더 진입 | S; B78 진입 | 다운로드 ICS 내용·중복·실캘린더 가져오기<br>`tests/live-share.test.mjs`<br>`e2e/restored-trip-export.spec.ts`<br>`e2e/simple-live-share.spec.ts` |
| `community-discovery` / 22 | 카드/글 UI 정리, 탐색·연계 유지 | S; 앞선 단위 보호 계약 | 최종 공개 목록·검색·실연계<br>`tests/community-search.test.mjs`<br>`tests/community-list-order.test.mjs`<br>`e2e/community-browse-recovery.spec.ts`<br>`e2e/community-demo-labels.spec.ts` |
| `community-participation` / 22 | 745 댓글/제보·감각 지도 조작 채택 | S; 앞선 단위 선택/제보 계약 | 실인증 작성·댓글·신고·삭제 전수<br>`tests/auth-community.test.mjs`<br>`tests/community-comment-draft.test.mjs`<br>`e2e/community-report-feedback.spec.ts`<br>`e2e/submission-auth-state.spec.ts` |
| `community-bookmarks` / 22 | 레이아웃 변경, 북마크 모델 삭제 없음 | S/U | 실사용자 북마크 저장/동기화<br>`tests/community-bookmarks.test.mjs`<br>`e2e/community-bookmarks.spec.ts` |
| `anonymous-account` / 23,31 | 로그인/회원가입 사진·미리보기 문구 제거 | S; B66: 합성 저장 진입 일부 | 실가입/로그인/탈퇴·권한·인증 지연 전체<br>`tests/auth-route-boundary.test.mjs`<br>`tests/account-lifecycle.test.mjs`<br>`e2e/auth-hydration.spec.ts`<br>`e2e/account-lifecycle.spec.ts` |
| `trip-save-restore` / 23,30 | 저장 카드 축소; 일정 열기/메모/삭제·가져오기 유지 | S; B66: 저장 일부; B78: 저장 UI | 실기기 vs 실계정 저장/복원·충돌·실패<br>`tests/account-travel.test.mjs`<br>`tests/travel-write-ownership.test.mjs`<br>`e2e/account-travel.spec.ts`<br>`e2e/travel-book.spec.ts` |
| `public-share-consent` / 24,30 | 나루 내부 공유 진입; 자동 공개 생성은 추가 안 함 | S; B66/B78 진입 | 실공유 동의·만료·해제·스냅샷<br>`tests/live-share.test.mjs`<br>`e2e/simple-live-share.spec.ts`<br>`e2e/shared-trip-snapshot.spec.ts` |
| `public-share-privacy` / 24,30 | 공유 권한/API 경계 소스 변경 없음 | S; B16: 현장 위치 권한 일부 | 공유 payload·정밀 위치/개인정보·소유자 전수<br>`tests/travel-write-ownership.test.mjs`<br>`tests/live-share.test.mjs`<br>`e2e/device-location-privacy.spec.ts`<br>`e2e/shared-trip-snapshot.spec.ts` |
| `accessible-design` / 9,20,31 | 키보드/포커스/확대/CSS 대비 변경 | B78: 한정된 axe·크기·키보드·200% 행동 | 전체 페이지·실기기·화면낭독기<br>`e2e/accessibility-final.spec.ts`<br>`e2e/touch-target-contract.spec.ts`<br>`e2e/text-scale.spec.ts`<br>`e2e/naru-workspace-visual.spec.ts` |
| `release-usability-latency` / 31 | UI와 Vite tmp 감시 수정, CSS 예산 확대 | S; B78: 화면 행동(성능 실측 대체 아님) | 최종 빌드·실 API 지연·모든 출시 흐름<br>`e2e/performance-boundaries.spec.ts`<br>`e2e/task-first-experience.spec.ts` |
| `kto-01` / 25 | 관광 조회→장소 식별/검색/상세 진입 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/tourism-response-contract.test.mjs`<br>`tests/place-identity.test.mjs`<br>`e2e/place-search-identity.spec.ts` |
| `kto-02` / 25 | 영문 관광 adapter 유지; 영문 공개 UI는 원문 후속 범위 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/tourism-response-contract.test.mjs`<br>`tests/optional-api-activation.test.mjs` |
| `kto-03` / 25 | 공식 편의 근거 표시·필터 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/facility-evidence-api.test.mjs`<br>`tests/facility-selection.test.mjs`<br>`e2e/facility-evidence.spec.ts` |
| `kto-04` / 25 | 추천/코스 도구 진입 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/optional-api-activation.test.mjs`<br>`tests/small-trip.test.mjs`<br>`e2e/small-trip.spec.ts` |
| `kto-05` / 26 | 전체 상세/대본 도구 Odii 해설 진입 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/odii-evidence.test.mjs`<br>`tests/audio-guide-mode.test.mjs`<br>`e2e/region-album-playback.spec.ts` |
| `kto-06` / 26 | PhotoGallery 조회 유지; 삭제한 사진 코스 버튼과 별개 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/spot-photo-match.test.mjs`<br>`tests/official-photo-request-lifecycle.test.mjs`<br>`e2e/photo-course.spec.ts` |
| `kto-07` / 26 | 캠핑 조회 기능 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/optional-api-activation.test.mjs`<br>`tests/tourism-response-contract.test.mjs` |
| `kto-08` / 26 | 공모 사진 조회 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/spot-photo-match.test.mjs`<br>`tests/official-photo-request-lifecycle.test.mjs` |
| `kto-09` / 27 | 반려동물/안내견 관련 조회 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/optional-api-activation.test.mjs`<br>`tests/guide-dog-facility.test.mjs` |
| `kto-10` / 27 | 지역 집계/혼잡 화면 연결 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/regional-statistics-boundary.test.mjs`<br>`tests/crowd-calendar-provider.test.mjs`<br>`e2e/map-crowd-source-date.spec.ts` |
| `kto-11` / 27 | 통계 후보/주변 조회 연결 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/statistical-candidates.test.mjs`<br>`tests/nearby-query-integrity.test.mjs`<br>`e2e/nearby-query-integrity.spec.ts` |
| `kto-12` / 27 | 통계 후보 근거 연결 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/statistical-candidates.test.mjs`<br>`tests/regional-statistics-boundary.test.mjs` |
| `kto-13` / 28 | 혼잡 날짜/지표 연결 유지 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/crowd-calendar-provider.test.mjs`<br>`tests/regional-statistics-boundary.test.mjs`<br>`e2e/map-crowd-source-date.spec.ts` |
| `kto-14` / 28 | 지역 통계 adapter 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/regional-statistics-boundary.test.mjs`<br>`tests/tourism-response-contract.test.mjs` |
| `kto-15` / 28 | 선택형 관광 adapter 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/optional-api-activation.test.mjs`<br>`tests/tourism-response-contract.test.mjs` |
| `kto-16` / 28 | 선택형 관광 adapter 삭제 없음 | S/U: adapter diff 없음; 실응답 실행 안 함 | 최종 후보 실제 요청·시각·상태·화면 연결(HTTP 200/fixture로 대체 금지)<br>`tests/optional-api-activation.test.mjs`<br>`tests/tourism-response-contract.test.mjs` |
| `external-kakao` / 29 | 지도의 표시/viewport·선택 유지 변경; adapter 유지 | S; 앞선 단위 guards; B78 지도 진입 | 실 SDK·경로 응답·실배포 키/도메인<br>`tests/kakao-route-integrity.test.mjs`<br>`tests/kakao-directions.test.mjs`<br>`e2e/kakao-directions-contract.spec.ts`<br>`e2e/map-load-recovery.spec.ts` |
| `external-odsay` / 29 | 교통 도구 포털 진입; adapter 변경 없음 | S; B78 진입 | 실대중교통 provider 응답·환승·없음/오류<br>`tests/odsay-route-integrity.test.mjs`<br>`tests/odsay-response.test.mjs`<br>`e2e/odsay-route-boundary.spec.ts` |
| `external-weather` / 29 | 날씨/점검 카드 연결, provider 변경 없음 | S; B78 진입 | 실기상청 날짜/격자·현재성·오류<br>`tests/weather-integrity.test.mjs`<br>`tests/weather-response.test.mjs`<br>`e2e/weather-language.spec.ts` |
| `restroom-file-data` / 5,30 | 화장실·현장 도구 유지, 개발 시설 예시는 별도 | S; B78 장소별 진입 | 30개/5개 시 원본 출처·좌표·실조회<br>`tests/restroom-source-update.test.mjs`<br>`tests/restroom-alternatives.test.mjs`<br>`e2e/restroom-alternatives.spec.ts` |
| `naru-local-runtime` / 30,31 | 입력/UI 변경, runtime/API 소스 변경 없음 | B78: 합성 429/503 회복; B66 합성 요청 | 실전용 서버·로컬 모델·스트리밍·장애 전환<br>`tests/assistant-actions.test.mjs`<br>`tests/assistant-runtime.test.mjs`<br>`tests/assistant-stream.test.mjs`<br>`e2e/naru-availability-recovery.spec.ts`<br>`e2e/naru-stream.spec.ts` |
| `naru-tool-conditions` / 5,6,10,31 | 이름/배치 변경; 지역/활동 선택 왕복 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/region-plan-reset.test.mjs`<br>`e2e/region-change-boundary.spec.ts` |
| `naru-tool-facilities` / 6,10,31 | 이름/배치 변경; 선택 상태·도움 왕복 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/facility-selection.test.mjs`<br>`e2e/condition-prerequisites.spec.ts` |
| `naru-tool-dates` / 10,14,15,31 | 이름/배치 변경; 날짜 선행조건·입력 초점 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 및 해당 행동 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-date-integrity.test.mjs`<br>`e2e/trip-date-integrity.spec.ts` |
| `naru-tool-places` / 6,7,10,31 | 이름/배치 변경; 탐색·전체 상세 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/plan-response-integrity.test.mjs`<br>`e2e/place-search-identity.spec.ts` |
| `naru-tool-itinerary` / 10,14,15,31 | 이름/배치 변경; 같은 일정 편집 도구 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/itinerary-schedule.test.mjs`<br>`e2e/itinerary-edit-controls.spec.ts` |
| `naru-tool-receipt` / 10,12,31 | 이름/배치 변경; 변경 근거/제안 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-decision-receipt.test.mjs`<br>`e2e/trip-decision-receipt.spec.ts` |
| `naru-tool-map` / 10,14,17,31 | 이름/배치 변경; route-check→동일 지도 이동 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 및 해당 행동 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/kakao-route-integrity.test.mjs`<br>`e2e/map-tools-reachable.spec.ts` |
| `naru-tool-alternatives` / 10,19,31 | 이름/배치 변경; 대체 제안 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-alternatives.test.mjs`<br>`e2e/trip-alternatives.spec.ts` |
| `naru-tool-comfort` / 10,13,31 | 이름/배치 변경; 여유 조절 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-comfort.test.mjs`<br>`e2e/trip-comfort.spec.ts` |
| `naru-tool-course` / 10,14,31 | 이름/배치 변경; 코스 확장 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/small-trip.test.mjs`<br>`tests/photo-course.test.mjs`<br>`e2e/photo-course.spec.ts` |
| `naru-tool-split` / 10,21,31 | 이름/배치 변경; 따로 이동/재합류 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/split-reunion.test.mjs`<br>`e2e/split-reunion.spec.ts` |
| `naru-tool-readiness` / 10,18,31 | 이름/배치 변경; 점검 선택·상세 왕복 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 및 해당 행동 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/departure-readiness.test.mjs`<br>`e2e/departure-readiness.spec.ts` |
| `naru-tool-weather` / 10,18,29,31 | 이름/배치 변경; 날씨 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/weather-integrity.test.mjs`<br>`e2e/weather-language.spec.ts` |
| `naru-tool-transport` / 10,17,29,31 | 이름/배치 변경; 귀가 교통 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/return-transport.test.mjs`<br>`e2e/return-transport.spec.ts` |
| `naru-tool-compare` / 10,19,31 | 이름/배치 변경; 편의 비교 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-compare.test.mjs`<br>`e2e/facility-evidence.spec.ts` |
| `naru-tool-preview` / 8,10,17,31 | 이름/배치 변경; 도착 전 확인 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/facility-layers.test.mjs`<br>`e2e/roadview-recovery.spec.ts` |
| `naru-tool-transcript` / 10,26,31 | 이름/배치 변경; 전체 상세/대본 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/odii-evidence.test.mjs`<br>`tests/audio-guide-mode.test.mjs` |
| `naru-tool-inquiry` / 8,10,20,31 | 이름/배치 변경; 목적별 문의 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀; B16 현장 기능 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/onsite-communication.test.mjs`<br>`e2e/place-inquiry.spec.ts` |
| `naru-tool-budget` / 10,31 | 이름/배치 변경; 예산 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-budget.test.mjs`<br>`e2e/trip-budget.spec.ts` |
| `naru-tool-experience` / 21,31 | 이름/배치 변경; 여행 체험 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/travel-experience.test.mjs`<br>`e2e/travel-experience.spec.ts` |
| `naru-tool-audio` / 21,26,31 | 이름/배치 변경; 듣기 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/audio-guide-mode.test.mjs`<br>`e2e/region-album-playback.spec.ts`<br>`e2e/travel-experience.spec.ts` |
| `naru-tool-coordinates` / 17,31 | 이름/배치 변경; 장소 위치 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/place-coordinate-restoration.test.mjs`<br>`e2e/place-identity-continuity.spec.ts` |
| `naru-tool-route-check` / 17,31 | 이름/배치 변경; 경로 점검→지도 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 및 해당 행동 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/departure-route-evidence.test.mjs`<br>`e2e/naru-tool-migration.spec.ts` |
| `naru-tool-save` / 10,23,30,31 | 이름/배치 변경; 계정/기기 저장 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/account-travel.test.mjs`<br>`e2e/simple-account-save.spec.ts` |
| `naru-tool-share` / 10,24,30,31 | 이름/배치 변경; 공유 동의 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/live-share.test.mjs`<br>`e2e/simple-live-share.spec.ts` |
| `naru-tool-offline` / 10,21,31 | 이름/배치 변경; 오프라인 파일 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/trip-recovery.test.mjs`<br>`e2e/restored-trip-export.spec.ts` |
| `naru-tool-calendar` / 10,21,24,31 | 이름/배치 변경; 캘린더 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/live-share.test.mjs`<br>`e2e/restored-trip-export.spec.ts` |
| `naru-tool-on-trip` / 10,21,31 | 이름/배치 변경; 현장 진행·되돌리기 기존 도구 연결 유지 | B78: 28개 카탈로그 진입/복귀 및 해당 행동 일부 | 도구별 핵심 계산·실 API/파일/권한 전체는 별도<br>`e2e/naru-workspace.spec.ts`<br>`tests/on-trip.test.mjs`<br>`e2e/naru-tool-migration.spec.ts` |

## CSS·Actions 원인 분석 문서의 독립 검토

`docs/integration-local-first-20260929.md`의 다음 구분은 읽은 코드·Git 차분과 맞는다.

1. **검사 실패와 소스 자동 수정은 다른 사건이다.** 읽은 활성 CI는 `contents: read`, checkout 자격증명 비보존, lint/check/test/build를 사용한다. `--fix`, 제품 소스 자동 변경 후 commit/push 하는 단계는 확인되지 않았다. `scripts/check-performance-budget.mjs`는 gzip 크기를 읽어 한도 초과 시 실패하며 현재 CSS 200KiB 기준이다. 이 한도는 승인 UI를 재설계하는 명령이 아니다.
2. **도구가 파일을 전혀 쓰지 않는다는 주장은 피해야 한다.** 하네스의 명시적 template 명령은 새 pending evidence 파일을 만들고, 빌드는 `.vercel/output/` 같은 생성물을 쓴다. client CSS manifest 플러그인은 번들 metadata를 연결한다. 이는 제품 TSX/CSS를 자동 재작성하는 동작과 구별된다. CI의 check가 template을 호출하는 경로는 확인되지 않았다.
3. **과거 디자인 왜곡의 직접 근거는 통합 차분이다.** `9c988cf` → `bcb380e`의 CSS·배치 변경과 `docs/pr726-original-intent-20260928.md` 복원 기록은 원래 디자인이 후속 통합 과정에서 변한 사실을 뒷받침한다. 구형 디자인 검사에 맞추려 했다는 의도는 기록에 근거한 원인 해석이며, Actions 자체가 자동 수정했다고 확대할 수 없다.
4. **운영 CSS 누락과 개발 HMR 초기화는 별도 원인이다.** CSS 분할/manifest 문제는 생성·전달 경로, `tmp/` trace HTML 감지는 개발 감시 경로다. 후자를 과거 PR 전체의 디자인 왜곡 원인으로 보지 않는다. 이번 후보에서 `.github/workflows`, `app/api`, `lib` 경로의 baseline 대비 변경은 없었으나, 프론트 consumer가 달라졌으므로 실조회 보존을 자동 통과시킬 수 없다.
5. **재발 방지 판단 기준:** Owner 승인 화면을 먼저 고정하고 실제 기능/상태/접근성 계약을 보존한다. 오래된 문구·DOM 가정을 갱신할 때 핵심 행동 검사를 삭제/skip하지 않는다. CSS 예산 확대와 별개로 최종 빌드 manifest·실배포의 CSS 전달을 확인한다.

## 남은 판정 경계

- 79개 요구 중 이 표가 `S/U` 또는 일부 `B`로 표시한 범위는 미실행/부분 실행이다. 특히 관광공사 16개와 Kakao/ODsay/날씨/화장실 원본·실계정·로컬 모델·Production은 실제 제공처 근거가 필요하다.
- 본문에서 없어진 정책 문구를 기대하는 검사 실패는 현재 기능 삭제의 증거가 아니다. 반대로 같은 문구가 남아 있더라도 실제 버튼/입력/저장/오프라인이 실패하면 기능 회귀다.
- QHD 화면의 남는 여백 등 Owner 승인과 관련된 미적 선택을 이번 읽기 검토가 임의로 되돌리지 않는다. 확대·초점·내용 누락 여부는 기능·접근성 검사로 따로 판단했다.
- 진행 중인 전체 Release Audit의 실패는 별도로 조사해야 한다. 이 문서를 현재 후보의 CI/통합/배포 완료로 인용하지 않는다.
