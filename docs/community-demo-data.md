# 커뮤니티 합성 데모 데이터

이 데이터는 커뮤니티 화면 검수용 합성 예시입니다. 실제 이용자 후기, 공공데이터, 시설 확인, 공식 운영·가격·교통 정보가 아니며 좋아요를 만들지 않습니다. 게시글과 댓글에는 `wave-community-demo-2026-v1` 배치가 저장되고 화면에는 `합성 데모 예시` 또는 `합성 데모 댓글` 배지가 표시됩니다.

데이터 파일에는 경남 18개 시·군별 게시글 20개와 게시글별 댓글 2개가 있습니다. 모든 작성자 이름과 ID는 `데모`/`wave-demo-`로 시작하며 실제 계정과 연결되지 않습니다. 기존 `004_community_seed.sql` 행과 이를 숨기는 `006_retire_community_seed.sql`은 변경하지 않습니다.

DB 연결 없이 데이터만 검사합니다.

```bash
npm run community:demo:dry-run
```

DB 변경은 자동 실행되지 않습니다. 비운영 Neon 브랜치에 적용하려면 아래처럼 쓰기 의사, 원격 연결 허용, 정확한 배치 ID와 소유자 키를 모두 명시해야 합니다.

```bash
WAVE_COMMUNITY_DEMO_WRITE=1 DATABASE_URL='postgresql://...' \
  node scripts/community-demo.mjs --apply \
  --allow-remote \
  --batch=wave-community-demo-2026-v1 \
  --owner=wave-community-demo-fixtures
```

도구는 W.A.V.E Production DB와 `VERCEL_ENV=production`에서 실행을 거부합니다. 이 저장소 검증에서는 실제 Neon이나 Production DB에 쓰지 않았습니다.

같은 명령을 다시 실행해도 같은 배치만 갱신합니다. 동일한 게시글·댓글 ID가 다른 배치 또는 실제 이용자 행에 있으면 전체 적용이 중단됩니다. 배치 소유자가 다를 때도 실패합니다.

롤백은 게시글을 삭제하지 않습니다. 배치 소유 게시글과 합성 댓글의 공개 상태만 `hidden`으로 바꿉니다. 따라서 데모 게시글에 실제 이용자가 남긴 댓글·좋아요·신고는 삭제되지 않습니다.

```bash
WAVE_COMMUNITY_DEMO_WRITE=1 DATABASE_URL='postgresql://...' \
  node scripts/community-demo.mjs --rollback \
  --allow-remote \
  --batch=wave-community-demo-2026-v1 \
  --owner=wave-community-demo-fixtures
```

쓰기 CLI는 `@neondatabase/serverless` HTTP 드라이버를 사용하므로 일반 로컬 PostgreSQL 연결은 지원 대상으로 검증하지 않았습니다. 일회용 PGlite에서는 SQL과 트랜잭션 경계만 별도 어댑터로 검사했습니다. `--allow-remote`는 안전한 TLS URL 확인을 대신하지 않으며 Production 허용 옵션도 아닙니다.
