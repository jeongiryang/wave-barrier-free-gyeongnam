"use client";

import { forwardRef, useImperativeHandle, useRef, type InputHTMLAttributes, type KeyboardEvent, type MouseEvent } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const AccessibleDateInput = forwardRef<HTMLInputElement, Props>(function AccessibleDateInput({ onClick, onKeyDown, style, ...props }, forwardedRef) {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(forwardedRef, () => input.current as HTMLInputElement);
  const open = () => {
    if (!input.current || input.current.disabled || input.current.readOnly) return;
    try { input.current.showPicker?.(); } catch { input.current.focus(); }
  };
  const click = (event: MouseEvent<HTMLInputElement>) => { onClick?.(event); if (!event.defaultPrevented) open(); };
  const keydown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (!event.defaultPrevented && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); open(); }
  };
  return <input {...props} ref={input} type="date" style={{ minHeight: 44, cursor: "pointer", ...style }} onClick={click} onKeyDown={keydown} />;
});

export default AccessibleDateInput;
