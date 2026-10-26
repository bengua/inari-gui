const CLI_PATH =
  "/Applications/Inari.app/Contents/Resources/app.asar.unpacked/node_modules/bb-app/host-daemon/dist/room-cli";
const RELEASES_URL = "https://freedzhost.cloud";

const said = (text?: string | null) =>
  text?.trim() ? `: "${text.trim().replace(/\s+/g, " ").slice(0, 400)}".` : ".";

const fixPrompt = (problem: string, look: string) =>
  `${problem} ${look} Find the root cause and fix it without losing any work, then tell me what was wrong. If \`room-cli\` is not on your PATH, use ${CLI_PATH}.`;

export const cloudThreadFixPrompt = (threadId: string, agent: string, error?: string | null) =>
  fixPrompt(
    `My Inari Cloud thread ${threadId} (${agent}) failed${said(error)}`,
    `Investigate with \`room-cli thread show ${threadId}\` and \`room-cli vm run '<command>'\` on my cloud VM.`,
  );

export const syncFixPrompt = (state: string, issue?: string | null) =>
  fixPrompt(
    `Inari's automatic sync between this computer and my cloud VM is not working (state: ${state})${said(issue)}`,
    "Check `room-cli cloud status --json`, ~/.gui-cloudroom/cloudroom-sync/, and the logs in ~/.gui-cloudroom/logs/.",
  );

export const projectFilesFixPrompt = (threadId: string, error?: string | null) =>
  fixPrompt(
    `Inari could not move my work to the cloud for thread ${threadId}${said(error)}`,
    `Check \`room-cli thread show ${threadId}\` and \`room-cli cloud thread-workspace ${threadId}\`, then copy any missing project files with \`room-cli vm push\`.`,
  );

export const cloudUnavailableFixPrompt = (error?: string | null) =>
  fixPrompt(
    `My Inari desktop app cannot reach my cloud VM${said(error)}`,
    "Check `room-cli cloud status --json`, then run `room-cli vm run 'systemctl status cloudroom --no-pager; df -h'` if the VM answers.",
  );

export const crashFixPrompt = (error: string) =>
  fixPrompt(
    `The Inari desktop app crashed${said(error)}`,
    "Check the logs in ~/.gui-cloudroom/logs/ and `room-cli status --json`.",
  );

export const appUpdateFixPrompt = (current: string, latest: string | null) =>
  `Update my Inari desktop app from version ${current} to ${latest ?? "the newest version"}. Download the newest release for this computer from ${RELEASES_URL}, quit Inari, replace the old app (on macOS: /Applications/Inari.app), and reopen it. Do not delete ~/.gui-cloudroom; it holds my data. Confirm the new version when you are done.`;
