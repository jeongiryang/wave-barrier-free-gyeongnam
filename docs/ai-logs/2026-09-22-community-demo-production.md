# PR #678 운영 시연 적용 후속 작업 로그

- 원 요청: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/678#issuecomment-5774378985
- 작성자: unknownamed
- AI 도구: Codex, 구현 에이전트와 독립 QA
- 상태: 후속 PR 작성 및 검증, 실제 운영 적용은 Owner 인계

## 목적과 역할

비어 있는 운영 커뮤니티에 준비된 360개 글·720개 댓글을 Owner가 명시적으로 적용할 수 있도록 도구를 보완한다. 팀원은 Owner Neon 로그인·인증정보 수신·운영 DB 쓰기를 수행하지 않는다. 병합 이후 Owner가 기존 인증 환경에서 적용하고 운영 목록·검색·상세·댓글 화면을 최종 확인한다.

## 변경

- 모든 합성 게시글 제목에 `[시연]`을 저장하고 공개 mapper에서 이전 데이터의 접두어 누락도 보완한다. 일반 글 제목은 보존한다.
- 운영 대상·스키마·배치 소유권·ID 충돌·실제 행 수를 READ ONLY로 확인한 뒤, 별도 opt-in으로 지정 배치만 트랜잭션 적용한다.
- 기존 글·댓글·좋아요·신고를 보존하고 rollback은 해당 합성 배치만 hidden 처리한다.
- Owner용 사전/적용/사후/rollback 명령과 운영 화면 확인 절차를 문서화한다. 자동 seed, CI/CD 변경 또는 외부 API 데이터 대체는 없다.

## 검증

- 제목 접두어 및 120자 제한, legacy mapper 보완, 실제 글 보존: 로컬 단위 2개 통과.
- 독립 UI: 로컬 PGlite + repository mapper 응답으로 1440/960/390px 목록·검색·상세의 제목/배지/작성자와 댓글 구분 3개 통과. 합성 테스트 응답이며 운영 조회 결과로 주장하지 않는다.
- 전체 단위 1,651/1,651, lint 오류 0(기존 경고 25개), typecheck, build:vercel, check:performance 통과.
- 독립 PGlite SQL 17개 통과: READ ONLY/스키마와 외래키 거부 6개, 적용·재실행·rollback·모든 실제 행 필드 보존·충돌·부분 배치 중단·사전 점검 후 변경·중간 실패 원자성 등 11개.
- 운영 절차 인터페이스 5개 그룹 통과: 로컬 DB로 전체 절차 실행, 오류 비밀값 제거, commit 후 응답 손실과 preflight 확인, CLI dry-run/설정 거부. 실제 Neon 전송은 없음.
- 최종 Actions 결과는 후속 PR에 기록한다.

## 결과와 제한

팀원 작업 중 운영 DB 쓰기와 Owner 인증정보 접근은 수행하지 않았다. 로컬 PGlite는 실제 Neon HTTP 전송·운영 동시성 검증을 대신하지 않는다. 운영 전후 수와 운영 화면 검증은 Owner 실행 후 별도로 기록해야 한다. PR 준비/CI 성공만으로 시연 데이터가 운영에 입력됐다고 간주하지 않는다.
