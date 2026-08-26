"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import type { AuthMode } from "../types";
import { friendlyAuthError, readAuthCredentials, safeAuthReturnPath } from "../validation";
import { useHydratedSession } from "./useHydratedSession";

export function useAuthForm(mode: AuthMode, returnTo?: string) {
  const router = useRouter();
  const { data: session, isPending } = useHydratedSession();
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const redirectTimer = useRef<number | null>(null);
  const registering = mode === "register";
  const next = safeAuthReturnPath(returnTo);

  useEffect(() => () => {
    if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    const parsed = readAuthCredentials(mode, new FormData(event.currentTarget));
    if (!parsed.value) {
      setMessage(parsed.error || "입력 내용을 확인해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { email, password, name } = parsed.value;
      const result = registering
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "인증을 완료하지 못했습니다.");
      setSuccess(true);
      setMessage(registering ? "W.A.V.E 계정이 만들어졌습니다. 여행자 이야기로 이동합니다." : "로그인했습니다. 이전 화면으로 이동합니다.");
      redirectTimer.current = window.setTimeout(() => router.push(next), 450);
    } catch (error) {
      setMessage(friendlyAuthError(error instanceof Error ? error.message : ""));
    } finally {
      setSubmitting(false);
    }
  }

  return {
    registering, session, isPending, showPassword, submitting, message, success, next, submit,
    togglePassword: () => setShowPassword((current) => !current),
  };
}
