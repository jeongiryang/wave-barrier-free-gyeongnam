# spec-50 메뉴 그림·글자 병기 AI 작업 로그

- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/550
- 제목: feat: 메뉴에 그림과 글자 함께 표시
- 작성자: jeongiryang
- 최종 상태: PR #550 열림. CI `browser (3, desktop)`·`browser (3, mobile)` 실패 (아래 충돌 항목 참조)
- AI 도구: Claude Code

## 목적

`specs/50-nav-icon-labels.md`(P1 접근성)를 구현한다. 상단 주요 메뉴 네 항목은 지금까지 글자만
있었다. 각 항목에 뜻이 분명한 인라인 SVG를 함께 두어, 글을 빨리 읽기 어려운 사용자와 처음 온
사용자가 목적지를 더 빨리 찾게 한다. 그림은 글자를 대체하지 않고 항상 함께 나타난다.

## 역할 구분

- 사람: 명세 결정(그림 뜻, 배치, 접근성 계약, 검증 범위)과 작업 범위 승인
- AI: 코드·CSS·e2e 구현, 성능 예산 초과 원인 조사와 해결, 로컬 검증 실행, 로그 작성

## 구현

- `components/NavIcons.tsx` 신규. 24×24 격자, `stroke-width: 1.8`, `currentColor`, 기본 `aria-hidden`으로
  `AccessIcons.tsx`의 구조를 그대로 따른다. `intro`(물결 두 줄), `planner`(지도 위 경로),
  `festivals`(달력 위 별), `community`(말풍선 두 개) 네 가지.
- `components/WaveHeader.tsx`: 링크 네 개에 `<NavIcon />`과 `<span>`을 함께 넣는다. 문구,
  `aria-current`, `useSitePreferences().t` 사용 방식, 스크롤 숨김 동작은 그대로다.
- `components/PublicMobileNav.tsx`: `PublicNavLink`에 선택 항목 `icon`을 더하고 있을 때만 그린다.
  초점 관리와 `disabled` 처리는 바꾸지 않았다.
- `features/auth/components/AuthUtilityShell.tsx`: 패널 목록에 `icon`을 채운다. `/travel-book`은
  명세가 정한 네 이름에 해당이 없어 글자만 둔다(명세가 허용한 선택 항목).
- `app/styles/simple-wave.css`: 데스크톱 가로 배치(`gap: var(--s-2)`), 767px 이하 세로 배치
  (`flex-direction: column`, `gap: var(--s-1)`, `min-width: 64px`, 그림 22px)를 더한다.
- `e2e/nav-icon-labels.spec.ts` 신규 5건.

## 성능 예산 처리

`npm run check:performance`의 CSS gzip은 변경 전 이미 70.00/70 KiB로 상한의 100%였다. 그림 배치
CSS를 더하자 70.06 KiB로 초과했다. 명세가 정한 완화책인 `app/styles/landing-retired-hero.css`
삭제는 이 파일이 어디에서도 import되지 않아 번들에 들어있지 않았고, 따라서 수치가 전혀 줄지
않았다. 기준을 낮추지 않고 통과시키기 위해, 뒤에 로드되는 `simple-wave.css`가 같은 명시도로
무조건 덮어써서 실제로 적용되지 않던 선언만 제거했다.

- `app/styles/wave-horizon.css`: `.wave-header nav`의 `gap/padding/border-radius/background`,
  `.wave-header nav a`의 `padding/border-radius/font-size`, `[aria-current]` 규칙 전체,
  650px 이하의 `.wave-header nav a` 규칙
- `app/styles/planner-conversation.css`: 640px 이하 `.wave-header nav a`의 `min-width/padding/font-size`
- `app/styles/landing-retired-hero.css` 삭제(명세 지시대로 수행. 번들 감소 효과는 없었다)

결과 CSS gzip 70.00/70 KiB로 통과한다. 헤더의 계산된 스타일은 바뀌지 않으며, 대비·조작 영역
관련 기존 브라우저 검사로 확인했다.

## 검증

- `npm run lint`: 오류 0, 경고 14 (모두 변경 전과 동일한 기존 경고)
- `npm run typecheck`: PASS
- `npm test`: 기존 실패 2건만 남고 그 외 PASS. 두 건(`authenticated gateway applies image admission
  independently`, `dedicated AI runtime waits for startup and never repeats model loading`)은 이 작업 전
  `main`에서도 같은 이유(로컬에 Python 없음)로 실패한다.
- `npm run build:vercel`: PASS
- `npm run check:performance`: PASS. CSS gzip 변경 전 70.00/70 KiB → 변경 후 70.00/70 KiB
- `npm run test:e2e -- e2e/nav-icon-labels.spec.ts --project=desktop-chromium`: 5/5 PASS
- `npm run test:e2e -- e2e/accessibility-final.spec.ts e2e/touch-target-contract.spec.ts
  e2e/mobile-touch-targets.spec.ts --project=desktop-chromium`: 12/12 PASS
- 같은 네 파일 `--project=mobile-chromium`: 17/17 PASS
- `e2e/site-chrome-contrast.spec.ts` `e2e/dark-theme-contrast.spec.ts` `e2e/contrast-fixed-layers.spec.ts`
  `e2e/planner-workspace-responsive.spec.ts` `e2e/simple-landing.spec.ts`
  `e2e/public-presentation-release.spec.ts`: 20/20 PASS
- `e2e/preferences-disclosure-focus.spec.ts`: 4건 FAIL. 로컬과 CI(browser shard 3, desktop·mobile)에서
  모두 재현된다. 아래 "명세와 기존 계약의 충돌" 참조. 테스트를 고치거나 skip 하지 않았다.
- 로컬에서 위 목록 외 전체 `npm run test:e2e`는 시간 문제로 실행하지 않았다. CI는 browser shard 3을
  제외한 모든 job이 통과했다(quality, sandbox-boundary, browser 1·2·4 desktop·mobile).

## 명세와 기존 계약의 충돌 (사람 판단 필요)

`e2e/preferences-disclosure-focus.spec.ts:60`은 한 단어짜리 메뉴 라벨이 줄바꿈되지 않았는지를
`Range.selectNodeContents(link)`의 client rect들의 `Math.round(top)` 가짓수가 1인지로 검사한다.
그림을 링크 안에 넣으면 그림 상자와 글자 상자가 같은 top을 가질 수 없어 이 가짓수가 늘어난다.
실측값은 다음과 같다.

- 1366px(가로 배치): tops `[25, 23, 24]` — 그림 20px, span 23px, 글자 20px. 글자는 줄바꿈되지
  않았고 순전히 세로 정렬 차이다. 링크에 `line-height`를 맞추면 해결할 수 있다.
- 320px(세로 배치): tops `[66, 92, 91]` — 그림이 글자 **위**에 있다. 이것은 명세
  `진입과 화면` 절이 요구한 배치 그 자체다.

즉 320px 실패는 명세가 요구한 세로 배치와 이 테스트의 판정 방식이 정면으로 충돌하는 것이고,
둘 중 하나를 바꾸지 않으면 통과시킬 수 없다. 지시에 따라 기존 테스트를 고치지 않았고, 명세가
정한 배치도 바꾸지 않았다. 1366px만 따로 고치는 것은 320px가 여전히 실패해 job이 붉게 남는
데다, CSS gzip 예산에 남은 여유가 2바이트뿐이라 추가 CSS를 넣으려면 또 다른 파일을 정리해야
해서 하지 않았다. 판단이 필요하다.

- 안 1: 테스트의 판정을 "라벨(span) 안에서만" 줄 수를 세도록 바꾼다(그림을 범위에서 제외).
- 안 2: 명세의 767px 이하 세로 배치를 포기하고 가로 배치를 유지한다.
- 실제 렌더링으로 1440px·960px·390px·320px를 확인했다. 네 항목 모두 그림과 글자가 함께 보이고,
  767px 이하에서 그림이 글자 위로 올라가며, 320px에서도 가로 넘침이 없다. 비밀번호 재설정 화면의
  모바일 메뉴 패널에서도 그림이 함께 보인다.

## 결과와 제한

- 위치정보 관련 호출·저장은 추가하지 않았다. `navigator.geolocation`을 쓰지 않으며 메뉴 선택을
  서버나 브라우저 영구 저장소에 기록하지 않는다.
- CSS gzip 예산이 상한에 정확히 닿아 있어 앞으로 헤더에 CSS를 더 얹으려면 다시 같은 정리가
  필요하다. 남은 여유는 사실상 없다.
- `app/styles/landing-arrival.css` 등 어디에서도 참조되지 않는 CSS 파일이 몇 개 더 있다. 이번
  범위가 아니라 남겨 두었다.
