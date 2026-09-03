"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import { useHydratedSession } from "../hooks/useHydratedSession";

function passwordValues(form: HTMLFormElement) {
  const data = new FormData(form);
  return {
    currentPassword: String(data.get("currentPassword") || ""),
    newPassword: String(data.get("newPassword") || ""),
    confirmation: String(data.get("confirmation") || ""),
  };
}

export default function AccountSettings() {
  const router = useRouter();
  const { data: session, isPending } = useHydratedSession();
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changing, setChanging] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const changeLock = useRef(false);
  const deleteLock = useRef(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changeLock.current) return;
    const form = event.currentTarget;
    const values = passwordValues(form);
    setPasswordMessage("");
    setPasswordSuccess(false);
    if (values.currentPassword.length < 8 || values.currentPassword.length > 128) return setPasswordMessage("현재 비밀번호를 확인해 주세요.");
    if (values.newPassword.length < 8 || values.newPassword.length > 128) return setPasswordMessage("새 비밀번호는 8자 이상 128자 이하로 입력해 주세요.");
    if (values.newPassword !== values.confirmation) return setPasswordMessage("새 비밀번호 확인이 일치하지 않습니다.");
    changeLock.current = true;
    setChanging(true);
    try {
      const result = await authClient.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword, revokeOtherSessions: true });
      if (result.error) throw new Error("change-failed");
      form.reset();
      setPasswordSuccess(true);
      setPasswordMessage("비밀번호를 변경하고 다른 기기의 로그인 세션을 종료했습니다.");
    } catch {
      setPasswordMessage("현재 비밀번호를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      changeLock.current = false;
      setChanging(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (deleteLock.current) return;
    const data = new FormData(event.currentTarget);
    const password = String(data.get("deletePassword") || "");
    const confirmation = String(data.get("deleteConfirmation") || "");
    setDeleteMessage("");
    if (password.length < 8 || password.length > 128 || confirmation !== "계정 삭제") {
      setDeleteMessage("현재 비밀번호와 ‘계정 삭제’ 확인 문구를 정확히 입력해 주세요.");
      return;
    }
    deleteLock.current = true;
    setDeleting(true);
    try {
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirmation }),
      });
      const body = await response.json().catch(() => ({})) as { error?: string; pendingVerification?: boolean; cleanupPending?: boolean; cleanupToken?: string };
      if (!response.ok) throw new Error(body.error || "delete-failed");
      if (body.pendingVerification) {
        setDeleteMessage("계정 삭제 확인 메일을 보냈습니다. 같은 브라우저에서 메일의 링크를 열어 삭제를 완료해 주세요.");
        setDeleting(false);
        return;
      }
      if (body.cleanupPending && /^[a-f0-9]{64}$/.test(body.cleanupToken || "")) {
        router.push(`/account/delete-complete?token=${body.cleanupToken}`);
        return;
      }
      router.push("/?account=deleted");
    } catch (error) {
      setDeleteMessage(error instanceof Error && /[가-힣]/.test(error.message) ? error.message : "계정 삭제를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.");
      setDeleting(false);
      deleteLock.current = false;
    }
  }

  if (isPending) return <p className="auth-account-status" role="status">계정 정보를 불러오는 중…</p>;
  if (!session?.user) return <div className="auth-signed-in"><p>계정 관리를 사용하려면 먼저 로그인해 주세요.</p><a className="auth-primary-link" href="/login?next=%2Faccount">로그인</a></div>;

  return <div className="account-settings">
    <p className="auth-description"><strong>{session.user.name || session.user.email}</strong> 계정의 보안과 삭제를 직접 관리합니다.</p>
    <section aria-labelledby="change-password-title">
      <h3 id="change-password-title">비밀번호 변경</h3>
      <p>변경하면 현재 기기를 제외한 다른 로그인 세션을 종료합니다.</p>
      <form onSubmit={changePassword} noValidate>
        <div className="auth-field"><label htmlFor="account-current-password">현재 비밀번호</label><input id="account-current-password" name="currentPassword" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></div>
        <div className="auth-field"><label htmlFor="account-new-password">새 비밀번호</label><input id="account-new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div>
        <div className="auth-field"><label htmlFor="account-confirm-password">새 비밀번호 확인</label><input id="account-confirm-password" name="confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={128} required /></div>
        <p className={`auth-message${passwordSuccess ? " success" : ""}`} role={passwordMessage ? "status" : undefined} aria-live="polite">{passwordMessage}</p>
        <button className="auth-submit" type="submit" disabled={changing}>{changing ? "변경하는 중…" : "비밀번호 변경"}</button>
      </form>
    </section>
    <section className="account-danger" aria-labelledby="delete-account-title">
      <h3 id="delete-account-title">계정 탈퇴</h3>
      <p>인증 계정과 서버에 연결된 게시글·댓글·좋아요·신고를 삭제합니다. 이 기기에만 저장된 여행집과 환경설정은 남습니다.</p>
      <form onSubmit={deleteAccount} noValidate>
        <div className="auth-field"><label htmlFor="delete-password">현재 비밀번호</label><input id="delete-password" name="deletePassword" type="password" autoComplete="current-password" minLength={8} maxLength={128} required /></div>
        <div className="auth-field"><label htmlFor="delete-confirmation">확인 문구</label><input id="delete-confirmation" name="deleteConfirmation" type="text" autoComplete="off" placeholder="계정 삭제" required /><small>되돌릴 수 없습니다. ‘계정 삭제’를 그대로 입력해 주세요.</small></div>
        <p className="auth-message" role={deleteMessage ? "alert" : undefined} aria-live="polite">{deleteMessage}</p>
        <button className="account-delete-button" type="submit" disabled={deleting}>{deleting ? "삭제하는 중…" : "계정과 서버 데이터 삭제"}</button>
      </form>
    </section>
  </div>;
}
