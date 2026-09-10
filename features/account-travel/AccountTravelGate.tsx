"use client";
import Link from "next/link";
import { useHydratedSession } from "../auth/hooks/useHydratedSession";
import type { ReactNode } from "react";

export default function AccountTravelGate({ next, children }: { next: string; children: (userId: string) => ReactNode }) {
  const { data, isPending, error } = useHydratedSession();
  if (isPending) return <p role="status">내 여행을 펼치고 있어요.</p>;
  if (!data?.user?.id || error) return <div className="travel-account-welcome"><h2>어디서든 내 여행을 이어가세요.</h2><p>로그인하면 저장한 여행을 다른 기기에서도 열고, 동행자와 함께 계획할 수 있습니다.</p><Link className="auth-primary-link" href={`/login?next=${encodeURIComponent(next)}`}>로그인하고 이어가기</Link><Link href="/planner">여행 먼저 계획하기</Link></div>;
  return <div key={data.user.id}>{children(data.user.id)}</div>;
}
