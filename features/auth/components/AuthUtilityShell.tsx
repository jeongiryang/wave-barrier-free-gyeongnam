import type { ReactNode } from "react";
import WaveHeader from "../../../components/WaveHeader";
import SkipLink from "../../../components/SkipLink";

export default function AuthUtilityShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page wave-night night-secondary">
      <SkipLink href="#auth-title">계정 관리로 바로가기</SkipLink>
      <WaveHeader current="other" />
      <div className="auth-layout auth-utility-layout">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <p className="section-kicker">{eyebrow}</p>
          <h1 id="auth-story-title">{title}</h1>
          <p>{description}</p>
        </section>
        <section className="auth-card auth-utility-card" aria-labelledby="auth-title">
          <p className="auth-kicker">{eyebrow}</p>
          <h2 id="auth-title">{title}</h2>
          {children}
        </section>
      </div>
    </main>
  );
}
