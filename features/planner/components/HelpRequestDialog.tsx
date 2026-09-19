"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { helpMessage, helpSituations } from "../../../lib/help-request.js";
import { usePlaceDialogFocus } from "../hooks/usePlaceDialogFocus";
import type { HelpSituation } from "../../../lib/help-request";

// 사람 확인 전에는 목록을 비워 둔다 (human-gate). 확인되지 않은 기관 이름·번호를
// 임시로 적지 않는다. 확인되면 { name, phone, description }[] 형태로 채운다.
const OFFICIAL_CONTACTS: { name: string; phone: string; description: string }[] = [];

const situations = helpSituations();

const situationButtonStyle = (pressed: boolean): React.CSSProperties => ({
  minHeight: 56,
  padding: "14px 16px",
  border: `1px solid ${pressed ? "var(--accent)" : "var(--line)"}`,
  borderRadius: 16,
  background: pressed ? "var(--accent)" : "#fff",
  color: pressed ? "#fff" : "var(--ink)",
  font: "inherit",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
});

export default function HelpRequestDialog({ placeName, placeAddress, onClose }: {
  placeName: string | null;
  placeAddress: string | null;
  onClose: () => void;
}): ReactNode {
  const dialog = usePlaceDialogFocus(true, onClose);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const [situation, setSituation] = useState<HelpSituation | null>(null);
  const [large, setLarge] = useState(false);
  const [notice, setNotice] = useState("");
  const [copyFallback, setCopyFallback] = useState(false);

  // 명세 상세 상호작용 계약 2번: 첫 초점은 "이 화면 보여주기" 버튼에 둔다.
  useEffect(() => { primaryButtonRef.current?.focus(); }, []);

  const message = helpMessage(situation, placeName);

  function showScreen() {
    setLarge(true);
    setNotice("");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(30); } catch { /* 진동은 필수 신호가 아니다. */ }
    }
  }

  async function copyMessage() {
    const toCopy = placeName ? `${message}\n${placeName}` : message;
    try {
      await navigator.clipboard.writeText(toCopy);
      setCopyFallback(false);
      setNotice("문장을 복사했어요.");
    } catch {
      setCopyFallback(true);
      setNotice("직접 선택해 복사해 주세요.");
    }
  }

  return createPortal(
    <dialog ref={dialog} className="region-change-dialog inquiry-dialog" data-large={large} aria-labelledby="help-request-title">
      {large ? (
        <div>
          <button type="button" onClick={() => setLarge(false)} style={{ minHeight: 56, marginBottom: 20 }}>
            돌아가기
          </button>
          <p style={{ fontSize: 18, color: "var(--muted)", marginBottom: 8 }}>지금 있는 곳</p>
          <p style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4, margin: "0 0 24px" }}>
            {placeName || "일정에 담은 장소가 없어요."}
            {placeAddress ? <><br /><span style={{ fontSize: 24, fontWeight: 500 }}>{placeAddress}</span></> : null}
          </p>
          <p style={{ fontSize: 32, fontWeight: 700, color: "var(--ink)", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>{message}</p>
        </div>
      ) : (
        <>
          <header>
            <div>
              <p className="section-kicker">WAVE · 도움 요청</p>
              <h2 id="help-request-title" tabIndex={-1}>도움이 필요할 때</h2>
            </div>
            <button type="button" onClick={onClose} aria-label="도움 요청 닫기">×</button>
          </header>

          <section aria-label="지금 있는 곳">
            <p style={{ fontSize: 14, color: "var(--muted)", margin: "0 0 4px" }}>지금 있는 곳</p>
            {placeName ? (
              <p style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>
                {placeName}{placeAddress ? ` · ${placeAddress}` : ""}
              </p>
            ) : (
              <p style={{ fontSize: 16, color: "var(--ink)", margin: "0 0 4px" }}>일정에 담은 장소가 없어요.</p>
            )}
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>일정에 담은 장소예요. 실제 계신 곳과 다르면 직접 말씀해 주세요.</p>
          </section>

          <fieldset style={{ border: 0, padding: 0, margin: "20px 0 0" }}>
            <legend style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, padding: 0 }}>어떤 도움이 필요하세요?</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {situations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={situation === item.id}
                  style={situationButtonStyle(situation === item.id)}
                  onClick={() => setSituation(situation === item.id ? null : item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="inquiry-card-preview" lang="ko">
            <small>보여줄 문장</small>
            <p>{message}</p>
            <span>WAVE</span>
          </div>

          <div className="inquiry-actions">
            <button type="button" ref={primaryButtonRef} onClick={showScreen}>이 화면 보여주기</button>
            <button type="button" onClick={() => void copyMessage()}>문장 복사하기</button>
          </div>
          {notice && <p role="status">{notice}</p>}
          {copyFallback && (
            <textarea
              className="inquiry-copy-fallback"
              aria-label="복사할 문장"
              readOnly
              value={placeName ? `${message}\n${placeName}` : message}
              rows={4}
              onFocus={(event) => event.currentTarget.select()}
            />
          )}

          <p className="modal-note" style={{ fontSize: 14, fontWeight: 600 }}>
            W.A.V.E는 위치를 대신 전달하지 않아요. 통화나 신고 앱에서 직접 위치를 알려 주세요.
          </p>

          {OFFICIAL_CONTACTS.length > 0 && (
            <section aria-label="공식 연락 안내" style={{ marginTop: 16, display: "grid", gap: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>공식 연락 안내</p>
              {OFFICIAL_CONTACTS.map((contact) => (
                <div key={contact.phone} style={{ display: "grid", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>{contact.description}</p>
                  <a href={`tel:${contact.phone}`} style={{ minHeight: 56, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--line)", borderRadius: 16, fontWeight: 700, fontSize: 18, textDecoration: "none", color: "var(--ink)" }}>
                    {contact.name} · {contact.phone}
                  </a>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </dialog>,
    document.body,
  );
}
