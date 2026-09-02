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
  const [validationAttempt, setValidationAttempt] = useState(0);
  const redirectTimer = useRef<number | null>(null);
  const submitLock = useRef(false);
  const inputRevision = useRef(0);
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
  }, [invalidField, validationAttempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // disabled가 그려지기 전에 Enter나 더블 클릭이 연달아 들어와도 인증 요청은 한 번만 보낸다.
    if (submitLock.current) return;
    setMessage("");
    setSuccess(false);
    setInvalidField("");
    const parsed = readAuthCredentials(mode, new FormData(event.currentTarget));
    if (!parsed.value) {
      setMessage(parsed.error || "입력 내용을 확인해 주세요.");
      // 문구만 띄우면 어느 칸이 문제인지 되짚어 올라가야 한다. 렌더 뒤 그 칸으로 데려간다.
      setInvalidField(parsed.field || "");
      // 같은 오류를 다시 제출해도 해당 칸으로 초점을 되돌린다.
      setValidationAttempt((current) => current + 1);
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    const submittedRevision = inputRevision.current;
    let completed = false;
    try {
      const { email, password, name } = parsed.value;
      const result = registering
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw new Error(result.error.message || "인증을 완료하지 못했습니다.");
      completed = true;
      setSuccess(true);
      setMessage(registering ? "W.A.V.E 계정이 만들어졌습니다. 여행자 이야기로 이동합니다." : "로그인했습니다. 이전 화면으로 이동합니다.");
      redirectTimer.current = window.setTimeout(() => router.push(next), 450);
    } catch (error) {
      // 요청 중 값을 고쳤다면 응답은 이전 값에 대한 것이므로 오래된 오류를 다시 띄우지 않는다.
      if (submittedRevision === inputRevision.current) {
        setMessage(friendlyAuthError(error instanceof Error ? error.message : ""));
      }
    } finally {
      // 성공 뒤 이동을 기다리는 짧은 동안에도 같은 가입·로그인 요청을 다시 보내지 않는다.
      if (!completed) submitLock.current = false;
      setSubmitting(false);
    }
  }

  function clearError(event: FormEvent<HTMLFormElement>) {
    if (success) return;
    inputRevision.current += 1;
    const changedField = event.target instanceof HTMLInputElement ? event.target.name : "";
    // 필드 오류는 그 필드를 고칠 때만 걷는다. 공급자 오류는 어느 입력을 바꿔도
    // 오래된 문구가 남지 않게 한다.
    if (invalidField && changedField !== invalidField) return;
    setInvalidField("");
    setMessage("");
  }

  return {
    registering, session, isPending, showPassword, submitting, message, success, next, submit,
    invalidField,
    clearError,
    togglePassword: () => setShowPassword((current) => !current),
  };
}
