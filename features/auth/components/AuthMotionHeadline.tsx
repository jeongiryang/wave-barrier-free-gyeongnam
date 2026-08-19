"use client";

import { useEffect, useState } from "react";
import { useSitePreferences } from "../../../components/SitePreferences";
import type { AuthMode } from "../types";

const copy = {
  login: {
    lead: "내가 고른 장소에서",
    phrases: ["나에게 맞는 하루로", "더 편한 이동으로", "여행자의 이야기까지"],
    signature: "한 흐름으로.",
    accessible: "내가 고른 장소에서 나에게 맞는 하루와 더 편한 이동, 여행자의 이야기까지 한 흐름으로 이어집니다.",
  },
  register: {
    lead: "여행의 조건에서",
    phrases: ["나에게 맞는 하루로", "더 편한 이동으로", "다녀온 경험까지"],
    signature: "나답게 이어집니다.",
    accessible: "여행의 조건에서 나에게 맞는 하루와 더 편한 이동, 다녀온 경험까지 나답게 이어집니다.",
  },
} as const;

export default function AuthMotionHeadline({ mode }: { mode: AuthMode }) {
  const { motion } = useSitePreferences();
  const [phraseIndex, setPhraseIndex] = useState(0);
  const selected = copy[mode];
  const visiblePhraseIndex = motion === "calm" ? selected.phrases.length - 1 : phraseIndex;

  useEffect(() => {
    if (motion === "calm") return;
    const reset = window.setTimeout(() => setPhraseIndex(0), 0);
    const second = window.setTimeout(() => setPhraseIndex(1), 2700);
    const final = window.setTimeout(() => setPhraseIndex(2), 5400);
    return () => {
      window.clearTimeout(reset);
      window.clearTimeout(second);
      window.clearTimeout(final);
    };
  }, [mode, motion]);

  return (
    <h2 id="auth-story-title" className="auth-motion-headline">
      <span className="sr-only">{selected.accessible}</span>
      <span className="auth-motion-visual" aria-hidden="true">
        <span className="auth-copy-lead">{selected.lead}</span>
        <span className="auth-copy-phrase-shell">
          <span className="auth-copy-phrase" key={`${mode}-${visiblePhraseIndex}`}>{selected.phrases[visiblePhraseIndex]}</span>
        </span>
        <em className="auth-copy-signature">{selected.signature}<i /></em>
      </span>
    </h2>
  );
}
