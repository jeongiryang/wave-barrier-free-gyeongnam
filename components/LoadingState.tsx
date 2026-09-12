import type { ReactNode } from "react";

export function Spinner() {
  return <span className="wave-spinner" aria-hidden="true" />;
}

/** Keeps a readable live status when motion is reduced. */
export default function LoadingState({ children, skeleton = true }: { children: ReactNode; skeleton?: boolean }) {
  return <div className="wave-loading" role="status" aria-live="polite">
    <p><Spinner /><span>{children}</span></p>
    {skeleton && <div className="wave-skeleton-lines" aria-hidden="true"><i /><i /><i /></div>}
  </div>;
}
