# 커뮤니티 합성 데모 데이터와 Owner 운영 적용

[PR #678의 Owner 결정](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/678#issuecomment-5774378985)에 따라 글 360개·댓글 720개를 운영에 적용할 수 있는 명시적 절차를 제공합니다. **팀원은 데이터·도구·테스트와 후속 PR까지 담당합니다. 병합 이후 실제 운영 적용과 운영 화면 최종 확인은 Owner가 기존 인증 환경에서 수행합니다.** 팀원이 Owner 계정으로 로그인하거나 `DATABASE_URL`·Neon 인증정보를 전달받지 않습니다. 아래 명령은 CI/CD나 migration에서 자동 실행하지 않습니다.

데이터는 경남 18개 시·군별 글 20개, 글별 댓글 0·1·2·3·5·8개(총 720개)로 구성됩니다. 2026-09-24 Owner 요청에 따라 작성일을 지역별로 섞고, 글별 좋아요 0~48개를 시연용으로 추가해 최신순·인기순·댓글순의 차이를 드러냅니다. 실제 이용자 후기·방문 증거가 아닌 합성 대화입니다. 모든 제목은 `[시연] `으로 시작하고, 작성자 ID는 `wave-demo-*`, 표시 이름은 `데모 여행자`/`데모 답글`로 구분합니다. 화면의 `합성 데모 예시`/`합성 데모 댓글` 배지를 유지합니다. 이전 데모 제목에 접두어가 없더라도 공개 API의 mapper가 표시를 보완하며 실제 이용자 제목은 바꾸지 않습니다.

공식 장소 ID, 시설 보고, 좌표, 사진, 방문일은 합성하지 않습니다. 좋아요는 시연 배치에만 `wave-demo-like:wave-community-demo-2026-v1:` 전용 ID로 추가하며 실제 사용자 계정을 만들지 않습니다. 목록·상세에 `반응 수 시연 포함`을 표시합니다. 기존 좋아요는 수정·삭제하지 않으며 같은 fixture 재적용은 중복을 만들지 않습니다. 좋아요 수를 낮추는 작업은 이 추가 전용 도구의 범위가 아닙니다. 외부 API 조회를 이 데이터로 대체하지 않습니다. 배치는 `wave-community-demo-2026-v1`, 소유자 키는 `wave-community-demo-fixtures`입니다. 소유자 키는 공개된 배치 식별자이며 인증정보가 아닙니다. 실제 접근 권한은 Owner의 기존 DB 인증이 결정합니다.

## 팀원 검증 범위

DB 연결 없이 전체 데이터의 개수·지역 분포·고유성·합성 표시·제목을 검사합니다.

```sh
npm run community:demo:dry-run
node --test tests/community-demo*.test.mjs
```

비운영 Neon 브랜치에서만 기존 opt-in 명령을 사용할 수 있습니다. `DATABASE_URL`은 해당 환경의 비밀 저장소에서 주입하며 출력하지 않습니다. 쓰기는 `WAVE_COMMUNITY_DEMO_WRITE=1`, 정확한 `--batch`와 `--owner`, 원격 연결에 대한 `--allow-remote`가 필요합니다.

```sh
node scripts/community-demo.mjs --apply --allow-remote --batch=wave-community-demo-2026-v1 --owner=wave-community-demo-fixtures
```

`--rollback`으로 바꾸면 같은 배치만 숨깁니다. 비운영 명령에 운영 URL이나 `VERCEL_ENV=production`을 사용하면 거부합니다. SQL 통합 검증용 PGlite와 실제 Neon HTTP 전송은 서로 다른 검증 범위입니다. 저장소의 보안 고정 lockfile은 변경하지 않습니다. PGlite 0.5.8을 별도 도구 디렉터리에 설치한 후 `WAVE_PGLITE_MODULE`에 해당 패키지의 `dist/index.js` file URL을 설정하고 `node --test tests/community-demo-database.integration.mjs`로 선택적 DB 통합 검증을 실행합니다. 기본 `npm test`에는 외부 도구가 필요하지 않습니다.

## Owner: 운영 사전 점검

후속 PR을 병합하고 해당 코드가 배포된 뒤, Owner의 기존 인증 환경에서 실행합니다. `DATABASE_URL`을 채팅·PR·로그·스크린샷으로 공유하지 않습니다. 환경에 이미 주입된 값을 사용하며 `printenv`, 연결 문자열 출력, shell trace를 사용하지 않습니다. `VERCEL_ENV`는 미설정 또는 `production`만 허용합니다.

고정된 운영 대상은 다음과 같습니다. 다른 프로젝트·브랜치로의 전환은 이 명령의 임의 인자로 처리하지 않습니다.

| 항목 | 예상 값 |
| --- | --- |
| 프로젝트 | `icy-poetry-45639585` |
| 브랜치 | `br-super-sun-azshacj4` |
| 엔드포인트 | `ep-nameless-voice-azo6m14c` (pooler 포함) |
| DB | `neondb` |

먼저 READ ONLY 사전 점검 결과를 보관합니다. 이 단계는 쓰기 opt-in 없이 실행할 수 있습니다.

```sh
node scripts/community-demo.mjs --production --preflight --batch=wave-community-demo-2026-v1 --owner=wave-community-demo-fixtures --target=ep-nameless-voice-azo6m14c/neondb > community-demo-before.json
```

도구는 대상 URL·DB·스키마·배치 소유권·ID 충돌을 확인합니다. 예상 대상이나 스키마가 아니거나, 다른 소유자의 배치/게시글/댓글과 충돌하면 적용하지 않습니다. `019_community_demo_metadata.sql`은 메타데이터만 추가하며 자체적으로 데모 행을 만들지 않습니다. 운영 도구는 누락된 스키마를 임의 보수하지 않습니다. 사전 점검은 배치가 완전히 없는 상태(배치 0개·글 0개·댓글 0개) 또는 완전한 상태(배치 1개·글 360개·댓글 720개)만 허용합니다. 일부 행만 남은 상태는 apply와 rollback 모두 중단하며 Owner가 먼저 원인을 조사합니다.

## Owner: 명시적 적용과 결과 보관

PowerShell 예시입니다. 아래 두 opt-in에는 비밀값이 없습니다. `DATABASE_URL`은 앞 단계에서 사용한 기존 Owner 환경을 그대로 사용합니다.

```powershell
$env:WAVE_COMMUNITY_DEMO_WRITE = '1'
$env:WAVE_COMMUNITY_DEMO_PRODUCTION_WRITE = 'wave-community-demo-2026-v1'
node scripts/community-demo.mjs --production --apply --batch=wave-community-demo-2026-v1 --owner=wave-community-demo-fixtures --target=ep-nameless-voice-azo6m14c/neondb > community-demo-apply.json
```

종료 코드가 0인지 확인하고 출력 JSON을 검토합니다. 출력에는 비밀 연결 정보 대신 데이터 해시와 대상 식별자, 적용 전후 글·댓글·배치 및 실제 상호작용 수가 기록됩니다. 같은 배치를 재실행해도 중복 행은 만들지 않습니다. 기존 글·댓글 ID를 유지하고 합성 댓글만 재분배합니다. 신고 이력이 있는 댓글의 소속 글이 바뀌는 경우에는 트랜잭션을 중단해 신고 대상 연결을 보존합니다. 기존 반응 건수 보존 검사를 먼저 수행한 뒤 전용 ID의 시연 좋아요만 추가하므로 `likesTotal` 증가는 예상된 시연 추가분과 별도로 확인해야 합니다. 실제 이용자 글·댓글·좋아요·신고는 수정하거나 삭제하지 않습니다. 트랜잭션 중 충돌·검증 실패가 발생하면 부분 적용을 남기지 않습니다. 실패 시 보호 조건을 해제하거나 데이터를 삭제하지 말고 원인을 확인합니다. 네트워크 응답 유실 등으로 적용 성공 여부가 불명확한 경우에는 롤백됐다고 단정하지 말고, 아래 읽기 전용 사후 점검으로 실제 상태를 확인한 뒤 재실행 여부를 결정합니다.

```sh
node scripts/community-demo.mjs --production --preflight --batch=wave-community-demo-2026-v1 --owner=wave-community-demo-fixtures --target=ep-nameless-voice-azo6m14c/neondb > community-demo-after.json
```

`postsNonDemo`와 `commentsNonDemo`는 데모 배치 표식이 NULL인 보존 대상 전체입니다. 과거 `wave-seed`처럼 이미 숨긴 샘플 행도 포함할 수 있으므로 실제 사람의 활동량으로 해석하지 않습니다. 이 집합 전체를 보존하여 실제 이용자 행도 보호합니다.

별도 사전·사후 조회 사이에는 실제 이용자가 글을 쓸 수 있습니다. 전체 수의 변화를 무조건 데모 작업의 결과로 단정하지 말고 명령 자체의 before/after 보존 검사 결과와 구분합니다.

## Owner: 실제 운영 화면 확인

배치 글 360개·댓글 720개가 활성 상태인지 확인한 다음 [운영 커뮤니티](https://wave-barrier-free-gyeongnam.vercel.app/community)에서 확인합니다.

- 목록과 다음 페이지에 `[시연]` 제목, `합성 데모 예시`, `데모 여행자`가 보입니다.
- `[시연]`, 지역명, `충전기` 등으로 검색하고 카테고리를 바꿔도 시연 표시가 유지됩니다.
- 상세 제목에도 `[시연]`이 있고, 해당 글의 댓글에 `합성 데모 댓글`과 `데모 답글`이 보입니다.
- 실제 이용자 글·댓글에는 데모 배지가 붙지 않습니다. 실제 좋아요·신고·외부 API 정보는 변경하지 않았습니다.
- 최신순·인기순·댓글순의 선두 글이 다르고, 각 정렬 기준의 수치가 내림차순인지 확인합니다.
- 모바일에서도 제목·배지·작성자를 읽을 수 있습니다.

PR에 안전한 before/apply/after JSON, 적용 코드 커밋, 데이터 해시, 확인 시간, 목록·검색·상세·댓글 확인 결과를 남깁니다. 운영 적용 전에는 이 체크를 완료로 표시하지 않습니다.

## Owner: 배치만 숨기는 rollback

동일한 운영 대상·배치·소유자·두 쓰기 opt-in 조건으로 실행합니다.

```sh
node scripts/community-demo.mjs --production --rollback --batch=wave-community-demo-2026-v1 --owner=wave-community-demo-fixtures --target=ep-nameless-voice-azo6m14c/neondb > community-demo-rollback.json
```

해당 배치의 글·합성 댓글만 `hidden`으로 바꾸며 물리 삭제하지 않습니다. 그 글에 실제 이용자가 남긴 댓글·좋아요·신고도 보존됩니다. 숨긴 글의 상세 화면은 공개되지 않습니다. 다시 `--apply`하면 같은 배치가 중복 없이 활성화됩니다. 완료 후 현재 shell의 두 쓰기 opt-in 환경변수를 제거합니다.

```powershell
Remove-Item Env:WAVE_COMMUNITY_DEMO_WRITE -ErrorAction SilentlyContinue
Remove-Item Env:WAVE_COMMUNITY_DEMO_PRODUCTION_WRITE -ErrorAction SilentlyContinue
```
