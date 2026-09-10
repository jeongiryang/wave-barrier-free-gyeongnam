"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useHydratedSession } from "../auth/hooks/useHydratedSession";
import { profiles } from "../planner/constants";
import { travelRequest } from "./client";

function Preferences({ selected, onApply }: { selected: string[]; onApply: (ids: string[]) => void }) {
  const [saved, setSaved] = useState<{ selectedIds: string[]; revision: number } | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    travelRequest<{ selectedIds: string[]; revision: number }>("/preferences", undefined, controller.signal).then(setSaved).catch(() => { if (!controller.signal.aborted) setNotice("계정 편의 조건을 불러오지 못했습니다."); });
    return () => controller.abort();
  }, []);
  async function save(ids: string[]) {
    if (lock.current || !saved) return;
    lock.current = true; setBusy(true);
    try { setSaved(await travelRequest("/preferences", { selectedIds: ids, revision: saved.revision })); setNotice(ids.length ? "선택한 편의 조건을 계정에 저장했어요." : "계정에 저장한 편의 조건을 비웠어요."); }
    catch (error) { setNotice(error instanceof Error ? error.message : "저장하지 못했습니다."); }
    finally { lock.current = false; setBusy(false); }
  }
  async function reload() {
    try { setSaved(await travelRequest("/preferences")); setNotice("계정의 최신 편의 조건을 확인했어요."); } catch { setNotice("계정 편의 조건을 불러오지 못했습니다."); }
  }
  return <section aria-label="계정 편의 조건">
    <p><b>여러 기기에서 같은 편의로</b></p><p>저장할 때 선택한 편의 조건만 계정에 보관합니다. 동행자에게는 공유되지 않아요.</p>
    {saved?.selectedIds.length ? <p>계정에 저장한 조건: {profiles.filter(p => saved.selectedIds.includes(p.id)).map(p => p.label).join(" · ")}</p> : null}
    <div className="travel-profile-actions">
      <button type="button" disabled={!saved || busy || !selected.length} onClick={() => void save(selected)}>편의 조건을 계정에 저장</button>
      <button type="button" disabled={!saved?.selectedIds.length || busy} onClick={() => { onApply(saved!.selectedIds); setNotice("계정의 편의 조건을 적용했어요."); }}>계정 편의 불러오기</button>
      <button type="button" disabled={!saved?.selectedIds.length || busy} onClick={() => void save([])}>계정 편의 삭제</button>
      <button type="button" disabled={busy} onClick={() => void reload()}>다시 확인</button>
    </div><p role="status">{notice}</p>
  </section>;
}
export default function AccountPreferences(props: { selected: string[]; onApply: (ids: string[]) => void }) {
  const { data, isPending } = useHydratedSession();
  if (isPending) return null;
  if (!data?.user?.id) return <p><Link href="/login?next=%2Fplanner">로그인하면 편의 조건을 여러 기기에서 불러올 수 있어요 →</Link></p>;
  return <Preferences key={data.user.id} {...props} />;
}
