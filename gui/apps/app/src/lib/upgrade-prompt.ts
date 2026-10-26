import { useEffect } from "react";
import { fetchWithAppSurface } from "@/lib/app-surface";
import { openUrlInExternalBrowser } from "@/lib/url-open-routing";

export type UpgradePrompt = "limit_notice" | "queue" | "queue_badge" | "plan_card" | "free_tip" | "auto_delete";

const REPORT_TO_CLOUDROOM = false as boolean; // Inari tells no third party what was clicked.
function report(where: UpgradePrompt, action: "viewed" | "clicked"): void {
  if (!REPORT_TO_CLOUDROOM) return;
  void fetchWithAppSurface("/api/v1/cloudroom/upgrade-prompt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ where, action }),
  }).catch(() => {});
}

export function useUpgradePromptViewed(where: UpgradePrompt | null): void {
  useEffect(() => {
    if (where) report(where, "viewed");
  }, [where]);
}

export function openUpgrade(where: UpgradePrompt): void {
  report(where, "clicked");
  openUrlInExternalBrowser("https://freedzhost.cloud");
}
