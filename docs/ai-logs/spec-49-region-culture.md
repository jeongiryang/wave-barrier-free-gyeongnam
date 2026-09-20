# spec-49 지역 노래·이야기 카드 AI 작업 로그

- 브랜치: `codex/spec-49-regional-song-story-cards`
- 제목: feat: 지역 문화 이야기 카드 추가
- 작성자: OpenAI Codex
- PR: https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/640
- 최종 상태: PR #640 열림, 구현 및 로컬 검증 완료

## 목적

소개 화면의 기존 지역 카드에서 공식 출처가 확인된 지역 문화 한 줄을 보여 준다. 특정 녹음의
저작인접권을 임의로 판단하지 않도록 음원·영상 파일과 재생 기능은 두지 않고, 국가유산청
국가유산포털의 공식 설명으로만 연결한다.

## 공식 자료 확인 결과

2026-09-20에 아래 공식 페이지에서 종목과 소재지를 확인했다. 확인할 수 없는 나머지 지역에는
빈 줄이나 추정 자료를 만들지 않는다.

| 지역 | 항목 | 제공 기관 | 공식 안내 |
| --- | --- | --- | --- |
| 밀양 | 밀양아리랑 | 국가유산청 국가유산포털 | https://heritage.go.kr/heri/cul/culSelectDetail.do?ccbaAsno=0000480000000&ccbaCpno=2223800480000&pageNo=1_1_1_1&sngl=Y |
| 진주 | 진주검무 | 국가유산청 국가유산포털 | https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800120000&pageNo=1_1_1_1 |
| 통영 | 통영오광대 | 국가유산청 국가유산포털 | https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800060000&pageNo=1_1_1_1 |
| 고성 | 고성오광대 | 국가유산청 국가유산포털 | https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800070000&pageNo=1_1_1_1 |
| 사천 | 진주삼천포농악 | 국가유산청 국가유산포털 | https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=1273800110100&pageNo=1_1_2_0 |
| 거창 | 거창삼베일소리 | 국가유산청 국가유산포털 | https://www.heritage.go.kr/heri/cul/culSelectDetail.do?ccbaCpno=2223800170000&pageNo=1_1_2_0 |

## 구현

- `features/landing/region-culture.ts`: 출처가 확인된 6개 정적 항목과 지역명 조회 맵을 추가했다.
- `LandingRegionStory.tsx`: 기존 여행지 링크를 바꾸지 않고, 해당 지역에만 제목·40자 이내 소개·
  제공 기관·확인 날짜·새 탭 공식 링크를 겹침 패널로 표시한다.
- `simple-wave.css`: 기존 토큰만 사용해 모든 지역 카드의 높이를 유지하고 링크 조작 영역을 44px로
  고정했다.
- `docs/assets-and-licenses.md`: 사용한 공식 링크와 확인 날짜를 기록했다.
- 단위 테스트와 Playwright 검사에서 지역명 계약, 출처, 음원·위치정보·서버 호출 부재, 카드 정렬,
  반응형 가로 넘침, 링크 보안 속성 및 axe 결과를 고정했다.

새 서버 handler/action, 환경 변수, DB, 위치 권한, 사용자 좌표 저장, 음원 파일·경로·재생 기능은
추가하지 않았다. 문화 항목은 정적 데이터이므로 운영 API 승인도 필요하지 않다.

## CSS 예산

변경 후 CSS gzip은 `69.05 / 70 KiB`로 예산을 통과한다. 저장소에는 import되지 않는 과거 CSS가
있지만, 이는 애초 번들에 포함되지 않아 삭제해도 gzip이 줄지 않는다. unrelated 기록 파일을
삭제하지 않고 실제 성능 검사를 기준 완화 없이 통과시켰다.

## 검증

- `npm run lint`: PASS, 오류 0 / 기존 경고 14
- `npm run typecheck`: PASS
- `npm test`: PASS, 1508/1508
- `npm run build:vercel`: PASS
- `npm run check:performance`: PASS
  - CSS gzip 69.05/70 KiB
  - 랜딩 초기 JS gzip 139.76/155 KiB
  - 플래너 초기 JS gzip 223.85/270 KiB
  - 최대 청크 gzip 60.9/110 KiB
- `e2e/region-culture.spec.ts`: desktop/mobile 14/14 PASS
  - 390px·960px·1440px 카드 높이와 가로 넘침 확인
  - axe 위반 0건

관련 Playwright 흐름을 두 프로젝트에서 실행했으며 전체 e2e 모음은 이 기능 PR에서 다시 실행하지
않았다. 실패한 검사는 없다.

## 제한과 인계

- 공식 출처가 확인된 6개 지역만 표시한다. 18개 지역을 억지로 채우지 않았다.
- 링크 대상의 운영 여부와 내용은 국가유산청이 관리한다. 외부 페이지 내용을 가져오거나 저장하지
  않는다.
- 다른 기능 PR에 의존하지 않으며 `main`에 독립적으로 병합할 수 있다.
- 이 PR에서는 병합·자동 병합·배포를 하지 않는다.
