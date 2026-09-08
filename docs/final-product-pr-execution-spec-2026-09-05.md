# W.A.V.E 운영 서비스 최종 제품·PR 실행 명세

- 조사 기준 시각: 2026-09-05 09:15~14:20 UTC
- 기준 저장소: `jeongiryang/wave-barrier-free-gyeongnam`
- 기준 `main`: `34e6021265b16d046dca24feaa3ec2101fc977e2`
- 구현 기준 선행 PR: 초안 PR #287, 조사 종료 시 HEAD `b803b80`
- 문서 성격: 코드·운영 화면·로컬 검증·공식 자료를 구분한 실행 계약

이 문서는 아이디어 목록이 아니다. 현재 기능을 안정적으로 제공할 수 있는 핵심 여정으로
재구성하고, 승인 후의 후속 PR을 작은 단위로 실행하기 위한 최종 계약이다. 이번 구현 PR은
#287 위에서 기존 일정 진입 회귀를 고치고, 제공하지 않는 지도 측정 UI와 장식성 인트로 조작을
제거하며, 실제 적용 디자인 규격과 회귀 검사를 추가한다.

## A. 최신 코드·운영판 현황과 검증 범위

### 확인 결과

| 항목 | 확인 결과 | 확인 수준 |
| --- | --- | --- |
| 최신 main | `34e6021`, PR #262 병합 결과 | GitHub 커밋·로컬 fetch |
| 배포 방식 | main CI 성공 후 Vercel production candidate, migration, promote; health 실패 시 alias rollback | 코드 `.github/workflows/cd.yml` |
| 운영 URL | 저장소 메타데이터의 production origin에서 랜딩·플래너를 비파괴 열람 | 운영 화면 재현 |
| 운영과 main 관계 | 화면 구조는 main과 일치했으나 배포 산출물의 commit 식별값이 노출되지 않아 동일 SHA는 미확정 | 운영 화면+미검증 경계 |
| 최신 CD | 조사 시점 main SHA 대상 GitHub Actions CD 성공 이력 확인 | GitHub Actions |
| 저장 | 일정·순서·날짜·환경설정은 localStorage, 공유 일정은 서버 30일 snapshot | 코드 확인 |
| 인증 | 세션 복귀와 callback 흐름 존재, 실제 계정 로그인은 운영 데이터 생성 금지 때문에 미수행 | 코드 확인·운영 미검증 |
| 공유 URL | `/trip/[id]`, 기존 v1 payload 복원 경로 존재 | 코드·자동 테스트 |
| 캐시 | 서비스워커 등록 없음. 브라우저/Vercel 정적 자산 캐시는 존재할 수 있으나 운영 헤더는 별도 미측정 | 코드 확인·일부 미검증 |
| 외부 API | 관광·무장애·날씨·ODsay·지도·부가 공공데이터. timeout과 일부 fallback 존재 | 코드 확인 |
| baseline | lint, typecheck, unit 261개, build:vercel, performance budget 통과 | 로컬 자동 검증 |
| baseline E2E | Node 24 로컬 dev server의 Vinext `invalid hook call`로 서버 health 500, 테스트 시나리오 진입 전 중단 | 로컬 재현; 제품 실패로 단정 금지 |

운영 화면에서는 초기 검색이 자동 실행되고, 일정이 비어도 추천 첫 장소가 지도 목적지처럼
보이는 상태와 “준비 25%” 표시를 확인했다. 이는 한 번의 네트워크 실패가 아니라 main 코드의
상태 계약과 일치한다. PR #287은 명시적 검색·다중 취향·근거 상태·일정 경로를 대폭 개선한다.
본 PR은 그 위에서 남은 운영 회귀를 보완한다.

### 확인하지 않은 것

- 운영 계정 생성·로그인·글·좋아요·신고·공유 일정 생성은 수행하지 않았다.
- iPhone/Android 실기기, Samsung Internet, 인앱 브라우저는 에뮬레이션과 구분해 미검증이다.
- Preview/production 환경변수 값, Vercel 프로젝트 설정, Kakao 허용 도메인은 권한 변경 없이
  값 자체를 열람하지 않았다.
- 운영 배포 SHA, 실제 사용량, API별 quota 잔량은 확인 가능한 공개 근거가 없어 추정하지 않는다.

## B. 기능 전수조사와 최종 판단

판단 번호는 1 유지, 2 수정, 3 통합, 4 보조 영역 이동, 5 범위 축소, 6 일시 중단, 7 제거다.

| 기능 | 문제·진입·핵심 관계 | 정상/실패·의존성 | 부담·중복·제거 가치 | 최종 권고 |
| --- | --- | --- | --- | --- |
| 소개 랜딩 | 목적 이해→플래너 | 장식 파동·긴 섹션, CTA는 정상 | 장식 조작과 강제 전체화면은 진입을 늦춤 | 2: 짧은 메시지·단일 주요 CTA |
| 경남 지역 선택 | 여행 범위 선택 | 18개 목록, PR #287 경계 SVG; 키보드 목록 대안 | Kakao를 첫 화면에 쓰면 키·성능 부담 | 2: SVG+목록 기본 |
| 필요한 편의 | 추천의 핵심 입력 | 6 프로필, 실제 세부 필드와 문구 일부 불일치 | 안전·접근성 핵심 | 2: 시설 단위 근거와 일치 |
| 여행 취향 | 장소 유형 선택 | main 단일, #287 복수 선택·query 직렬화 | 실제 추천에 반영돼야 가치 있음 | 2: 복수·명시 검색 |
| 날짜 | 날씨·행사·일정 범위 | main 추천 query에는 미반영, 일정 저장에 반영 | 장소 편의와 혼합 금지 | 3: 일정 질문에 통합 |
| 여행지 검색 | 핵심 추천 | main 자동 검색·결과 초기화, #287 명시 검색·이전 결과 유지 | 외부 API 지연·부분 실패 | 2: 상태 계약 강화 |
| 추천 카드 | 근거를 보고 선택 | 사진·점수·상세·추가 | 점수 하나는 과장 가능 | 2: 확인/미확인/부정 분리 |
| 정보 부족 장소 | 추가 탐색 | 공식 근거 없는 장소가 별도 영역 | 일반 추천과 섞이면 신뢰 훼손 | 4: 보조 영역 유지 |
| 장소 상세 dialog | 편의 세부 판단 | #287 native dialog·focus 복귀 | 모바일 내부 스크롤 필요 | 2 |
| 일정 추가 | 선택 장소 저장 | 이 기기 localStorage | `찜`과 혼동 금지 | 1: `일정에 추가` |
| 기존 이 기기 일정 | 재방문 핵심 | 검색 결과와 무관한 catalogue 복원 | 새 검색 게이트로 막으면 데이터 체감 손실 | 2: 검색 없이 열람·편집 |
| 날짜별 일정 | 하루 배치 | 날짜 밖 항목 보존, #287 이동 UI | 자동 재배치 금지 | 2 |
| 순서 편집/자동 정렬 | 이동 순서 | drag 및 버튼, 좌표 기반 추정 | drag-only 접근 금지 | 2 |
| 지도 | 위치·경로 확인 | Kakao→Leaflet fallback | API 키·스크롤 충돌 | 2: 일정 장소 중심 |
| 지도 레이어 | 교통/지형 보조 | Kakao 연결 시 작동 | 지도 판단 보조 | 4: `지도 표시` drawer |
| 거리·반경·면적 측정 | 일반 지도 유틸 | SDK drawing 미로딩, 항상 비활성 | 핵심 여정 무관·죽은 버튼 | 7: UI 제거, 데이터 없음 |
| 주변 검색 | 식당/시설 탐색 | Kakao Places 의존 | 일정과 혼동 가능 | 4: 지도 보조 |
| 로드뷰 | 현장 확인 보조 | Kakao 의존 | 가치 있으나 모바일 복잡 | 4 |
| 현재 위치 | 출발지 입력 | 권한·timeout·거절 필요 | 민감 좌표 보호 필수 | 2: 명시 동의·비공유 |
| 이동 경로 비교 | 실제 이동 판단 | ODsay/preview, 부분 실패 | 시설 편의를 경로 무장애로 확대 금지 | 2 |
| 날짜별 모든 이동 구간 | 일정 완결성 | #287 구간 coverage | API 비용 증가 | 2: 요청 제어·부분 실패 |
| 날씨 | 출발 판단 | Open-Meteo, 예보 범위 | 현재 날씨를 미래 날짜 대체 금지 | 2 |
| 혼잡 | 참고 신호 | 날짜 적합성·데이터 부재 가능 | 확정 표현 금지 | 5: 보조 신호 |
| 교통 데이터/예매 | 이동 대안 | provider별 연결, 외부 서비스 | 내부 예약처럼 보이면 오해 | 5: 외부 이동 명시 |
| 출발 전 확인 | 재확인 항목 | main 날씨 로드만으로 진척 과장, #287 명시 검토 | 완료율 대신 상태별 체크 | 2 |
| 공유 링크 | 동행자 전달 | 30일 서버 snapshot | 변경 후 stale URL 재사용 위험 | 2: payload signature 캐시 |
| ICS | 일정 내보내기 | 현재 여행 기간 단일 이벤트 | 장소별 일정처럼 과장 | 5: 기간 알림으로 명시 후 개선 |
| 여행 보관함 | 여행 단위 복원 | localStorage 20개 | 로그인 동기화 아님 | 2: `이 기기 여행` |
| 프로필 저장 | 편의 재사용 | 로컬 설정 | 건강 상태 추론 금지 | 1, 저장 범위 명시 |
| 사진 코스/EXIF | 개인 사진 보조 | 로컬 처리·좌표 제거 | 핵심 플래너 방해 가능 | 4 |
| 음성 안내/대본 | 시각·인지 접근 | 보조기술 가치 | 저빈도 추정으로 제거 금지 | 1 |
| 커뮤니티 글/댓글/좋아요 | 경험 공유 | 인증·DB·신고 | 공식 편의 점수와 분리 필요 | 4: 독립 메뉴 |
| 시설 경험 제보 | 현장 경험 | 익명 endpoint | 공식 정보에 합산 금지 | 2: 출처 배지 |
| 서비스 상태 | 장애 복구 | provider/live/partial 내부어 노출 | 핵심 화면 상시 점유 불필요 | 3: 오류 카드·도움말 통합 |
| 도움말·정책 | 복구·신뢰 | dialog/pages | 제거 기능 문구 동기화 필요 | 2 |
| 언어 | 외국인 접근 | main 8개 중 일부 화면만 번역; #287 ko/en 축소 | 미완성 언어를 완성처럼 제공 금지 | 5: ko 기본, en beta; 기존 값 fallback 보존 |
| 테마/모션 | 가독성·접근 | localStorage, system reduced motion | 핵심 접근성 | 1 |
| PWA 설치 | 재진입 | manifest, 서비스워커 없음 | 오프라인 오해 금지 | 5: 설치 바로가기만 |

사용 통계가 없으므로 “사용률이 낮다”는 근거로 제거한 기능은 없다.

## C. 제거 후보의 영향·대체 흐름·재배치

### C-1. 지도 측정 도구 — 제거 승인 반영

- 근거 수준: 코드 확인과 운영 구조 재현. Kakao SDK URL은 drawing library를 불러오지 않아
  거리·반경·면적·지우기가 항상 disabled다.
- 제거가 맞는 이유: 측정은 여행 일정의 날짜·순서·경로 판단과 중복되고, 활성화하려면 SDK
  권한·상태·터치 충돌·도형 lifecycle을 새로 운영해야 한다. 비활성 버튼을 설명과 함께 두는
  방식은 사용자 가치가 없다.
- 영향 사용자/데이터: 저장 형식이 없고 활성 경로가 없어 기존 측정 데이터는 없다.
- 대체: 일정의 실제/미리보기 구간 거리와 외부 지도 링크를 사용한다.
- URL/링크: 독립 URL 없음. `#map-panel-layers`는 유지해 기존 초점/테스트 의존을 보호한다.
- 재배치: toolbar `레이어·측정`→`지도 표시`; drawer는 레이어와 일정 추가·인쇄·공유만 둔다.
- 빈자리: 측정 제목·안내·4버튼을 통째로 제거해 경로 도구를 바로 노출한다.
- 정리: props/type import/E2E 명칭/repository contract를 함께 수정한다. 내부 drawing adapter는
  별도 삭제 PR 전까지 비노출 호환 코드로 남겨 rollback 비용을 낮춘다.
- 롤백: 본 PR revert만으로 UI 복구, 데이터 영향 없음.

### C-2. `인트로 다시보기` — 제거 승인 반영

- 근거 수준: 코드·운영 화면. 장식 캔버스 sequence를 재시작할 뿐 제품 목적 이해나 다음 행동을
  추가하지 않는다.
- 영향: 사용자 데이터·URL 없음. 동작 감소 사용자는 정지 안내만 받는 별도 조작이었다.
- 대체: 파동은 자동 장식으로 유지하되 reduced-motion에서 정지한다. 주요 CTA `내 여행
  설계하기`, 보조 링크 `어떻게 작동하나요?`만 남긴다.
- 레이아웃: 전체화면 강제를 제거하고 콘텐츠 높이에 맞춰 다음 설명이 자연스럽게 보이게 한다.
- 문서/CSS/test: 컴포넌트 state, dead CSS, E2E replay 계약을 함께 제거한다.
- 롤백: 컴포넌트·CSS·테스트 revert, 데이터 영향 없음.

### C-3. 언어 제공 범위 축소 — #287 유지, 데이터 삭제 금지

기존 8개 선택지는 랜딩의 일부 문자열만 번역되고 플래너 대부분은 한국어였다. 완성된 서비스처럼
노출하는 대신 ko와 beta en만 선택 가능하게 한 #287의 축소를 유지한다. 기존 localStorage locale이
지원 목록 밖이면 storage normalizer가 한국어로 안전하게 복귀해야 한다. 삭제한 번역 원본은 git에
남아 이후 언어별 전 구간 번역·QA가 완료되면 복원할 수 있다. 기존 공유 payload locale은 서버가
모르는 값도 거절하지 말고 ko 표시 fallback을 사용한다.

## D. 국내 서비스·디자인 레퍼런스 조사

확인일은 모두 2026-09-05다.

| 공식 자료 | 관찰 | W.A.V.E 적용 | 비적용 |
| --- | --- | --- | --- |
| [네이버 지도 저장 도움말](https://help.naver.com/service/5637/contents/692?lang=ko) | 장소 저장과 저장 목록을 구분 | 즉시 일정에 들어가면 `일정에 추가`, 로컬 범위는 `이 기기` | 저장이 아닌 행동을 `찜`이라 부르지 않음 |
| [카카오맵 공식 소개](https://www.kakaocorp.com/page/service/service/KakaoMap) | 지도·길찾기 중심, 부가 기능은 맥락별 진입 | 일정 장소·경로를 지도 중심에, 주변/로드뷰는 toolbar | 모든 플래너 입력을 지도 위에 겹치지 않음 |
| [카카오 지도 Web API 가이드](https://apis.map.kakao.com/web/guide/) | JavaScript 키·등록 도메인 필요, 외부 지도 링크 제공 | Kakao 기본+Leaflet/목록 fallback | 키 없는 환경을 정상 Kakao처럼 표시 금지 |
| [두산에너빌리티](https://www.doosanenerbility.com/kr) | 짧은 핵심 주제, 큰 시각 영역, 사업 영역을 구분 | 랜딩 한 문장과 주요 CTA, 후속 섹션은 3개 가치 | 기업 사이트 전체화면 전환을 플래너에 복제 안 함 |
| [한화오션](https://www.hanwhaocean.com/) | 검색 결과상 짧은 브랜드 메시지 | 큰 이미지 확보 후에만 소개 영역 적용 | 조사 환경 502로 실제 transition/sticky/CSS는 미검증 |
| Apple 첨부 참고 문서 | 콘텐츠 중심·위계·명시 선택; 수치는 Apple 표면 기록 | Deep Ocean·한국어 폰트·44/48px 기준으로 재해석 | SF Pro 배포, Apple blue, 36px 버튼, Liquid Glass 복제 금지 |
| [공공누리 사진 자료](https://phoko.visitkorea.or.kr/main/index.kto) | 항목별 이용 유형·저작자 확인 필요 | 공공누리 1유형 등 수정 가능 자산만 credit와 함께 확보 | 검색 썸네일이나 제한 유형 무단 크롭 금지 |
| [VWorld 행정경계 자료](https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?dsId=30604) | 시군구 경계 데이터 안내 | license 확인된 고정 SVG를 빌드 자산으로 사용 | 경계 확보 전 임의 도형을 실제 경계로 표시 금지 |

패턴은 “큰 이미지는 소개에만, 플래너는 읽을 수 있는 밀도”, “한 지역 조합에서 주요 색상
행동은 하나”, “선택은 색+체크/문구”, “반투명은 기본값이 아님”으로 통합한다.

## E. 한국어 용어 사전과 확정 문구

| 현재 표현 | 실제 기능 | 최종 표현 | 이유·위치 | 사용하지 않을 표현 |
| --- | --- | --- | --- | --- |
| 여행 보관함 | localStorage 여행 snapshot | 이 기기 여행 | 저장 범위를 즉시 전달, header/page | 클라우드 보관함 |
| 보관하기 | 장소를 현재 일정에 즉시 추가 | 일정에 추가 | 버튼 동작과 일치 | 찜하기, 담아두기 |
| 이 기기 일정 | 날짜별 local 장소 | 이 기기 일정 | 기존 사용자에게 정확 | 내 일정(단독) |
| 여행 취향 | 관광 category 복수 | 여행 취향 | 조건 질문 | 테마 코드 |
| 접근성 상세 | 시설별 공공 데이터 | 편의시설 보기 | 과도한 보장 방지 | 이용 가능, 안심 |
| 공식 편의근거 | 공공 API의 시설 응답 | 확인된 편의정보 | 사용자가 이해하기 쉬움 | 공식 인증 |
| 정보 확인률 | 알려진 필드 비율 | 확인된 항목 N개 | 퍼센트 오해 방지 | 접근성 점수 |
| 추가 탐색 | 근거 부족 후보 | 편의정보를 더 확인할 장소 | 추천과 분리 | 추천 장소 |
| 여행 정보 다시 조회 | 동일 조건 재요청 | 최신 정보 다시 불러오기 | 실제 행동 | 새로고침 |
| SERVICE STATUS | provider 상태 | 정보 연결 상태 | 도움말/오류 카드 | provider, live, partial |
| 레이어·측정 | 레이어만 실제 제공 | 지도 표시 | 죽은 기능 제거 | 측정 도구 |
| 공유 | 30일 서버 링크 생성 | 공유 링크 만들기 | 저장/외부 전송 구분 | 바로 공유됨 |
| 저장 완료 | localStorage write | 이 기기에 저장했어요 | 범위+결과 | 성공! |

확정 핵심 문구:

- 소개 제목: `내 조건에서 시작해, 갈 수 있는 하루를 설계합니다.`
- 소개 CTA: `내 여행 설계하기`; 보조: `어떻게 작동하나요?`
- 핵심 질문: `어떤 편의가 필요할까요?`
- 검색 CTA: `내 조건에 맞는 여행지 찾기`
- 빈 검색: `조건에 맞고 편의정보가 확인된 여행지를 찾지 못했어요.` / `지역이나 여행
  취향을 바꿔 다시 찾아보세요. 필요한 편의는 자동으로 줄이지 않습니다.`
- 실패: `여행지를 불러오지 못했어요. 선택한 조건은 유지됩니다. 연결을 확인하고 다시 찾아
  주세요.`
- 정보 부족: `편의정보를 확인하지 못했어요. 이용 가능하다는 뜻이 아닙니다.`
- 좌표 없음: `일정에는 그대로 보관하며 지도에서는 제외합니다.`
- 외부 이동: `카카오맵에서 확인` + `외부 서비스로 이동합니다.`

문체는 해요체 설명과 동작형 버튼을 사용한다. 오류는 문제·보존 상태·복구 행동 순으로 쓴다.

## F. 최종 여정과 화면 정보구조

1. `/`: 한 문장 가치→`내 여행 설계하기`. 강제 intro·재생 조작 없음. 3개 가치, 경남 지역,
   근거 설명, 마지막 CTA 순서다.
2. `/planner#conditions`: 기본 guided. 지역→필요한 편의→복수 취향을 한 질문씩 받고 검색한다.
   날짜는 장소 편의 필터가 아니라 일정·예보 범위이므로 일정에서 정한다.
3. `#places`: 마지막 검색 조건과 결과를 고정해 보여준다. 조건을 편집하면 “조건이 바뀌었어요”
   상태가 되고 이전 결과를 임의로 새 조건 결과처럼 보이지 않는다.
4. 상세 dialog: 사진→확인된/확인 필요/부정 시설→출처·기준시각→`일정에 추가`.
5. `#itinerary`: 검색 여부와 관계없이 기존 일정 진입 가능. 날짜 탭, 장소, 위/아래 이동,
   날짜 변경, 모든 구간 상태, 지도 순서가 같은 ID 순서를 사용한다.
6. 지도: 일정 장소와 선택 구간이 중심. `주변`, `출발·도착`, `지도 표시`, `로드뷰`, `내 위치`,
   `이미지`, `공유`만 제공한다.
7. `#departure-readiness`: 날씨·혼잡·교통·편의정보를 “확인/확인 필요/불러오기 실패”로 나누고
   사용자가 실제 검토 checkbox를 완료해야 끝난다.
8. 저장·공유: `이 기기 여행에 저장`과 `공유 링크 만들기`를 분리한다.

전체 보기 모드는 같은 state를 읽으며 복제 input을 만들지 않는다. URL hash·뒤로가기·새로고침은
동일 step state machine을 사용한다.

## G. 상태·API·저장·공유 계약

### 편의

- profile ID는 `wheel`, `senior`, `baby`, `pregnant`, `visual`, `hearing`을 유지한다.
- 각 profile은 `server/tourism/catalog.ts`의 실제 필드 집합만 평가한다. `senior`의 route 필드는
  접근로 텍스트일 뿐 “짧은 동선”을 보장하지 않는다.
- 필드 상태는 `positive | negative | unknown | error`다. 빈 문자열·미확인 표현은 unknown,
  upstream 실패는 error다. error를 unknown으로 합치지 않는다.
- 여러 profile이 같은 필드를 요구하면 카드에는 한 번만 표시하되 어떤 선택에 필요한지는
  accessible name/상세에서 연결한다.
- 기존 저장 profile ID는 migration 없이 계속 읽는다. 모르는 ID는 무시하고 원본 storage를
  즉시 덮어쓰지 않는다.

### 검색

`idle → loading → success | empty | insufficient | partial-error | error`를 사용한다.

- `draftCriteria`와 `lastSubmittedCriteria`를 분리한다.
- 검색 중 CTA는 disabled+`여행지 찾는 중…`; 동일 signature 중복 요청 금지.
- 새 요청은 이전 요청을 abort하고 request token이 최신일 때만 결과를 commit한다.
- 실패/재시도 중 직전 성공 결과는 `이전 검색 결과`로 유지하며 새 조건 결과로 표시하지 않는다.
- locale 변경은 표시 문자열만 바꾸고 자동 재검색하지 않는다. 데이터 언어 변경이 필요하면
  사용자가 명시 재검색한다.
- offline→online은 자동 요청 대신 재시도 CTA를 enable한다.

### 단계 제한

- 여행지 단계: 성공한 최신 검색 필요.
- 일정/출발 확인 단계: 현재 검색과 관계없이 실제로 복원된 저장 장소 1개 이상이면 접근 가능.
- URL/hash/rail/button/뒤로가기/새로고침에 같은 `available` 함수를 적용한다.
- 저장 ID만 있고 catalogue snapshot도 공유 복원도 실패한 orphan은 개수에 포함하지 않고 복구
  안내를 보여준다.

### 날짜·날씨·행사

- `travelStart <= travelEnd`, 최대 범위는 UI/server가 같은 상수로 제한한다.
- 범위 밖 기존 배정은 자동 이동하지 않고 목록과 날짜 이동 select로 보존한다.
- Open-Meteo 응답의 날짜가 여행일과 일치할 때만 그 날짜 예보로 표시한다. 현재 날씨로 대체 금지.
- 영업·행사 데이터가 날짜와 일치하지 않으면 `확인 필요`; “영업 중” 보장 금지.
- ICS v1은 여행 기간 알림임을 명시하고, 장소별 event 지원 전까지 구간 시간처럼 표시하지 않는다.

### 일정·지도

- 단일 기준: `orderedPlaceIds` + `scheduleAssignments` + `tripDays`.
- 목록 순서, 지도 번호, route legs, share payload, 향후 ICS가 이 projection을 사용한다.
- 좌표 없는 장소는 일정에 유지하고 지도·route leg에서 제외하며 이름을 사용자에게 알린다.
- leg별 `idle/loading/live/preview/error`를 독립 관리한다. 하나의 실패로 완료된 leg를 지우지 않는다.
- 순서/날짜/출발지 변경 시 영향받는 leg cache key만 무효화한다.
- 정확한 GPS 출발지는 메모리에서만 사용하며 localStorage/share payload/log에 넣지 않는다.

### 저장·호환

- 기존 key(`wave-saved-places`, catalogue, schedule, order, travel-book, preferences)를 유지한다.
- multi-key 저장은 새 snapshot을 먼저 검증하고 실패 시 기존 key를 건드리지 않는 two-phase helper로
  후속 PR에서 통합한다.
- `storage` event로 다른 탭 변경을 감지하되 마지막 writer를 숨기지 않고 “다른 탭에서 일정이
  변경됐어요”→다시 불러오기 CTA를 제공한다.
- 새 schema field는 optional additive. 서버는 최소 한 배포 주기 동안 구 payload를 읽는다.
- 롤백 가능한 기간에는 새 클라이언트가 구 필드를 제거하거나 기존 값을 재해석하지 않는다.

### 공유

- share payload는 최대 12개 place와 날짜·순서·조건·공개 출발지 label을 포함한다.
- 생성 캐시는 payload signature가 같을 때만 재사용한다.
- 좌표·GPS·사용자 프로필 명칭을 기본 포함하지 않는다.
- 30일 만료, 없는 장소, 부분 복원, 전체 복원 실패를 구분한다. 전체 실패 때 현재 추천으로
  대체하지 않는다.
- 구 v1 링크는 read path를 유지한다. 새 쓰기 버전 도입 후에도 old reader가 최소 요약을 열도록
  additive payload를 우선한다.

## H. 요구→이슈→PR→검수 추적표

| 요구 | 이슈 | 실행 PR | 검수 기준 |
| --- | --- | --- | --- |
| 복수 취향 | #252 | #287 | 두 개 선택 query·뒤로가기·재검색 |
| 한 화면 한 질문 | #253 | #287 | guided/overview 동일 state |
| 단계 제한·기존 일정 보호 | #254 | #287 + 본 PR | 새 검색 전 저장 일정 진입 가능 |
| 명시 검색 | #261 | #287 | 첫 방문 plan request 0회 |
| 일정/지도 SSOT | #264 | #287 | 날짜별 번호·leg 일치 |
| 자연스러운 한국어 | #265 | 후속 PR-2 | 용어 snapshot+수동 QA |
| 상세 근거 | #271/#274/#277 | #287 + 후속 PR-3 | 4상태·출처·경로 비보장 |
| 날짜 계약 | #275 | #287 + 후속 PR-4 | 범위 밖 보존·예보 날짜 일치 |
| 지도 도구 정리 | #276 | 본 PR | disabled 측정 버튼 0개 |
| 출발 확인 | #280 | #287 | 명시 검토 전 완료 아님 |
| 여행 lifecycle | #281 | 후속 PR-5 | 실패 원자성·다중탭 |
| 느린 네트워크 | #282 | #287 + 후속 PR-3 | 직전 결과 보존·late response 무시 |
| 도움말 | #283 | 후속 PR-2 | 제거 기능/저장 범위 동기화 |
| 성능 | #284 | 각 PR | 같은 조건 budget 비교 |
| 접근성 | #285 | #287 + 본 PR | axe, focus, 44px, reduced motion |
| 반응형 | #278/#286 | #287 + 본 PR | 지정 viewport overflow 0 |
| 디자인 절제 | #255/#257 및 본 명세 | 본 PR | 단일 CTA·불투명 표면·콘텐츠 높이 |

## I. 기존 이슈 정리안과 본문 초안

실제 이슈 변경은 하지 않는다.

- 유지·보강: #252, #253, #254, #255, #256, #257, #258, #259, #261, #264, #265,
  #267~#285.
- 통합 제안: #286은 #278의 상세 QA matrix로 이동 후 close. #263은 epic으로 유지하고 각 PR
  체크리스트만 링크한다.
- 이미 해결 표기 제안: #260은 PR #262 병합과 main SHA를 본문에 기록하고 closed 유지.
- 분할: #276을 `지도 핵심 도구 정리`와 `drawing 재도입 평가`로 분리하되 후자는 backlog.

### #276 본문 보강 초안

제목: `[UX] 지도 기본 도구를 실제 제공 기능으로 정리`

문제: SDK drawing library를 로드하지 않는데 거리·반경·면적 버튼이 기본 drawer에 disabled로
노출된다. 이는 “동작하지 않는 버튼을 기본 화면에 남기지 않는다”는 운영 기준에 어긋난다.

완료 조건: `레이어·측정`을 `지도 표시`로 바꾸고 측정 UI를 제거한다. 일정 추가·인쇄·공유와
레이어는 유지한다. 저장 데이터 삭제 없음. 모바일/키보드 drawer focus 복귀와 기존 `#map-panel-layers`
anchor를 유지한다. 추후 재도입은 Kakao SDK license/key/quota, touch/keyboard drawing, 상태 저장,
취소/초기화까지 독립적으로 검증한 뒤 결정한다.

### #254 본문 보강 초안

새 여행의 다음 단계 제한과 기존 일정 열람을 분리한다. 최신 검색이 없어도 resolve된 이 기기
일정이 1곳 이상이면 일정·출발 확인 화면을 열 수 있어야 한다. 추천 결과의 saved 교집합을 기존
일정 존재 판정에 쓰지 않는다. orphan ID는 완료로 세지 않고 복구 안내를 제공한다.

## J. PR별 상세 구현 명세와 독립 실행 프롬프트

### PR-1 (이번 PR): 운영 여정 회귀와 기본 화면 정리

1. 제목/브랜치/이슈: `fix: 기존 일정 진입과 핵심 화면 위계를 바로잡는다`,
   `fix/production-journey-completion`, #254/#255/#257/#276/#285.
2. 근거: 검색 결과 교집합이 기존 일정 count를 0으로 만들고, 지도 측정은 항상 disabled,
   인트로 replay는 장식만 재생한다.
3. 결정: 일정 수정, 측정 제거, replay 제거, 랜딩 절제.
4. 의존: #287 HEAD. #287보다 먼저 main에 병합하지 않는다.
5. 범위: `app/planner/page.tsx`, journey hook/frame, landing component/CSS, map command/panel,
   tests, design/system/spec. 비범위: 운영 배포·DB/API schema·drawing 내부 adapter 삭제.
6. Before→After: 검색 전 일정 잠김→기존 일정 열림; 죽은 4버튼→레이어/경로 행동;
   전체화면+replay+glass→콘텐츠 높이+단일 CTA+불투명 표면.
7. 문구: E절 그대로.
8. 상태: 저장 장소가 있으면 itinerary/departure available; 완료는 review와 별개.
9. 계약: storage/API/share 변경 없음.
10. 파일/함수: `PlannerPage`, `useJourneyProgress`, `PlannerStageFrame`, `LandingHero`,
    `MapCommandBar`, `MapLayerPanel`, 관련 CSS/E2E.
11. 순서: 게이트 수정→도구 제거→랜딩 정리→test/doc.
12. 호환: key/URL 유지; migration 없음.
13. QA: 320~2560, keyboard, reduced motion, performance budget.
14. 자동: lint/typecheck/unit/E2E/build/performance.
15. 수동: 기존 storage 주입→검색 없이 일정→날짜/지도; 지도 drawer; 랜딩 CTA.
16. Preview: ko/en, light/dark, API success/empty/error.
17. 배포 전: #287 병합/같은 deploy bundle, CI/Preview 승인.
18. smoke: GET `/`, `/planner`, 기존 trip URL; 데이터 생성 금지.
19. rollback: UI commit revert; 데이터 영향 없음.
20. 완료: 죽은 버튼 0, 저장 일정 접근, viewport overflow 0.
21. 실행 프롬프트: M절.

Apple 채택: 콘텐츠 우선·선택 명시·표면 절제. 비채택: SF Pro/Apple blue/36px/Liquid Glass.

### PR-2: 한국어 용어·도움말·서비스 상태 통합

1. 브랜치 `feat/korean-content-contract`, #265/#283. 2. 화면별 용어 불일치와 내부어 노출 해결.
3. 수정+통합. 4. PR-1 후. 5. copy catalog/help/status만, API 비범위. 6. `보관/찜/저장`
혼재→E 용어표. 7. E 확정 문구. 8. 오류별 recovery CTA. 9. 데이터 계약 불변.
10. locale catalog, header, cards, dialogs, help, status. 11. glossary→component→snapshot→QA.
12. 기존 locale storage 보존. 13. 200% zoom·긴 장소명. 14. copy snapshot+a11y. 15. 전 화면
클릭. 16. Preview ko/en. 17. 번역 review. 18. 비파괴 읽기. 19. revert. 20. 금지어 scan 0.
21. 프롬프트: “본 문서 E절만 구현하라. 기능·API·저장 형식은 바꾸지 말고 모든 동일 행동에
동일 용어를 적용한다. 오류는 문제/보존/다음 행동을 포함하고 lint/typecheck/test/E2E/build를
실행해 PR을 생성하라.”

### PR-3: 검색·편의 4상태와 부분 실패 계약

1. `fix/search-evidence-state-contract`, #271/#274/#277/#282. 2. request error와 unknown이
합쳐지고 generic non-empty가 positive가 될 위험. 3. 핵심 수정. 4. PR-2 후. 5. plan/detail model,
UI, fixtures; 추천 알고리즘 전면교체 비범위. 6. 단일 score→필드별 확인/부정/미확인/실패.
7. E 오류문구. 8. G 검색 state. 9. additive response status, old client fallback. 10.
`accessibility-model.ts`, `plan-builder.ts`, `usePlanRequest.ts`, evidence components. 11. parser→model→UI.
12. response field optional. 13. slow/offline/screen reader. 14. fixture matrix. 15. abort/late/retry.
16. Preview 실 API 별도. 17. API budget. 18. no-write GET smoke. 19. flag/revert, DB 없음. 20. unknown을
positive로 표시하는 case 0. 21. 프롬프트: “G의 편의·검색 계약을 정확히 구현하고 upstream별
성공을 독립 보존하라. 필요한 편의를 완화하지 말고 fixture와 live preview 결과를 구분해 PR을
작성하라.”

### PR-4: 날짜·날씨·ICS 진실성

1. `fix/date-weather-export-contract`, #256/#275/#280. 2. 현재 날씨/미래 일정과 단일 ICS 의미
혼동. 3. 수정+범위 축소. 4. PR-3 후. 5. date/weather/readiness/ICS. 6. 값 대체→날짜 일치/확인
필요. 7. E 문구. 8. forecast out-of-range. 9. 기존 schedule 보존. 10. weather model/hooks/board,
departure, calendar. 11. pure date funcs→UI. 12. timezone Asia/Seoul, old data. 13. narrow/date input.
14. boundary tests. 15. 범위 밖·API 실패. 16. same date preview. 17. system clock 고정. 18. 읽기만.
19. UI rollback, storage 불변. 20. 대체 현재 날씨 0. 21. 프롬프트: “G의 날짜 계약을 구현하고
예보가 없으면 없다고 표시하라. ICS가 실제 표현하는 범위를 UI와 파일명에 명시하라.”

### PR-5: 저장·공유 호환과 다중 탭 복구

1. `fix/trip-persistence-compatibility`, #281. 2. multi-key 부분 저장, stale share URL, 부분 복원 시
무관 추천 fallback. 3. 수정. 4. PR-4 후. 5. local helper/share payload/restoration. 신규 sync 서버
비범위. 6. silent failure→복구 안내. 7. `이 기기에 저장하지 못했어요...`. 8. G 저장 states.
9. additive schema/v1 read. 10. saved catalogue/schedule/order/travel-book/share. 11. signatures→atomic
helper→restore. 12. 구/신 client fixture. 13. storage quota/multitab. 14. migration/rollback tests.
15. 두 탭·quota·expired URL. 16. Preview link. 17. old-client canary. 18. existing link GET. 19. write
version gate; 기존 데이터 삭제 금지. 20. stale URL 0, unrelated fallback 0. 21. 프롬프트: “G 저장·공유
계약을 additive하게 구현하라. 기존 key와 v1 링크를 보존하고 실패 시 기존 값을 덮지 마라.”

### PR-6: 반응형·브라우저·실기기 release gate

1. `test/release-device-matrix`, #267/#278/#286. 2. Chromium 두 viewport만 존재. 3. QA 보강.
4. PR-5 후. 5. Playwright WebKit/viewport, manual checklist; 디자인 재작업 비범위. 6. 산발 QA→K표.
7. 문구 불변. 8. browser permission states. 9. API mocked/live 분리. 10. playwright config/e2e/docs.
11. cheap matrix PR→nightly full matrix. 12. 데이터 없음. 13. K 전체. 14. screenshot/axe/overflow.
15. 실기기 기록. 16. Preview. 17. 필수 브라우저 통과. 18. smoke. 19. test-only revert. 20. P0 0.
21. 프롬프트: “K 매트릭스를 비용별 CI/Preview/실기기로 나누고 에뮬레이션을 실기기로 쓰지
마라. overflow 숨김으로 실패를 통과시키지 마라.”

## K. 모바일·PC·브라우저·접근성 검수표

| 범위 | 자동/수동 | 합격 기준 |
| --- | --- | --- |
| 320, 360×640, 390×844, 412, 430 | Playwright+수동 | 가로 overflow 1px 이하, CTA/지도/모달 가림 없음 |
| tablet portrait/landscape | Preview 수동 | 질문/목록 1~2열 자연 전환, 드래그 외 버튼 제공 |
| 1024×768, 1366×768, 1440×900 | Chromium CI | 핵심 행동 first viewport, PC 폭 활용 |
| 1920×1080, 2560×1440 | screenshot | max width·정렬선, 과도한 빈 가운데 mobile column 금지 |
| breakpoint ±1px | 자동 | layout jump·잘림 없음 |
| 휴대폰 가로/낮은 높이 | 실기기 | sticky CTA·dialog close 접근 가능 |
| Windows Chrome/Edge | Preview/실기기 | 한글 fallback·date/input·clipboard |
| macOS/iPhone Safari | WebKit+실기기 | safe-area, 주소창, 100svh, 공유/ICS fallback |
| Android Chrome | 실기기 | keyboard, current location 거절/timeout, 지도 scroll |
| Samsung Internet/인앱 | 수동 핵심지원 | 검색→추가→일정 완료; 미지원 share는 링크 복사 대체 |
| 키보드 | 자동+수동 | skip, visible focus, dialog trap/return, 날짜/순서 버튼 |
| 보조기술 | NVDA/VoiceOver 후속 | 질문·선택·근거 상태·오류 live region 이해 가능 |
| 확대/큰 글자 | 200%, OS text | 문구 잘림·가림 없음, 재배치 허용 |
| 대비 | axe+computed | 일반 4.5:1, 큰 글자/UI 3:1 |
| 조작 영역 | computed | 핵심 interactive 44×44 이상 |
| 모션 | media emulation+실기기 | 의미 보존, 자동/3D/scroll 장식 정지 |
| 이미지/API 실패 | fixture | alt/fallback, empty와 error 구분 |

## L. 배포·호환·롤백 계획

`baseline → 로컬 → CI → Preview → 승인 → 운영 배포 → 비파괴 smoke → 관찰/rollback` 순서다.

1. #287과 본 PR은 같은 release bundle이다. stacked PR을 먼저 main에 병합하지 않는다.
2. main 최신 SHA를 각 PR 검수 직전에 fetch하고 base 변동 시 테스트를 다시 실행한다.
3. CI는 Node 22.13.0 계약을 사용한다. 로컬 Node 24 E2E dev-server 실패는 CI 결과로 대체하지
   말고 원인/환경을 기록한다.
4. Preview에서 production과 API origin, auth callback, public Kakao key 허용 도메인, database,
   cache headers 차이를 checklist로 확인한다. secret 값은 로그에 출력하지 않는다.
5. DB migration은 additive만 먼저 적용한다. 이번 본 PR은 migration이 없다.
6. 구버전 탭은 기존 API payload를 계속 읽을 수 있어야 한다. breaking server response는 최소 한
   release 뒤 제거한다.
7. production smoke는 `/`, `/planner`, 기존 공개 trip GET, health GET만 사용한다. 계정·글·공유
   생성 금지.
8. 오류율/latency/health 악화 시 Vercel alias를 이전 deployment로 되돌리고 앱 commit을 revert한다.
   migration rollback은 alias rollback과 별개이며 destructive down migration을 자동 실행하지 않는다.
9. localStorage는 배포 rollback으로 되돌아가지 않는다. 그러므로 write는 additive하고 old client가
   모르는 field를 무시하게 한다.
10. 정적 자산 hash가 바뀌어 열린 구버전 탭 chunk가 실패하면 새로고침 안내를 제공한다. 서비스
    worker가 없으므로 SW cache purge 절차를 만들지 않는다.

## M. 첫 PR 즉시 실행 프롬프트

> `feat/launch-experience-overhaul`의 최신 HEAD에서 새 브랜치
> `fix/production-journey-completion`을 만든다. main이나 기존 PR 브랜치에 직접 쓰지 않는다.
> 이 문서 J의 PR-1만 구현한다. 기존 이 기기 일정은 현재 검색 결과와 무관하게 resolve된
> `orderedSavedPlaces`가 있으면 일정·출발 확인 단계에 진입할 수 있게 한다. 완료 조건은 진입
> 가능성과 분리한다. Kakao drawing library가 제공되지 않는 현재 운영 계약에서는 지도 drawer의
> 거리·반경·면적·지우기 UI를 제거하고 `레이어·측정`을 `지도 표시`로 바꾼다. 저장·인쇄·공유와
> layer는 유지한다. 랜딩의 `인트로 다시보기`와 강제 100svh를 제거하고, Deep Ocean 색·현재 한글
> font stack·44/48px 기준을 유지한 채 불투명 표면, 단일 주요 CTA, 행간 1.08 이상의 한글 제목을
> 적용한다. Apple blue/SF Pro/36px/Liquid Glass를 복사하지 않는다. CSS/props/import/test/help/design
> 문서를 함께 정리한다. 기존 storage key, 일정, 공유 URL, API와 DB는 변경하지 않는다. lint,
> typecheck, unit, E2E, build:vercel, performance를 실행하고 실행/실패/미실행을 분리 기록한다.
> 실제 운영 배포나 운영 데이터 생성은 하지 않는다. CLAUDE.md의 AI log와 PR template을 지켜
> stacked draft PR을 만들고 #287 의존성을 본문 첫 부분에 표시한다.

## N. 승인 필요한 결정과 미검증 사항

### 이번 요청으로 승인된 것으로 실행한 결정

- 항상 비활성인 지도 측정 UI 제거. 내부 adapter의 완전 삭제는 별도 PR.
- 장식 전용 `인트로 다시보기` 제거, hero 전체화면 강제 해제.
- 기존 일정은 새 검색보다 우선해 열람·편집 가능.
- #287 위 stacked PR로 충돌 없이 보완하고 실제 main 병합·운영 배포는 하지 않음.

### 병합 전에 저장소 책임자가 확인할 결정

- #287의 ko/en 제공 범위 축소를 그대로 release할지, 기존 6개 beta 언어 selector를 임시 복원할지.
  본 명세 권고는 미완성 다국어를 완성처럼 노출하지 않는 범위 축소이며 기존 저장값은 보존한다.
- migration `008_review_date_integrity.sql`을 production에 적용할 권한과 rollback 운영 절차.
- VWorld 실제 경계 SVG와 관광사진의 항목별 license/credit. 확인 전 자산 배포 금지.
- GPS 출발지의 서버 전송 범위를 private-origin 정책과 실제 ODsay 필요 입력 사이에서 확정.

### 미검증

- 실제 production SHA, production env 차이, API quota, real auth callback.
- iPhone Safari/Android Chrome/Samsung Internet/인앱 브라우저 실기기.
- 한화오션 페이지의 실제 동작/CSS(조사 환경 접속 실패).
- #287 전체 E2E와 Preview 화면. 로컬 Node 24 Vinext 실패와 CI Node 22 결과를 분리한다.

## 완료 전 자체 검토

- 핵심 편의·일정·지도·공유는 제거하지 않았고, 제거는 죽은 측정과 장식 조작으로 한정했다.
- 기능 제거 뒤 CTA·drawer·레이아웃·문서·테스트를 함께 재구성했다.
- `확인됨`, `무료`, `안전`, `무장애 경로`를 데이터보다 강하게 약속하지 않는다.
- 기존 storage key·공유 URL·서버 payload를 이번 PR에서 변경하지 않는다.
- 전문가 검토·코드 테스트·운영 열람과 실제 사용자/실기기 테스트를 명확히 구분했다.
- 모든 후속 PR은 독립 rollback과 구체적인 완료 조건·실행 프롬프트를 가진다.
