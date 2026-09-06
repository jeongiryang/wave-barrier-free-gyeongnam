# 지도 출발·도착 검색과 언어·포커스

- Base #325 `c3d72879b1de7b223792a28b78ebefccccb00abf`, 격리 worktree `wave-map-journey-language`, branch `fix/map-journey-language`.
- 관련 #251 #264 #265 #267 #276 #282 #285 #286. 기존 변경 보존, 운영 쓰기·Secret·유료 호출 없음.

## 재현

- 초기 데스크톱·모바일 **12건 실패**: 영어 출발/도착 이름 누락, 정상 빈 결과와 오류를 구분하지 않음, malformed places가 렌더 오류로 이어짐, 검색어 변경 후 이전 요청이 남음, 경로 재계산의 native disabled 때문에 포커스가 사라짐.
- 수정 후 **12/12 PASS**. 추가 화면 검사에서 입력 높이 42px인 **4건 실패/14건 통과**. 좁은 화면의 긴 결과 이름 잘림도 캡처에서 확인.

## 변경

- 검색 상태를 idle/loading/success/empty/error로 구분. 명시적인 제출만 조회하며, 입력 변경은 진행 요청과 이전 결과를 무효화한다. 중복 제출은 ref로 막고 기존 timeout을 유지한다.
- 응답 배열/필수 이름/좌표를 검사하여 malformed·공백·범위 밖 좌표를 정상 빈 결과나 0 좌표로 바꾸지 않는다.
- 검색/경로 재계산의 pending은 aria-disabled·aria-busy와 실제 중복 실행 방어로 표시하여 키보드 포커스를 보존한다.
- 지도 영역 제목·범례·출발/도착 선택·검색 상태 KO/EN 및 원문 언어, 검색 없이 기존 거점/일정 선택, Escape/선택 후 trigger 복귀를 제공한다.
- 입력 44px, 결과 이름 줄바꿈과 단일 패널 스크롤로 10번째 검색 결과까지 읽고 조작할 수 있다.

## 실제 검증

- `npm ci`, lint, typecheck, unit·contract **287/287**, Vercel build, performance PASS.
- 관련 8개 E2E spec **106/106 PASS**. 마지막 영어 landmark/실제 Tab 확인 추가 후 새 spec **18/18 PASS**.
- 320/390/768/1366px light/dark, 10개 결과, 실제 Tab focus-visible, elementFromPoint 가림 검사, 44px, 이름 잘림/overflow, axe 위반 0, pageerror 0. 320px 전/후 화면 직접 확인.
- 실패→재시도→중복 Enter 1회→선택→출발지 갱신→기존 일정 1개 유지, 새 검색어로 진행 요청 교체, 오류/빈 결과 구분을 mock 계약으로 검증했다. 실제 Kakao 연동 성공 증거를 대신하지 않는다.
- CSS **69.32/70 KiB**, planner initial JS **269.68/270 KiB**.

## 보존 및 정확한 재개 지점

현재 변경은 관련 검사와 기본 검증을 마친 상태로 보존한다. 선행 #325 CI 34045028862의 320px 경로 문구 배치 4건 실패를 먼저 수정한다. 통합 후보 458bf7d 전체도 도움말 focus trap 1건 실패(368 pass/기존 skip 1)가 있어 별도 원인 조사가 필요하다. 이 변경의 전체 E2E·최종 합성·PR CI는 아직 실행 전이다.

선행 수정 후 이 브랜치로 안전하게 merge하고 전체 검증/PR을 진행한다. 본문 언어는 지도 선택창 범위이며 지도 SDK 도구·교통/날씨 상세·인증/정책은 미완료이다. main/Production 34e6021, 리뷰 0/3·008 운영 접근·Preview·Production API 실패·사람 확인은 유지한다.
