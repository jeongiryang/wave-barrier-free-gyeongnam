"use client";

import { forwardRef, lazy, Suspense, useImperativeHandle, useRef, useState, type InputHTMLAttributes } from "react";

const WaveDatePicker = lazy(() => import('./WaveDatePicker'));

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const AccessibleDateInput = forwardRef<HTMLInputElement, Props>(function AccessibleDateInput({ value, defaultValue, min, max, onChange, ...props }, forwardedRef) {
  const input = useRef<HTMLInputElement>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(String(defaultValue || ''));
  useImperativeHandle(forwardedRef, () => input.current!);
  return <Suspense fallback={<input {...props} type="text" value={value === undefined ? uncontrolledValue : String(value)} readOnly aria-busy="true" />}><WaveDatePicker value={value === undefined ? uncontrolledValue : String(value)} min={min === undefined ? undefined : String(min)} max={max === undefined ? undefined : String(max)} inputRef={input}
    inputProps={{ ...props, onChange: event => { setUncontrolledValue(event.target.value); onChange?.(event); } }}
    onChange={date => {
      const node = input.current;
      if (!node) return;
      // Use the native setter so React observes the same bubbling input event as typing.
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(node, date);
      node.dispatchEvent(new Event('input', { bubbles: true }));
    }} /></Suspense>;
});

export default AccessibleDateInput;
