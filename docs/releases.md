# W.A.V.E 시맨틱 버전 이력

W.A.V.E는 정식 1.0 출시 전까지 `0.x.y` 버전을 사용한다. 병합된 PR 한 건을
하나의 릴리즈 단위로 보고 다음 규칙을 적용한다.

- `feat`: 마이너 버전을 올리고 패치를 `0`으로 초기화
- `fix`, `docs`, `chore`: 패치 버전을 1 증가
- 버전 태그는 해당 변경이 포함된 `main` 커밋을 가리킴
- 릴리즈 본문에는 PR 번호, 제목, 전체 커밋 SHA를 기록

## 백필 범위

- 시작: PR #1 — `v0.1.0`
- PR #35 — `v0.7.0`
- 백필 자동화 PR #36 — `v0.7.1`
- 백필 권한 수정 PR #37 — `v0.7.2`
- 백필 경쟁 조건 수정 PR #38 — `v0.7.3`
- 과거 커밋 태그 생성 수정 PR #39 — `v0.7.4`
- 릴리즈 기준 태그 안전장치 PR #40 — `v0.7.5`
- README 최신화 PR #41 — `v0.7.6`
- 지역 여행 친구 PR #42 — `v0.8.0`
- 총 37개 PR 기반 버전

PR #37 병합 때 백필과 일반 릴리즈 워크플로가 동시에 실행돼 잘못 생성된
`v0.1.1`은 PR #38의 제한적 교정 로직이 제거한 뒤, 원래 대상인 PR #3
커밋에 다시 생성한다. 교정은 해당 태그의 SHA와 릴리즈 본문이 알려진 경쟁
조건 산출물과 모두 일치할 때만 수행한다. 교정은 성공했으며, 과거 커밋 태그는
checkout이 보관한 Actions 토큰으로 lightweight tag를 먼저 push한 뒤 해당 태그에
릴리즈를 연결한다.

과거 커밋 중 GitHub Actions 워크플로 변경을 포함한 커밋은 기본
`GITHUB_TOKEN`으로 태그를 만들 수 없다. 따라서 백필은 저장소 Secret
`RELEASE_GITHUB_TOKEN`에 `Contents: read/write`와 `Workflows: read/write`
권한이 있는 fine-grained token을 등록한 뒤 `Release Backfill`을 수동 실행한다.
`v0.8.0`이 확인되기 전까지 일반 `Release`는 새 버전을 만들지 않아 불완전한
이력 위에 잘못된 버전이 생기지 않는다.

실제 전체 매핑은 검증·실행 가능한
[`scripts/backfill-releases.mjs`](../scripts/backfill-releases.mjs)에 단일 원본으로 둔다.

> PR #1의 GitHub API `merge_commit_sha`는 현재 `main`의 조상이 아니다. 현재
> `main`에서 동일 변경을 담고 있는 통합 커밋 `000f6a0`을 `v0.1.0` 기준으로
> 사용해 태그 이력이 실제 배포 계보에서 끊기지 않게 했다.

## 이후 릴리즈

백필 이후에는 `main`에 PR이 병합될 때마다 `Release` 워크플로가 병합 커밋 제목을
판독한다. `feat:`는 다음 마이너 버전, 나머지 Conventional Commit 유형은 다음
패치 버전을 만들며, 생성 직후 태그 SHA가 병합 커밋과 일치하는지 확인한다.
