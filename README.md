<div align="center">
  <img src="./public/favicon.svg" width="88" alt="W.A.V.E 로고" />
  <h1>W.A.V.E</h1>
  <p><strong>이동·편의 조건에 맞는 경남 여행지를 공식 근거로 고르고, 실제 경로와 일정, 출발 전 확인까지 한 흐름으로 잇는 무장애 여행 길잡이입니다.</strong></p>

  <p>
    <a href="https://wave-barrier-free-gyeongnam.vercel.app/"><img alt="W.A.V.E 서비스 열기" src="https://img.shields.io/badge/서비스_열기-0078BD?style=for-the-badge&logo=vercel&logoColor=white" /></a>
    <a href="https://wave-barrier-free-gyeongnam.vercel.app/api/health"><img alt="서비스 설정 상태 확인" src="https://img.shields.io/badge/설정_상태-0B7285?style=for-the-badge" /></a>
  </p>

  <p>
    <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/workflows/ci.yml"><img alt="CI 상태" src="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/workflows/ci.yml/badge.svg" /></a>
    <a href="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/workflows/cd.yml"><img alt="배포 상태" src="https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/workflows/cd.yml/badge.svg" /></a>
    <img alt="Node.js 22" src="https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white" />
  </p>
</div>

## 핵심 사용자 여정

W.A.V.E는 여행자가 실제로 내리는 결정을 네 단계로 나눕니다. 처음에는 한 단계씩
진행하고, 익숙해지면 전체 보기에서 지도와 교통 도구를 한꺼번에 사용할 수 있습니다.
관광 탐색, 일정 작성, 출발 준비와 공유는 로그인 없이 이용할 수 있으며 계정은
커뮤니티 글·댓글·좋아요·신고에만 필요합니다. 등록 이메일로 비밀번호를 복구하고
로그인 뒤 계정 관리에서 비밀번호 변경과 탈퇴를 직접 처리할 수 있습니다.

1. [이동·편의 조건과 날짜를 고릅니다.](https://wave-barrier-free-gyeongnam.vercel.app/planner#conditions)
2. [공식 편의근거가 확인된 장소와 추가 확인이 필요한 장소를 구분해 봅니다.](https://wave-barrier-free-gyeongnam.vercel.app/planner#places)
3. [날짜·시각·순서를 편집하고 실제 경로와 추정 이동을 비교합니다.](https://wave-barrier-free-gyeongnam.vercel.app/planner#itinerary)
4. [날씨·관광 집중률·교통·장소 근거를 다시 확인한 뒤 일정을 보관하거나 공유합니다.](https://wave-barrier-free-gyeongnam.vercel.app/planner#departure-readiness)

| 여행자의 질문 | W.A.V.E가 보여 주는 것 | 판단 기준 |
| --- | --- | --- |
| 내가 이용하기 편한가? | 선택한 조건과 장소별 공식 편의정보 | 긍정 근거가 없으면 일치 점수를 만들지 않음 |
| 어떻게 이동하는가? | 자동차·대중교통 경로와 직선 연결 미리보기 | 실제 제공기관 경로와 추정값을 분리 |
| 어떤 순서가 나은가? | 날짜·시작 시각·장소 순서를 편집하는 일정 | 버튼과 키보드로도 같은 작업 제공 |
| 지금 출발해도 되는가? | 네 가지 출처의 조회 상태와 재확인 항목 | 실패·값 없음·예측을 확인 완료로 표시하지 않음 |
| 여행 뒤 무엇을 남길까? | 이 기기의 여행집·메모·사진 코스·여행 후기 | 로컬 자료, 공유 자료, 공개 게시물을 구분 |

## 기능과 데이터 신뢰

| 기능 | 주소 | 실제 제공 범위 |
| --- | --- | --- |
| 여행 조건과 추천 | [`/planner#conditions`](https://wave-barrier-free-gyeongnam.vercel.app/planner#conditions) · [`#places`](https://wave-barrier-free-gyeongnam.vercel.app/planner#places) | 경남 18개 시·군, 여행 주제, 휠체어·보행·영유아·임산부·시각·청각 조건, 공식 편의근거 기반 추천 |
| 일정과 출발 준비 | [`/planner#itinerary`](https://wave-barrier-free-gyeongnam.vercel.app/planner#itinerary) · [`#departure-readiness`](https://wave-barrier-free-gyeongnam.vercel.app/planner#departure-readiness) | 날짜·시각·순서 편집, 이동·체류시간 계산, 날씨·집중률·교통·장소 상태, `.ics` 저장 |
| 지도와 교통 | [`/planner#navigation`](https://wave-barrier-free-gyeongnam.vercel.app/planner#navigation) | Kakao Maps 또는 Leaflet 대체 지도, 자동차·철도·버스·환승 정보; 제공기관 키와 응답 상태에 따라 범위가 달라짐 |
| 여행 상황 비교 | [`/planner#layers`](https://wave-barrier-free-gyeongnam.vercel.app/planner#layers) | 여행일 날씨와 관광 집중률 예측, 일정 영향, 다른 주제·장소 후보 |
| 내 여행집 | [`/travel-book`](https://wave-barrier-free-gyeongnam.vercel.app/travel-book) | 이 브라우저에 최대 20개 여행의 일정·상태·메모를 보관하고 플래너로 복원 |
| 사진 코스 | [`/photo-course`](https://wave-barrier-free-gyeongnam.vercel.app/photo-course) | 사진 파일 앞부분의 EXIF를 기기에서 읽어 날짜·위치 순서를 복원하고 좌표를 뺀 JSON·공유문 생성 |
| 여행자 이야기 | [`/community`](https://wave-barrier-free-gyeongnam.vercel.app/community) | 실제 이용자 작성 글의 공개 읽기, 계정 기반 글·댓글·좋아요·신고, 장소별 현장 제보와 여러 장소 여행일지 |
| 계정 관리 | `/forgot-password` · `/reset-password` · `/account` | 계정 존재 여부를 노출하지 않는 이메일 비밀번호 복구, 비밀번호 변경, 인증 계정과 연결 커뮤니티 데이터 탈퇴 삭제 |
| 공유 여행 | `/trip/{id}` | 선택 조건과 공식 장소 식별자를 30일간 보관하고 열 때 최신 관광정보로 다시 구성 |
| 환경설정과 설치 | 화면 오른쪽 위 `환경설정` | 밝은·어두운 화면, 동작 감소, 언어 선택, 지원 브라우저의 명시적 앱 설치 요청 |

데이터의 출처와 성격은 합쳐 표시하지 않습니다.

| 데이터 성격 | 화면 표시와 처리 |
| --- | --- |
| 공식 관광·무장애 정보 | 제공기관, 확인 항목, 가능한 경우 조회 시각을 표시하고 긍정 근거만 조건 일치에 반영 |
| 교통 제공기관 경로 | 제공기관 응답이 실제 출발지→목적지 경로를 포함할 때만 실제 시간·거리·요금으로 표시 |
| 직선거리·기본 체류시간 | `미리보기`, `추정`처럼 계산값임을 표시 |
| 관광 집중률 | 예측 기준일과 함께 표시하며 실시간 방문자 수로 표현하지 않음 |
| 여행자 현장 제보 | 작성자 한 명의 경험으로 표시하고 공식 편의점수에 합산하지 않음 |
| 조회 실패·값 없음 | 실패 응답은 캐시하지 않고 `재확인 필요`, `정보 없음`으로 표시 |

한국관광공사와 공공데이터포털의 관광 원본 응답은 요청 시 조회하며 W.A.V.E
데이터베이스에 원문 전체를 복제하지 않습니다. 저장한 공유 여행은 장소 식별자로
최신 관광정보를 다시 확인합니다. `/api/health`는 외부 제공기관의 정상 응답을
보증하는 상태 확인이 아니라 현재 배포에 필요한 키가 설정됐는지를 보여 줍니다.

## 접근성, 개인정보와 저장 범위

- 본문과 조작 요소는 키보드 이동, 보이는 초점, 44px 이상 터치 영역, 명암 대비,
  `prefers-reduced-motion`과 화면 내 동작 감소 설정을 기준으로 검사합니다.
- 일정 순서와 날짜 변경은 드래그 없이 버튼과 키보드로도 할 수 있습니다.
- 지도·외부 예약 사이트·제공기관 콘텐츠는 각 서비스의 접근성 수준에 영향을 받습니다.
  지도 없이도 장소 카드와 일정에서 핵심 정보를 확인할 수 있게 유지합니다.
- 한국어가 전체 기준 언어입니다. 영어·일본어·중국어·프랑스어·독일어·러시아어는
  주요 소개와 조작 중심이며 관광지 원문은 한국어로 표시될 수 있습니다.
- 테마·언어·동작 설정, 여행 프로필, 저장 장소, 일정과 내 여행집은 브라우저의
  `localStorage`에 저장됩니다. 브라우저 데이터 삭제 시 함께 사라지며 서버 백업 대상이 아닙니다.
- 사진 코스는 원본 사진을 업로드하지 않습니다. 최대 200장의 EXIF 앞부분을 브라우저에서
  순서대로 읽고, 내보내기와 공유에서는 좌표를 제거합니다.
- 현재 위치는 사용자가 버튼을 누를 때 브라우저 권한을 요청합니다. 지도 표시와 경로 조회에
  사용하며, 경로 조회 시 출발·도착 좌표가 W.A.V.E API를 거쳐 연결된 Kakao·ODsay에
  전달될 수 있습니다. W.A.V.E 데이터베이스와 운영 이벤트에는 좌표를 저장하지 않습니다.
- 공유 여행에는 선택 조건, 날짜 배정, 출발지의 표시 이름과 공식 장소 식별자가 저장됩니다.
  정확한 출발 좌표는 저장하지 않으며 30일 뒤 조회에서 제외하고 매일 예약 정리합니다.
- 커뮤니티에는 Neon Auth 사용자 참조 ID·표시 이름과 사용자가 작성한 글·댓글·좋아요·신고가
  저장됩니다. 커뮤니티 테이블은 이메일과 비밀번호를 저장하지 않으며, 계정 탈퇴 시
  해당 사용자와 연결된 커뮤니티 데이터를 함께 삭제합니다.
- 로그인 없이 보내는 장소 제보에는 장소 식별자·이름·분류·작성 내용과 시각이 저장됩니다.
  개인정보를 작성하지 않아야 하며, 애플리케이션 코드는 분석·광고 추적 서비스를 연결하지 않습니다.

세부 운영 기준과 확인 절차는 [운영·보안·개인정보 안내](docs/operations.md)에 있습니다.
현재 키 등록과 제공처별 실응답 판정은 [API·환경 변수 전수조사](docs/api-integration-audit.md)에
정리되어 있습니다.
W.A.V.E는 시설 운영 여부나 여행 안전을 보증하지 않으므로 출발 전 운영기관의 최신 안내를
다시 확인해야 합니다.

## 실행과 저장소 구조

요구 사항은 Node.js `22.13.0` 이상, npm, Git입니다.

```bash
git clone https://github.com/jeongiryang/wave-barrier-free-gyeongnam.git
cd wave-barrier-free-gyeongnam
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 `Copy-Item .env.example .env.local`로 환경 파일을 만듭니다.
기본 로컬 주소는 `http://localhost:3000`이며 포트가 사용 중이면 터미널에 표시된 주소를
사용합니다. 실제 키는 `.env.local`, Vercel 환경 변수 또는 GitHub Secret에만 두고
커밋하지 않습니다.

| 변수 | 필요도 | 사용처 |
| --- | --- | --- |
| `TOUR_API_SERVICE_KEY_ENCODED` | 핵심 | 관광·무장애·사진과 승인된 공공 교통 API |
| `KAKAO_MAP_JAVASCRIPT_KEY` | 핵심 | 브라우저 지도 SDK |
| `KAKAO_REST_API_KEY` | 핵심 | 장소 검색·자동차 경로 서버 호출 |
| `KORAIL_API_KEY`, `TAGO_API_KEY` | 선택 | 별도 발급한 철도·버스 키; 승인 범위에 따라 공통 키 사용 |
| `ODSAY_API_KEY`, `EXPRESSWAY_API_KEY` | 선택 | 대중교통 경로·고속도로 정보 보강 |
| `DATABASE_URL` | 저장 기능 | Neon pooled Postgres 연결 문자열 |
| `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | 계정 기능 | Neon Auth 주소와 32자 이상 쿠키 서명 비밀값 |
| `CRON_SECRET` | 운영 | 공유 여행 보관기간 정리 요청 인증 |
| `COMMUNITY_MODERATOR_USER_IDS` | 커뮤니티 운영 | 신고를 처리할 Neon Auth 사용자 ID 목록 |

```text
app/                    페이지, 레이아웃, API·메타데이터 라우트
components/             공통 화면과 환경설정
features/               여행 설계·지도·여행집·사진 코스·커뮤니티 기능
lib/                    브라우저·서버 공통 검증과 순수 로직
server/                 관광·교통·날씨·저장 제공기관 모듈
worker/index.ts         서버 API 진입점
migrations/             Neon Postgres 스키마 변경
public/                 아이콘과 정적 자산
tests/, e2e/            로직·운영 정책·브라우저·접근성 회귀 검사
scripts/                빌드·사진 점검·릴리즈 도구
docs/                   운영과 설계 기록
.github/workflows/      CI·배포 자동화
```

## 배포와 운영

Vercel을 웹과 서버 함수의 단일 운영 환경으로 사용하고, 서비스가 직접 만든 영속
데이터만 Neon Postgres에 저장합니다. 설치 순서는 [Vercel·Neon 설정 안내](docs/vercel-neon-setup.md)에
정리되어 있습니다.

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build:vercel
```

CI는 위 검사를 실행합니다. `main`의 CI가 성공하면 CD가 같은 커밋으로 후보 배포를
만들고 `/api/health`를 확인한 뒤 데이터베이스 변경을 적용하고 프로덕션으로 승격합니다.
승격 뒤 상태 확인이 실패하면 Vercel rollback을 실행합니다. Vercel 자체 Git 배포는
중복 배포를 막기 위해 꺼져 있습니다.

공유 여행 만료와 사용하지 않은 계정 삭제 정리 권한은 매일 `03:17 UTC`에 실행되는 예약 작업에서 정리하고,
공유 여행은 저장 요청 때도 소량 보완합니다.
애플리케이션 저장소에는 Neon 백업 일정이나 복구 시점 목표가 코드로 설정되어 있지 않으므로,
운영자는 배포 전 Neon의 백업·복구 설정과 복원 훈련을 별도로 완료해야 합니다. 장애 분류,
롤백, 데이터 복구와 사후 확인 절차는 [운영 안내](docs/operations.md)를 따릅니다.

---

<div align="center">
  <strong>W.A.V.E — 모두의 이동 조건이 여행의 시작점이 되도록.</strong><br />
  <a href="https://wave-barrier-free-gyeongnam.vercel.app/">지금 W.A.V.E 열기</a>
</div>
