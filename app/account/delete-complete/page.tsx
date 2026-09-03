import AccountDeletionComplete from "../../../features/auth/components/AccountDeletionComplete";
import AuthUtilityShell from "../../../features/auth/components/AuthUtilityShell";
import { pageMetadata } from "../../../lib/site-metadata";

export const metadata = {
  ...pageMetadata({
    title: "계정 삭제 완료",
    description: "W.A.V.E 계정 삭제 뒤 연결된 서비스 데이터를 정리합니다.",
    path: "/account/delete-complete",
    index: false,
  }),
  referrer: "no-referrer" as const,
};

export default async function AccountDeletionCompletePage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  return <AuthUtilityShell eyebrow="계정 관리" title="계정 삭제 마무리" description="인증 계정 삭제 뒤 서버에 연결된 커뮤니티 데이터까지 안전하게 정리합니다."><AccountDeletionComplete token={typeof token === "string" ? token : undefined} /></AuthUtilityShell>;
}
