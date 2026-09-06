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

초기 변경을 2a5cea0으로 보존한 뒤 #325 aa48328(좁은 셀의 미확인 시간 줄바꿈)과 #319 be9e908(도움말 표시 전 포커스)을 재구현 없이 merge했다. 처음 #318로 지목한 도움말의 정확한 관련 PR은 #319이며 #318 원격 변경은 없다. 합성 코드 a997535에서 관련 10개 spec **122/122**, lint/typecheck, unit **287/287**, Vercel build/performance PASS. 이 변경의 전체 E2E·최종 합성·PR CI는 이어서 실행한다.

PR의 base는 #325이며 추가 의존성 #319의 포커스 수정도 포함한다. 본문 언어는 지도 선택창 범위이며 지도 SDK 도구·교통/날씨 상세·인증/정책은 미완료이다. main/Production 34e6021, 리뷰 0/3·008 운영 접근·Preview·Production API 실패·사람 확인은 유지한다. #325 aa48328의 전체 로컬 366 pass/1 fail/기존 skip 1은 첫 page.goto ERR_NO_BUFFER_SPACE이며 이 실행을 PASS로 바꾸지 않는다.
