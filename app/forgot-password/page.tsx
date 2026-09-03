import AuthUtilityShell from "../../features/auth/components/AuthUtilityShell";
import ForgotPasswordForm from "../../features/auth/components/ForgotPasswordForm";
import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "비밀번호 재설정",
  description: "W.A.V.E 계정의 비밀번호 재설정 링크를 요청합니다.",
  path: "/forgot-password",
  index: false,
});

export default function ForgotPasswordPage() {
  return <AuthUtilityShell eyebrow="비밀번호 복구" title="재설정 링크 받기" description="비밀번호를 잊어도 여행자 계정을 다시 이어갈 수 있습니다."><ForgotPasswordForm /></AuthUtilityShell>;
}
