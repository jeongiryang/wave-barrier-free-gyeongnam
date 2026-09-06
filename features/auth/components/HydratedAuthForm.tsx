"use client";

import { useSyncExternalStore, type ComponentProps } from "react";

const subscribe = () => () => undefined;
const ready = () => true;
const notReady = () => false;

/** Sensitive fields must not accept input before their submit handler is attached. */
export default function HydratedAuthForm({ children, ...props }: Omit<ComponentProps<"form">, "method">) {
  const hydrated = useSyncExternalStore(subscribe, ready, notReady);
  return <>
    <form {...props} method="post">
      <fieldset disabled={!hydrated} style={{ display: "contents", border: 0, padding: 0, margin: 0, minWidth: 0 }}>
        {children}
      </fieldset>
    </form>
    {!hydrated && <p className="auth-message" role="status">계정 입력을 준비하고 있습니다. 이 안내가 계속 보이면 브라우저의 JavaScript를 켜고 다시 열어 주세요. 여행 계획은 로그인 없이 시작할 수 있습니다.</p>}
  </>;
}
