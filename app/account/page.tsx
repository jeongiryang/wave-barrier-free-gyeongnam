import AccountSettings from "../../features/auth/components/AccountSettings";
import AuthUtilityShell from "../../features/auth/components/AuthUtilityShell";
import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "계정 관리",
  description: "W.A.V.E 계정의 비밀번호를 변경하거나 계정과 연결 데이터를 삭제합니다.",
  path: "/account",
  index: false,
});

export default function AccountPage() {
  return <AuthUtilityShell eyebrow="계정 관리" title="내 계정 설정" description="비밀번호 변경부터 탈퇴와 연결 데이터 정리까지 직접 결정할 수 있습니다."><AccountSettings /></AuthUtilityShell>;
}
