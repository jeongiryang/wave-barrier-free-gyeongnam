"use client";
import LoadingState from "../../../components/LoadingState";

import { lazy, Suspense, useState } from "react";
import type { KeyHealth, PlanData, TransportProvider } from "../types";

const PlannerServiceDiagnostics = lazy(() => import("./PlannerServiceDiagnostics").catch(() => ({ default: () => <p role="alert">상태 정보를 불러오지 못했어요. 페이지를 다시 열어 확인해 주세요. 일정은 유지됩니다.</p> })));

export interface PlannerServiceStatusProps {
  locale: string;
  keyHealth: KeyHealth | null;
  effectiveProviders: TransportProvider[];
  transportProviders: TransportProvider[];
  providerErrors: number;
  liveCount: number;
  dataErrors: number;
  plan: PlanData | null;
}

export default function PlannerServiceStatus(props: PlannerServiceStatusProps) {
  const [open, setOpen] = useState(false);
  return <details lang="ko" className="planner-service-status" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>정보 연결 상태<span aria-hidden="true">⌄</span></summary>
    {open && <Suspense fallback={<LoadingState>상태 정보를 준비하고 있어요.</LoadingState>}><PlannerServiceDiagnostics {...props} /></Suspense>}
  </details>;
}
