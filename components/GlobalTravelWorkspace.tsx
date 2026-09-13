'use client';
import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import LoadingState from './LoadingState';
import NaruLauncher from './NaruLauncher';
import PlannerNavigation from './PlannerNavigation';
import TravelWorkspaceBoundary from './TravelWorkspaceBoundary';

const PlannerWorkspace = lazy(() => import('../app/planner/page').then(module => ({ default: module.PlannerWorkspace })));
const NaruContext = createContext<(prompt?: string) => void>(() => {});
export const useOpenNaru = () => useContext(NaruContext);

/** One mounted journey engine across routes; neither chat nor needs are persisted here. */
export default function GlobalTravelWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const planner = pathname === '/planner';
  const supported = planner || pathname === '/' || pathname.startsWith('/festivals') || pathname.startsWith('/community') || pathname === '/guide';
  const [mounted, setMounted] = useState(planner);
  const [opened, setOpened] = useState(false);
  const [request, setRequest] = useState({ id: 0, prompt: '' });
  const openNaru = useCallback((prompt = '') => { setMounted(true); setOpened(true); setRequest(value => ({ id: value.id + 1, prompt: prompt.slice(0, 1200) })); }, []);
  const show = useCallback(() => setOpened(true), []);
  const dismiss = useCallback(() => setOpened(false), []);
  useEffect(() => {
    if (supported && !planner) return;
    const frame = requestAnimationFrame(() => {
      if (planner) setMounted(true);
      else { setMounted(false); setOpened(false); setRequest({ id: 0, prompt: '' }); }
    });
    return () => cancelAnimationFrame(frame);
  }, [supported, planner]);
  const pageContext = pathname.startsWith('/festivals') ? '축제' : pathname.startsWith('/community') ? '커뮤니티' : pathname === '/' ? '서비스 소개' : '여행 설계';
  return <NaruContext.Provider value={openNaru}>
    <Suspense fallback={null}><PlannerNavigation onNaru={openNaru} /></Suspense>
    {!planner && children}
    {supported && (mounted || planner) && <div className="global-travel-workspace" data-embedded={!planner} hidden={!planner && (!opened || !supported)}>
      <TravelWorkspaceBoundary embedded={!planner} onClose={dismiss}><Suspense fallback={<LoadingState>여행과 나루를 준비하고 있어요.</LoadingState>}><PlannerWorkspace active={supported} onShow={show} embedded={!planner} launchRequest={request} pageContext={pageContext} onDismiss={dismiss} /></Suspense></TravelWorkspaceBoundary>
    </div>}
    {supported && !planner && !opened && <NaruLauncher onOpen={openNaru} context={pageContext} />}
  </NaruContext.Provider>;
}
