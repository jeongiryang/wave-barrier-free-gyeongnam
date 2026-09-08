# #353 실제 여행 화면 연결 — 구현·검증 기록

## 2026-09-09 07:11:25 KST — 배포 사실 대조

- 원격 후보 `9f83fb920343cec31abfa3de04cc6414e43e3728` → #378 포함 main `eab2442f90b72441fd311db13dd8bb935723527f` → Production `dpl_GVGVzh2TahHEDKDJHUp6vCN9FaGJ`. CI/CD: [main CI868 attempt2](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34277144002/attempts/2) SUCCESS(고유838: 837 PASS·기존skip1·fail/flaky0), [CD221](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34282029576) SUCCESS. canonical 대조: 2026-09-09 06:45:02.580 및 07:01:03.532 KST 독립 canonical 조회에서 같은 SHA/배포의 READY·production을 전후 확인했다([독립 Production 검증 범위](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788)).
- 독립 Production QA 범위/제한/증거: [독립 Production 검증 범위](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788): 2026-09-09 06:46–07:01 KST 공개 여정의 제한된 PASS. 74개 관찰에서 처리되지 않은 페이지 오류0건, 실제 Kakao 날짜별 표지·날씨 상세 초점·기기 저장의 장소 ID/날짜/순서 복원을 확인했다. route/ODSay 전송0건이며 전체 제공처·모든 설정 복원·#353 완료를 뜻하지 않는다. 기존 bf29 CI866 성공과 독립 Preview `_leaflet_pos` FAIL, 수정 전 정상2 FAIL/감소2 PASS와 동일 local 수정 후4 PASS는 아래 원문 그대로 보존한다. 새 CI 결과로 이력을 지우거나 local4를 새 Production 검증으로 세지 않는다.
- CI868 attempt1의 25분 job 취소·browser(2) artifact 미보관 이력을 보존한다. attempt2에서 browser(2)·validate만 새로 실행했고 quality·boundary·browser(1)은 같은 SHA의 이전 성공/동일 로그와 artifact를 상속했다. 단일 재시도 성공은 job budget 원인 수정 증거가 아니다. #357은 별도 incident 원장을 따른다. CD221 사전 점검은 8 total/1 active/008 영향0, migration 경로001–008 성공을 확인했다. [PostDeploy12](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34282190225)는 browser8 PASS/26초와 API smoke0회 hold를 분리하며 전체 FAILURE다.
- 실제 공개 여정의 plan1/weather1/spot-photo2/crowd1/enrich1/map-config15 허용은 browser 요청 집계다. crowd1은 응답 전에 중단됐으며 HTTP200 응답 20건을 모든 upstream 성공으로 세지 않는다. route/ODSay 전송0건·서버쓰기0, guard console20건과 crowd 중단1건을 보존했다. 저장/복원은 주남126117·대산2758443의 ID/날짜/순서이며 좌표는 의도적으로 제외됐다. 위치 재확인을 누르지 않았고 도착 추정/모든 설정 복원은 보장하지 않는다. 실제 Kakao 검수는 기존 Leaflet Preview 실패의 새 재검수도, 초기 hydration 관찰#347의 해소도 아니다.
- #379는 다른 실행이 소유한 외부 Draft PR이다. 이 작업에서 생성·push·검토·병합하지 않았으며, CI869 green을 현재 Production 변경이나 CI868 attempt2의 원인 수정으로 세지 않는다.

- 사람은 KO 우선, 일반 Intro/Hero 연출 유지, 필수 요구와 선택 아이디어 보존을 결정했다. AI는 구현·회귀·증거 정리 중 실제 수행한 범위만 기록한다. 최종 사람 GO·제출은 완료 처리하지 않는다.
- #353 ACTIVE: 기존9caca 별도02:29 날짜와03:08 지도는 그대로 보존한다. 새 eab 같은 공개 세션의 날짜 변경→날짜별 실제 Kakao 지도 근거는 확보됐다. 이를 소개에서 공유하는3가지 상태로 표시하는 로컬 미커밋 구현, 보조 6개 도구 native 접기/본문 16px 및 최종 제출 캡처는 별도 검증 대상이다. 일반 Intro/Hero는 유지하며 D41–D46 이관과 #372 hold는 바꾸지 않는다.
- 현재 로컬 자산 6개는 06:55:25.855–06:58:13.668 KST eab 원본의 픽셀 동일 정수 crop/무손실 WebP(978,798 bytes)이며 [timeline manifest](../../public/media/wave-journey/timeline-manifest.json)에 원본 SHA/출처/상태를 보존했다. Production 촬영 자료를 로컬 소개에 연결한 것과 새 소개를 Production에서 검증한 것은 다르다.
- 이 문서 갱신은 기존 7개 문서만 수정했다. 부모 작업의 제품 코드/검사는 변경하지 않았고 새 provider·브라우저·테스트·CI를 실행하지 않았다. 원본 independent-production-qa.md/bounded-production-qa-receipt.json의 제한된 판정을 인용했으며 이 문서 작성자가 독립 QA PASS나 사람 승인을 새로 선언하지 않는다.

## Historical — 후보 준비·수정 당시 기록

기준: `81b88e4f6bf69c4811d458fbe2639a87e885a84b` 이후의 `feat/service-story-real-353`.
관련 Issue는 #353 및 실제 지도 표지 가림을 기록한 #347이다. #375의 정상 첫 방문 인트로·큰 Hero·스크롤 프레임 확장·명시적 영상 재생은 보존한다. #21의 일반 모션 약화는 Owner 비채택이며 OS/앱 감소 모드의 정적 대안은 계속 유지한다.

## 실제 변화

- 가상 세 장소·고정 17일 달력·순서 SVG를 실제 창원 공개 화면으로 바꾼다. 주남저수지126117→대산플라워랜드2758443, 2026-09-09 일정과 지도는 동일 촬영의 장소·순서다. 네 단계 버튼·초점·이름·polite 안내와 일반 모션은 유지한다.
- 편의 선택과 공식 시설 근거, 확인·미확인 상태는 펼쳐 읽는 별도 정보에 둔다. 별도 촬영의 날짜 변경 전후는 기본 지도와 연결된 상태로 오인하지 않도록 접힌 시연으로 분리한다. 이 소개 버튼이 실제 사용자의 여행을 저장·수정하거나 API를 조회하지 않는다.
- 관광사진 워터마크, 카카오 로고·축척, 시설 원문·조회 시각을 변경하지 않은 실제 캡처7개, 549,350bytes를 선별한다. [원본·권리·상태 원장](../../public/media/wave-journey/README.md), [개별 해시](../../public/media/wave-journey/manifest.json). 촬영 당시 Production9caca의 기록이며 실시간 결과나 경로 성공이 아니다.
- 이미지가 실패해도 비율과 공간을 유지하고 읽을 수 있는 오류 안내·장소 이름·플래너 링크를 남긴다. 새 영상 자동재생·SDK·의존성을 추가하지 않는다.
- 큰 이미지 옆 설명이 수직 중앙에 밀려나던 로컬 시각 문제를 시작점 정렬로 고쳤다. 데스크톱 설명은 이동 중에도 보이며 상세를 펼치거나 모바일에서는 정상 문서 흐름을 따른다.
- 지역 선택 안내와 시연 문서를 실제 필요한 편의 중심 문구로 맞춘다. 옛 사람 유형 명칭 두 개 대신 확인된 선택지 ‘접근로와 승강기’1개를 사용한다.

## 지도 표지 가림 P2

[실제 Production 재현](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/347#issuecomment-5589728501)에서 날짜를 옮긴 뒤 사진 표지가 도구막대에 가렸고 390px 사진 일부가 캔버스 밖으로 잘렸다. 원본 실패 캡처를 보존한다.

Kakao 기본 bounds 여백과 Leaflet 고정46px는 도구막대·사진의 실제 크기를 반영하지 않았다. SDK별 원래 장소 bounds를 유지하는 callback으로, 도구막대·연결 상태·사진과 번호표의 실제 DOM 크기를 여백에 반영한다. 기존 relayout 처리를 확장해 화면/도구 크기 변경만 관찰하고 사용자 pan이나 페이지 스크롤에서는 다시 맞추지 않는다. 취소·교체·언마운트 시 callback/observer/timer를 정리한다. [Kakao setBounds 공식 계약](https://apis.map.kakao.com/web/documentation/#Map_setBounds)을 따른다.

이는 로컬 구현·회귀 통과 범위이며 **실제 SDK Preview 및 Production에서 가림이 해소됐다는 최종 증거는 아직 필요하다.** SDK adapter 테스트를 실제 지도 서비스의 응답 성공으로 계산하지 않는다.

## 현재 실행한 검증

2026-09-09 KST, 위 브랜치의 로컬 미커밋 변경 기준.

- `npm run typecheck`: 통과.
- `npm run lint`: 최종 오류0, 기존 경고5. 새 지도 테스트의 별칭 변수2건이 최초 검사에서 실패해 변수명·observer 보관만 수정했다. 최초 실패 로그도 보존했고 관련 지도12건도 다시 통과했다.
- `npm test`: **705 PASS**, 실패·skip·cancel0 (13.806s).
- `node --test tests/map-viewport-fit.test.mjs tests/map-load-recovery.test.mjs`: **12 PASS**, 실패·skip0. 실제 renderer 본문을 제한된 SDK adapter로 실행해 원래 bounds·비대칭 여백·날짜 교체·취소·화면 크기 변경을 검증한다.
- 관련 `landing-first-arrival`, `service-story`, `landing-theme-contrast`: **34 PASS** (24.0s). 이미지 실패 대체의 KO/EN·desktop/mobile 추가4건 **4 PASS** (4.9s). 상태·정확한 두 장소ID·날짜·지도 순서·키보드·모션 감소·대비4.5:1·이미지 실제 decode·실패 공간 유지·추가 여행 API요청0을 검사한다.
- 관련 `map-load-recovery`, `map-save-trip`, `map-tools-reachable`, `region-change-boundary`: **36 PASS** (51.4s). 기존 날짜·지역·저장·복원·키보드·도구 접근 계약을 유지한다.
- `condition-prerequisites`: **8 PASS** (7.8s). main CI864의 실제 첫 시도 대비 실패는 큰 Hero 아래 요약이 일반 모션 전환 중일 때 DOM 이름·문자만 확인하고 axe를 실행한 경합이었다. 정상 스크롤 진입 후 motion-ready·실제 표시·opacity1을 먼저 요구하는 준비 검증을 추가했으며 기존 Hero 전체 axe·이름·번역·넘침 검사는 그대로다. 모션·대비 기준이나 timeout을 바꾸지 않았다.
- `npm run build:vercel` 및 `npm run check:performance`: 이미지 실패 대체까지 포함한 최종 결합본 통과. gzip CSS69.77/70, landing120.88/155, planner269.85/270, largest95.92/110KiB. 예산은 올리지 않았다.
- 로컬 실제 브라우저1280×720와390×844에서 첫 장면·실제 관광카드·날짜 장면·설명 위치와 넘침을 봤다. 자동 테스트의 테마/다국어/axe 결과와 실제 기기·낭독기 결과는 구분한다.

테스트 삭제·새 skip·timeout/worker/retry/성능 기준 완화 없음. 가상 세 장소 계약은 실제 두 장소의 정확한 ID·이름·날짜·지도 동일성과 촬영 구분을 더 직접 검증하도록 바꿨다. 기존 대비·넘침·초점 검사는 보존하고 전 단계 대비 검사를 추가했다.

## 보존 및 남은 Gate

원본 source 브랜치·사용자 dirty10·50worktrees·queue294 generation5/attempts/receipts·PITR/restore·실패 CI와 모든 캡처는 보존했다. 작업 증거는 `D:/wave-db-binding-preflight-20260908/`의 `story353-real-*`, `landing353-real-assets-9caca/`, `map-p2-fit-proposal-81b88e4/`에 있다.

#377은 main81b88e4로 병합됐지만 [main CI864](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34264286393)는 2026-09-09 04:04:11 KST FAILURE로 종료됐다. browser(1)의 기존 EN 요약 대비 검사가 첫 시도 실패→내장 retry 성공으로 flaky Gate에서 실패했다. 실패 대비1.08/1.03:1과 원본 trace·캡처는 독립 기록에 보존했다. 해당 랜딩 CSS·컴포넌트·검사는 #377에서 변경되지 않았으며 날씨 회귀나 인프라 실패로 판정하지 않는다. 별도로 browser(2)는 desktop207·mobile206 PASS+기존skip1 후 화면 artifact 업로드 중 25분 job 한도로 취소됐다. 전체830건은 PASS828·flaky1·기존skip1이며 추가 제품 실패0이다. regression 보고서는 모두 보존됐고 screenshots-2 업로드만 미완료다. CD219/PostDeploy10은 SKIPPED이며 신규 DB 쓰기·배포가 없었다. 04:08:55 KST Vercel canonical metadata는 여전히 Production9caca69fd5db24ed0bc741ad68ffef0d00ffe3ee READY였다.

과거 CI863의 성공이나 이후 재시도로 첫 실패를 덮어쓰지 않는다. ODsay #372 hold를 유지하며 반복 provider 실호출·유료 모델 API·자동화 활성화·#373 확대는 하지 않는다.

다음: 준비 상태를 더 엄격히 확인하는 작은 테스트 수정을 독립 commit으로 보존하고 현재 #353 후보에 포함한다. #373 전체를 가져오거나 main864를 무작정 재실행하지 않는다. #353 후보의 Full CI·정확한 Preview·실제 SDK 가림 확인·독립 QA 뒤 정상 병합, new main CI/CD/Production까지 확인한다. 제출 원고/최종 캡처/README 일치를 다시 확인하기 전 전체 #353 완료나 Release GO를 선언하지 않는다.

## 2026-09-09 04:43 KST — exact4052 Preview 실패 후 실제 Leaflet 수정

위의 후보 전 로컬 결과는 역사 기록으로 보존한다. [PR #378](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/378) exact `4052f857324227bfb38d7a226227f9c728bd2416`의 [CI865](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34267553616)는 5개 job 모두 SUCCESS였다. 독립 artifact 집계는 browser **833 PASS + 기존 skip1**, 실패·flaky·retry·중복0, unit705 PASS였다. 호스팅 build 예산은 CSS69.77/70, landing120.05/155, planner268.96/270, largest95.92/110KiB다. 로컬 빌드 수치와 섞지 않는다.

그러나 동일 HEAD [Preview](https://wave-barrier-free-gyeongnam-47fk5gwkz-jeongiryang-projects.vercel.app)의 [독립 QA는 P2 FAIL](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/378#pullrequestreview-5146163979)이다. 390px에서 대산을 다음 날로 옮긴 뒤 주남의 날짜로 돌아오면 실제 Leaflet 사진 위쪽24.75px가 OSM 상태 배지에 가려졌다. 첫 표시뿐 아니라 안정된 화면에서도 재현됐다. 첫 방문·4단계·이미지·키보드·넘침 검수의 통과가 이 지도 실패를 취소하지 않는다. Kakao 대신 Leaflet으로 연결된 정확한 원인은 확정하지 않았고, 실제 Kakao 성공 또는 12초 timeout으로 추정하지 않는다. `/api/route`는 전송 전에 차단해 ODsay 호출0을 유지했다.

근본 원인과 수정:

- Leaflet은 첫 view가 만들어질 때 대기하던 marker DOM을 붙인다. 최초 `fitBounds` 이전에는 사진 크기를 측정할 수 없었다. 기존 원본 bounds를 유지하며 `whenReady`에서 실제 붙은 사진과 번호를 동기적으로 다시 측정한다. 새 대기 시간이나 재시도는 추가하지 않는다.
- 날짜가 바뀌어 SDK map이 교체되어도 도구·캔버스 크기가 같으면 이전 geometry 기록 때문에 정착 후 여백 적용을 건너뛰었다. 크기와 함께 fit callback의 map 교체를 구분한다. 같은 map의 pan/스크롤이나 동일 크기 알림은 계속 재맞춤하지 않는다.
- 두 결함 각각 unit 실패를 먼저 보존한 뒤 수정했다. 실제 Leaflet 라이브러리를 사용하는 새 E2E는 fixture 데이터와 명시적 빈 지도 키만 사용한다. SDK/projection은 대체하지 않으며 모든 나머지 API/외부 요청이 fixture 밖으로 나가지 않았음을 요구한다. 1366px 두 장소→날짜 이동→날짜별 지도→390px 날짜 왕복에서 사진·번호 전체의 canvas 포함, 도구/배지와 겹침0, 선택일의 정확한 장소ID를 세 번의 안정된 기하 관찰로 검사한다.

수정 후 로컬 검증:

- 관련 지도 unit **14 PASS**, 실패·skip0. mounted-photo red/green과 replacement-map red/green 로그를 각각 보존했다.
- `npm test`: **707 PASS**, 실패·skip·cancel0, 6.249s.
- `npm run typecheck`: PASS. 새 E2E 포함 `npm run lint`: 오류0·기존 경고5.
- 정상 저장소 설정의 `playwright test e2e/leaflet-date-fit.spec.ts`: **desktop/mobile 2 PASS**, 10.6s. 같은 기존45초/8초 제한, retry·worker 정책을 유지했다. 실제 화면 PNG도 확인했다. agent의 별도 stage 실행1 PASS/9.6s와 중복 집계하지 않는다.
- `npm run build:vercel`, `npm run check:performance`: PASS. 로컬 CSS69.77/70, landing120.89/155, planner269.87/270, largest95.92/110KiB. 예산 증가는 없다.

원본 Preview 실패의 `51-390-day1-settled.png`, `52-390-day1-persistent`와 CI865 전체 artifact는 `story353-preview-4052f85-independent/`에 보존한다. 새 local 증거는 `story353-leaflet-fix-*`, `leaflet-date-fit-regression-20260909/`에 있다. exact4052에 새 E2E를 실행해 browser red/green을 얻었다고 주장하지 않는다. **수정 HEAD의 새 Full CI·Preview·독립 QA 및 이후 Production은 아직 필요하다.**

## 2026-09-09 04:51 KST — 마지막 CTA에서 근거로 연결

지도 수정은 독립 commit `6a9d60ccfb5e84461163b3e8f700aa16b36763b9`로 보존했다. #353 본문·의미 있는 댓글8개/48묶음 재감사의 작은 잔여인 마지막 CTA 출처 연결도 보완한다. 주 여행 시작 버튼은 그대로 두고, ‘시연 출처와 조회 시각 보기’를 명시적으로 선택할 때만 기존 출처 details를 열고 native summary로 이동한다. 새 날짜를 만들거나 지역 사진의 월 정보를 확인일로 바꾸지 않는다. 기존 실제 조회시각·시설 갱신일과의 구분·방문 전 재확인 안내를 재사용한다. 사진 원장의 ‘경로 요청 없음’은 앱의 시도를 전송 전에 막았다는 정확한 경계로 정정했다.

로컬 실제390px 화면에서 링크를 눌러 원문과 조회시점이 펼쳐지는 것을 확인했다. 관련 service-story/테마 검사는 **26 PASS/18.3s**. 추가 보조문구·링크의 두 테마 대비 검사는 **4 PASS/2.6s**, 최종44px 영역·KO/EN 키보드·원문 열기·summary 초점·주 CTA 유지 검사는 **4 PASS/7.6s**다. 이 재실행을 고유 테스트 개수로 더하지 않는다. 최종 결합본 unit **707 PASS/6.299s**, lint 오류0·기존 경고5, typecheck·Vercel build·performance PASS다. 로컬 gzip CSS69.86/70, landing121.12/155, planner269.86/270, largest95.92/110KiB. `story353-final-source-link-*` 로그와 캡처를 보존한다.

기존 일반 Intro/Hero/확장·감소모드·영어 기능과 테스트는 유지한다. 04:44:05 KST canonical 직접 조회는 여전히9caca READY로, 현재 후보의 새 Production 성공을 뜻하지 않는다. 다음은 한 번의 새 exact 후보 Full CI와 Preview/독립 QA이며, 별도 날짜 촬영을 기본 지도와 연속 상태라고 주장하지 않는다. 최종 같은 세션의 날짜→지도 기록과 제출 문서/화면 정합성은 #353에 계속 남아 있다.

## 2026-09-09 05:22 KST — 정상 모드 Leaflet 전환 수명 오류 수정

exact `bf29f21b4abfb0376320631f96877276659536a3`의 [CI866](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34271440547)은 05:16:41 KST 최종 validate까지 5개 job 모두 SUCCESS다. 그러나 [같은 Preview](https://wave-barrier-free-gyeongnam-agzi02j68-jeongiryang-projects.vercel.app)의 [독립 QA5146488089](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/378#pullrequestreview-5146488089)는 P2 FAIL로 보존한다. 이전 사진 가림은 실제390px에서 사진·번호 전체 포함, 배지와84.25px 간격, 겹침0으로 해소됐지만 별도로 `_leaflet_pos` uncaught error1건을 발견했다. 마지막 출처 CTA와 #377 날씨 summary/hash 재진입은 같은 Preview에서 통과했다. Kakao SDK 요청의 `ERR_BLOCKED_BY_ORB`도 원본에 보존하며 제공처 성공·timeout·설정 오류로 단정하지 않는다.

실제 Leaflet1.9.4와 기존 fixture를 쓰는 동일 4가지 경우에서 수정 전에는 일반 모드 desktop/mobile2건이 초기 자동 확대 직후 `_onZoomTransitionEnd → _move → _getNewPixelOrigin → _leaflet_pos` 오류로 실패했고 감소 모드2건만 통과했다. 일반 모드 오류는 첫 날짜 클릭보다 먼저 발생했다. 따라서 빠른 날짜 클릭만이 원인이라고 쓰지 않는다. 공개 SDK의 자동 확대 timer가 `remove()` 뒤에 남아 삭제된 map pane을 참조하는 수명 문제를 별도 네트워크0/2경우 실험에서도 확인했다. 이 별도 실험을 원래 Preview의 정확한 발생 시각 증명으로 확대하지 않는다.

자동 `fitBounds`에만 [Leaflet 공식 옵션](https://leafletjs.com/reference.html#fitbounds-options) `animate:false`를 전달해 맞춤을 동기적으로 끝낸다. 사용자 직접 확대·축소·이동, 원래 bounds·측정 여백·maxZoom13·취소 경계, 일반 Intro/Hero/스크롤 연출은 유지한다. 오류를 삼키거나 SDK 내부를 덮어쓰지 않는다. 기존 실제 Leaflet E2E의 모든 사진·번호·날짜·ID·fixture 격리 검사는 보존하고 일반/감소 모드, 반복 native 날짜 입력, 초기·각 안정 상태·최종의 필터 없는 pageerror0과 원본 stack 첨부를 추가했다.

수정 후 검증: 동일 별도4경우 **4 PASS/10.6s**, 각16회 native 날짜 입력·pageerror0. 저장소 설정 그대로 `playwright test e2e/leaflet-date-fit.spec.ts` **4 PASS/10.7s**. `npm test` **707 PASS/6.114s**, 실패·skip·cancel0. lint 오류0·기존 경고5, typecheck·Vercel build·performance PASS. 로컬 gzip CSS69.86/70, landing121.12/155, planner269.85/270, largest95.92/110KiB다. 두 독립 실행의 테스트 수를 더해 고유 회귀 수로 보고하지 않는다. 테스트 삭제·새 skip·timeout/retry/worker/성능 기준 완화가 없다.

실패와 성공의 모든 로그·원래 trace·화면은 `leaflet-rapid-day-repro-bf29f21-20260909/`, `leaflet-animation-remove-mechanism-20260909/`, `story353-leaflet-no-animation-*`, `story353-leaflet-lifecycle-*`, `story353-preview-bf29f21-independent/`에 보존한다. 새 수정 HEAD의 exact Full CI·Preview·독립 QA는 아직 필요하며 Production은 여전히9caca다. #353 전체 완료, 실제 경로 제공처 성공 또는 Release GO를 선언하지 않는다.

## 2026-09-09 07:34 KST — 같은 여행의 날짜·지도 연결 및 시각 체크포인트

위 과거 후보는 #378을 통해 main/Production `eab2442f90b72441fd311db13dd8bb935723527f`에 반영됐다. [현재 Production의 독립 검증과 CI868/CD221 원본](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/353#issuecomment-5592520788)을 우선하며 과거 실패를 지우지 않는다. 이번 증가분은 같은 기존 worktree의 `feat/service-story-days-353`에서 별도 후보로 보존한다.

- 한 번의 실제 운영 시연에서 촬영한6장을 사용한다. 두 장소를 첫날에 둔 상태, 대산을 둘째 날로 옮긴 뒤 첫날 주남/둘째 날 대산을 native 버튼으로 선택하면 일정·지도·날짜·장소ID·순위가 함께 바뀐다. 버튼과 live 제목의 DOM을 유지해 키보드 초점을 잃지 않는다. 화면 선택은 기록된 장면을 보여줄 뿐 사용자의 여행 편집이나 최신 제공처 조회가 아님을 설명한다.
- 원본 정수 영역을 무손실 WebP로 추출했고,6파일 합계978,798B의 픽셀 일치·원본 크기·날짜·조회 시각·Kakao 및 사진 출처를 `timeline-manifest.json`과 외부 원본으로 연결한다. 기존9caca7자산과 옛 시연 기록은 삭제하지 않는다.
- 한국어 편의 문구를 실제 접근로·승강기·유아 편의시설 중심으로 맞췄다. 주4단계 뒤에 반복되던6개 기능 패널은 native 상세보기에 보존하고 본문을16px로 맞췄다. 모든6CTA·영어 구조·normal Intro/Hero/확장 전환·감소 모드·이미지 실패 대안은 유지한다.

현재 변경에 실행한 로컬 검사는 `npm test` **707 PASS/6.280s**, lint 오류0·기존 경고5, typecheck·Vercel build·performance PASS다. gzip CSS69.87/70, landing121.36/155, planner269.81/270, largest95.92/110KiB이며 예산은 그대로다. 새 media는 선택한 날짜/장면에서 지연 로딩한다.

관련 E2E: desktop 첫 진입/날짜8 PASS17.1s; desktop compact/service-story15 PASS13.4s; 최종 mobile 첫 진입/compact/service-story23 PASS29.5s; 양 프로젝트 theme/regions/planner-product-flow13 PASS·기존 mobile skip1(10.1s). 서로 중복 실행한 테스트 수를 더해 고유 회귀 수로 보고하지 않는다. 먼저 실행한 mobile 날짜 테스트는7 PASS/1 FAIL이었다. sibling 설명 영역이750ms 퇴장 전환 중일 때 전체 장면 axe가 실행된 원본 trace를 보존하고, panel과 sibling reveal의 실제 전환 완료를 확인하도록 준비 조건을 추가했다. 같은 전체 장면 axe·대비·assertion·locator·timeout·workers·retries·제품 모션은 유지했다. 단일 실패 재검사1 PASS 후 전체 관련 mobile23 PASS를 확인했다. 실패를 재실행 성공으로 소급 변경하지 않는다.

07:28–07:29 KST 기여자 시각 검수에서320×568·390×844·1366×900의 실제15개 viewport PNG를 확인했다. 첫 wave와 안정 wordmark, 한국어 CTA, 날짜/지도 상태, 상세보기 열기·닫기·초점, reduced 정적 대안, 실제 Chromium200%→100% 복구를 구분했다. pageerror/overflow0, API/외부/쓰기 전달0이다. 차단된 인증/외부 manifest 요청에 따른 콘솔6건은 숨기지 않는다. 320px에서는 주 CTA가 화면 아래에 있으나 native Tab으로 바로 도달하고 인트로 재생이 조작을 막지 않는다. 축소된 지도 원본 내부 작은 글자와 별도로 읽을 수 있는 HTML 날짜·장소·순위를 구분한다. 이는 실제 낭독기/장애인/실물 모바일 검증이나 final independent QA PASS가 아니다.

**현재 보안 Gate는 미완료다.** 같은 시각의 새로운 registry advisory로 production audit가 Next16.3.1 critical·sharp0.35.3 high를 보고했다. 전체 개발 도구 감사에서는 js-yaml4.3.1 high도 확인됐다. 기존 CI868의 당시 audit0은 역사 기록이며 현재 성공 근거로 재사용하지 않는다. [#355의 좁은 별도 패치](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/issues/355#issuecomment-5592687534)에서 필요한 patch 버전만 처리하고 있다. 이 디자인 후보를 audit 실패 상태로 배포하지 않으며 보안 패치 포함 후 exact HEAD Full CI·Preview·독립 QA·Production 및 최종 제출 화면 일치를 확인해야 한다.

외부 증거: `D:/wave-db-binding-preflight-20260908/story353-days-*`, `story353-days-native-visual-20260909/`, `story353-preserved-before-security-2026-09-08T22-23-09-808Z/`. 기존 사용자dirty10·50worktrees·queue294 generation/attempts/receipts·server·모든 실패 artifact를 보존한다. 별도 #379 소유 작업, #373 후순위, automation OFF 및 #372 quota hold를 유지한다.

## 2026-09-09 08:14 KST — 모바일 홈 링크의 실제 조작 영역

위 날짜/지도 증가분은 `ff93989028c23aee9c50ca5650210f47c594e2db`로 커밋·push해 보존했다. 이후 1440×900의 3열·960×900의 2열 도구 배치도 실제 화면으로 확인했다. 전체6CTA는48px, 본문16px, 두 화면의 overflow/pageerror0이며 로컬 시각 증거는 총17장이다. 별도 최종 Production 성공으로 주장하지 않는다.

독립 보안 Preview에서 발견한 기존 모바일 홈 링크는 로고 글자를 숨긴 뒤 폭32px·높이44px가 됐다. #353의 기존44px AC 안에 있는 결함으로, 320/390px에서 실제 너비 검사2 FAIL을 먼저 보존했다. 기존 최소 폭44px·가운데 정렬 selector에 `.brand`만 추가해 링크 조작 영역을 넓힌다. 로고 그림의32px 크기·일반 Intro/Hero 모션·CTA·언어 구조는 유지한다.

새 회귀는320/390px를 두 Chromium 프로젝트에서 검사한다. native Tab 초점과3px outline, 양축44px, 로고32px, 양옆 확장 영역의 실제 hit-test, viewport/넘침, Enter 후 `#top` 목적지의 실제 화면 포함을 확인한다. 처음 새 테스트에 넣었던 ‘앵커 활성화 후에도 링크에 초점 유지’ 기대는 native fragment 이동과 맞지 않아4 FAIL이었다. 기존 제품 초점을 강제로 되돌리지 않고 새 검사를 실제 목적지 이동 계약으로 바로잡았다. 이 중간 실패도 최초32px 재현과 별도로 보존한다. 기존1363px 검사와 기존 assertion은 변경하지 않았다.

최종 관련 E2E는 **6 PASS/3.9s**, 실패·skip0이다(새320/390×두 프로젝트4건 + 기존1363×두 프로젝트2건). 관련 unit4 PASS, 변경 spec lint와 diff check PASS다. 실제320/390 모바일 캡처에서 초점 표시·헤더 조작 간격·겹침 없음을 확인했다. 새 검사는 모든 미설정 API를 전송 전에 차단하며 제공처 성공 증거가 아니다. CSS 증가는8바이트이고 성능 예산 자체는 변경하지 않았다. 최종 결합 빌드에서 총 gzip 예산을 다시 확인해야 한다.

증거: `story353-mobile-home-hitarea-ff93989-20260909/{initial-red,fixed-related,final-related}/`, `implementation-receipt.json`, `final.diff`. 새 skip·timeout/retry/worker·기존 assertion 완화·별도 서버 실행은 없다. 보안 [PR380](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/pull/380)은 최종 `46deae46b538d62e26b09b8bbd15cafa4f7b1c7c`로 [CI871](https://github.com/jeongiryang/wave-barrier-free-gyeongnam/actions/runs/34289021139)의 quality/boundary 성공·전체 browser 대기 상태다. 독립 QA와 병합 이후 최신 main을 이 디자인 후보에 안전하게 포함한 뒤 최종 검증한다. #353 전체 완료·Production 반영·제출자료 완성을 아직 선언하지 않는다.
