# 현재 화면에 맞는 도움말 안내

- 제목: 소개 장면과 실제 여행지·일정 영역에 도움말을 연결한다.
- 작성자: jeongiryang / Codex
- 상태: 로컬 검증 완료, PR CI와 Production 검증 예정
- 관련: #347 항목 8, #353, #385

## 목적

실제 로컬 플래너에서 도움말 2단계가 여행지 제목과 화살표의 얇은 줄만 강조하는 문제를 재현했다. 소개 도움말도 이전 지역 지도·삭제된 데이터 원칙 구역을 참조하고 실제 화면과 다른 순서로 이동했다.

현재 소개의 Hero → 지역 사진 → 편의 선택 → 추천 근거 → 여행 시작 순서와 한국어·영어 설명을 맞췄다. 플래너는 여행지의 이름·편의·일정 버튼이 있는 내용과 날짜별 일정 편집기를 강조한다. 빈 결과·오류와 빈 일정에도 대상을 제공한다. 기존 강조 범위 제한, 스크롤/resize 재계산, 지연 로딩, 단계 잠금, 초점 트랩·복귀는 유지했다.

## 역할 구분

- 사람: 디자인·기능 개선, CI 통과 후 머지와 운영 배포 검증 승인.
- AI: 실제 UI 재현, 현재 마크업·도움말 검토, 코드와 테스트 변경, 검증 및 PR 작성.

## 검증

- lint: 0 errors, 기존 warnings 13개.
- typecheck, unit 708개, build:vercel, check:performance PASS.
- 도움말 관련 4개 spec / Chromium desktop·mobile 24개 PASS (27.2초).
- 새 검사는 실제 소개 순서·한국어/영어 내용, 장소명과 날짜 입력이 강조 범위 안에 있는지, 빈 일정·저장된 일정, 1440→960px resize, 초점 복귀와 pageerror 0을 검증한다.
- 실제 CUA 로컬 화면에서 변경 전 제목 줄과 변경 후 빈 결과 영역을 대조했다. 회귀 테스트가 생성한 1440px·960px·Pixel 7 화면에서 장소명·편의 내용과 주 버튼 강조를 직접 확인했다. 테스트 사진은 고정 fixture이며 실제 관광사진 검증 근거가 아니다.
- 첫 24개 실행: 22 PASS / 2 FAIL. 스크롤 뒤 숨겨진 헤더를 바로 클릭하던 신규 테스트 준비를 키보드 초점·실제 viewport 확인·Enter로 바꿨다.
- 두 번째 24개 실행: 22 PASS / 2 FAIL. 빈 화면의 SSR disabled 도움말에 준비 전에 초점을 시도한 것을 확인해 overview 복원·활성 상태를 기다리도록 했다. timeout·assertion·retry는 줄이거나 완화하지 않았다.
- 첫 unit 실행: 707 PASS / 1 FAIL. 이미 마운트되지 않는 #evidence를 요구한 기존 테스트를 실제 #recommendation으로 갱신했다. 최종 전체 unit 708 PASS.
- 최종 로그: TEMP/wave-help-ready.log, TEMP/wave-help-ready-{lint,typecheck,test,build-vercel,check-performance}.log. 화면: TEMP/wave-help-ready-output.

## 결과와 제한

이 변경은 #347의 도움말 범위만 다룬다. 경로·날짜·공유·계정 등 나머지 항목은 완료 처리하지 않는다. 이번 범위에 새 Preview나 제공처 실호출·공개 사용자 데이터 변경은 없다. PR CI와 정확한 머지 SHA의 CD, 실제 Production 확인은 머지 뒤 PR 기록으로 남긴다. 전체 출시 GO나 모든 접근성 요구 완료를 선언하지 않는다.
