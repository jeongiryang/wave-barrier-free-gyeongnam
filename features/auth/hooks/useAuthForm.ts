"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../../../lib/auth/client";
import { authFieldInputId } from "../../../lib/auth/fields.js";
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
  const [invalidField, setInvalidField] = useState("");
  const redirectTimer = useRef<number | null>(null);
  const registering = mode === "register";
  const next = safeAuthReturnPath(returnTo);

  useEffect(() => () => {
    if (redirectTimer.current !== null) window.clearTimeout(redirectTimer.current);
  }, []);

  useEffect(() => {
    if (!invalidField) return;
    // 상태가 렌더링된 뒤 옮겨야 초점 진입 시 aria-invalid와 오류 설명을 함께 읽는다.
    const inputId = authFieldInputId(invalidField);
    if (inputId) document.getElementById(inputId)?.focus();
  }, [invalidField]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setInvalidField("");
    const parsed = readAuthCredentials(mode, new FormData(event.currentTarget));
    if (!parsed.value) {
      setMessage(parsed.error || "입력 내용을 확인해 주세요.");
      // 문구만 띄우면 어느 칸이 문제인지 되짚어 올라가야 한다. 렌더 뒤 그 칸으로 데려간다.
      setInvalidField(parsed.field || "");
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
    invalidField,
    // 고치기 시작하면 오류 표시를 걷는다. 아직 틀렸다고 계속 말하면 방금 고친 것이
    // 반영되지 않은 줄 안다.
    clearInvalid: () => setInvalidField(""),
    togglePassword: () => setShowPassword((current) => !current),
  };
}
