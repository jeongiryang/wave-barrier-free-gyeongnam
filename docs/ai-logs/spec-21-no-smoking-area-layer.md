# 공식 금연구역 편의지도 레이어 AI 작업 로그

- PR: 생성 후 갱신
- 제목: feat: 공식 금연구역 편의지도 레이어 추가
- 작성자: Codex
- 최종 상태: PR 검토 대기
- AI 도구: Codex

## 목적

공개 관광지 기준으로 공식 실외 금연구역을 지도에서 확인하되, 금연구역을 흡연 가능 장소로 뒤집지 않고 사용자 위치·흡연 여부를 수집하지 않는다.

## 역할 구분

- 사람: 공공데이터포털 `전국금연구역표준데이터` 활용 등록, 서버 키 설정, 최종 승인과 Production 실호출 확인
- AI: 공식 명세 조사, 서버·UI·상태·캐시 구현, 합성 fixture 검증, 문서와 PR 작성

## 데이터 검증

- 공식 데이터셋: 전국금연구역표준데이터 (`https://www.data.go.kr/data/15013192/standard.do`)
- 제공기관: 지방자치단체, 소관기관 보건복지부, 실외 금연구역만 제공
- OpenAPI: `https://api.data.go.kr/openapi/tn_pubr_public_prhsmk_zn_api`, HTTPS, JSON/XML, 개발·운영 자동승인 안내
- 인증: 공공데이터포털 서비스키. 기존 서버 전용 `TOUR_API_SERVICE_KEY_ENCODED` 재사용
- 확인 필드: `prhsmkNm`, `prhsmkScopeDesc`, `ctprvnNm`, `signguNm`, `rdnmadr`, `lnmadr`, `institutionNm`, `latitude`, `longitude`, `referenceDate`
- 경남 표본: 경상남도 의령군 제공기관 데이터가 공식 포털에 존재함을 확인. 현재 계정의 이 API 활용승인이 없어 실호출 건수는 확인하지 않았으며 0건으로 단정하지 않음
- 결정: 흡연구역이 아니라 공식 데이터 의미 그대로 `kind: no-smoking`, 화면 이름 `금연 구역`으로 구현

## 검증

- `npm test`: 1,513개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 오류 0, 기존 경고 14
- `npm run build:vercel`: 통과
- `npm run check:performance`: 통과(CSS gzip 68.93/70KiB, Planner 초기 JS gzip 223.86/270KiB)
- `node --test tests/provider-budget-inventory.test.mjs tests/smoking-area.test.mjs tests/smoking-area-handler.test.mjs tests/facility-layers.test.mjs`: 25개 통과
- `playwright test e2e/smoking-area.spec.ts e2e/facility-layers.spec.ts --project=desktop-chromium --workers=1`: 15개 통과, 390px·960px·1440px와 axe 포함
- 실제 제공처 호출: 미실행. 현재 계정 활용승인 전 상태이므로 합성 fixture 결과와 구분함

## 결과와 제한

- 실제 위치 레코드를 하드코딩하지 않았다. 테스트 위치는 합성 fixture다.
- Owner가 OpenAPI를 활용 등록한 뒤 Production에서 실제 경남 표본 수·응답 상태를 확인해야 한다.
- 새 환경 변수나 유료 API는 추가하지 않았다.
