"use client";
import type { ReactNode } from "react";
import { equipmentRentalPlaces } from "../equipment-rental";

const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  padding: 16,
  background: "var(--paper, #fff)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
};

const callButtonStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "10px 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: 0,
  borderRadius: "var(--r-md, 8px)",
  color: "#fff",
  background: "var(--accent)",
  fontWeight: 700,
  fontSize: "1rem",
  textDecoration: "none",
};

const linkButtonStyle: React.CSSProperties = {
  minHeight: 48,
  padding: "10px 18px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-md, 8px)",
  color: "var(--ink)",
  background: "var(--paper, #fff)",
  fontWeight: 600,
  fontSize: "1rem",
  textDecoration: "none",
};

export default function EquipmentRentalList({ region }: { region: string | null }): ReactNode {
  const inRegion = region ? equipmentRentalPlaces.filter((place) => place.region === region) : [];
  const shown = inRegion.length ? inRegion : equipmentRentalPlaces;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
        대여 가능 여부와 조건은 기관에서 정해요. 전화로 먼저 확인해 주세요.
      </p>
      {region && !inRegion.length && shown.length > 0 && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>이 지역에 확인된 곳이 없어요.</p>
      )}
      {!shown.length ? (
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>확인된 대여처가 아직 없어요.</p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {shown.map((place) => (
            <li key={place.id} style={cardStyle}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--ink)" }}>{place.name}</p>
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>{place.region}</p>
              {place.items.length > 0 && (
                <p style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>대여 가능 품목: {place.items.join(", ")}</p>
              )}
              <p style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>이용 조건: {place.eligibility}</p>
              {place.hours && <p style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>운영시간: {place.hours}</p>}
              <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>확인한 날짜: {place.checkedOn}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                {place.phoneNumber && (
                  <a href={`tel:${place.phoneNumber}`} style={callButtonStyle}>전화 앱 열기 · {place.phoneNumber}</a>
                )}
                {place.url && place.url.startsWith("https://") && (
                  <a href={place.url} target="_blank" rel="noreferrer" style={linkButtonStyle}>안내 페이지 열기</a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
