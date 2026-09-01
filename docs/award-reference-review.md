# 역대 관광데이터 공모전 참고 레포 선별·적용 기록

> 검토일: 2026-09-01  
> 원칙: 수상작의 화면을 복제하지 않고 W.A.V.E의 공식 근거 기반 무장애 여행 결정에
> 직접 기여하는 정보 구조와 상호작용만 채택한다.

## 결론

W.A.V.E에는 이미 수상작에서 반복되는 코스 만들기, 지도, 날씨, 개인화, 커뮤니티,
마이 여행 기능이 구현돼 있다. 남은 문제는 기능 수가 아니라 긴 플래너에서 현재 상태,
완료 조건, 다음 행동과 데이터 신뢰 범위를 잃기 쉽다는 점이다. 따라서 신규 기능을 더
붙이기보다 **Journey Control Center**로 전체 여정을 재구성한다.

## 레포별 판단

| 참고 레포 | 확인한 강점 | W.A.V.E 적용 | 적용하지 않은 이유 |
| --- | --- | --- | --- |
| [NEXPOT](https://github.com/jeongiryang/Nexpot) | 영상·장소·코스·지도·리뷰 요약을 한 화면에서 스캔 | 상단 여행 브리핑, 상태 요약, 근거 중심 카드 위계 | 영상·리뷰 양을 공식 접근성 근거처럼 사용하지 않음 |
| [TAGO](https://github.com/jeongiryang/tago) | 코스 상세, 나만의 여행, 둘러보기와 참여 흐름 | 4단계 진행 상태, 내 일정, 현재 단계의 다음 행동 | 챗봇은 근거 없는 답변 위험과 기존 시각 플래너 중복 때문에 제외 |
| [Drivel-client](https://github.com/jeongiryang/Drivel-client) | 문제→서비스→화면을 이어 주는 시연 중심 소개 | README의 1분 소개, 실제 화면, 3분 시연 문서 | 발표 이미지를 제품 UI로 복제하지 않음 |
| [AlongTheBlue](https://github.com/jeongiryang/AlongTheBlue_SERVER) | 지역 정체성이 분명한 브랜드와 결과물 연결 | Deep Ocean 브랜드, 서비스·문서·Production 연결 | 제주 바다 표현을 경남 전역 서비스에 그대로 차용하지 않음 |
| [야구행](https://github.com/jeongiryang/Yaguhang_BE) | 일정·날씨·주변 관광지를 한 맥락으로 연결 | 일정과 날씨·혼잡·이동을 출발 준비로 결합 | 경기 스크랩·알림은 W.A.V.E 핵심 문제와 무관해 제외 |
| [Tripmate Android](https://github.com/jeongiryang/tripmate-android) | 개인화·지도·여행 상세, 기능 모듈 경계 | 이 기기 편의 프로필, 지도, feature 단위 구조, 모바일 하단 단계 탐색 | 네이티브 앱 전환은 현재 웹 제출 범위와 맞지 않아 제외 |
| [Running-Handai-FE](https://github.com/jeongiryang/Running-Handai-FE) | 일관된 변경 유형과 협업 규칙 | 현재 Conventional Commit·PR·AI 로그 체계로 충족 | 사용자 기능 자료가 없어 UI 근거로 사용하지 않음 |
| ReStory·Course Maker | 공개 기본 경로에서 README를 확인하지 못함 | 검증 가능한 근거가 없어 미적용 | 화면·기능을 추측하지 않음 |

## Journey Control Center 적용 범위

- 첫 방문: 한 번에 한 질문만 노출하는 집중 단계 보기와 이전·다음 행동
- 숙련 사용자: 지도·교통·상황 정보를 즉시 펼치는 전체 보기 전환
- 자연어 안내: 조건·추천·일정·출발 확인을 기능명이 아닌 여행자의 질문으로 설명
- 데스크톱: 4단계 고정 여정 레일, 완료도, 현재 단계, 다음 행동
- 모바일: 안전영역을 포함한 44px 하단 단계 탐색
- 히어로: 편의조건·공식 추천·저장 장소·현재 경로를 묶은 여행 브리핑
- 신뢰 언어: `확인됨 / 일부 확인 / 재확인 필요`와 의미를 첫 화면에서 설명
- 정확성: 제공기관·데이터 응답 수와 실제 출발지→목적지 경로 수를 구분
- 접근성: 키보드 3px 초점, 동작 감소 시 즉시 이동, 밝은·어두운 테마와 390~1440px 검증

구현 추적은 [GitHub Issue #221](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/221)에서 관리한다.
단계형 정보량 분산과 질문형 문구는 [GitHub Issue #225](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/225)에서 이어서 관리한다.
