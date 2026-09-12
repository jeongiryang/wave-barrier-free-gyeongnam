"use client";
import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import LoadingState from '../../../components/LoadingState';

/** Keep one React subtree, even when the conversation moves its DOM workspace. */
export default function PlannerStagePortal({ host, children }: { host: HTMLElement | null; children: ReactNode }) {
  const mainMount = useRef<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const mount = useCallback((node: HTMLDivElement | null) => {
    mainMount.current = node;
    if (node) setTarget(current => current || document.createElement('div'));
  }, []);
  useLayoutEffect(() => {
    const destination = host || mainMount.current;
    if (!target || !destination) return;
    destination.append(target);
    return () => target.remove();
  }, [host, target]);
  return <div ref={mount} className="planner-stage-mount" hidden={Boolean(host)}>{target ? createPortal(children, target) : <LoadingState>여행 설계를 준비하고 있어요.</LoadingState>}</div>;
}
