import AuthUtilityShell from "../../features/auth/components/AuthUtilityShell";
import ResetPasswordForm from "../../features/auth/components/ResetPasswordForm";
import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "새 비밀번호 설정",
  description: "이메일로 받은 링크를 사용해 W.A.V.E 계정 비밀번호를 새로 설정합니다.",
  path: "/reset-password",
  index: false,
});

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <AuthUtilityShell eyebrow="비밀번호 복구" title="새 비밀번호 설정" description="메일에서 확인된 일회용 링크로만 비밀번호를 바꿀 수 있습니다."><ResetPasswordForm token={typeof token === "string" ? token : undefined} /></AuthUtilityShell>;
}
