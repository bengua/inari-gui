// FoxBot, Inari's mascot, on Inari's own thread state.
//
// The state comes from the same list the sidebar draws (useSidebarThreads):
// no server route, no polling of our own. FoxBot follows the open thread; on
// the home page it sums up the whole swarm. Placement follows the rules set
// for the desktop: on the app's background, no frame, no card — top of the
// sidebar on a wide screen, top-centred above the threads on a phone.
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSidebarThreads } from "@/lib/plugin-sidebar-hooks";
import { FoxStage, type FoxActivity, type FoxPing } from "@/components/FoxStage";

const WORKING = new Set([
  "working-draft",
  "workflow",
  "background-agent",
  "background-command",
  "plan-mode",
  "goal",
  "runtime",
]);
const QUEUED = new Set(["queued-waiting", "queued-failed"]);
const RANK: Record<FoxActivity, number> = { waiting: 3, working: 2, queued: 1, idle: 0 };

interface ThreadLike {
  id: string;
  providerId: string;
  indicator: string | null;
  hasPendingInteraction: boolean;
  isArchived: boolean;
  isHidden: boolean;
}

/** The sprite engine's harness word for an Inari provider. It picks the
 *  persona itself (claude -> merica, kimi -> zen, local -> rebel), the same rule
 *  as the phone. Codex and Pi run the homelab's own models here: local. */
export function harnessFor(providerId: string | null | undefined): string | null {
  if (!providerId) return null;
  const id = providerId.toLowerCase();
  if (id.includes("claude")) return "claude";
  if (id.includes("kimi")) return "kimi";
  if (id === "codex" || id === "pi" || id.includes("local") || id.includes("reflexion")) return "local";
  return id;
}

/** One thread's state, as FoxBot shows it. */
export function activityFor(thread: Pick<ThreadLike, "indicator" | "hasPendingInteraction">): FoxActivity {
  if (thread.hasPendingInteraction || thread.indicator === "waiting-for-input") return "waiting";
  if (thread.indicator && WORKING.has(thread.indicator)) return "working";
  if (thread.indicator && QUEUED.has(thread.indicator)) return "queued";
  return "idle";
}

/** What FoxBot shows: the open thread, else the most urgent state of the swarm. */
export function foxStateFor(threads: ThreadLike[], openThreadId: string | null) {
  const live = threads.filter((t) => !t.isArchived && !t.isHidden);
  const errors = live.filter((t) => t.indicator === "unread-error").length;
  const open = openThreadId ? live.find((t) => t.id === openThreadId) : undefined;
  let lead: ThreadLike | undefined = open;
  if (!lead) {
    for (const t of live) {
      if (!lead || RANK[activityFor(t)] > RANK[activityFor(lead)]) lead = t;
    }
  }
  const activity: FoxActivity = lead ? activityFor(lead) : "idle";
  return {
    activity,
    // The persona belongs to a room: the open thread's, else the busiest one's.
    harness: harnessFor(open?.providerId ?? (lead && activity !== "idle" ? lead.providerId : null)),
    health: Math.max(20, 100 - errors * 20),
    errors,
  };
}

function useOpenThreadId(): string | null {
  const { pathname } = useLocation();
  return pathname.match(/\/threads\/([^/]+)/)?.[1] ?? null;
}

export function FoxMascot({ variant }: { variant: "sidebar" | "compact" }) {
  const { threads, status } = useSidebarThreads();
  const openThreadId = useOpenThreadId();
  const state = useMemo(
    () => foxStateFor(threads as unknown as ThreadLike[], openThreadId),
    [threads, openThreadId],
  );
  const [ping, setPing] = useState<FoxPing | null>(null);
  const nonce = useRef(0);
  const previous = useRef({ activity: state.activity, errors: state.errors });

  useEffect(() => {
    const before = previous.current;
    // A thread that starts waiting for Ben, or a new error, earns a signal.
    if (
      (state.activity === "waiting" && before.activity !== "waiting") ||
      state.errors > before.errors
    ) {
      nonce.current += 1;
      setPing({ name: "notify", nonce: nonce.current });
    }
    previous.current = { activity: state.activity, errors: state.errors };
  }, [state.activity, state.errors]);

  return (
    <FoxStage
      activity={state.activity}
      offlineReason={status === "error" ? "threads unavailable" : null}
      health={state.health}
      harness={state.harness}
      event={ping}
      className={
        variant === "sidebar"
          ? "mx-2 mb-1 h-[180px] shrink-0"
          : "mx-auto h-[132px] w-full max-w-[220px] shrink-0"
      }
    />
  );
}
