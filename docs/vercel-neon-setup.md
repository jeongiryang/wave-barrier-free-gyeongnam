# W.A.V.E Vercel·Neon 설정 안내

W.A.V.E는 Vercel을 웹·서버 함수의 단일 운영 환경으로 사용하고, 서비스가 직접
생성한 영속 데이터만 Neon Postgres에 저장한다. 한국관광공사 원본 응답과 사용자의
실시간 GPS 좌표는 데이터베이스에 저장하지 않는다.

## 1. Vercel 프로젝트 연결

1. Vercel에서 **Add New → Project**를 연다.
2. GitHub의 `jeongiryang/wave-barrier-free-gyeongnam` 저장소를 선택한다.
3. Root Directory는 `./`, Production Branch는 `main`으로 둔다.
4. Framework Preset은 **Other** 또는 자동 감지를 사용한다.
5. 저장소의 `vercel.json`과 `npm run build:vercel`을 그대로 사용하며 Output
   Directory는 직접 지정하지 않는다.

## 2. Neon 데이터베이스와 인증

1. Neon Console에서 프로젝트를 만들고 가장 가까운 리전을 선택한다.
2. **Connect**에서 pooled connection string을 복사해 `DATABASE_URL`에 넣는다.
3. Neon Auth를 활성화하고 발급된 주소를 `NEON_AUTH_BASE_URL`에 넣는다.
4. 로컬에서 `openssl rand -base64 32` 또는 같은 수준의 안전한 난수를 생성해
   `NEON_AUTH_COOKIE_SECRET`에 넣는다.
5. 세 값은 Vercel Project Settings → Environment Variables에서 Production과
   Preview에 등록한다. 실제 값은 저장소에 커밋하지 않는다.
6. Neon SQL Editor에서 `migrations/001_community.sql`,
   `migrations/002_community_moderation.sql`을 번호 순서대로 실행한다. 첫 마이그레이션은
   게시글·댓글·좋아요와 조회 인덱스를 만들고, 두 번째는 신고·검토 상태와 중복 신고
   방지 제약을 추가한다.
7. 커뮤니티 운영 담당자의 Neon Auth 사용자 ID를 `COMMUNITY_MODERATOR_USER_IDS`에
   쉼표로 구분해 등록한다. 이 값은 서버에서만 읽으며 사용자 화면에 노출하지 않는다.

`/login`과 `/register`는 Neon Auth 연결이 완료된 환경에서 활성화된다. `/community`는
로그인 없이 읽을 수 있고 글·댓글·좋아요·신고만 계정이 필요하다. 신고 3건이 모인
내용은 운영 검토 상태로 전환되어 공개 목록에서 잠시 숨겨지며, 지정 운영자가
`/community/moderation`에서 공개 유지 또는 숨김을 결정한다. 데이터베이스가 아직
준비되지 않은 Preview에서도 관광 검색·지도·교통 기능은 비회원으로 계속 이용할 수 있다.

W.A.V.E 커뮤니티 DB는 Neon Auth의 사용자 참조 ID와 표시 이름만 저장한다. 이메일과
비밀번호는 커뮤니티 테이블에 저장하지 않는다. 로그인 화면은 공식 내비게이션과 같은
브랜드·HTTPS 출처를 유지하고, 로그인 완료 후에는 검증된 내부 `next` 경로로만 이동한다.

## 3. 서비스 환경 변수

Vercel에 `.env.example`의 필요한 항목을 등록한다.

- `TOUR_API_SERVICE_KEY_ENCODED`: 공공데이터포털 일반 인증키(Encoded)
- `KAKAO_MAP_JAVASCRIPT_KEY`: 지도 브라우저 표시용 키
- `KAKAO_REST_API_KEY`: 장소 검색·자동차 경로 서버 호출용 키
- `KORAIL_API_KEY`, `TAGO_API_KEY`: 별도 발급 키가 있을 때만 등록
- `ODSAY_API_KEY`, `EXPRESSWAY_API_KEY`: 선택 기능을 사용할 때 등록
- `COMMUNITY_MODERATOR_USER_IDS`: 신고를 처리할 Neon Auth 사용자 ID 목록

공공데이터포털의 동일 일반 인증키로 승인된 서비스는 KORAIL·TAGO 전용 항목을
비워도 공통 키를 사용한다. 변수 변경 후에는 Vercel에서 Redeploy를 실행한다.

## 4. GitHub Actions 자동 배포

GitHub 저장소 Settings → Environments에서 `production` 환경을 만들고, Settings →
Secrets and variables → Actions에 다음 Repository secrets를 등록한다.

- `VERCEL_TOKEN`: Vercel Account Settings에서 만든 토큰
- `VERCEL_ORG_ID`: Vercel 프로젝트의 `.vercel/project.json`에 표시되는 `orgId`
- `VERCEL_PROJECT_ID`: 같은 파일의 `projectId`

`.github/workflows/cd.yml`은 `main`의 코드 품질 검사가 성공한 뒤에만 Production을
배포한다. Vercel 자체 Git 자동 배포와 중복되지 않도록 `vercel.json`의 Git 배포는
비활성화되어 있다.

## 5. GitHub Ruleset 권장값

`main`에 다음 규칙을 적용한다.

- Pull Request를 통한 변경만 허용
- 승인 1명 이상
- 필수 상태 검사: **CI / validate**
- 병합 전 최신 `main` 반영
- 강제 푸시와 브랜치 삭제 차단

프로덕션 배포 작업은 `main` 병합 뒤 실행되므로 필수 PR 상태 검사로 지정하지 않는다.

## 6. 로컬 확인

```bash
cp .env.example .env.local
npm ci
npm run dev
```

Windows PowerShell에서는 첫 줄 대신 다음 명령을 사용한다.

```powershell
Copy-Item .env.example .env.local
```

PR을 올리기 전 `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e`,
`npm run build:vercel`을 모두 실행한다.
