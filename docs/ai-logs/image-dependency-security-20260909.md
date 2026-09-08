# Image dependency security patch AI 작업 로그

- PR: 생성 전 — Refs #355
- 제목: Next·sharp 및 js-yaml 보안 패치 버전 고정
- 작성자: Codex Engineering Agent (`operations_issue_audit`)
- 최종 상태: 로컬 검증 PASS; 커밋·hosted CI·배포·독립 QA 전
- AI 도구: Codex, 공식 보안 권고/릴리스 읽기, 로컬 npm 및 Git
- 기준: `eab2442f90b72441fd311db13dd8bb935723527f`, `fix/image-dependency-security-20260909`

## 목적

2026-09-09 KST의 production 의존성 감사에서 Next 16.3.1(critical)과 sharp 0.35.3(high)이 보고됐다. Next와 eslint-config-next를 16.3.4로 함께 고정하고 Next의 optional dependency를 통해 sharp 0.35.4를 설치한다. 이후 전체 감사에서 발견된 기존 개발 의존성 js-yaml 4.3.1(high)도 Owner가 기존에 위임한 보안 수정 범위에서 4.3.2로 고정한다. 원래 production 감사 2건과 첫 전체 감사 실패는 별도 증거 폴더에 보존한다.

## 역할 구분

- Owner/PM: 별도 보안 작업 우선순위와 범위 승인, PR 및 배포 진행 판단.
- 이 AI: 공식 권고와 실행 경로 조사, 승인된 의존성 두 파일 및 이 로그 수정, 로컬 검사. 이 패치의 구현자이므로 독립 QA 또는 사람 승인을 대신하지 않는다.
- 원래 #353 제품 작업의 25개 변경 파일은 다른 작업 트리에 보존되며 이번 패치에 포함하지 않는다.

## 변경과 공급망 검토

- `next`, `eslint-config-next`: `16.3.1` → `16.3.4`로 정확히 고정.
- lockfile: root 항목과 40개 패키지 항목만 변경. Next/`@next` 및 sharp/`@img`의 필요한 플랫폼별 의존성 39개와 추가 승인된 js-yaml 한 항목이다. sharp는 `0.35.4`, libvips 배포 패키지는 `1.3.3`이다.
- js-yaml: `4.3.1` → `4.3.2`. [유지관리자 권고](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)의 빈 YAML merge source 처리에 따른 CPU 소모 문제를 수정한 동일 minor 패치다. 기존 `argparse ^2.0.1` 의존성과 MIT 라이선스는 유지된다. 조사한 직접 사용처는 workflow/운영 설정을 읽는 테스트이며 공개 앱의 YAML 입력 경로는 발견되지 않았다. 개발 의존성이라는 이유로 발견된 high를 무시하지 않았다.
- 추가 override나 직접 sharp 의존성을 만들지 않았다. 기존 override와 React, React DOM, RSC, vinext, Nitro, Vite, ESLint, TypeScript 항목은 그대로다.
- scripts를 실행하지 않는 lockfile 갱신 후 변경 범위, npm registry URL과 integrity 존재를 검토한 뒤 정상 `npm ci`를 실행했다.
- Next의 Node `>=20.9.0`, React 19 호환 범위 및 eslint-config-next의 ESLint `>=9` 범위가 기존 고정 버전을 수용한다. 대규모 업그레이드나 codemod는 필요하지 않다.

## 실제 실행 경로와 한계

[Windows Next 서버 권고](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36)는 영향받는 Next 서버의 Windows 경로 처리에 관한 것이다. [Next AVIF 권고](https://github.com/vercel/next.js/security/advisories/GHSA-2xp9-vwfh-vxw4)와 [sharp 권고](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c)는 신뢰하지 않는 AVIF 입력의 디코딩 경로와 관련된다. [Next 16.3.4](https://github.com/vercel/next.js/releases/tag/v16.3.4)는 패치된 sharp를 사용하면서 AVIF 최적화를 다시 제공한다. [sharp 0.35.4](https://github.com/lovell/sharp/releases/tag/v0.35.4)는 수정된 libheif를 포함한다.

이 저장소의 build/dev는 Vite + vinext이며 Nitro의 Vercel 함수 설정은 `nodejs22.x`다. `next/image`를 사용하는 여행 기록 페이지는 `unoptimized`를 명시하고 나머지 조사 대상 사진은 일반 이미지 요소다. 앱에 직접 sharp 사용은 발견되지 않았다. 조사한 vinext RSC 서버의 `/_vinext/image` 경로는 URL 검증 후 원본으로 302 응답하며 sharp 변환을 호출하지 않는다. 생성된 로컬 Vercel 함수에도 이 경로가 확인됐다.

따라서 조사한 실행 경로에서 취약한 Next 서버 또는 sharp 디코더의 실제 도달 가능성을 입증하지는 못했다. 이것을 감사 오탐이나 패치 면제 사유로 판단하지 않는다. 로컬 빌드 검토는 다운로드한 Production 바이너리 검증이 아니며, 공격 시도·취약성 악용 검증·Production 침해 확인을 수행하지 않았다. GitHub advisory database의 9월 8일 게시와 유지관리자의 8월 권고 날짜를 Production 사고 발생일로 해석하지 않는다.

## 검증

- 로컬 환경: Windows, Node `v24.14.0`, npm `11.9.0`. 배포 함수의 `nodejs22.x`와 구분한다.
- `npm install --package-lock-only --ignore-scripts --no-fund`: PASS.
- 구조화한 lockfile 범위 검토와 `git diff --check`: PASS.
- `npm ci --no-fund`: PASS, 618 packages 설치. 기존 이메일 패키지 등의 deprecation 경고는 보존했다.
- js-yaml의 lock-only 갱신 뒤 일반 install이 `up to date`를 보고했지만 직접 읽은 설치 파일은 여전히 4.3.1이었다. 그 시점의 tree/audit는 lockfile 기준 결과로만 보존한다. 경로를 검증한 뒤 기존 js-yaml 폴더를 증거 폴더로 이동 보존하고 `npm install --save-dev --save-exact js-yaml@4.3.2 --ignore-scripts --no-fund`로 한 패키지만 다시 설치했다.
- 최종 설치 파일 검증: Next/eslint-config-next `16.3.4`, sharp `0.35.4`, js-yaml `4.3.2` 모두 일치. `npm ls ... --all --json`: PASS.
- 실제 모듈 로드: js-yaml의 정상 YAML 파싱 PASS. sharp로 기존 `hero-coast-small.webp`(840×473)를 디코딩하고 64×36 PNG로 변환·재디코딩 PASS. 실제 sharp `0.35.4`, libvips `8.18.6`, libheif `1.23.2`. 이 작은 로컬 smoke는 네트워크 요청·악성 입력 0건이며 취약성 악용 검사가 아니다.
- 최종 `npm audit --omit=dev --json`: PASS, 모든 severity 0건. 완료 `2026-09-08T22:35:01.164Z` (`2026-09-09 07:35:01 KST`).
- 최종 `npm audit --json`: PASS, 모든 severity 0건. 완료 `2026-09-08T22:35:01.231Z` (`2026-09-09 07:35:01 KST`).
- 실제 설치 수정 후 다시 실행한 `npm run lint`: PASS, error 0 / 기존 warning 5. `npm run typecheck`: PASS.
- 실제 설치 수정 후 `npm test`: 707 PASS, fail/cancelled/skipped/todo 0. 기존 YAML workflow/운영 계약 검사 포함, 테스트 수정 없음.
- 실제 설치 수정 후 `npm run build:vercel`: PASS. `npm run check:performance`: PASS. gzip KiB는 CSS `69.86/70`, landing initial JS `121.12/155`, planner initial JS `269.85/270`, largest JS chunk `95.92/110`; landing raw JS `372.44/520`이다.
- 전체 로컬 E2E는 이 작업에서 실행하지 않는다. 최종 커밋의 hosted CI와 독립 QA는 후속 게이트다.

## 결과와 제한

증거 경로: `D:/wave-db-binding-preflight-20260908/image-dependency-security-20260909/`. 원래 취약성 감사, 변경 전 package/lockfile, 첫 전체 감사 실패(`05-audit-full.log`), 설치 불일치와 원래 폴더, 최종 변경 범위 JSON, 각 명령 로그와 종료 상태를 보존한다. 실제 설치 확인 후의 최종 검사는 `23-runtime-dependency-smoke.json` 및 `24-`~`31-` 증거다. UI, 테스트, workflow, 성능 예산을 변경하지 않는다. 과거 CI867/868 성공을 이 패치의 CI 결과로 재사용하지 않았다. 이 로그는 구현/로컬 검증 기록이며 Production 배포 성공, 전체 제공처 성공 또는 최종 Release GO를 주장하지 않는다.
