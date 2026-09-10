# 카카오 로그인 연결 조사 — 2026-09-10

관련: #351, #442. **2026-09-10 후속: 단일 인증 전환 코드를 구현했고 운영 활성화 검증 중. 기존 조사와 당시 미구현 판정은 아래에 보존한다.**

## 구현된 전환 계약

- `WAVE_AUTH_BACKEND=native`인 배포만 자체 Better Auth를 실행한다. 기본값은 기존 Neon 프록시이며 native 설정 오류 시 옛 인증으로 자동 우회하지 않는다.
- 같은 `neon_auth.user/account/session/verification` 및 UUID를 사용한다. 사용자·계정 복사, 비밀번호 재작성, 이메일 자동 병합, 병렬 카카오 전용 계정 저장소는 없다. 새 쿠키 `wave-auth`를 사용하므로 전환 시 다시 로그인해야 한다.
- Better Auth/Core 1.6.23과 Kysely 0.29.5를 고정한다. 기존 프로젝트의 `legacy-peer-deps=true` 때문에 Core peer도 직접 고정해야 Node 런타임에서 누락되지 않는다.
- 최소 scope `account_email`, 검증된 이메일만 허용한다. 연결은 본인이 로그인한 10분 내 세션으로 시작하고 callback에서도 같은 유효 세션인지 검사한다. 닉네임·사진 수집과 자동 사용자 정보 덮어쓰기는 꺼둔다.
- 비밀번호 재설정은 30분·한 번만 쓰는 토큰과 전체 이전 세션 폐기, 탈퇴는 같은 브라우저의 유효 세션과 이메일 토큰으로 재확인한다. 카카오 연결 해제를 먼저 완료한 뒤 인증 계정을 삭제한다. 기존 서비스 데이터 삭제 grant/완료 화면을 유지한다.
- 외부 카카오 연결 해제 웹훅은 대표 어드민 키와 앱 ID를 확인한다. 카카오 연결 행과 세션을 같은 DB 트랜잭션에서 삭제하며 WAVE 계정·콘텐츠는 유지한다. 계정 이메일로 복구할 수 있다. WAVE 전체 탈퇴는 별도 계정 관리 요청이다.
- SMTP는 Gmail 465/TLS, 정해진 발신 계정·수신자 1명·서비스 계정 링크만 허용한다. Secret/SMTP 응답/토큰을 로그에 출력하지 않는다. 전송은 재시도하지 않는다.
- 배포 후보의 인증 DB 준비 및 SMTP 인증 확인이 실패하면 기존 CD의 승격 전 검사에서 중단한다. 이 검사는 메일을 보내지 않는다.

## 확정된 외부 설정

Production: `https://wave-barrier-free-gyeongnam.vercel.app`

- Kakao 앱 1539906, 기존 `WAVE_SERVER_REST` 키를 사용한다. Login ON·Client Secret ON·OIDC OFF를 유지한다. 개인 개발자 비즈 앱 및 아이콘은 Owner 완료. 이메일 필수 동의 저장.
- 로그인 redirect URI: `https://wave-barrier-free-gyeongnam.vercel.app/api/auth/callback/kakao`
- 연결 해제 웹훅: `https://wave-barrier-free-gyeongnam.vercel.app/api/kakao/unlink` (POST)
- Vercel Production 서버 전용: `KAKAO_LOGIN_CLIENT_ID`, `KAKAO_LOGIN_CLIENT_SECRET`, `KAKAO_PRIMARY_ADMIN_KEY`, `SMTP_USER`, `SMTP_PASS`. 기존 DB/쿠키 Secret은 유지한다. 키/Secret 신규 발급이나 회전은 하지 않았다.
- Google 앱 비밀번호는 Owner가 직접 만들어 Vercel에 입력했다. Gmail 개인 계정은 출시 메일 SLA가 아니며 공개 일일 발송 제한·스팸 제한이 있다. #365의 API 용량 조사에 포함한다.

## 순서와 되돌리기

1. 메타데이터/권한 검토 후 `migrations/010_native_auth.sql`을 별도 실행한다. 사용자 데이터 변경 없이 provider/account 고유 인덱스와 rateLimit 테이블만 추가한다. 중복 계정이면 트랜잭션을 실패시키며 기존 행을 삭제하지 않는다. 런타임 자동 DDL은 없다.
   - 2026-09-10 20:26 KST 운영 SQL Editor에서 COMMIT 성공. 이후 두 catalog 검사 `true`, 사용자 6명·계정 6개 보존을 확인했다.
2. 위 서버 환경을 준비하고 같은 SHA의 CI 성공 후 Production 후보를 먼저 검사한다. Gmail 실제 인증 성공은 배포 preflight 결과로 확인한다.
3. Production 전환 후 실제 이메일 계정 로그인, 실제 Kakao 왕복과 동일한 내부 계정/소유권, 로그아웃·재로그인·메일·취소를 확인한다. 시험용 DB/API 결과를 운영 OAuth 성공으로 보고하지 않는다.
4. 관리형 Neon Auth 서비스는 **데이터를 보존하는 disable**만 검토한다. 공식 API의 `delete_data:false`는 스키마를 유지한다. `delete_data:true` 또는 콘솔의 데이터 삭제 선택은 사용하지 않는다. 전환 완료 전 기존 서비스를 끄지 않는다.
5. native 전환 실패 시 데이터 삭제/복원 없이 이전 배포로 돌아간다. 관리형 서비스를 비활성화했다면 데이터 보존 재활성화가 먼저다. 새 카카오 사용자도 같은 이메일의 비밀번호 복구를 이용할 수 있으나, 이전 배포에서 카카오 로그인은 지원하지 않는다. 추가 인덱스/테이블을 되돌리기 위해 삭제하지 않는다.

최종 비활성화·실제 OAuth·메일·배포 결과는 #351과 PR에 후속 기록한다. 운영 활성화 완료로 조기 집계하지 않는다. 공모전/위치정보 법적 게이트는 #11에 별도 보존한다.

공식: [Neon 데이터 보존 비활성화](https://neon.com/docs/auth/guides/manage-auth-api), [Kakao 연결 해제 웹훅](https://developers.kakao.com/docs/ko/kakaologin/callback), [Better Auth Kakao](https://better-auth.com/docs/authentication/kakao).

## 이전 조사 기록

## 확인한 사실

- 제품은 `@neondatabase/auth@0.5.0-beta`의 관리형 인증을 사용한다. `lib/auth/server.ts`, `lib/auth/client.ts`, `app/api/auth/[...path]/route.ts`가 같은 세션을 공유한다.
- 실제 Production Neon Auth의 설정을 읽었다. Google이 등록되어 있고, Add OAuth Provider에서 추가할 수 있는 항목은 GitHub와 Vercel뿐이다. 카카오나 Generic OAuth 항목은 없다. 계정·설정을 변경하지 않았다.
- [Neon 공식 OAuth 문서](https://neon.com/docs/auth/guides/setup-oauth) 및 [지원 플러그인](https://neon.com/docs/auth/guides/plugins)도 같은 제한을 보인다. 공식 원문 저장소 `neondatabase/website`의 2026-08-26 개정본을 확인했다.
- #351의 과거 Owner 확인에 따르면 Kakao Login ON과 Client Secret 활성화는 이미 완료됐다. 다시 활성화하거나 키를 재발급해야 한다고 판단하지 않는다. 실제 callback 등록·비밀값 배포 상태는 아직 확인되지 않았다.
- 카카오 지도 JavaScript 키, 장소/길찾기 REST 키의 존재는 로그인 연동 완료의 증거가 아니다. Neon 요금제를 올리는 것만으로 카카오 제공자가 생기지 않는다.

## 권장 전환안

같은 Neon DB를 유지하면서 자체 운영 Better Auth로 인증 실행부를 일원화하는 방안을 우선 검토한다. 별도 카카오 전용 계정·쿠키를 병행하거나 이메일만 일치한다고 기존 계정과 자동 병합하지 않는다.

1. 기존 인증 테이블 구조·해시 방식·버전·사용자 ID와 커뮤니티 소유권 참조를 메타데이터로 확인한다. 관리형 스키마를 추정해서 직접 쓰지 않는다.
2. 기존 계정 ID를 보존하는 추가형 이관과 되돌리기 절차를 작성한다. 실제 사용자 데이터는 개발 fixture나 PR 로그로 복사하지 않는다.
3. 자체 Better Auth의 공식 Kakao provider와 서버 전용 Client ID/Secret을 연결한다. state/PKCE, 제한된 callback·return URL, HttpOnly 세션과 기존 동일 출처 보호를 적용한다.
4. 기존 이메일 가입/로그인, 메일 재설정, 로그아웃, 계정 탈퇴, 게시글 소유권을 함께 검증한다. 연결은 로그인한 본인의 명시적 계정 연결 흐름으로만 허용한다.
5. 새 callback 주소를 확정하고 실제 Kakao 콘솔·배포 환경에 등록한다. 별도 이메일 발송 설정도 필요하다. Provider 자체 로그인과 callback을 통과하기 전에는 버튼을 출시하지 않는다.

현재 외부 설정과 이관 호환성 확인 없이 기존 인증을 교체하지 않았다. 이 문서는 구현 완료나 배포된 카카오 로그인으로 집계하지 않는다. #351에 남은 실행 범위로 유지한다.
