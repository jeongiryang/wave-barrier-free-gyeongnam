"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { usePlaceDialogFocus } from "../planner/hooks/usePlaceDialogFocus";
import type { Place } from "../planner/types";
import styles from "./FestivalDetailDialog.module.css";

const ui = {
  dialog: { width: "min(960px,calc(100vw - 32px))", maxHeight: "88dvh", margin: "auto", padding: 0, overflow: "auto", border: "1px solid #31596a", borderRadius: 18, color: "#edf4ff", background: "#081b2e" },
  close: { width: 44, height: 44, position: "sticky", zIndex: 5, top: 12, float: "right", margin: "12px 12px -56px 0", border: "1px solid #7095b7", borderRadius: "50%", color: "#fff", background: "rgba(7,23,38,.9)", fontSize: 26, lineHeight: 1 },
  layout: { minHeight: 560, display: "grid", gridTemplateColumns: "minmax(300px,42%) minmax(0,1fr)" },
  poster: { minHeight: 560, position: "relative", background: "#dfe9e5" },
  posterFallback: { minHeight: 560, display: "grid", placeItems: "center", padding: 32, color: "#334b51", textAlign: "center" },
  information: { padding: "clamp(38px,5vw,70px) clamp(28px,5vw,64px)" },
  state: { minHeight: 44, display: "inline-flex", alignItems: "center", padding: "8px 18px", borderRadius: 10, color: "#fff", background: "#7142e8", fontWeight: 800 },
  heading: { margin: "28px 0 10px", fontSize: "clamp(2rem,4vw,3.35rem)", lineHeight: 1.14, overflowWrap: "anywhere" },
  summary: { margin: "0 0 28px", color: "#c2d2e5", fontSize: "1.05rem", lineHeight: 1.7 },
  list: { margin: 0, paddingTop: 24, borderTop: "1px solid #31596a" },
  row: { display: "grid", gridTemplateColumns: "64px minmax(0,1fr)", gap: 14, padding: "11px 0" },
  term: { color: "#7fdfff", fontWeight: 700 },
  value: { margin: 0, lineHeight: 1.65 },
  officialLink: { marginTop: 24, padding: "11px 16px", display: "inline-block", border: "1px solid #7095b7", borderRadius: 9, color: "#fff", fontWeight: 700 },
  evidence: { margin: "20px 0 0", color: "#9fb9c9", fontSize: 14, lineHeight: 1.7 },
} satisfies Record<string, CSSProperties>;

export type FestivalDetail = Place & {
  startDate: string;
  endDate: string;
  phone: string;
  officialUrl: string;
  websiteUrl?: string;
  state: "ended" | "ongoing" | "upcoming";
  facilityState: string;
};

function stateLabel(festival: FestivalDetail) {
  if (festival.state === "ongoing") return "진행 중";
  if (festival.state === "ended") return "종료";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return `D-${Math.max(0, Math.ceil((Date.parse(festival.startDate) - Date.parse(today)) / 86400000))}`;
}

export default function FestivalDetailDialog({ festival, websiteUrl, onClose, visitActions }: {
  festival: FestivalDetail;
  websiteUrl?: string;
  visitActions?: ReactNode;
  onClose: () => void;
}) {
  const dialog = usePlaceDialogFocus(true, onClose);
  const primaryUrl = websiteUrl || festival.websiteUrl || festival.officialUrl;
  return <dialog ref={dialog} className={styles.dialog} style={ui.dialog} aria-labelledby={`festival-detail-${festival.id}`} data-testid="festival-detail-dialog">
    <button type="button" className={styles.close} style={ui.close} aria-label="축제 상세 정보 닫기" onClick={onClose}>×</button>
    <div className={styles.layout} style={ui.layout}>
      <div className={styles.poster} style={ui.poster}>
        {festival.image
          ? <Image src={festival.image} alt={`${festival.name} 축제 포스터`} fill sizes="(max-width: 760px) 90vw, 42vw" style={{ objectFit: "cover" }} unoptimized />
          : <div className={styles.posterFallback} style={ui.posterFallback}>등록된 축제 포스터가 없어요.</div>}
      </div>
      <section className={styles.information} style={ui.information}>
        <span style={ui.state}>{stateLabel(festival)}</span>
        <h2 style={ui.heading} id={`festival-detail-${festival.id}`} tabIndex={-1}>{festival.name}</h2>
        {festival.summary && <p style={ui.summary}>{festival.summary}</p>}
        <dl style={ui.list}>
          <div style={ui.row}><dt style={ui.term}>기간</dt><dd style={ui.value}>{festival.startDate} – {festival.endDate}</dd></div>
          <div style={ui.row}><dt style={ui.term}>장소</dt><dd style={ui.value}>{festival.address || "상세 행사장 주소 확인 필요"}</dd></div>
          {festival.phone && <div style={ui.row}><dt style={ui.term}>문의</dt><dd style={ui.value}>{festival.phone}</dd></div>}
          <div style={ui.row}><dt style={ui.term}>지역</dt><dd style={ui.value}>{festival.city}</dd></div>
        </dl>
        {primaryUrl && <a className={styles.officialLink} style={ui.officialLink} href={primaryUrl} target="_blank" rel="noopener noreferrer">공식 홈페이지</a>}
        <p style={ui.evidence}>일정과 운영 정보는 방문 전에 공식 홈페이지에서 다시 확인해 주세요.</p>
        {visitActions && <div className="festival-detail-visit">{visitActions}</div>}
      </section>
    </div>
  </dialog>;
}
