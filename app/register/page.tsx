import AuthShell from "../../features/auth/components/AuthShell";
import { pageMetadata } from "../../lib/site-metadata";

export const metadata = pageMetadata({
  title: "회원가입",
  description: "W.A.V.E 여행자 계정을 만들고 관광지 이야기와 여행 후기를 나누세요.",
  path: "/register",
  index: false,
});

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <AuthShell mode="register" returnTo={typeof next === "string" ? next : undefined} />;
}
