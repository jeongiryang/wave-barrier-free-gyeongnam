# W.A.V.E API·환경 변수 전수조사

검증 기준일: **2026-09-05 UTC**  
대상: `main` `3e779171725cdeec1b479838b5875cc57a2ab4c6`, Vercel Production

이 문서는 키 값을 기록하지 않는다. `/api/health`의 설정 상태, 실제 Production 응답,
성공한 CI/CD와 코드의 환경 변수 소비 경로만 대조한다.

## 현재 상태 (2026-09-05)

Production smoke 27/27은 응답 경계 검사이며 모든 사용자 흐름의 정상 동작 보장이 아니다.
특히 광역 외 사진·휴게소, 환승 횟수, 날짜·지도 정합성은 [런칭 검증 기록](launch-audit-2026-09-05.md)에서 별도로 추적한다.
과거 8개 언어 실호출 기록과 달리 이번 작업의 지원 언어는 한국어·영어 두 가지다.

## 결론

- 필수 외부 API와 서비스 기반 환경 변수는 모두 등록되어 실제 기능이 동작한다.
- `ODSAY_API_KEY`, `EXPRESSWAY_API_KEY`는 사용자 등록·수정 후 Production 호출이 확인됐다. 현재 추가 발급이 필요한 런타임 API 키는 없다.
- `KORAIL_API_KEY`, `TAGO_API_KEY`는 현재 공공데이터포털 일반 인증키로 각 API가
  실제 동작하므로 중복 등록하지 않는다.
- `COMMUNITY_MODERATOR_USER_IDS`와 Neon 사용자 자체 삭제는 API 키가 아니라 운영 설정이다.

## 외부 데이터·지도 API

| 제공처·기능 | 환경 변수 | Production 판정 | 실제 확인 결과 |
| --- | --- | --- | --- |
| 한국관광공사 TourAPI·무장애·관광사진·데이터랩 | `TOUR_API_SERVICE_KEY_ENCODED` | 등록·정상 | 무장애, 국문 관광, 오디오, 두루누비, 지역 중심·연관 관광지, 사진, 방문자·수요, 캠핑·반려동물·웰니스·행사·숙박 응답 확인 |
| TourAPI 다국어 | 위와 동일 | 등록·정상 | 한국어·영어·일본어·중문 간체·중문 번체·프랑스어·독일어·러시아어 8개 서비스 `live` 확인 |
| KORAIL 운행계획 | 공통 키 또는 `KORAIL_API_KEY` | 등록·정상 | 인증 정상, 점검 날짜의 결과 없음은 `ready`로 구분 |
| TAGO 버스·철도·고속·시외 | 공통 키 또는 `TAGO_API_KEY` | 등록·정상 | 인근 정류장 31건, 도착 4건, 철도 코드 15건, 고속 터미널 453건, 시외 터미널 340건 확인 |
| Kakao 지도 SDK | `KAKAO_MAP_JAVASCRIPT_KEY` | 등록·정상 | 지도 설정 응답과 Production 지도 공급자 확인 |
| Kakao 로컬 검색·자동차 경로 | `KAKAO_REST_API_KEY` | 등록·정상 | 장소 검색 및 76개 좌표점의 실제 자동차 경로·시간·거리·통행료 확인 |
| ODsay 대중교통 경로 | `ODSAY_API_KEY` | 등록·응답 확인 | 시간·요금·정류장 응답 확인. 환승 계산 수정과 무장애 이동 미확인 범위는 별도 검증 중 |
| 한국도로공사 테마휴게소 | `EXPRESSWAY_API_KEY` | 등록·응답 확인 | 데이터 응답 정상. 경남 외 휴게소 혼입 여부와 지역 필터는 수정·검증 진행 |
| Open-Meteo 날씨 | 없음 | 정상 | 창원 3일 이상 예보 응답 확인 |
| OpenStreetMap 대체 타일 | 없음 | 준비됨 | Kakao SDK를 사용할 수 없을 때의 공개 지도 fallback |

`empty`는 API 오류가 아니다. 이번 검사에서 의료관광·물과 여행은 선택 조건의 결과가
없었고, 관광 집중률은 일반 계획 요청에서는 없었지만 지정 관광지 요청에서는 `live`였다.
등록된 제공처의 인증·상류 오류는 `error`로 분리한다.

## 서비스·배포 환경 변수

| 기능 | 환경 변수·Secret | 판정 근거 | 현재 조치 |
| --- | --- | --- | --- |
| Neon Postgres | `DATABASE_URL` | 공유 여행·커뮤니티 실응답, CD migration 성공 | 추가 등록 없음 |
| Neon Auth | `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | 공개 세션 API와 가입·로그인·복구 계약, CD 환경 검사 성공 | 사용자 자체 삭제 지원 설정은 별도 확인 |
| 보관기간 Cron | `CRON_SECRET` | CD가 Production 값 존재를 보장하고 Vercel Cron이 사용 | 추가 등록 없음 |
| 커뮤니티 운영자 | `COMMUNITY_MODERATOR_USER_IDS` | 선택 설정, 비어 있으면 운영 작업을 403으로 차단 | 운영자 계정을 정하면 사용자 ID 등록 |
| GitHub → Vercel CD | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | 최신 후보 배포·승격·health·rollback 단계 성공 | 추가 등록 없음 |
| Release 백필 | `RELEASE_GITHUB_TOKEN` | 과거 릴리즈를 다시 만드는 수동 workflow 전용 | 백필을 다시 실행할 때만 필요 |

## 키 등록 순서

### 1. ODsay

1. ODsay LAB에서 애플리케이션을 만들고 **Web/URI 플랫폼**을 선택한다.
2. 허용 URI에 프로토콜 없이 `wave-barrier-free-gyeongnam.vercel.app`을 등록한다.
3. 발급된 Web API 키를 Vercel 프로젝트의 **Production** 환경 변수
   `ODSAY_API_KEY`에 저장한다.
4. Production을 다시 배포한다.
5. `/api/route`에서 `odsay`가 `connected` 또는 실제 무경로의 `ready`인지 확인한다.

Vercel Functions는 고정 송신 IP를 보장하지 않으므로 Server/IP 키를 기준으로 잡지 않는다.
W.A.V.E 서버는 실제 Production origin을 `Referer`로 보내고, 경로 결과에는 ODsay 공식
귀속 문구를 표시한다.

공식 안내: [ODsay 대중교통 API 가이드](https://lab.odsay.com/guide/guide),
[Vercel 환경의 ODsay 공식 답변](https://lab.odsay.com/community/boardView?seq=695)

### 2. 한국도로공사

1. 한국도로공사 공공데이터 포털에서 OpenAPI 이용 신청과 인증키 발급을 완료한다.
2. 테마휴게소 API 사용 권한을 확인한다.
3. 키를 Vercel Production의 `EXPRESSWAY_API_KEY`에 저장하고 다시 배포한다.
4. `/api/wave?action=enrich&region=창원&theme=nature&locale=ko`의 `rest` 상태가
   `live` 또는 정상 빈 결과인 `empty`인지 확인한다.

공식 포털: [한국도로공사 공공데이터](https://data.ex.co.kr/)

## 운영자가 직접 확인할 항목

1. Neon Auth에서 사용자 자체 삭제 지원 여부를 확인한다. 현재 SDK 요청은 운영 Auth
   인스턴스에서 `404 NOT_FOUND`였으며 W.A.V.E는 이를 503 설정 오류로 안전하게 구분한다.
2. 실제 수신 가능한 이메일로 비밀번호 재설정 메일과 링크 완료를 확인한다.
3. 신고 처리를 맡을 계정의 Neon Auth 사용자 ID를 `COMMUNITY_MODERATOR_USER_IDS`에 등록한다.
4. Neon 백업/PITR 보존기간을 확인하고 복원 훈련 기록을 남긴다.
5. 키 원문은 채팅·GitHub 이슈·커밋에 붙이지 않고 Vercel Production 환경 변수에 직접 저장한다.

## 자동 회귀 경계

`npm run check:production`과 매일 실행되는 `Production API Smoke`는 다음을 검사한다.

- 필수 키 존재와 실제 관광·날씨·지도·장소·자동차·공공교통 응답
- 국문·영문 관광 응답의 제공처 오류 유무
- 확장 관광정보에 포함된 모든 제공처의 오류 유무
- ODsay 또는 테마휴게소 키가 등록된 경우 해당 선택 제공처의 실제 상태
- 커뮤니티·인증 세션과 주요 화면 응답

키가 등록됐다는 이유만으로 정상으로 판정하지 않는다. 등록된 선택 API가 인증 오류나
상류 오류를 반환하면 Production smoke가 실패한다.
