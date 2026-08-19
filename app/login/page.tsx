import type { Metadata } from "next";
import AuthShell from "../../features/auth/components/AuthShell";

export const metadata: Metadata = {
  title: "로그인",
  description: "W.A.V.E 전용 계정으로 로그인하고 경남 여행자 커뮤니티에 참여하세요.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <AuthShell mode="login" returnTo={typeof next === "string" ? next : undefined} />;
}
