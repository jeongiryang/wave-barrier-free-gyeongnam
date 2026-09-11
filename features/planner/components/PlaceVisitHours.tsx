"use client";
import { lazy, Suspense } from "react";
import type { PlannedVisit } from "../../../lib/visit-hours.js";

const Hours = lazy(() => import("./VisitHoursCard").catch(() => ({ default: () => <p role="alert">이용시간 화면을 열지 못했어요. 페이지를 새로 열어 다시 확인해 주세요.</p> })));
export default function PlaceVisitHours(props: { id: string; name: string; visit?: PlannedVisit; en?: boolean }) {
  return <Suspense fallback={null}><Hours key={props.id} {...props} /></Suspense>;
}
