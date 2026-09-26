# 프론트 PR 이력에 따른 하네스 책임 보강

이 문서는 9월 26일 `main@a46ca03`까지의 이력 스냅샷이다. #715 이후의 밤 테마·인트로 제거·출처 이동·달력과 마감 수정은 [후속 기록](release-completion-20260927.md) 및 현행 공통 책임을 따른다.

9월 30일 마감 작업의 기준은 현재 사용자의 요구, 기능설명서, 실제로 채택된 현행 화면이다. 과거 PR의 색·배치·기능 이름을 모두 누적하면 서로 모순되는 지침이 된다. 이번 조사는 원안과 후속 통합을 추적해 **프론트 UX·프론트 수정·디자인의 책임과 선택할 검증 기준**을 정리했다.

기준 커밋은 `main@a46ca03c15fe21d563d7ca5e3aedfe13c28a6ef6`이다. 구현 결과는 [공통 책임 F01–F10](../harness/frontend-responsibilities.md)과 [UX](../harness/personas/frontend-ux.md)·[프론트 수정](../harness/personas/frontend-fix.md)·[디자인](../harness/personas/design.md) 역할에 반영했다. 애플리케이션·API·CI/CD 실행 코드는 변경하지 않는다.

## 조사 범위와 방법

- 기간: **2026-09-12 00:00:00 UTC부터 기준 main의 마지막 PR 종료 시각인 2026-09-26 13:41:25 UTC까지**. 최근 약 2주의 개편·통합·후속 수정을 모두 포함하도록 잡았다. 9월 26일 UTC에 수집했다.
- GitHub REST의 closed PR을 페이지 끝까지 조회해 464개 중 해당 기간 **116개(병합 50·미머지 종료 66)**를 얻었다. 검색 인덱스 기반 `gh pr list --search`는 51개만 반환해 단독 모집단으로 쓰지 않았다.
- 이전 디자인 기원을 위해 연결 선행 **[#449](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/449)·[#466](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/466)·[#468](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/468)·[#470](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/470)·[#478](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/478)**을 추가했다. PDF 기반 계획 → Horizon의 폰트·사진 → 현재 Design B 계보를 추적하기 위한 5건이다. 저장소 개설 이후 모든 디자인 이력을 조사했다는 뜻은 아니다.
- 총 **121개**의 본문·실제 변경 파일 목록·일반댓글·리뷰·인라인 리뷰를 수집했다. 파일 수 대조는 121/121 일치, API 접근 실패 0건. 프론트와 직접 관련된 실제 diff 및 후속 현행 연결을 검토했다. 대규모 통합 PR의 모든 백엔드 코드 정확성을 인증한 것은 아니다.
- 글자·색·간격·정렬·사진·카드·섹션·모달·반응형·키보드·상태/복구·사용자에게 보이는 데이터 의미·관련 UI 회귀를 선정했다. 기간 내 108개와 선행 5개가 해당한다. CI/내부 계약/모델 운영 8개는 제외 이유를 기록했다. **현재 미노출·후속 제거된 UI도 이력 조사에 포함**했다.
- 본문의 명시적 의도, 직접 Owner 댓글, 작성자의 승인/검증 보고, 현행 코드에 대한 정적 판단, 감사자가 도출한 검사 기준을 구분했다. 미머지의 `mergeCommit` 값이나 PR 제목으로 채택 여부를 판정하지 않았다.

[전체 121개 목록](frontend-pr-history/inventory-20260926.md)에 제목·상태·종료 시각·파일 수·토론 수·선정/제외 이유를 남겼다. 세부 변경·의도·현재 상태·담당·검사 기준은 [선행/초기](frontend-pr-history/early-20260926.md), [중간](frontend-pr-history/middle-20260926.md), [최신](frontend-pr-history/late-20260926.md)에 있다. 수집된 일반댓글은 93개, 정식 리뷰 3개, 인라인 1개다. 정식 리뷰와 인라인은 모두 CI PR [#373](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/373)에 해당하므로 제품 디자인 승인 근거가 아니다.

## 채택 계보

| 흐름 | 후속 결정과 현행 해석 |
|---|---|
| [#449](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/449) PDF → [#466](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/466) Horizon → [#468](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/468)/#470/#478/#498 | Noto Sans KR, 읽히는 사진·출처·조작의 기원. 당시 7/4단계·전역 팔레트·두 줄 필름·카드 고정 수치는 현재 규칙으로 자동 승계하지 않는다. |
| [#500](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/500) 3열 → [#507](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/507) 두 화면 → [#512](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/512) 소개 복원 → [#520](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/520) 한 대화창 | `여행지 찾기 / 내 일정`과 같은 여행을 쓰는 나루. 단순화로 없어진 기능/설명을 후속 복원한 이력이 있으므로 화면 수보다 발견·완주·복귀로 평가한다. |
| [#604](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/604) 접근성 7원안 → [#605](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/605) 시설 11원안 → [#607](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/607) 나루·현장·여행 통합 | 닫힌 원안의 제안이 통합되어 있다. 일반 종료 댓글의 “[#607](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/607) 통합”과 실제 선행 직접 통합을 구별한다. 상세 원안 목록은 중간 부록에 있다. |
| [#652](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/652) Design B + [#620](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/620)–[#642](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/642)의 실제 22원안 | 현행 전역 개편의 시작. 정렬·저장·장소별 글·계정 복귀·pointer/초점·대비 회귀까지 결합 수정했다. [#548](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/548)의 초록/민트 랜딩을 현재 전역 규칙으로 되살리지 않는다. |
| [#655](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/655) 나루 3탭 → [#665](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/665) 실제 도구 이동 → [#668](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/668) 모바일/여행 완주 | 나루의 대화·도구·보관과 같은 여행 상태. 당시 어두운 나루/60px 모바일 헤더/작은 썸네일은 후속 [#709](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/709)로 바뀌었다. |
| [#617](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/617) 인트로 → [#667](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/667) 프로토타입 → [#668](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/668) 런타임 → [#682](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/682)/#707/#709 | 프로토타입 ZIP 병합과 실제 런타임 통합을 구분한다. 옛 2초·10.4초·입자 수를 현재 고정 요구로 쓰지 않는다. |
| [#688](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/688)/#701/#703/#706/#707 원안 → [#709](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/709) 선택 통합 | 원안 5개는 미머지 종료지만 속도 카드·안내 설정·흰 나루·사진 카드·상단 중앙 정렬 등이 반영됐다. 로그인 강제·10개 고정 검색·걷기/휴식/동행 삭제·custom base-select는 현재 채택되지 않았다. |

## PR 근거 → 특징·의도 → 담당 → 확인

이 표의 검사 기준은 PR 사실을 현재 작업에 적용한 판단이다. 매 수정마다 표 전체를 실행하라는 지시가 아니다.

| PR 근거 | 변경 특징·의도와 현재 결정 | 주 담당 | 선택할 확인 기준 |
|---|---|---|---|
| [#466](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/466)/#548/#652/#668/#706/#709 | 본문은 Noto Sans KR, 야경 랜딩·navy 여행화면, 나루/인사의 밝은 표면으로 발전. WaveHand는 나루·장식 범위다. | design · F01 | 실제 적용 서체/굵기·행간·한글 줄바꿈·토큰/선택자·CSS 순서, 기본/선택/초점의 전경/배경. 손글씨를 본문 전체에 확대하지 않음. |
| [#478](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/478)/#498/#502/#679/#709 | 사진·날짜·출처·화살표가 서로 가리지 않게 함. 세로 띠로 줄어든 사진은 실제 데이터에서만 드러난 결함. | design · F03 | 사진 있는 카드·긴 제목/출처·사진 실패, 1440/960/390과 짧은 화면, 카드 끝/출처 링크 hit target. 사진 밝기와 글자 대비를 별도로 판단. |
| [#523](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/523)/#615/#696/#698/#709 | 생활어로 주 행동을 먼저, 반복 설명을 줄임. 반복 합성 배지는 제거했지만 `[시연]` 제목·임의 위치 고지는 유지. | frontend-ux · F02 | 제목만으로 다음 행동 이해, 중복 문구·긴 한국어, 제거 뒤 출처/시연/미확인 의미 보존. 온점을 모든 문장/숫자에서 지우지 않음. |
| [#507](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/507)/#512/#559/#588/#611/#624/#639/#665 | 두 화면과 접힌 도구에서 여행 완주·기능 발견. 기능을 없애는 방식의 단순화를 피함. | frontend-ux · F04 | 첫 지역 선택→검색→담기→일정, 접힌 기능 열기→사용→복귀, 처음 유효 행동까지 입력·스크롤·왕복 부담. |
| [#520](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/520)/#655/#692/#701/#703/#704/#709 | 속도 선택, 나루 안 안내 설정, 가상 키보드·창 이동 중 대화/초안 유지. | frontend-fix · F05 | radio 방향키·설정 적용/취소/Esc·390↔960·키보드/드래그, 같은 대화·초안·미리보기·여행·초점 복귀. |
| [#468](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/468)/#498/#514/#546/#552/#554/#557/#604/#623/#652 | 준비 전 입력 유실·늦은 초점·누른 사이 버튼 이동 방지, native 입력·보조 설정. | frontend-fix · F06 | 느린 로딩 중 입력/포인터·Tab/Shift+Tab/Enter/Space/Esc, checked radio의 실제 Tab 순서·큰 글씨/저장 실패, 지원/미지원·음성 종료·실기기 진동. |
| [#515](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/515)/#546/#617/#667/#668/#682/#704/#707/#709 | 인트로·상단 사진·마무리 영역의 서로 다른 수명. 현재 상단만 4.5초 전환, 하단은 사진 없는 단색·자동 높이·64/40px 여백. | design · F07 | 첫 진입/재방문/skip/Esc·모션 감소·사진 실패·관찰 API 부재, 콘텐츠/CTA 도달. 과거 마무리 사진·전체 삭제안을 재도입하지 않음. |
| [#578](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/578)/#580/#582/#614/#652/#679/#694/#696 | 보기/정렬/필터가 실제로 구분되면서 같은 결과·선택을 보존. | frontend-ux · F08 | 검색→필터→정렬→보기→상세/뒤로가기, 실제 상위 결과·사진·읽던 위치. 반복 배지나 폐기된 열수 옵션을 복원하지 않음. |
| [#525](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/525)/#526/#538/#540/#568/#572/#574/#576/#586/#664/#673 | 공식 자료·조회 시각·부재/미확인·문의 대안·시연의 의미를 구별. | frontend-ux · F09 | 원천 상태와 카드/지도/문의 비교, 0/일부/오류·긴 원문. 문의/공식 링크를 실제 설치 지도·연속 통행·실시간 시설 보증으로 부르지 않음. |
| [#504](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/504)/#507/#520/#609/#670/#671/#685/#688/#699/#709 | 같은 여행·필수 편의·고정 방문·저장/공유의 현재성·비로그인 기능을 보존. | frontend-fix · F10 | 나루 후속 제안→배경 검색→적용, 축제 담기, 복원 전 클릭·공유 갱신 중 편집·오래된 응답·실패·Undo. 디자인 변경으로 API 페이지 크기나 로그인 경계를 바꾸지 않음. |

## 현행 판단에서 남겨야 할 한계

소스 조사에서 현재 노출이나 실제 데이터 제공을 확인하지 못한 항목은 기능 완료로 세지 않는다. [#600](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/600) 대여처·[#596](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/596) 공식 연락처·[#635](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/635) 동행 지원·[#641](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/641) 지역 음원 등록부는 비어 있다. [#561](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/561)/#563 말투는 production gate, [#594](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/594) 스트리밍과 [#642](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/642) 현장 게시판은 기본 off 경계가 있다. 실제 배포 환경의 flag·endpoint·데이터는 이번에 재조회하지 않았다.

[#630](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/630) 인구감소·[#640](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/640) 문화 설명의 랜딩 제거는 [#682](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/682) 본문/diff에 기록된 결정이다. 플래너의 인구감소지역 우선 보기는 남는다. 문화 설명의 랜딩 연결과 `features/landing/region-culture.ts` 런타임 자료 파일은 함께 삭제됐고 대체 진입점은 발견하지 못했다. 원안은 Git/PR 이력으로 확인할 수 있지만 현행 기능으로 세거나 자동 복원하지 않는다. 반대로 [#688](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/688)의 사진/SGIS 출처 제거는 현재 반영되지 않아 사진 링크와 지도 출처가 남아 있다.

[#664](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/664)/#689의 축제 편의 마커는 **임의 위치 시연**이다. 실제 시설 좌표의 정확성이나 여행 안전 근거로 쓰지 않는다. [#678](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/678)/#694의 합성 글·반응도 실제 사용자 경험/수요의 증거가 아니다. 반복 배지 삭제 결정과 핵심 시연 사실을 지키는 책임은 함께 유지한다.

이 감사에서 새 제품 P0/P1을 확정하거나 79개 기능 요구를 재인증하지 않았다. 실제 제공처·운영 데이터, 보조기기/음성/진동·모바일 키보드, 과거에 미검증이라고 적힌 샘플은 각 요구의 실제 증거로 별도 확인해야 한다.

## 접근 공백과 검증 범위

- API 접근 실패/변경 파일 수 불일치는 0건이다. 다만 API patch가 없는 파일은 121개다. 바이너리 108개(이미지·글꼴·PDF·ZIP 등)는 파일 메타데이터와 사용처를 확인했으며 모든 원본 시안을 다시 열어 비교하지 않았다.
- 텍스트 patch 누락은 13개다. [#678](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/678)/#687/#694/#696의 대형 `data/community-demo-wave-2026-v1.json` 4개는 관련 mapper·생성/분포 로직·UI diff로 판단했고 각 데이터 행의 전수 diff는 읽지 않았다. [#712](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/712)의 보관 workflow 이동 9개는 이번 제품 디자인 범위에서 제외했다.
- 원 사용자 채팅·연결 이슈 전체·옛 CI artifact/스크린샷을 전부 재수집하지 않았다. 직접 확보된 [#678](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/678) Owner 댓글 외의 “사용자 승인” 표현은 작성자의 보고로 표시했다. PDF/프로토타입 원형과 현재 화면의 시각적 동일성을 주장하지 않는다.
- 이번에는 문서·하네스 지침만 바뀌므로 서비스 나루 호출·운영 DB 조작·브라우저 전체 감사·배포를 재실행하지 않는다. 기존 같은 SHA의 운영 검증은 별도 이전 작업의 증거이며 이 조사의 새 실행 결과가 아니다.
- 로컬 검증: `npm run harness -- check` 통과(79요구·31쪽·7역할), 3개 역할 브리프 생성과 전체 이력 자동 미포함 확인, 121개 목록 누락/중복·상태/수치 및 로컬 링크 33개 대조, `git diff --cached --check` 통과. 독립 문서 QA에서 최신 통합 결정과 담당 경계를 대조하고 문화 자료 파일 잔존 오기를 실제 삭제 이력으로 정정했다. 남은 문서 P0/P1은 발견하지 못했다. 이 판정은 제품 기능/렌더 통과를 뜻하지 않는다.

## 적용 방식과 비용

일상 작업은 기존 명령으로 관련 역할 하나의 브리프를 만들고 F01–F10 중 관련 행만 선택한다. 예: `npm run harness -- brief frontend-fix --task '나루 안내 설정 취소 후 입력과 초점 보존'`. 과거 121개 부록은 근거 충돌이 있을 때 필요한 PR만 연다.

결과는 `요구 ID/F규칙 → PR·현행 결정 → 변경 화면/상태 → 주 담당 판단 → 실제 증거 → 남은 확인`으로 남긴다. 같은 증거는 재사용하고 상태/비동기 변경에는 필요한 기존 회귀를 고른다. 순수 글자·간격 수정에 구현 복제 테스트를 추가하지 않는다. 새 CI job·주기 감사·자동 모델 호출·전 역할 반복 실행은 추가하지 않는다.
