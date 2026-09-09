"use client";

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
  const { locale, effectiveProviders, liveCount } = props;
  const [open, setOpen] = useState(false);
  const connectedTransportCount = effectiveProviders.filter((item) => item.state === "connected").length;
  const readyTransportCount = effectiveProviders.filter((item) => item.state === "ready").length;
  const transportStatus = connectedTransportCount
    ? `${connectedTransportCount}개 직접 확인`
    : effectiveProviders.some((item) => item.state === "error")
      ? "확인 지연"
      : readyTransportCount
        ? "조회 준비"
        : "준비";
  return <details className="planner-service-status" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>
      <span><small>문제 해결</small><strong>서비스 상태와 데이터 제공 범위</strong></span>
      <span className="service-status-summary">관광정보 {liveCount ? `${liveCount}개 확인` : "준비"} · 교통정보 {transportStatus} · {locale.toUpperCase()}</span>
    </summary>
    {open && <Suspense fallback={<p role="status">상태 정보를 준비하고 있어요.</p>}><PlannerServiceDiagnostics {...props} /></Suspense>}
  </details>;
}
