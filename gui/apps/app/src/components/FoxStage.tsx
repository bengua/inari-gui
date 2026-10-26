import { useCallback, useEffect, useRef } from "react";
import { cn } from "@cloudroom/shared-ui/lib/utils";

export type FoxActivity = "idle" | "working" | "waiting" | "queued";

export interface FoxPing {
  name: string;
  nonce: number;
}

export interface FoxContract {
  setPet?: (json: string) => void;
  setHealth?: (health: number) => void;
  setActivity?: (activity: FoxActivity | null) => void;
  setOffline?: (reason: string | null) => void;
  setMood?: (mood: string | null) => void;
  setStale?: (stale: boolean) => void;
  setReducedMotion?: (on: boolean) => void;
  setEvent?: (name: string) => void;
  setHarness?: (type: string | null) => void;
  say?: (text: string | null) => void;
  pause?: () => void;
  resume?: () => void;
}

type FoxWindow = (Window & { fox?: FoxContract }) | null | undefined;

export function callFox<K extends keyof FoxContract>(
  win: FoxWindow,
  method: K,
  ...args: Parameters<NonNullable<FoxContract[K]>>
): boolean {
  try {
    const fn = win?.fox?.[method];
    if (typeof fn !== "function") return false;
    (fn as (...methodArgs: unknown[]) => void)(...args);
    return true;
  } catch {
    return false;
  }
}

export interface FoxStageProps {
  activity?: FoxActivity | null;
  offlineReason?: string | null;
  health?: number | null;
  harness?: string | null;
  event?: FoxPing | null;
  className?: string;
}

interface FoxDesiredState {
  activity: FoxActivity | null;
  offlineReason: string | null;
  health: number | null;
  harness: string | null;
}

function readReducedMotion(): boolean {
  try {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch {
    return false;
  }
}

export function FoxStage({
  activity = null,
  offlineReason = null,
  health = null,
  harness = null,
  event = null,
  className,
}: FoxStageProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const loadedRef = useRef(false);
  const desiredRef = useRef<FoxDesiredState>({
    activity,
    offlineReason,
    health,
    harness,
  });
  const lastEventNonceRef = useRef<number | null>(null);

  const applyDesiredState = useCallback(() => {
    if (!loadedRef.current) return;
    const win = iframeRef.current?.contentWindow as FoxWindow;
    const desired = desiredRef.current;
    if (desired.health !== null) callFox(win, "setHealth", desired.health);
    callFox(win, "setHarness", desired.harness);
    callFox(win, "setOffline", desired.offlineReason);
    if (desired.offlineReason === null) {
      callFox(win, "setActivity", desired.activity);
    }
  }, []);

  useEffect(() => {
    desiredRef.current = { activity, offlineReason, health, harness };
    applyDesiredState();
  });

  useEffect(() => {
    if (!loadedRef.current || event === null) return;
    if (event.nonce === lastEventNonceRef.current) return;
    lastEventNonceRef.current = event.nonce;
    const win = iframeRef.current?.contentWindow as FoxWindow;
    callFox(win, "setEvent", event.name);
  }, [event]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (!loadedRef.current) return;
      const win = iframeRef.current?.contentWindow as FoxWindow;
      callFox(win, "setReducedMotion", query.matches);
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const syncVisibility = () => {
      if (!loadedRef.current) return;
      const win = iframeRef.current?.contentWindow as FoxWindow;
      callFox(win, document.hidden ? "pause" : "resume");
    };
    document.addEventListener("visibilitychange", syncVisibility);
    return () => document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  const handleLoad = useCallback(() => {
    loadedRef.current = true;
    lastEventNonceRef.current = null;
    applyDesiredState();
    const win = iframeRef.current?.contentWindow as FoxWindow;
    callFox(win, "setReducedMotion", readReducedMotion());
    callFox(win, document.hidden ? "pause" : "resume");
  }, [applyDesiredState]);

  return (
    <div
      data-testid="fox-stage"
      aria-label="SwarmFox mascot"
      className={cn("pointer-events-none select-none", className)}
    >
      <iframe
        ref={iframeRef}
        src="/fox/index.html"
        title="SwarmFox"
        onLoad={handleLoad}
        sandbox="allow-scripts allow-same-origin"
        className="pointer-events-auto h-full w-full border-none bg-transparent"
        style={{ background: "transparent", colorScheme: "light" }}
      />
    </div>
  );
}
