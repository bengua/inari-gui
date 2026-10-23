import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "@cloudroom/shared-ui/icon";
import { Button } from "@cloudroom/shared-ui/button";
import { Checkbox } from "@cloudroom/shared-ui/checkbox";
import { Input } from "@cloudroom/shared-ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@cloudroom/shared-ui/popover";
import { cn } from "@cloudroom/shared-ui/lib/utils";
import type {
  AutomationAgentSummary,
  AutomationsOverviewResponse,
} from "./src/rpc-types.js";
import { formatAutomationTrigger } from "./lib/format-schedule.js";
import {
  LOOP_TEMPLATES,
  TEMPLATE_CATEGORIES,
  TEMPLATE_PRIORITIES,
  type LoopTemplate,
  type TemplateCategory,
} from "./templates.js";

export interface TemplateProject {
  id: string;
  name: string;
  path: string | null;
}

export interface LoopTemplatesState {
  projects: readonly TemplateProject[] | null;
  /** Creates one loop per project. Resolves once every create has settled. */
  onAdd: (template: LoopTemplate, projectIds: string[]) => Promise<void>;
}

type OverviewEntry = AutomationsOverviewResponse["automations"][number];

export const LOOP_PRIORITY_STYLE = {
  1: { ring: "border-[#ff7066] bg-[#ff7066]/15", text: "text-[#ff7066]" },
  2: { ring: "border-[#ff9a14] bg-[#ff9a14]/15", text: "text-[#ff9a14]" },
  3: { ring: "border-[#5297ff] bg-[#5297ff]/15", text: "text-[#5297ff]" },
  4: { ring: "border-muted-foreground", text: "text-muted-foreground" },
} as const;

export function LoopGroupDivider({
  label,
  title,
  count,
  hint,
  className,
}: {
  label: string;
  title?: string;
  count: number;
  hint?: string;
  className?: string;
}) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2.5 text-xs font-semibold">
      <span className={className}>{label}</span>
      {title ? <span className="text-foreground">{title}</span> : null}
      <span className="font-medium text-subtle-foreground">{count}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      {hint ? (
        <span className="font-normal text-subtle-foreground">{hint}</span>
      ) : null}
    </div>
  );
}

// A small colored letter per repo, so many repos stay easy to tell apart.
function RepoLetter({ name }: { name: string }) {
  const hue =
    ([...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) * 47) % 360;
  return (
    <span
      aria-hidden
      className="inline-grid size-[15px] shrink-0 place-items-center rounded-[4px] text-[9px] font-semibold"
      style={{
        backgroundColor: `oklch(42% 0.09 ${hue})`,
        color: `oklch(92% 0.05 ${hue})`,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function shortPath(path: string | null): string {
  return path?.replace(/^\/(?:Users|home)\/[^/]+/u, "~") ?? "";
}

function TemplateRepoPicker({
  template,
  projects,
  activeIds,
  onAdd,
}: {
  template: LoopTemplate;
  projects: readonly TemplateProject[] | null;
  activeIds: ReadonlySet<string>;
  onAdd: LoopTemplatesState["onAdd"];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, setPending] = useState(false);
  const on = activeIds.size > 0;
  const choosable = (projects ?? []).filter((p) => !activeIds.has(p.id));
  const needle = query.trim().toLowerCase();
  const visible = (projects ?? []).filter(
    (p) => needle === "" || p.name.toLowerCase().includes(needle),
  );
  const toggle = (id: string, checked: boolean) =>
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  const submit = () => {
    setPending(true);
    void onAdd(template, [...selected]).finally(() => {
      setPending(false);
      setSelected(new Set());
      setOpen(false);
    });
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={`Add ${template.name} to repos`}
          className={cn(
            "h-7 gap-1 px-2 text-xs",
            on && "border-primary/40 text-primary hover:text-primary",
          )}
        >
          <Icon name={on ? "Check" : "Plus"} className="size-3.5" aria-hidden />
          {on ? "On" : "Add"}
          <Icon name="ChevronDown" className="size-3" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-1.5">
        <p className="px-2 pb-2 pt-1 text-xs leading-snug text-muted-foreground">
          {template.description}
        </p>
        <div className="relative px-0.5">
          <Icon
            name="Search"
            className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${projects?.length ?? 0} repos`}
            aria-label="Search repos"
            className="h-8 border-0 bg-muted/50 pl-8 text-sm"
          />
        </div>
        <div className="flex items-center px-2 pb-1 pt-2 text-2xs font-medium text-subtle-foreground">
          {projects === null ? "Loading repos…" : `${projects.length} repos`}
          {choosable.length > 0 ? (
            <button
              type="button"
              className="ml-auto cursor-pointer text-primary hover:underline"
              onClick={() => setSelected(new Set(choosable.map((p) => p.id)))}
            >
              Select all
            </button>
          ) : null}
        </div>
        <div className="max-h-64 overflow-y-auto">
          {visible.map((project) => {
            const active = activeIds.has(project.id);
            const checked = active || selected.has(project.id);
            return (
              <label
                key={project.id}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm",
                  active ? "cursor-default" : "hover:bg-state-hover",
                  checked && !active && "bg-primary/7",
                )}
              >
                <Checkbox
                  checked={checked}
                  disabled={active || pending}
                  onCheckedChange={(value) =>
                    toggle(project.id, value === true)
                  }
                />
                <span className="min-w-0 truncate">{project.name}</span>
                <span
                  className={cn(
                    "ml-auto shrink-0 truncate pl-2 text-2xs",
                    active
                      ? "text-success"
                      : "font-mono text-subtle-foreground",
                  )}
                >
                  {active ? "running" : shortPath(project.path)}
                </span>
              </label>
            );
          })}
          {projects !== null && visible.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No repos match.
            </p>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2 border-t border-foreground/10 px-1 pt-2">
          <span className="pl-1 text-xs text-subtle-foreground">
            {selected.size} selected
          </span>
          <Button
            type="button"
            size="sm"
            className="ml-auto h-7 px-3 text-xs"
            disabled={selected.size === 0 || pending}
            onClick={submit}
          >
            {pending
              ? "Adding…"
              : `Add to ${selected.size} repo${selected.size === 1 ? "" : "s"}`}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TemplateCard({
  template,
  repos,
  activeIds,
  projects,
  renderAgent,
  onAdd,
}: {
  template: LoopTemplate;
  repos: readonly string[];
  activeIds: ReadonlySet<string>;
  projects: readonly TemplateProject[] | null;
  renderAgent: (agent: AutomationAgentSummary) => ReactNode;
  onAdd: LoopTemplatesState["onAdd"];
}) {
  const on = repos.length > 0;
  return (
    <div
      title={template.description}
      className="grid min-w-0 grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-3 rounded-lg border border-border bg-surface-raised px-3 py-3"
    >
      <span className="flex size-6 items-center justify-center">
        <Icon
          name={template.icon}
          className={cn(
            "size-4",
            on ? "text-primary" : "text-muted-foreground/70",
          )}
          aria-hidden
        />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">
          {template.name}
        </span>
        <span className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground/80">
          {renderAgent({
            providerId: template.providerId,
            model: template.model,
            reasoningLevel: template.reasoningLevel,
          })}
        </span>
        <span className="mt-1 block truncate text-xs text-muted-foreground/80">
          {formatAutomationTrigger({
            triggerType: "schedule",
            cron: template.cron,
            timezone: "UTC",
          })}
        </span>
        {on ? (
          <span className="mt-2 flex flex-wrap gap-1">
            {repos.slice(0, 3).map((name) => (
              <span
                key={name}
                className="inline-flex h-5 items-center gap-1 rounded-[5px] bg-foreground/7 pl-0.5 pr-1.5 text-[11.5px] text-foreground"
              >
                <RepoLetter name={name} />
                {name}
              </span>
            ))}
            {repos.length > 3 ? (
              <span className="inline-flex h-5 items-center rounded-[5px] bg-foreground/7 px-1.5 text-[11.5px] text-subtle-foreground">
                +{repos.length - 3} more
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
      <span className="self-center">
        <TemplateRepoPicker
          template={template}
          projects={projects}
          activeIds={activeIds}
          onAdd={onAdd}
        />
      </span>
    </div>
  );
}

export function LoopTemplatesView({
  entries,
  templates,
  renderAgent,
}: {
  entries: readonly OverviewEntry[] | null;
  templates: LoopTemplatesState;
  renderAgent: (agent: AutomationAgentSummary) => ReactNode;
}) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all");
  // Where each template runs: loops that kept its name, per project.
  const running = useMemo(() => {
    const byName = new Map<string, Map<string, string>>();
    for (const { automation, project } of entries ?? []) {
      const projects = byName.get(automation.name) ?? new Map<string, string>();
      projects.set(project.id, project.name);
      byName.set(automation.name, projects);
    }
    return byName;
  }, [entries]);
  const shown = LOOP_TEMPLATES.filter(
    (t) => category === "all" || t.category === category,
  );

  return (
    <div className="grid grid-cols-[10rem_minmax(0,1fr)] items-start gap-7">
      <nav
        aria-label="Template categories"
        className="sticky top-0 flex flex-col gap-0.5"
      >
        <div className="px-2.5 pb-1.5 text-2xs font-medium text-subtle-foreground">
          Categories
        </div>
        {[
          { id: "all" as const, label: "All", icon: "GridView" },
          ...TEMPLATE_CATEGORIES,
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
            className={cn(
              "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-state-hover hover:text-foreground",
              category === item.id && "bg-state-hover text-foreground",
            )}
          >
            <Icon
              name={item.icon}
              className={cn("size-3.5", category === item.id && "text-primary")}
              aria-hidden
            />
            {item.label}
            <span className="ml-auto text-2xs text-subtle-foreground">
              {item.id === "all"
                ? LOOP_TEMPLATES.length
                : LOOP_TEMPLATES.filter((t) => t.category === item.id).length}
            </span>
          </button>
        ))}
      </nav>
      <div className="-mt-6 min-w-0">
        {TEMPLATE_PRIORITIES.map((priority) => {
          const group = shown.filter((t) => t.priority === priority.level);
          if (group.length === 0) return null;
          return (
            <section key={priority.level} aria-label={priority.label}>
              <LoopGroupDivider
                label={`P${priority.level}`}
                title={priority.label}
                count={group.length}
                hint={priority.hint}
                className={LOOP_PRIORITY_STYLE[priority.level].text}
              />
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {group.map((template) => {
                  const active =
                    running.get(template.name) ?? new Map<string, string>();
                  return (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      repos={[...active.values()]}
                      activeIds={new Set(active.keys())}
                      projects={templates.projects}
                      renderAgent={renderAgent}
                      onAdd={templates.onAdd}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
