# W.A.V.E API·환경 변수 전수조사

2026-09-08 #365 후속 구현: [제공처 제한 운영 경계](provider-quota-operations.md)와
[실제 호출 목록](../.wave/provider-budget.json)을 추가했다. 구조화 오류/인스턴스별
cooldown, KO/EN 제한·부분 실패 안내, 지속되는 GitHub 운영 중단 기록과 자동화
no-loop, 실호출 검사당 33개 앱 HTTP 요청 상한을 후보 코드에서 검증했다.
이 상한은 제공처 내부 호출 총량·계정별 한도가 아니다. 최신 HEAD의 전체 CI·독립 QA·
Production 재검증 전에는 운영 완료로 계산하지 않으며 구독 실행기는 아직 활성화하지 않았다.
아래 2026-09-06 수치와 SHA는 역사적 실호출 기록이다.

최신 전체 검증: **2026-09-06 16:56 UTC**, 교통 후속 분석: **17:02~17:04 UTC**, 실제 브라우저: **17:29 UTC**

대상: `main` / Vercel Production `34e6021265b16d046dca24feaa3ec2101fc977e2`

이 문서는 키 값을 기록하지 않는다. `/api/health`의 설정 상태, 실제 Production 응답,
성공한 CI/CD와 코드의 환경 변수 소비 경로만 대조한다.

## 이전 상태 (2026-09-05)

Production smoke 27/27은 응답 경계 검사이며 모든 사용자 흐름의 정상 동작 보장이 아니다.
특히 광역 외 사진·휴게소, 환승 횟수, 날짜·지도 정합성은 [런칭 검증 기록](launch-audit-2026-09-05.md)에서 별도로 추적한다.
과거 8개 언어 실호출 기록과 달리 이번 작업의 지원 언어는 한국어·영어 두 가지다.

## 2026-09-06 재검증 — 이전 정상 결과와 구분

**최신 16:56:46 UTC는 26/27 통과, route 1건 실패**다. 관광 KO/EN·보강·지역/장소 사진·집중률과
그 외 공개 API·14개 페이지 계약은 통과했다. 기존 timeout·재시도·성공 조건을 유지했고 결과는 여전히 `ok: false`다.
관광 제공처가 계속 전체 장애라는 판단은 최신 증거와 맞지 않는다. 장기 안정성·모든 원천 실호출까지 증명하지 않는다.

17:02:44 UTC route HTTP 200/cache MISS: Kakao/ODsay 대안 5개(6/14/19/35/36분)·정류장 6개,
TAGO 도착 0건·KORAIL 0건 ready다. 17:04 앱 문구는 도착 조회 후 현재 결과 없음으로 표시했다.
이 문구 자체가 원 제공처의 정상 인증·빈 응답을 독립적으로 증명하지 않는다. 현재 파서는 `{}`도 정상 0건으로
처리하는 결함이 있어 #316 `7c6d0e1`에서 교통 전용 성공 코드·건수·항목 검증을 추가했다(관련 10/10, unit 290/290).
공식 [KORAIL 응답 명세](https://www.data.go.kr/data/15125762/openapi.do)와
[TAGO 버스도착정보 명세](https://www.data.go.kr/data/15098530/openapi.do)를 대조했다.
잘못된 응답·미조회·검증된 빈 결과의 계약과 실제 배포 후 증거를 먼저 확인한다. `ready`를 무조건 허용하도록 smoke를 완화하지 않았다.

17:29:55 실제 익명 브라우저 390/1366px에서 자동 추천 응답은 장소 3·탐색 3·제공처 error 0,
콘솔/페이지 오류·GET 실패·가로 넘침 0이었다. 두 폭 모두 실제 장소 카드에서 추가·새로고침 후 복원을 확인했다.
첫 데스크톱 탐색의 광범위한 버튼 locator는 제품 저장 실패의 증거로 세지 않는다. 서버 쓰기/모의 응답/개인 위치 사용 없음.
자동 추천과 장소 1개로 준비도 100%가 되는 기존 운영 UX는 남으며 후보 #287 이후 수정의 배포 검증이 필요하다.

**이하 15:46 이전 실패는 보존한 이력이다.**

**이전 15:46:38 UTC는 21/27 통과, 6건 실패**다. route(9.7초), 관광 추천 KO/EN(각 12.3초),
관광 보강(76.6초), 장소 사진(61.6초)은 응답 계약 실패이고 집중률(30.7초)은 HTTP/전송 실패였다.
지역 사진, 설정·날씨·장소 검색·지도 설정·공개 커뮤니티·세션 경계 및 14개 페이지는 통과했다.
기존 timeout·재시도·성공 조건을 그대로 사용했다. 진단 wrapper의 프로세스 종료 0과 달리 결과는 `ok: false`다.
Production SHA와 배포는 바뀌지 않았다. 이 결과를 후보 코드의 운영 성공이나 모든 원천 제공처의 호출 성공으로 세지 않는다.

**이전 14:02:46 UTC는 22/27 통과, 5건 실패**다. route(9.7초), 관광 추천 KO/EN(각 12.2초),
관광 보강(67.1초)이 응답 계약을 충족하지 못했고 집중률(30.7초)은 HTTP/전송 실패였다.
지역 사진과 장소 사진은 이번 응답에서 live/이미지 계약을 통과했다. 모든 원천 제공처의 새 실호출이나
장기 안정성까지 확인한 것은 아니다. 설정·날씨·장소 검색·지도 설정·공개 커뮤니티·세션 경계와
14개 페이지는 통과했다. 본문/키/사용자 정보는 출력하지 않았으며 기존 timeout·재시도·assertion을 유지했다.
이하 20/27은 이전 이력이다. 검토 PDF의 10:25 사진 실패 표시는 당시 상태이며, 최신 제출본을 만들 때
이 결과와 새 운영 캡처를 다시 반영해야 한다. 아직 제출 확정본이나 정상화 완료로 판정하지 않는다.

**14:17:38 UTC 사진 출처 후속 부분 점검**: 지역/장소 사진의 단일 요청은 각각 30초 안에 응답을 받지 못했다.
원천 서비스/이미지 출처/캐시 정보를 추가 확인하지 못했다. 전체 검사의 재시도 조건과 다르므로 22/27 결과를
대체하거나 공식 사진 제공처 전체 장애로 해석하지 않는다. 두 응답의 장기 안정성은 미확정이다.

**12:12:45 UTC 두 응답의 추가 분석**: route HTTP 200/cache MISS/9.9초에서 Kakao 자동차와 ODsay는
`connected`, 실제 경로 5개에 geometry가 있었다. KORAIL, TAGO 정류장·철도·고속·시외 목록은
`error`와 timeout 안내였다. TAGO 도착정보의 `ready`는 정류장 실패 뒤 미조회이며 정상 연결로 세지 않는다
(이 경계는 미배포 #316에서 보완). 국문 추천은 HTTP 200/cache MISS/12.3초지만 `mode=fallback`,
추천·탐색 장소 각 0개, 8개 제공처 모두 error였다. API의 키 존재·200·일부 경로 성공만으로 전체 정상이라
판정하지 않는다. 원본 응답·키를 출력/저장하지 않고 상태/개수/시간과 오류 유형만 기록했다.
공개 상태만으로 관광 실패의 인증·호출 제한·상류 연결 원인을 확정할 수 없다. 이 분석은 위 14:02 전체 결과와 구분한다.

12:46:39 UTC 로컬에서 `https://apis.data.go.kr/`의 자격 증명 없는 단일 접근도 10.0초 뒤
TimeoutError였다. 이 호스트는 코드상 KTO/KORAIL/TAGO가 공유한다. 키 값·개인 좌표·응답 본문을
사용하거나 기록하지 않았다. 공통 호스트 연결 경계를 조사할 근거일 뿐이며, Production API나
인증 성공 검사 또는 전체 제공처 장애의 공식 확인으로 해석하지 않는다. 서비스 timeout 기준은 바꾸지 않았다.

**이전 진단 11:36:55 UTC는 20/27 통과, 7건 실패**였다. route, 관광 추천 KO/EN, 관광 보강,
지역 사진, 장소 사진, 관광 집중률이 모두 실패했다. 경로 약 9.7초, KO/EN 추천 각 12.2초,
관광 보강은 기존 재시도를 포함해 181.8초 후 계약 실패였다. 지역 사진은 91.5초 후 HTTP/전송 실패,
장소 사진은 61.8초 후 계약 실패, 집중률은 30.7초 후 HTTP/전송 실패였다. 검사의 timeout이나
성공 조건을 바꾸지 않았다. 11:30 health HTTP 200/ok도 configuration만 확인한다.
아래 10:25와 같은 실패 범위이므로 검토 PDF의 실패 표시는 유효하며 정상 활용 실적으로 세지 않는다.

이전 진단 **10:25:14 UTC도 20/27 통과, 7건 실패**였다. route, 관광 추천 KO/EN, 관광 보강,
지역 사진, 장소 사진, 관광 집중률이 실패했다. 사진 두 요청은 약 61.6초 뒤 계약을 만족하지 못했고
집중률은 HTTP/전송 실패였다. 이 결과만으로 키 오류·호출 제한·제공처 장애 중 원인을 확정하지 않는다.
설정·날씨·장소 검색·지도 설정·공개 커뮤니티·인증 세션 경계 6개 및 공개 페이지 14개는 통과했다.
10:21 UTC health는 HTTP 200/ok이며 여전히 configuration 범위다. 아래 08시 사진·집중률 성공 기록을
현재 정상 판정으로 사용하지 않는다. 최종 제출 활용 목록과 기능설명서도 이 실패 상태를 반영한다.

Production SHA `34e6021265b16d046dca24feaa3ec2101fc977e2`, 08:22 UTC 재조회에서
Kakao 자동차·ODsay 대중교통은 실제 경로를 반환했으나 KORAIL·TAGO 정류장/철도/고속/시외
제공처가 `error`와 timeout을 반환했다. TAGO 도착정보는 정류장 조회 실패로 요청되지 않았다.
이는 정상 빈 결과가 아니다. `check:production`은 route 계약에서 실패했다. health 설정 정상이나
HTTP 200을 제공처 정상으로 해석하지 않는다. 새 인증키 필요·과금·제공처 장애 원인은 확정하지 않았다.

08:30 UTC 전체 계약을 중단 없이 수집한 진단은 **23/27 통과**였다. 실패 항목은 route,
관광 추천 한국어·영어, 관광 보강이다. 원본 `check:production`은 실패했으며 진단 실행을 성공한 테스트로 세지 않는다.
설정·날씨·장소 검색·지도 설정·지역/장소 사진·집중률·공개 커뮤니티·인증 경계 9개와 공개 페이지 14개는 통과했다.
08:36 UTC 부분 실패 route가 `x-vercel-cache: HIT`, `age: 1100`으로 반환됐다.
[#312](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/312)는 제공처 오류 봉투를 `no-store`로 변경한다.
이 수정은 상류 timeout 해결이나 운영 반영을 의미하지 않는다.

Production 브라우저 읽기 전용 확인: 랜딩·플래너·저장 화면 1366px, 플래너 390px의
HTTP 200·콘솔 오류 0·가로 overflow 0. 로그인 쓰기나 전체 여행 완료까지 검증한 결과는 아니다.

아래 9월 5일 표는 당시 확인 이력이다. 현재 전체 API 정상 판정이나 모든 여정 검증으로 사용하지 않는다.
후보 PR의 mock 테스트 성공은 Production 실호출을 대신하지 않는다.

### 캐시를 우회한 추가 실호출 (2026-09-06 09:11 UTC)

새 조회 URL의 `x-vercel-cache: MISS`도 국문 plan에서 12.96초 뒤 장소 0개·8개 제공처 error였다.
enrich는 11.28초 뒤 방문자·고캠핑·관광 수요·휴게소 live와 나머지 제공처 error를 함께 반환했다.
따라서 #312의 캐시 수정과 상류 장애 진단을 별도로 추적한다. 공식 사이트 검색에서는 이날의
장애 원인을 확정하는 공지를 확보하지 못했다. 키 재발급이나 timeout 증가를 해결책으로 단정하지 않는다.

### 현재 코드의 KTO 호출 목록과 제출 대응

아래 service/operation은 `server/shared/tourism-provider.ts`가 호출하는 실제 코드 식별자다.
출처 표기는 최종 화면에서 `출처: ⓒ한국관광공사` 또는 `출처: ⓒ한국관광콘텐츠랩`으로 대조한다.
기능설명서 7쪽 대응이며, 상태는 요청별로 다를 수 있다. 아래 enrich 개별 원천의 live/error는 이전 분석 이력이며 16:56 전체 계약 회복 후 각각의 상세 값은 재검수한다. 코드에 있는 API를 모두 정상 활용 실적으로 세지 않는다.

| 서비스 / operation | 호출 코드 | 화면 용도 | 9월 6일 확인·남은 작업 |
| --- | --- | --- | --- |
| `KorWithService2 / areaBasedList2, detailWithTour2` | `plan-builder.ts`, `shared-plan-restoration.ts` | 추천·편의 근거·공유 복원 | 17:01 plan barrierfree live 4건. detail/공유 복원 실호출은 별도 확인 필요 |
| `KorService2 / areaBasedList2, detailCommon2, searchKeyword2, searchFestival2` | `plan-builder.ts`, `spot-photo.ts`, `region-photo.ts`, `regional-enrichment.ts` | 국문 추천·사진 대안·행사·숙박 | 17:01 plan tour live 12건, 16:56 enrich/사진 계약 PASS. 개별 상세·행사 원천 재검수 필요 |
| `EngService2 / areaBasedList2` | `catalog.ts`, `plan-builder.ts`, `enrichment-sources.ts` | 영문 관광 정보 | 16:56 영문 plan 계약 PASS. 영문 전체 여정·고유명사 한계 재검수 필요 |
| `PhotoGalleryService1 / gallerySearchList1` | `region-photo.ts`, `spot-photo.ts` | 랜딩 지역·관광지 사진 | 16:56 지역/장소 사진 계약 PASS, 17:01 plan photo live 12건. 실제 출처·개별 원천 대조 필요 |
| `Odii / storySearchList` | `plan-builder.ts` | 오디오 가이드 | 17:01 plan audio live 2건. 실제 재생·원문 대안 재검수 필요 |
| `Durunubi / courseList` | `plan-builder.ts` | 걷기 코스 | 17:01 plan durunubi live 10건. 이동 접근성 보장으로 표시하지 않음 |
| `LocgoHubTarService1 / areaBasedList1` | `concentration.ts` | 중심 관광지 | 17:01 plan hub live 30건. 화면 표출·출처 대조 필요 |
| `TarRlteTarService1 / areaBasedList1` | `concentration.ts` | 연관 관광지 | 17:01 plan related live 50건. 추천 근거·산정 한계 대조 필요 |
| `TatsCnctrRateService / tatsCnctrRatedList` | `concentration.ts` | 관광 집중률 예측 | 16:56 단독 crowd 계약 PASS, 17:01 plan crowd는 정상 빈 결과 0건. 두 요청을 구분 |
| `DataLabService / locgoRegnVisitrDDList` | `visitor-demand.ts` | 지역 방문 통계 | enrich live, 화면 통계 기간/출처 확인 필요 |
| `AreaTarResDemService / areaTarSvcDemList` | `visitor-demand.ts` | 관광 자원 수요 | enrich live, 실제 수요 값·기간 표출 확인 필요 |
| `GoCamping / searchList, basedList` | `regional-enrichment.ts` | 캠핑 여행 보강 | enrich live, 편의 추천과 혼동하지 않도록 최종 검수 |
| `KorPetTourService2 / areaBasedList2` | `enrichment-sources.ts` | 반려동물 여행 보강 | enrich error |
| `WellnessTursmService / areaBasedList` | `enrichment-sources.ts` | 웰니스 여행 보강 | enrich error |
| `MdclTursmService / areaBasedList` | `enrichment-sources.ts` | 의료 관광 보강 | enrich error |
| `PhokoAwrdService / phokoAwrdList` | `enrichment-sources.ts` | 수상 관광사진 | enrich error |

KTO와 구분할 기타 제공처: `B500001/myportal/travel/travellist`는 물과 여행 데이터다.
KORAIL/TAGO·한국도로공사·Kakao·ODsay·Open-Meteo와 함께 기능설명서 8쪽에서 출처를 구분한다.

캐시 경계: 관광 handler는 성공 응답에 브라우저 300초/CDN 1800초를 요청한다. #312는
HTTP 200 안의 부분 실패에도 no-store를 적용한다. 관광 원본을 Neon에 복제하지 않는 정책과,
응답/사진 캐시·기기 일정 보관은 서로 다른 경계이며 원천별 허용 조건의 최종 대조가 남았다.

## 이전 검증 결론 (2026-09-05)

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
