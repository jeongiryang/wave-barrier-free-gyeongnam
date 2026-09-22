# 커뮤니티 합성 데모 데이터 AI 작업 로그

- PR: 생성 전
- 제목: 커뮤니티 합성 데모 데이터와 명시적 표시 추가
- 작성자: Codex 구현 에이전트
- 최종 상태: 로컬 구현·작성자 검증 완료, 독립 QA 최종 재현 대기
- AI 도구: Codex GPT-5.6 Sol/high 구현, Codex GPT-6 Astra/xhigh 독립 QA, Codex GPT-6 Astra/high 추가 검토, Playwright, PGlite SQL 어댑터

## 목적

제출 확정 PDF 22쪽의 실제 저장 데이터 원칙을 유지하면서, 검수자가 명시적으로 선택한 비운영 DB에서만 사용할 수 있는 커뮤니티 합성 데모 데이터를 준비한다. 경남 18개 시·군별 게시글 20개와 게시글별 댓글 2개를 제공하고, 목록·상세·댓글에서 실제 이용자 콘텐츠와 구분되는 배지를 표시한다.

## 역할 구분

- 사람: 풍부한 합성 데모 데이터 허용, 비운영 DB 한정, 시설·운영·가격·교통 사실 생성 금지, 실제 좋아요 금지, 기존 004/006 seed 유지, PR 생성 전 독립 QA 요구를 결정했고, 제안된 360개 게시글·720개 댓글 계획을 승인했다.
- 관리 AI: 범위와 수용 기준을 관리하고 기존 Production 빈 커뮤니티 기준선 및 별도 기능 결함을 분리했다.
- 구현 AI: PDF 22쪽 확인, 기존 커뮤니티 테스트, 메타데이터·데이터·CLI·화면 표시·문서·회귀 검사를 작성했다. Production/Neon DB 쓰기는 실행하지 않았다.
- 독립 QA AI: 저장소 밖의 일회용 PGlite 어댑터로 실제 SQL 트랜잭션을 검사했다. 작성자와 다른 검증 경로이며 Production 자격 증명을 사용하지 않았다.

## 검증

- `npm run community:demo:dry-run`: DB 연결 없이 성공. 게시글 360개, 댓글 720개, 18개 지역 각 20개, 고유 제목/본문/댓글 360/360/720, 미래 시각·사실 근거 필드·좋아요 없음.
- 관련 Node 검사 62개 통과: 기존 인증·검색·정렬·현장 제보·배포 migration과 새 데이터/소유권/표시 회귀를 포함한다.
- `npm run typecheck`: 통과.
- 변경 파일 대상 ESLint: 통과.
- `npx playwright test e2e/community-demo-labels.spec.ts`: desktop Chromium 1440×960과 mobile Chromium 2개 통과. 목록→상세→댓글 배지와 일반 게시글·댓글 미표시를 확인했다.
- 독립 PGlite SQL 검증 9개 통과: 메타데이터 migration 무데이터, 360/720 적용, 재적용 멱등성, 잘못된 소유자 거부, 외부 게시글/댓글 ID 충돌 거부, 중간 실패 전체 롤백, 숨김 롤백, 실제 댓글·좋아요·신고 보존, 재적용 복구를 확인했다.
- 카테고리는 수량을 맞추기 위해 회전하지 않고 글 의도에 고정했다. 동행 속도·아침형/늦잠형·식사 리듬은 `together`, 실제 시설 사실이 없는 사진·기념품 대화는 `place`, 회고는 `review`, 짐·앨범·일기는 `tips`로 검증했다.

### CI 후속 검증

- PR CI의 mobile transport 실패 trace에서 768px 제어 수를 5개로 읽은 직후 live `nth()` locator의 세 번째 항목이 사라져 전체 제한 시간까지 기다리는 DOM 재렌더 경쟁을 확인했다. 같은 trace의 mocked route 응답은 17ms와 22ms에 완료됐고 page error나 console error는 없었다.
- 테스트는 각 viewport에서 `Transport details`, 세 데이터셋, 재확인 버튼의 실제 영문 라벨 5개와 `aria-busy=false`, 44px 최소 크기, 가로 경계를 한 번의 browser 평가로 함께 확인하도록 바꿨다. timeout, retry, CI gate와 제품 코드는 바꾸지 않았다.
- desktop/mobile Chromium에서 light/dark를 각각 2회, 단일 worker로 반복한 focused 검사 8개가 3분 30초에 모두 통과했다. 별도 6-worker 과부하 실행에서는 mobile 6개가 통과하고 desktop 6개가 개별 assertion 없이 전체 45초 제한에 도달해, 최종 판정에는 CI 샤드에 가까운 단일-worker 반복 결과를 사용했다.

## 결과와 제한

- 실제 데이터 파일은 `data/community-demo-wave-2026-v1.json`이며 게시글·댓글 모두 영속 `demo_batch_id`를 갖는다. 기존 실제 이용자 행은 `NULL`을 유지한다.
- 적용은 쓰기 환경변수, 정확한 배치 ID·소유자 키, 비운영 원격 허용을 모두 요구한다. W.A.V.E Production DB와 `VERCEL_ENV=production`은 거부한다.
- 롤백은 부모 게시글을 삭제하지 않고 배치 소유 게시글·합성 댓글만 숨겨 실제 상호작용을 보존한다.
- 기존 `004_community_seed.sql`과 `006_retire_community_seed.sql`은 수정하지 않았고 기존 seed는 계속 숨김 상태다.
- 독립 SQL 검증은 단일 연결 PGlite 어댑터에서 수행했다. Neon HTTP 전송과 다중 프로세스 동시성은 실제 비운영 Neon에서 실행하지 않았다.
- 이 작업에서는 Production DB 쓰기, 배포, 병합, PR 생성을 수행하지 않았다.
