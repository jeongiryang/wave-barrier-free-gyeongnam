# 카카오 로그인 연결 조사 — 2026-09-10

관련: #351, #442. **현재 판정: NOT IMPLEMENTED / 인증 기반 전환 필요.**

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
