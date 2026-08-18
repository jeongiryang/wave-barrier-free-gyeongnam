# W.A.V.E — 경남 무장애 관광 플랫폼

W.A.V.E는 경상남도 18개 시·군의 관광지, 무장애 편의정보, 교통, 혼잡도,
사진과 날씨를 한 화면에서 비교하고 개인 조건에 맞는 여행지를 추천하는
웹 서비스입니다.

## 운영 기준

- [공모전 운영·데이터 정책](docs/competition-operation-policy.md)
- 공식 서비스는 Vercel Production 도메인 하나로 운영합니다.
- 영속 데이터가 필요할 때는 Neon Postgres를 사용하되, 한국관광공사
  OpenAPI 원본 응답은 저장하지 않고 실시간 호출합니다.
- 사용자의 GPS 좌표는 브라우저 안에서만 사용하며 서버와 DB로 전송하지 않습니다.

## 주요 기능

- 경남 18개 시·군 기반 관광지 추천
- 휠체어, 보행 불편, 영유아 동반, 임산부, 시각·청각 지원 조건 반영
- 한국관광공사 관광·사진·무장애 여행 데이터 연동
- 카카오맵, 자동차 경로, 로드뷰와 주변 장소 탐색
- KORAIL·TAGO 기반 철도·버스·고속·시외 교통정보 조회
- 관광지 집중률, 현재 날씨와 7일 예보 및 여행 준비 안내
- 추천 여행지 비교, 출발지·목적지 선택, 여행 계획 공유
- 반응형 화면, 다크 모드, 다국어, 스켈레톤 로딩

## 기술 구성

- React 19, Next.js 16 App Router 호환 구조
- Vinext, Vite 8, TypeScript
- Vercel 프런트엔드·Functions 통합 배포
- Neon Postgres 기반 서비스 영속 데이터 저장 예정
- Nitro 기반 Vercel Build Output 생성
- Leaflet 및 Kakao Maps JavaScript SDK
- GitHub Actions CI

## 로컬 실행

### 1. 준비 사항

- Node.js `22.13.0` 이상
- npm
- Git

### 2. 저장소 받기

```bash
git clone https://github.com/jeongiryang/wave-barrier-free-gyeongnam.git
cd wave-barrier-free-gyeongnam
npm ci
```

### 3. 환경 변수 설정

macOS·Linux·WSL:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

`.env.local`에 발급받은 키를 입력합니다. 실제 키는 Git에 올리지 않습니다.

```dotenv
TOUR_API_SERVICE_KEY_ENCODED=
KAKAO_MAP_JAVASCRIPT_KEY=
KAKAO_REST_API_KEY=
KORAIL_API_KEY=
TAGO_API_KEY=
ODSAY_API_KEY=
EXPRESSWAY_API_KEY=
```

필수 키는 공공데이터포털 일반 인증키(Encoded), 카카오 JavaScript 키,
카카오 REST API 키입니다. KORAIL·TAGO가 같은 공공데이터포털 인증키를
사용하는 승인 건이면 별도 키 항목은 비워도 됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속합니다. 포트가 사용 중이면
터미널에 표시된 실제 주소로 접속합니다.

### 5. 검사

```bash
npm run lint
npm run build:vercel
```

## 브랜치와 협업 규칙

`main`은 항상 배포 가능한 상태로 유지합니다.

```bash
git switch -c feat/기능명
git add .
git commit -m "feat: 기능 설명"
git push -u origin feat/기능명
```

GitHub에서 Pull Request를 만들고 CI가 통과한 뒤 `main`에 병합합니다.
Vercel은 병합된 `main` 커밋을 감지하여 공식 Production 환경을 자동 배포합니다.

## GitHub Actions CI

`.github/workflows/ci.yml`은 Pull Request와 `main` push마다 다음 작업을
실행합니다.

1. 잠금 파일 기준 의존성 설치
2. ESLint 정적 검사
3. Vercel용 프로덕션 빌드

저장소의 `Settings → Branches → Branch protection rules`에서 `main`에
다음 규칙을 권장합니다.

- Pull Request 없이 직접 병합 금지
- CI 성공 필수
- 최소 1명 승인 필수
- 최신 `main` 반영 필수

## Vercel 배포

1. Vercel에서 `Add New → Project`를 선택합니다.
2. `jeongiryang/wave-barrier-free-gyeongnam` 저장소를 가져옵니다.
3. Production Branch를 `main`으로 설정합니다.
4. 저장소의 `vercel.json` 설정을 그대로 사용합니다.
5. `.env.example`의 키를 Project Settings → Environment Variables에 등록합니다.
6. Deploy를 실행합니다.

빌드 명령은 `npm run build:vercel`이며 Nitro가 Vercel Build Output API 규격의
`.vercel/output`을 자동 생성합니다. Vercel의 Output Directory는 별도로
재정의하지 않습니다.
이후 `main`에 병합되면 Vercel이 자동으로 다시 배포합니다.

Render와 ChatGPT Sites는 공식 배포 대상으로 사용하지 않습니다. 기존 Render
서비스가 남아 있다면 Render Dashboard에서 Auto-Deploy를 끄거나 서비스를
삭제하여 중복 배포를 중단합니다.

카카오 개발자 콘솔의 JavaScript SDK 도메인에는 Vercel의 실제
`https://...vercel.app` 도메인과 사용하는 커스텀 도메인을 등록해야 합니다.

## 데이터 보관

- Vercel Functions의 메모리는 영구 저장소가 아니므로 공유 여행과 접근성 제보는
  Neon Postgres로 이전합니다.
- Neon에는 서비스 자체 데이터와 사용자 생성 데이터만 저장합니다.
- 한국관광공사 관광지·사진 데이터는 실시간 OpenAPI 호출을 원칙으로 합니다.
- 세부 기준은 [공모전 운영·데이터 정책](docs/competition-operation-policy.md)을 따릅니다.

## API 연결 확인

배포 후 다음 주소에서 환경 변수 인식 상태를 확인할 수 있습니다.

```text
/api/health
```

`configured`는 키가 런타임에 전달됐다는 의미입니다. 실제 제공기관의 응답은
서비스의 API 진단 화면과 각 조회 기능에서 함께 확인합니다.

## 보안 규칙

- `.env.local`과 실제 인증키는 커밋하지 않습니다.
- 브라우저에 필요한 카카오 JavaScript 키 외의 서버 키는 공개 코드에 넣지 않습니다.
- 키가 노출되면 해당 제공기관에서 즉시 재발급하고 배포 환경 변수를 교체합니다.

## 참고

- [한국관광공사 TourAPI](https://api.visitkorea.or.kr/)
- [공공데이터포털](https://www.data.go.kr/)
- [Kakao Maps API](https://apis.map.kakao.com/)
- [Vercel 문서](https://vercel.com/docs)
- [Neon 문서](https://neon.com/docs)
- [Vinext](https://github.com/cloudflare/vinext)
