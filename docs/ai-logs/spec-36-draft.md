# PR #미정 AI 작업 로그

- PR: 생성 후 연결
- 제목: 인구감소지역 여행 안내 추가
- 작성자: Codex (사람의 요구사항과 명세에 따라 작업)
- 최종 상태: 검토 대기
- AI 도구: Codex

## 목적

행정안전부의 공식 인구감소지역 지정 고시에 근거해 경남 11개 시군을 소개 화면과 여행 설계의 지역 선택에서 알리고, 다른 지역을 숨기지 않는 선택형 순서 필터를 제공한다.

## 역할 구분

- 사람: 명세와 개인정보 원칙 제공, 독립 PR 작성 지시, 최종 검토·병합 결정
- AI: 행정안전부 공식 출처 확인, 정적 데이터·화면·스타일·테스트 구현, 자동 검사 실행, PR 작성
- 사람만 수행: 최종 승인과 병합. API 키나 Secret 입력은 이 기능에 필요하지 않다.

## 공식 데이터 근거

- 고시: 「인구감소지역 지정 고시」(행정안전부고시 제2021-66호, 2021-10-19)
- 고시 원문: https://www.mois.go.kr/frt/bbs/type001/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000016&nttId=90651
- 현재 지정 현황: https://www.mois.go.kr/frt/sub/a06/b06/populationDecline/screen.do
- 확인일: 2026-09-20
- 경남 11개 시군: 거창군, 고성군, 남해군, 밀양시, 산청군, 의령군, 창녕군, 하동군, 함안군, 함양군, 합천군

## 검증

- `node --test tests/declining-regions.test.mjs`: 통과(3/3)
- `npm run typecheck`: 통과
- `npm run lint`: 통과(기존 경고 14건, 오류 0건)
- `npx playwright test e2e/declining-regions.spec.ts --project=desktop-chromium --workers=1`: 통과(2/2)
- `npx playwright test e2e/declining-regions.spec.ts --project=mobile-chromium --workers=1`: 통과(2/2)
- `npx playwright test e2e/declining-regions.spec.ts e2e/landing-regions.spec.ts e2e/compact-journey.spec.ts --project=desktop-chromium --workers=1`: 통과(15/15)
- `npm run build:vercel`: 통과
- `npm run check:performance`: 통과(CSS 69.23/70 KiB, 랜딩 JS 139.81/155 KiB, 플래너 초기 JS 223.86/270 KiB, 최대 청크 60.91/110 KiB)
- `npm test`: 1506건 통과, 2건 실패. 이 환경에 Python 실행 파일이 없어 `assistant-photo.test.mjs`, `assistant-runtime.test.mjs`가 종료 코드 9009로 실패했으며 이번 변경 경로와 무관하다.
- Playwright로 390px, 960px, 1440px 가로 넘침 없음과 해당 구역 axe 위반 0건을 확인했다.

## 결과와 제한

- 지정 여부와 출처만 정적으로 표시하며 인구 수, 감소율, 위험 지수는 다루지 않는다.
- 순서 필터는 React 메모리에만 존재하고 새로고침 시 꺼진다. 다른 지역을 숨기거나 추천 우선순위를 바꾸지 않는다.
- 새 API, 서버 action, DB, 환경 변수, 위치 권한, 저장소, 네트워크 요청을 추가하지 않았다.
- 공식 고시는 변경될 수 있으므로 향후 행정안전부 지정 현황과 `checkedOn`을 함께 갱신해야 한다.
- 병합과 배포는 수행하지 않는다.
