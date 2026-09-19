# PR #번호 AI 작업 로그

- PR: (push 후 채움)
- 제목: feat: 보조기기 대여처 안내
- 작성자: Claude Sonnet 5 (Claude Code)
- 최종 상태: 리뷰 대기 (사람 확인 항목 있음, human-gate)
- AI 도구: Claude Code (claude-sonnet-5)

## 목적

명세 30(`specs/30-equipment-rental-link.md`)을 구현한다. 여행 중 휠체어나 보조기기가 고장 났을 때
빌릴 수 있는 곳에 바로 연락할 수 있게 한다. 이 PR은 `feat/spec-17-help-request` 위에 쌓는다(17번의
도움 요청 화면 안에서 열리는 진입점이 있기 때문).

## 0단계: 대여처 확인 (웹 조사 결과, 사람 확인 필요)

repository owner 확인 없이는 어떤 기관·번호도 코드에 넣지 않는다는 원칙에 따라, 아래는 **후보
조사 결과이며 확정된 정보가 아니다.** 웹 검색만으로는 대여 가능 품목·이용 조건(거주지 제한 여부)·
정확한 전화번호를 신뢰성 있게 확인할 수 없었다.

| 후보 기관/경로 | 성격 | 확인 필요 사항 | 출처 |
|---|---|---|---|
| 보건복지부 국립재활원 중앙보조기기센터(knat.go.kr) | 전국 보조기기센터 지도/목록 제공 | 경남 권역 지역센터 목록, 정확한 명칭·전화번호 | https://www.knat.go.kr/knw/home/knat/knat_map.php |
| 공유누리(eshare.go.kr) | 지자체 복지용구 공유 물품 검색 플랫폼(수동 휠체어 등 등록 사례 확인) | 경남 시군별 등록 여부, 대여 조건(관내 거주 제한 여부), 실시간 재고 API 존재 여부 | https://www.eshare.go.kr |
| 창원시 장애인복지 담당부서(대표 055-225-2000으로 추정) | 창원시 휠체어 대여 관련 문의 창구 | 이 번호가 보조기기 대여 담당 부서가 맞는지, 대여 전용 번호가 따로 있는지 | https://www.changwon.go.kr/cwportal/depart/11067/14022/14031.web |
| 창원 "휠체어택시" 예약 번호(275-7447로 검색됨) | 검색 스니펫에 지역번호 없이 노출 — 보조기기 "대여"가 아니라 "택시" 서비스로 보임 | 보조기기 대여와 무관할 가능성이 높아 채택하지 않음 | 웹 검색 스니펫(1차 출처 미확인) |
| 진주·김해 등 다른 시군 | 검색으로 특정 기관을 찾지 못함 | 시군별 전수 조사 필요 | - |

공공데이터포털 OpenAPI는 이번 조사에서 보조기기 대여 전용 API를 찾지 못했다(0단계 4번 조건 미충족 →
정적 목록 방식으로 진행). 확인된 곳이 "하나도" 없는 것은 아니지만(후보는 있음), **신뢰할 수 있는
1차 출처로 전화번호·이용조건까지 확정하지 못했으므로** `equipmentRentalPlaces`는 빈 배열로 남긴다.
저장소 책임자가 위 후보를 검증하거나 직접 알고 있는 기관 정보를 확정해 주면 후속 커밋으로 채운다.

## 구현 내용

- `features/planner/equipment-rental.ts`: `EquipmentRentalPlace` 타입과 `equipmentRentalPlaces`(현재 빈 배열, human-gate 주석 포함).
- `features/planner/components/EquipmentRentalList.tsx`: 목록 표시 컴포넌트.
  - 항상 `대여 가능 여부와 조건은 기관에서 정해요. 전화로 먼저 확인해 주세요.` 문구를 보여준다.
  - 사용자가 고른 지역(장소의 `city` 또는 여행 지역)으로 먼저 거르고, 없으면 경남 전체를 보여준다.
  - `equipmentRentalPlaces`가 비어 있으면(현재 상태) 목록 대신 `확인된 대여처가 아직 없어요.`라는 정직한 상태 문장만 보여주고, 항목·버튼은 그리지 않는다. 지역 한정 결과가 없고 전체 목록은 있는 경우에는 `이 지역에 확인된 곳이 없어요.`를 보여준다(명세의 오류 처리 절 그대로).
  - `phoneNumber`가 없으면 `전화 앱 열기`를 그리지 않는다. `url`은 `https://`로 시작할 때만 링크를 그린다.
  - 입력칸을 하나도 만들지 않았다(신청 양식 없음).
- `features/planner/components/HelpRequestDialog.tsx`: `placeRegion` prop을 추가하고, `기기가 고장 났어요` 상황을 고르면 `EquipmentRentalList`를 인라인으로 보여준다.
  - 명세는 "lazy import"를 명시했지만, 17번에서 이미 정적 import로 굳힌 "이 화면을 여는 동안 새 네트워크 요청 0건" 불변조건을 지키기 위해 **정적으로 import**했다(목록 자체가 빈 배열이거나 정적 데이터라 코드 크기 비용이 거의 없다). 이 결정은 명세 문구보다 명세가 명시한 상위 불변조건(오프라인 동작)을 우선한 것이며, PR에서 사람 확인을 요청한다.
- `features/planner/components/TripDayTools.tsx`, `PlaceInquiryCard.tsx`: `HelpRequestDialog`에 `placeRegion`(장소의 `city`)을 추가로 전달한다. 기기 위치가 아니라 일정에서 고른 장소의 시군을 쓴다.
- `features/planner/components/DepartureReadinessCard.tsx`: 기존 `assessDepartureReadiness().items`(날씨·관광 집중률·이동 경로·이동 편의·장소 편의근거)는 건드리지 않고, 그 아래에 `보조기기` `<details>` 항목을 하나 추가해 여행 지역(`region`)으로 거른 `EquipmentRentalList`를 보여준다. 이 항목은 "확인됨/부분확인/재확인" 같은 상태 배지를 붙이지 않는다(정보성 항목이라 점수화하지 않음).
- CSS 파일은 수정하지 않았다. 카드 배경·테두리·모서리는 `var(--paper, #fff)`/`var(--line)`/`var(--r-md, 8px)` 인라인 스타일로 구현했다(전역 `--white` 토큰은 특정 스코프에서만 정의되어 있어 대신 안전한 폴백이 있는 `var(--paper, #fff)`를 썼다). `전화 앱 열기`는 `var(--accent)` 배경, 최소 높이 48px 인라인 스타일이다.

## 사람 확인이 필요한 부분 (human-gate)

- `equipmentRentalPlaces`에 넣을 실제 기관 이름, 전화번호, 대여 가능 품목, 이용 조건(거주지 제한 등), 운영시간, 안내 URL, 확인 날짜. 위 0단계 표의 후보를 검증하거나 다른 확인된 정보로 대체해야 한다.
- `#545`(문자중계 안내) 링크: 17번 PR과 동일하게, 저장소에 해당 내용이 아직 없어 추가하지 못했다.
- "확인된 대여처가 아직 없어요."라는 상태 문장을 보여줄지, 아니면 항목 자체를 완전히 숨길지: 이번 구현은 전자를 택했다(빈 목록을 그리는 것과 "아직 확인된 곳이 없다"는 사실을 말하는 것을 구분했다). 저장소 책임자가 다른 판단을 하면 조정이 필요하다.

## 검증

```sh
git fetch origin main
git merge-base --is-ancestor origin/main HEAD   # feat/spec-17-help-request 기준으로 통과(main 포함)
npm run lint            # 0 errors, 14 warnings(기존과 동일)
npm run typecheck       # 통과
npm test                # 1275 tests, 1273 pass, 2 fail(Python 없음, main에서도 실패하는 기존 문제, 무관)
npm run build:vercel    # 통과
npm run check:performance  # 통과. cssGzipKiB 70 → 70(변화 없음), plannerInitialJsGzipKiB → 210.47(budget 270)
```

- `tests/equipment-rental.test.mjs`(신규 7개): `equipmentRentalPlaces`가 빈 배열인지(소스 검사), 개인정보/신청서 필드가 없는지, `eligibility`·`checkedOn`이 타입에 필수인지, 전화번호 유무에 따른 버튼 렌더 규칙, `https` URL만 허용하는 규칙, 위치 API 미참조. 모두 통과. (`.ts` 파일을 plain `node --test`가 트랜스파일하지 못해 소스 텍스트 검사 방식을 썼다 — 기존 관례와 일치.)
- `e2e/equipment-rental.spec.ts`(신규 3개): 17번 도움 요청의 `기기가 고장 났어요`에서 열리는 것, 입력칸 0개, 서버 호출 0건(`**/api/**` 차단 방식, 17번 PR과 동일한 사유), 출발 전 확인의 `보조기기` 항목에 입력칸이 없고 `전화 앱 열기`가 있다면 `tel:` 링크인 것, 세 폭(1440/960/390) axe 위반 0건, 17번의 오프라인 흐름이 이 변경 이후에도 유지되는 것. `desktop-chromium`·`mobile-chromium` 모두 통과.
- 회귀 확인: `e2e/departure-readiness.spec.ts`, `e2e/help-request.spec.ts`, `e2e/trip-day-tools.spec.ts`, `e2e/place-decisions.spec.ts`를 다시 실행해 11/11 통과(desktop-chromium).

## 결과와 제한

- 확인된 기관이 없어 이 기능은 "빈 목록 + 정직한 상태 문구"로 출시된다. 실제 유용성은 저장소 책임자가 기관 정보를 확정해야 생긴다.
- `npm run test:e2e`(전체 스위트)는 관련 스펙만 선택 실행했다(전체 실행은 CI 확인 필요).
- CSS를 늘리지 않아 "죽은 선언 제거" 절차는 필요하지 않았다.
