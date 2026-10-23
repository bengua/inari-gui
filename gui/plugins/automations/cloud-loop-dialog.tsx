import { useEffect, useState, type ReactNode } from "react";
import {
  experimental_ProviderModelPicker as ProviderModelPicker,
  type ExperimentalProviderModelPickerValue,
} from "@get-bb/plugin-sdk/app";
import { Button } from "@cloudroom/shared-ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@cloudroom/shared-ui/dialog";
import { Icon } from "@cloudroom/shared-ui/icon";
import { cn } from "@cloudroom/shared-ui/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cloudroom/shared-ui/select";
import { Switch } from "@cloudroom/shared-ui/switch";
import { Textarea } from "@cloudroom/shared-ui/textarea";
import type {
  CloudAutomation,
  CloudAutomationActions,
  CloudAutomationChanges,
} from "./cloud-view.js";
import {
  formatAutomationTrigger,
  formatTimeUntil,
  isCloudWebhook,
} from "./lib/format-schedule.js";
import { LOOP_PRIORITY_STYLE } from "./templates-view.js";

const PRIORITIES = [1, 2, 3, 4] as const;
type Priority = (typeof PRIORITIES)[number];

const SCHEDULE_PRESETS = [
  "*/30 * * * *",
  "0 * * * *",
  "0 */2 * * *",
  "0 */4 * * *",
  "0 */8 * * *",
  "0 9 * * *",
];

function scheduleLabel(cron: string, timezone: string): string {
  return formatAutomationTrigger({ triggerType: "schedule", cron, timezone });
}

function agentValue(
  automation: CloudAutomation,
): ExperimentalProviderModelPickerValue | null {
  const agent = automation.agent;
  if (!agent?.providerId || !agent.model) return null;
  return {
    providerId: agent.providerId,
    model: agent.model,
    reasoningLevel: (agent.reasoningLevel ??
      undefined) as ExperimentalProviderModelPickerValue["reasoningLevel"],
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function ReadOnlyField({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 min-w-0 items-center gap-1.5 rounded-md bg-muted/50 px-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function PriorityRing({ level }: { level: Priority }) {
  return (
    <span
      className={cn(
        "size-3.5 shrink-0 rounded-full border-2",
        LOOP_PRIORITY_STYLE[level].ring,
      )}
    />
  );
}

export function CloudLoopDialog({
  automation,
  priority,
  onPriorityChange,
  actions,
  onClose,
}: {
  automation: CloudAutomation;
  priority: Priority;
  onPriorityChange: (priority: Priority) => void;
  actions: CloudAutomationActions;
  onClose: () => void;
}) {
  const savedAgent = agentValue(automation);
  const [prompt, setPrompt] = useState(automation.prompt ?? "");
  const [cron, setCron] = useState(automation.cron);
  const [agent, setAgent] = useState(savedAgent);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    setPrompt(automation.prompt ?? "");
    setCron(automation.cron);
    setAgent(agentValue(automation));
  }, [automation]);

  const webhook = isCloudWebhook(automation);
  const scheduleOptions =
    automation.cron === null || SCHEDULE_PRESETS.includes(automation.cron)
      ? SCHEDULE_PRESETS
      : [automation.cron, ...SCHEDULE_PRESETS];
  const changes: CloudAutomationChanges = {};
  if (automation.prompt !== undefined && prompt.trim() !== automation.prompt.trim())
    changes.prompt = prompt.trim();
  if (cron !== null && cron !== automation.cron) changes.cron = cron;
  if (
    agent !== null &&
    (agent.providerId !== savedAgent?.providerId ||
      agent.model !== savedAgent?.model ||
      agent.reasoningLevel !== savedAgent?.reasoningLevel)
  ) {
    changes.harness = agent.providerId;
    changes.model = agent.model;
    if (agent.reasoningLevel) changes.reasoning = agent.reasoningLevel;
  }
  const dirty = Object.keys(changes).length > 0;
  const nextRunAt =
    automation.next_run_at === null ? null : Date.parse(automation.next_run_at);

  const save = async () => {
    setPending(true);
    const saved = await actions.onSave(automation, changes);
    setPending(false);
    if (saved) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent
        className="max-w-xl gap-5"
        overlayClassName="bg-black/50 backdrop-blur-sm"
      >
        <DialogHeader className="pr-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <PriorityRing level={priority} />
            <DialogTitle className="min-w-0 flex-1 truncate">
              {automation.name}
            </DialogTitle>
            <Switch
              checked={automation.enabled}
              aria-label={`${automation.enabled ? "Pause" : "Resume"} ${automation.name}`}
              onCheckedChange={(enabled) =>
                actions.onEnabledChange(automation, enabled)
              }
            />
          </div>
          <DialogDescription className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-primary-text">
              <Icon name="Cloud" className="size-3.5" aria-hidden />
              Cloud
            </span>
            <span aria-hidden>·</span>
            <span className="truncate">
              {!automation.enabled
                ? "Paused"
                : nextRunAt === null
                  ? "Starts soon"
                  : `Next run ${formatTimeUntil(nextRunAt)}`}
              {` · ${automation.runs} runs`}
            </span>
          </DialogDescription>
        </DialogHeader>

        {automation.prompt === undefined ? null : (
          <Field label="Prompt">
            <Textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              aria-label="Loop prompt"
              disabled={pending}
              className="h-40 resize-none text-sm leading-relaxed"
            />
          </Field>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Schedule">
            {webhook || cron === null ? (
              <ReadOnlyField>
                {webhook ? "On webhook" : "One time"}
              </ReadOnlyField>
            ) : (
              <Select value={cron} onValueChange={setCron} disabled={pending}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scheduleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {scheduleLabel(option, automation.timezone)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>
          <Field label="Agent">
            {agent === null ? (
              <ReadOnlyField>Set by the loop</ReadOnlyField>
            ) : (
              <div className="flex h-9 min-w-0 items-center rounded-md border border-input px-2">
                <ProviderModelPicker
                  value={agent}
                  onChange={setAgent}
                  allowProviderChange
                  disabled={pending || automation.new_thread !== true}
                  className="h-6 max-w-full"
                />
              </div>
            )}
          </Field>
          <Field label="Runs on">
            <ReadOnlyField>
              <Icon name="Cloud" className="size-3.5 text-primary-text" aria-hidden />
              {automation.new_thread ? "Cloud · new thread each run" : "Cloud · same thread"}
            </ReadOnlyField>
          </Field>
          <Field label="Priority">
            <Select
              value={String(priority)}
              onValueChange={(value) => onPriorityChange(Number(value) as Priority)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((level) => (
                  <SelectItem key={level} value={String(level)}>
                    <span className="flex items-center gap-2">
                      <PriorityRing level={level} />P{level}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter className="items-center sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={pending}
            onClick={() => actions.onDelete(automation)}
          >
            Delete
          </Button>
          <div className="flex items-center gap-2">
            {webhook ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => actions.onRun(automation)}
              >
                <Icon name="Play" className="size-3.5" aria-hidden />
                Run now
              </Button>
            )}
            <Button
              type="button"
              disabled={pending || !dirty || prompt.trim().length === 0}
              onClick={() => void save()}
            >
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
