# API 전수 조사 · 테스트와 출시 위험

2026-09-12 후보18 추가: 정류장·도착 외 TAGO 노선 경유지와 노선 첫차/막차 조회를 연결했다. 기존 TAGO/공공데이터 키를 사용하므로 별도 과금 서비스는 추가하지 않았지만, `BusRouteInfoInqireService` 활용 승인과 실계정 트래픽은 설정만으로 확인되지 않는다. 공개 데이터별 공식 개발계정 기본량과 실제 부여량은 다를 수 있으므로 운영 전에 해당 서비스 승인/증량 여부를 확인해야 한다. 미승인·한도 초과·지역 미제공 시 방향·도착은 미확인으로 표시하고 카카오맵 연결을 유지한다. 자동 반복 조회 없이 단계별 요청과 캐시를 적용한다. 실제 배포 확인 결과는 해당 PR에 기록한다.

기준일: 2026-09-10 KST. 관련: #365, #372, #351, #442.

## 카카오 활용·계정 여행 추가 후 갱신

아래 초기 조사보다 이 절과 연결된 PR의 Production 근거가 우선한다. #451의 카카오 로그인과 Gmail 복구 메일은 실제 로그인·수신을 확인했다. ODsay는 다시 일일 한도에 도달해 **#454 외부 hold** 상태이며 추가 경로 조회를 하지 않는다.

- **카카오톡 공유:** SDK 2.8.3 `Share.sendDefault`, 기본 무료 일 30,000건. 운영 도메인의 JavaScript SDK 등록과 제품 링크 허용 도메인이 필요하며 실제 등록을 확인했다. 팝업 차단·SDK/CDN 장애·서비스 한도 초과 시 공유 창이 열리지 않을 수 있고 기존 링크 복사가 대안이다. [쿼터](https://developers.kakao.com/docs/ko/getting-started/quota)
- **카카오톡 나에게 보내기:** `/v2/api/talk/memo/default/send`. `talk_message` 이용 중 동의와 유효한 사용자 토큰 필요. 공식 메시지 정책은 나에게 발송에는 심사 전후 별도 발송 건수 제한이 없다고 설명한다. 친구 메시지의 일 30건 테스트 제한/100·20건 제한과 혼동하지 않는다. 일반 앱 쿼터와 인증/제공처 제한은 별도로 적용될 수 있다. WAVE는 자체 DB 예산으로 계정 3회/분·같은 여행 1회/분을 제한한다. 유료 메시징 계약을 추가하지 않았다. [메시지 정책](https://developers.kakao.com/docs/ko/kakaotalk-message/common)
- **계정 여행:** 기존 Neon DB를 사용한다. 여행 목록/편집에서 장소 이름을 조회할 때 기존 KTO `KorService2/detailCommon2`를 장소당 1회, 최대 12회 사용하며 조회는 계정별 3회/분으로 제한한다. 관광 API 응답은 DB에 영구 저장하지 않는다. 데이터 제공처 장애 시 저장한 ID·순서·메모는 유지되고 이름 미확인을 표시한다.
- **카카오 T 연결:** 공식 앱 실행 링크와 공개 목적지 복사이며 택시 배차 API 호출이 아니다. 별도 API 과금은 추가하지 않았고 사용자가 카카오 T에서 실제 호출·요금·결제를 결정한다. 공개 배차 API를 확인하지 못해 자동 배차는 외부 제휴 확인 대상이다. [공식 택시 안내](https://www.kakaomobility.com/service-kakaot/taxi)

현재 새로 결제할 필수 항목은 없다. 기존 우선순위인 ODsay 운영 용량과 Gmail 대체 발신 서비스 검토가 먼저다. 결제/유료 활성화는 실행하지 않았다.

## 9월 10일 저녁 후속 확인

이 절이 아래 오후 조사 당시의 미확인 상태보다 최신이다. PDF 디자인 #449는 Production `62858b8`로 배포됐다.

- **ODsay:** 실제 WAVE 앱은 Basic **하루 30건**이다. 19:08 KST 운영 경로 1회가 성공했고 사용량이 27/30에서 **28/30**으로 증가했다. #372 복구 hold는 종료했지만 출시 용량 위험은 #365로 이관했다. 추가 반복 호출은 하지 않는다.
- **Vercel:** 로그인 후 실제 프로젝트 **Hobby**를 확인했다. 정확한 월 잔여 사용량은 이 기록에서 확정하지 않는다.
- **Gmail SMTP:** Owner가 전용 앱 비밀번호를 만들어 Production 서버 Secret에 저장했고 SMTP_USER도 설정했다. 카카오 인증 전환 코드가 이 메일을 사용한다. 실제 SMTP 인증·메일 도착은 배포 검증 결과를 별도로 확인해야 한다. 개인 Gmail은 하루 500개를 넘게 발송하면 제한될 수 있고 복구에 1~24시간이 걸릴 수 있다. 개인 메일 사용량도 같은 계정에서 합산되므로 출시 보장 용량으로 보지 않는다. [Google 공식 발송 제한](https://support.google.com/mail/answer/22839?hl=ko)
- **Kakao Login 신규 연결:** `/oauth/authorize`, `/oauth/token`, `/v2/user/me`, `/v1/user/unlink`를 사용한다. 사용자 1명당 액세스 토큰 10분에 20개, 리프레시 토큰 60분에 30개 제한이 있다. 반복 로그인 검사를 피하고 자동 재시도를 하지 않는다. 로그인에 별도 유료 계약을 추가하지 않았다. [공식 쿼터](https://developers.kakao.com/docs/ko/getting-started/quota)
- **인증 DB:** 단일 기존 Neon PostgreSQL의 사용자·계정 ID를 유지하는 Better Auth 전환을 준비했다. 010 추가형 SQL 적용 후 사용자 6명·계정 6개가 보존됐다. 전환 후 인증 호출은 Vercel Functions와 Neon DB 사용량에 포함되며, 관리형 Auth의 MAU 숫자가 이 자체 서버의 용량 보장이 되지는 않는다.

유료 검토 우선순위는 **ODsay 용량/계약 → 전용 발신 도메인과 트랜잭션 메일 서비스 → 상업 운영 시 Vercel/Open-Meteo → 사용량 증가 시 Neon 및 Kakao 추가 쿼터**다. 결제·유료 활성화는 하지 않았다.

현재 병합 기준은 #443의 `5f50b452bda45be1811aee354596b8f40b16ec62`이며, 지도·서비스 문구 후속 PR에서도 외부 API 종류는 늘리지 않는다. `server/`, `lib/`, `features/`, `app/`, 브라우저 SDK·타일, 인증·DB·호스팅과 기존 `.wave/provider-budget.json`을 대조했다. 아래는 코드의 실제 사용 경로와 공식 정책 조사다. 계정별 한도를 확인하지 못한 항목은 숫자를 추정하지 않는다.

## 먼저 해결할 것

1. **ODsay 대중교통 경로:** #372에 quota_exhausted 운영 중단 기록이 남아 있다. 계정 한도·복구 여부가 확인되지 않아 전체 실 API 검증을 통과했다고 할 수 없다. 일/초당 한도와 승인된 용도를 확인하고, 출시 호출량을 감당하지 못하면 유료 계약을 검토해야 한다.
2. **Neon 인증 메일:** 실제 Production은 공용 SMTP를 사용한다. 비밀번호 재설정·탈퇴 확인 메일 전달이 지연되거나 제한될 위험이 있다. 자체 발신 도메인과 SMTP 연결을 우선 준비한다. 유료 요금제 여부와 별개로 이 설정이 필요하다.
3. **한국관광공사:** 관광 추천·편의 근거·사진·통계가 여러 API에 나뉜다. 동일 인증키가 있다고 각 서비스 승인·한도가 같다는 뜻은 아니다. 운영계정 승인과 서비스별 잔여량 확인이 필요하다. 대체로 결제보다 활용신청·증량이 우선이다.
4. **Open-Meteo / Vercel:** 무료 사용 조건과 출시 운영 형태를 비교해야 한다. 상업용 운영이나 안정적인 용량이 필요하면 유료 전환 대상이다.

## 현재 설정에서 확인한 사실

- 15:17 KST Production `/api/health`: 관광, Kakao Map, Kakao Mobility, KORAIL·TAGO, ODsay, 한국도로공사 키가 모두 설정되어 있다. 이 API는 키 존재만 확인하며 승인·잔여량·실응답 성공을 검사하지 않는다.
- Kakao SDK: 개발 주소 `127.0.0.1:4189`는 HTTP 401 `domain mismatched`, 운영 도메인은 JavaScript HTTP 200. 개발 주소 오류를 쿼터 부족으로 판단하지 않는다. 새 개발 포트는 등록된 Web 도메인과 맞아야 한다.
- Neon 실제 콘솔: Free, WAVE 프로젝트 컴퓨트 **10.1 / 100 CU-hr**, 저장 **0.03 / 0.5 GB**, 전송 **0.02 / 5 GB**, 브랜치 **4 / 10**. 9월 집계이며 콘솔 통계 지연이 있다. 현재 사용량만으로 즉시 DB 증설이 필요하다고 보지는 않는다.
- Neon Auth 실제 설정: 이메일 가입/로그인 사용, 공용 메일 서버, 가입 시 이메일 검증 꺼짐, localhost 허용 꺼짐. 카카오 제공자 추가 항목이 없다. 개인 계정 정보나 비밀값은 이 보고서에 저장하지 않았다.
- Vercel 실제 사용량은 2단계 인증 대기로 미확인이다. 아래 Hobby 수치는 현재 프로젝트 요금제를 확정한 값이 아닌 공식 비교 기준이다.
- 이번 조사에서 ODsay 경로를 추가 호출하지 않았다. 전체 외부 API를 반복 호출해 계정 잔여량을 소진하는 방식의 전수 검사는 하지 않았다.

## 사용하는 외부 API와 위험

| API / 실제 역할 | 한도·무료 조건 | 실패하면 생기는 일 | 판단과 조치 |
| --- | --- | --- | --- |
| KTO 국문·무장애 관광: 여행지 검색, 신규 건수, 상세 편의 근거 | 국문 서비스 공개 안내는 개발계정 신청 트래픽 1,000, 운영계정 활용사례 심의 후 증량. WAVE 실제 승인량·주기·잔여량은 미확인. 무장애·다른 서비스에 같은 숫자를 일괄 적용하지 않음 | 건수·추천이 실패/부분 결과가 되거나 확인 근거가 줄어듦 | **높음.** 핵심 서비스별 운영 승인과 증량 우선. [국문 서비스](https://www.data.go.kr/tcs/dss/selectApiDataDetailView.do?publicDataPk=15101578) |
| KTO 사진·오디오·두루누비·연관/허브/혼잡·방문자/수요·축제/숙박·반려/캠핑/웰니스/의료 관광 | 서비스별 공공데이터 활용 승인·호출량. 실제 수치 미확인 | 부가 추천·사진·통계가 누락됨. 정상 0건과 제공처 실패 구분 필요 | **중간~높음.** 아래 오퍼레이션 전부를 신청 목록과 대조. 실패를 재시도로 채우지 않음 |
| TAGO 버스 정류소·도착, 철도 도시/고속·시외 터미널 목록 | API별 승인·트래픽. 공통 키 재사용 가능 여부와 서비스 승인은 별개 | 근처 정류장·도착·교통 참고 정보 미표시 | **중간.** 공공데이터포털의 각 활용신청에서 운영 한도 확인. 자체 전 구간 길찾기 API는 아님 |
| KORAIL 열차운행계획 | 별도 활용신청·승인량 미확인 | 열차 시간표 참고 정보 미표시 | **중간.** 시간표와 ODsay의 통합 경로가 서로를 대체하지 않음 |
| K-water 물과 여행 `travellist` | 공공데이터 서비스 승인·한도 미확인 | 물 관련 코스·관광 부가 정보 누락 | **중간.** 결제보다 해당 서비스 승인·운영계정 확인 |
| 한국도로공사 테마휴게소 `restThemeList` | 별도 포털 키 사용. 실제 한도 미확인 | 테마휴게소 정보 누락 | **중간.** [공식 OpenAPI 가이드](https://data.ex.co.kr/guidedown/openoasis_guide.pdf)와 계정의 인증키 상태 확인 |
| Kakao Maps Web SDK·로드뷰·주변 카테고리 검색 | Web SDK 일 300,000, 키워드/카테고리 검색 각각 일 100,000. 전체 월 3,000,000 정책 및 API별 예외. 지도 무료 쿼터는 개발자 계정의 첫 활성화 앱 조건 | 지도/로드뷰/주변 검색 미작동; 지도는 Leaflet로 대체될 수 있음 | **중간.** 앱별 실제 쿼터·첫 앱 적용·Web 도메인 확인. 로드뷰의 별도 수치나 과금 분류는 추정하지 않음. [공식 쿼터](https://developers.kakao.com/docs/ko/getting-started/quota) |
| Kakao Local `keyword.json`: 출발지 장소 검색 | 일 100,000 공개 기본값. WAVE 앱 실제 잔여량 미확인 | 출발지 검색 실패 | **중간.** 초과 사용 승인 시 키워드 검색 2원/건 공개 요금. [공식 쿼터·요금](https://developers.kakao.com/docs/ko/getting-started/quota) |
| Kakao Mobility `directions`: 자동차 거리·시간·요금 | 자동차 길찾기 일 10,000. 초과분 월 100만 건 구간 8원/건 공개 요금 | 실제 자동차 경로가 없어 외부 지도 확인이 필요 | **중간~높음.** 일정의 구간 수·이동수단 변경 횟수로 사용량 추정. [공식 가격](https://developers.kakaomobility.com/price/) |
| ODsay `searchPubTransPathT`: 대중교통 전 구간 경로 | 공식 정책은 Basic 30/일, Standard 100,000/일 및 가격 문의. 반면 2026년 관리자 답변에는 특정 Basic 계정 1,000/일 설명이 있어 문서/계정 차이를 확인해야 함. 초당 수치는 비공개 | 실제 대중교통 경로·환승·요금 확인 불가. 저장한 일정과 외부 지도 링크는 유지 | **높음 / 기존 운영 중단.** WAVE에 30 또는 1,000을 임의 적용하지 않음. [정책](https://lab.odsay.com/doc/totalPolicy), [관리자 답변](https://lab.odsay.com/community/boardView?seq=705), [운영 중단 #372](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/372) |
| Open-Meteo `forecast`: 현재/7일 날씨 | 무료 비상업용: 분 600, 시간 5,000, 일 10,000, 월 300,000 안내. 무료 가동률 보장 없음 | 날씨를 확인할 수 없음. 맑음으로 임의 표시하면 안 됨 | **상업 출시 시 유료 검토 필수.** 여러 변수 요청은 HTTP 1회가 과금 1회와 다를 수 있음. [가격·조건](https://open-meteo.com/en/pricing) |
| OpenStreetMap 공개 타일: Leaflet 대체 지도 | 고정 무료 보장량·SLA 없음. 부적절한 부하 시 예고 없는 차단 가능 | Kakao 장애 시 대체 지도 배경까지 비어 보일 수 있음 | **중간.** 실제 코드는 `{s}.tile...` 형태이고 공식 권장은 `tile.openstreetmap.org`. 정책 정리·타일 제공처 선택은 #365 후속으로 남김. [타일 정책](https://operations.osmfoundation.org/policies/tiles/) |
| Neon PostgreSQL: 커뮤니티·공유 일정·제보·계정 관련 저장 | 실제 Free 한도 위 참조. 전송 5GB 초과 시 다음 주기/업그레이드까지 컴퓨트 중단 가능 | 공유 일정 저장/조회와 커뮤니티, 인증이 함께 영향을 받을 수 있음 | **현재 여유, 성장 시 높음.** 쿼리·전송량을 보며 Launch 검토. 최소 컴퓨트 0.25CU를 한 달 내내 쓰면 약 180CU-hr라 100을 넘음(30일 가정). [가격](https://neon.com/pricing), [전송 한도](https://neon.com/docs/introduction/network-transfer) |
| Neon Managed Better Auth: 이메일 로그인·가입·세션·재설정 | Free Auth 60,000 MAU 공개값. 실제 프로젝트 요청 제한·현재 MAU는 미확인. 카카오는 지원 제공자 아님 | 로그인·계정 복구 제한. 카카오 버튼만 추가해도 정상 동작하지 않음 | **연동 구조 문제.** [카카오 전환 조사](kakao-login-migration-351.md). DB 유료화만으로 해결 안 됨 |
| Neon 공용 SMTP: 재설정·확인 이메일 | 개발·테스트용. 정확한 공용 발송 한도 미공개/미확인. 운영은 자체 SMTP 권장 | 메일 미도착으로 비밀번호 복구·계정 확인 중단 | **높음.** 독립 SMTP·발신 도메인 준비. 무료 SMTP부터 가능하나 운영량에 따라 유료 필요. [공식 출시 점검](https://neon.com/docs/auth/production-checklist) |
| Vercel Functions·CDN·이미지: 전체 앱과 서버 API | 계정 요금제·잔여량 미확인. Hobby 비교값 월 100만 Function 호출, Active CPU 4시간, Provisioned Memory 360GB-hr, 비상업 개인용. 초과 시 해당 기능이 제한될 수 있음 | 전체 페이지/API/이미지 또는 배포가 영향을 받음 | **높음, 실제 Usage 확인 필요.** 상업 운영·용량·협업에 따라 Pro. 이미지가 앱을 거쳐 최적화되는 요청도 별도 집계 가능. [Hobby](https://vercel.com/docs/plans/hobby), [제한](https://vercel.com/docs/limits), [Pro](https://vercel.com/docs/plans/pro-plan) |

Kakao 무료 기본값과 유료 단가는 실제 앱 계약·추가 쿼터 적용 여부를 대신하지 않는다. 결제나 유료 API 활성화는 이번 작업에서 하지 않았다.

## 코드에서 실제 사용하는 공공데이터 오퍼레이션

| 계열 | 오퍼레이션 |
| --- | --- |
| 기본 관광·편의 | `KorService2/areaBasedList2`, `KorWithService2/areaBasedList2`, `KorWithService2/detailWithTour2`, `KorService2/detailCommon2`, `KorService2/searchKeyword2`, `KorService2/searchFestival2` |
| 다국어 | `EngService2/areaBasedList2` 및 `catalog.ts`의 선택 언어 서비스. 공개 UI는 한국어 중심이며 후속 언어 제공을 위해 코드가 보존됨 |
| 사진 | `PhotoGalleryService1/gallerySearchList1`, `PhokoAwrdService/phokoAwrdList` |
| 특화 관광 | `KorPetTourService2/areaBasedList2`, `WellnessTursmService/areaBasedList`, `MdclTursmService/areaBasedList`, `Durunubi/courseList`, `Odii/storySearchList`, `GoCamping/searchList`, `GoCamping/basedList` |
| 통계·추천 | `LocgoHubTarService1/areaBasedList1`, `TarRlteTarService1/areaBasedList1`, `TatsCnctrRateService/tatsCnctrRatedList`, `DataLabService/locgoRegnVisitrDDList`, `AreaTarResDemService/areaTarSvcDemList` |
| TAGO | `BusSttnInfoInqireService/getCrdntPrxmtSttnList`, `ArvlInfoInqireService/getSttnAcctoArvlPrearngeInfoList`, `TrainInfo/GetCtyCodeList`, `ExpBusInfo/GetExpBusTrminlList`, `SuburbsBusInfo/GetSuberbsBusTrminlList` |
| KORAIL | `B551457/run/v2/travelerTrainRunPlan2` |
| 기타 공공기관 | `B500001/myportal/travel/travellist`, `restinfo/restThemeList` |

기본 요청키는 `TOUR_API_SERVICE_KEY_ENCODED`; TAGO/KORAIL은 전용 키가 있으면 우선 사용한다. 도로공사는 `EXPRESSWAY_API_KEY`, Kakao는 지도 JavaScript/REST, ODsay는 전용 키다. 키 값은 보고서에 넣지 않는다.

## 테스트·출시 사용량에서 놓치기 쉬운 부분

- **앱 요청 수 ≠ 외부 API 요청 수.** 신규 건수는 최악의 경우 4활동×2목록×창원 5구역 = 40 목록 요청과 최대 12 상세 요청을 만든다. 한도가 서비스별이라 이 52를 한 서비스의 한도에서 단순 차감하는 계산도 잘못이다. 편의 선택만 바꾸면 추가 호출은 없고, 지역/활동 변경은 450ms 지연·5분 성공 캐시를 사용한다.
- 최종 추천은 위 목록·편의 외에 사진·두루누비·허브·연관·혼잡·오디오를 부를 수 있다. 통계의 기간 탐색과 지역 대체 조회가 있으면 더 늘어난다. 실제 cold/warm 비용을 별도 측정하기 전에는 ‘사용자 1명당 몇 회’로 고정하지 않는다.
- 자동차 구간은 `directions`, 대중교통 구간은 ODsay와 TAGO/KORAIL 참고 조회를 쓴다. 현재 명시적인 도보·자전거 요청은 승인된 전용 경로 API가 연결되지 않은 상태이며, **쿼터 때문에 실패한 것으로 해석하면 안 된다.** 외부 지도 링크를 사용한다.
- 성공한 공개 응답은 기존 정책상 브라우저 300초/CDN 1800초 캐시 대상이다. 실패·부분 응답은 no-store. 동일 진행 요청을 합치지만 콜드 스타트와 다른 서버까지 공유하는 계정 전체 호출 제한기는 아니다.
- 기존 운영 검사 33회 상한은 WAVE HTTP 요청 수다. 제공처 총 호출 수가 아니다. #372 중단 기록은 검사 재호출을 막으며, 일반 사용자 호출 전체를 전역 차단하는 장치는 아니다.
- **내부 저장 제한도 있다.** 공유 일정은 전체 서비스 20회/분·90회/10분, 제보 10회/분·45회/10분. 회원별 글 5회/10분, 댓글 20회/10분, 신고 10회/24시간. 동시 심사/테스트에서 429가 나면 유료 API 문제와 구분해야 한다. 결제해도 이 코드 제한은 자동으로 바뀌지 않는다.
- 프론트의 타임아웃과 서버 처리 예산이 있어 제공처가 느리면 한도가 남아도 부분 응답이 된다. 지도 SDK 도메인, 공공데이터 서비스 미승인, 잘못된 키 종류, SMTP 설정도 별도 원인이다.

## 유료 전환 판단 목록

| 우선순위 | 결제 후보 | 판단 |
| --- | --- | --- |
| 1 | ODsay Standard 또는 적합한 경로 서비스 계약 | 실제 계정 제한을 먼저 확인. 현재 대중교통 핵심 경로의 제한 이력이 있어 가장 먼저 용량·용도·견적 검토 |
| 2 | 발신 SMTP 서비스 | 자체 발신 설정이 우선. 소규모 무료 플랜 가능, 발송량·전달률·지원 수준에 따라 유료 |
| 3 | Open-Meteo Standard | 상업 운영이면 무료 비상업 API 그대로 사용하지 않음. 결제 시 코드도 `customer-api.open-meteo.com`과 키를 사용하도록 바꿔야 함 |
| 4 | Vercel Pro | 실제 플랜·CPU/메모리/전송/이미지 사용량 확인 후 판단. 개인 비상업 범위를 벗어나거나 무료 용량이 부족하면 전환 |
| 5 | Kakao Maps / Mobility 추가 쿼터 | 실제 사용량이 기본 한도에 근접하거나 지도 첫 앱 무료 조건에 해당하지 않으면 검토. 지도 Web 0.1원/건, Local 검색 2원/건, 자동차 경로 8원/건 공개 초과 단가 참고 |
| 6 | Neon Launch | 현재 콘솔 사용량은 여유. 상시 이용·트래픽 성장, 짧은 복구 보존 기간이 문제일 때 검토. 사용량 기반 요금이며 월 고정 15달러로 오해하지 않음 |
| 7 | 상용 OSM 기반 타일 제공처 | 대체 지도까지 안정적 운영 용량/SLA가 필요할 때. OSM 공개 타일 서버 자체를 결제해 증설하는 구조가 아님 |
| 제외 | KTO/TAGO/KORAIL/K-water/도로공사 | 현재 조사로는 유료 결제보다 활용 승인·운영계정·서비스별 트래픽 증량이 우선 |
| 제외 | 카카오 로그인 | 현 장애는 관리형 인증의 제공자 미지원. 유료 쿼터 구매로 해결되지 않음 |

현재 제품에는 OpenAI·Claude·Gemini 등 종량제 생성형 AI API 호출이 없다. 디자인 과정의 Codex/이미지 생성 도구 사용량은 서비스 이용자의 API 비용과 별개다. Leaflet·사진 EXIF 처리는 라이브러리/로컬 계산이며 유료 API가 아니다. 카카오맵·철도/버스 예매·공식 출처 링크는 외부 이동 링크로, 자체 예약 API 구현으로 세지 않는다. 관광 API가 반환하는 사진/오디오 호스트와 GitHub raw 소셜 이미지는 별도 콘텐츠 가용성 의존성이며 보장된 API 쿼터는 없다. GitHub Actions는 배포 운영 의존성이고, 현재 저장소는 공개다.

## 남은 계정 확인

- 공공데이터: 위 서비스 각각의 승인 상태, 개발/운영 구분, 승인 트래픽, 오늘 사용량, 만료/갱신.
- Kakao: WAVE 앱의 실제 일/월 잔여량, 지도 첫 앱 무료 적용, 등록 도메인, Mobility 추가 사용 설정.
- ODsay: 앱 플랜, 실제 한도와 사용량, 제한 사유, 복구 시각, 출시 용도 승인. 해제 후 한 번의 제한된 실제 경로 검증.
- Neon: 자체 SMTP 발신 도메인 및 발송 한도, 인증 전환에 필요한 호환성. DB 사용량은 이미 확인한 값에서 판단.
- Vercel: 2단계 인증 후 프로젝트 플랜과 Usage/과금 한도 확인.

미확인 계정 한도를 확정값이나 0 사용량으로 기록하지 않았다. 큰 부하·동시성 회귀와 전역 캐시/호출량 최적화는 #365/#368에 남겨 두고, 실제 사용자 화면과 이번 기능의 필요한 검증은 별도로 진행한다.

2026-09-12 기능 후보19·20: 코스 확장과 짧은 나들이는 기존 `/api/wave?action=plan`을 사용자 버튼으로만 요청한다. 지역/활동/편의 ID를 그대로 사용하며 새 제공처·GPS·일괄 경로 호출·자동 재시도는 추가하지 않는다. 프로필 변경/도구 닫기/화면 이탈 시 요청을 취소하고 이전 조건 응답을 새 후보로 사용하지 않는다. 결과의 `facilityKeys`가 없으면 편의조건을 낮춰 진행하지 않는다. 원자료의 명시적 부정은 제외하고 미확인은 별도 선택이다. plan의 기존12초 서버/14.5초 클라이언트 예산과 제공처 fan-out·캐시·계정별 한도를 소비한다. 한 앱 요청이 상류 한 번이라는 뜻은 아니다. 장소 이용시간은 펼칠 때만 기존 visit-info를 요청한다. 이동·복귀 시간은 브라우저의 거리 추정이며 새 교통 API 비용은 없다. 무료 KTO 쿼터가 부족하면 이 기능도 후보 일부/없음 상태가 될 수 있다. 추가 유료 계약·결제는 실행하지 않았다.
