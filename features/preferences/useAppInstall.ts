"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface InstallChoice {
  outcome: "accepted" | "dismissed";
  platform: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

type InstallState = "manual" | "available" | "installing" | "installed";

export function useAppInstall() {
  const promptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [state, setState] = useState<InstallState>("manual");

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const frame = window.requestAnimationFrame(() => {
      if (window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone) setState("installed");
    });
    const rememberPrompt = (event: Event) => {
      event.preventDefault();
      promptRef.current = event as BeforeInstallPromptEvent;
      setState("available");
    };
    const markInstalled = () => {
      promptRef.current = null;
      setState("installed");
    };
    window.addEventListener("beforeinstallprompt", rememberPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", rememberPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const event = promptRef.current;
    if (!event) return;
    promptRef.current = null;
    setState("installing");
    try {
      await event.prompt();
      const choice = await event.userChoice;
      setState(choice.outcome === "accepted" ? "installed" : "manual");
    } catch {
      setState("manual");
    }
  }, []);

  return { state, install };
}
