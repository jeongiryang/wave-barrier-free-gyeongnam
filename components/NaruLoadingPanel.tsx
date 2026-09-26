'use client';
import { useState } from 'react';
import LoadingState from './LoadingState';

/** Keep the lazy-loading surface at the user's chosen conversation size. */
export default function NaruLoadingPanel() {
  const [size] = useState(() => {
    try { return localStorage.getItem('wave-naru-size-v1') === 'compact' ? 'compact' : 'large'; }
    catch { return 'large'; }
  });
  return <div className="naru-loading-backdrop"><div className={`naru-panel naru-workspace naru-loading-panel naru-${size}`}><LoadingState>나루와의 대화를 열고 있어요.</LoadingState></div></div>;
}
