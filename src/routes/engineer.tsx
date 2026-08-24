import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Check,
  CircleAlert,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { useLabData } from "@/lib/useLabData";
import { useAllSteps, useStepMutations, type ProjectStep } from "@/lib/queries";
import { fmt, iso, type Employee, type Project } from "@/lib/lab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/engineer")({
  head: () => ({
    meta: [
      { title: "My Projects — Lab Planner" },
      {
        name: "description",
        content:
          "Engineer view: projects you lead, project steps, and reminders for critical steps.",
      },
      { property: "og:title", content: "My Projects — Lab Planner" },
      {
        property: "og:description",
        content: "Project steps and critical-step reminders per engineer.",
      },
    ],
  }),
  component: EngineerPage,
});

const REMINDER_OPTIONS = [0, 1, 2, 3, 5, 7];

function reminderState(step: ProjectStep, todayIso: string) {
  if (step.done || !step.reminder_enabled || !step.planned_start) return null;
  const lead = step.reminder_days_before;
  const start = step.planned_start;
  const trigger = new Date(start);
  trigger.setDate(trigger.getDate() - lead);
  const triggerIso = iso(trigger);
  if (todayIso >= start) return "overdue";
  if (todayIso >= triggerIso) return "due";
  return null;
}

function EngineerPage() {
  const data = useLabData();
  const steps = useAllSteps();
  const mut = useStepMutations();
  const [engineerId, setEngineerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ProjectStep> | null>(null);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);

  const engineer: Employee | null =
    data.employees.find((e) => e.id === engineerId) ?? data.employees[0] ?? null;

  const myProjects = useMemo(
    () =>
      data.projects.filter(
        (p) => p.responsible_id === engineer?.id && p.status !== "finished",
      ),
    [data.projects, engineer],
  );

  const stepsByProject = useMemo(() => {
    const map = new Map<string, ProjectStep[]>();
    for (const s of steps.data ?? []) {
      const list = map.get(s.project_id) ?? [];
      list.push(s);
      map.set(s.project_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sequence - b.sequence);
    return map;
  }, [steps.data]);

  const todayIso = iso(new Date());

  const reminders = useMemo(() => {
    const mine = new Set(myProjects.map((p) => p.id));
    return (steps.data ?? [])
      .filter((s) => mine.has(s.project_id))
      .map((s) => ({ step: s, state: reminderState(s, todayIso) }))
      .filter((r) => r.state)
      .sort((a, b) => (a.step.planned_start ?? "").localeCompare(b.step.planned_start ?? ""));
  }, [steps.data, myProjects, todayIso]);

  const startDraft = (project: Project) => {
    const existing = stepsByProject.get(project.id) ?? [];
    setDraftProjectId(project.id);
    setDraft({
      title: "",
      sequence: existing.length + 1,
      planned_start: project.start_date,
      due_date: null,
      critical: false,
      reminder_enabled: true,
      reminder_days_before: 2,
    });
  };

  const saveDraft = () => {
    if (!draft?.title?.trim() || !draftProjectId) return;
    mut.create.mutate({ ...draft, title: draft.title.trim(), project_id: draftProjectId });
    setDraft(null);
    setDraftProjectId(null);
  };

  return (
    <AppShell
      actions={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserRound className="size-4" />
          <select
            className="h-8 rounded-md border bg-card px-2 text-xs text-foreground"
            value={engineer?.id ?? ""}
            onChange={(e) => setEngineerId(e.target.value)}
          >
            {data.employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.full_name} ({e.initials})
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {engineer ? `${engineer.full_name} — my projects` : "My projects"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Projects you lead, their steps, and reminders for critical steps.{" "}
            {engineer?.email ? (
              <span>
                Reminder address on file: <span className="font-mono">{engineer.email}</span>{" "}
                (in-app alerts only for now).
              </span>
            ) : null}
          </p>
        </div>

        {reminders.length > 0 && (
          <section className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning-foreground">
              <Bell className="size-3.5" /> Reminders due
            </h2>
            <ul className="space-y-1.5">
              {reminders.map(({ step, state }) => {
                const project = myProjects.find((p) => p.id === step.project_id);
                return (
                  <li
                    key={step.id}
                    className="flex items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs"
                  >
                    <CircleAlert
                      className={cn(
                        "size-3.5 shrink-0",
                        state === "overdue" ? "text-destructive" : "text-warning",
                      )}
                    />
                    <span className="font-medium">{step.title}</span>
                    <span className="text-muted-foreground">
                      {project?.title} · starts {fmt(step.planned_start)}
                      {state === "overdue" ? " — start date reached" : ""}
                    </span>
                    <button
                      className="ml-auto rounded border px-2 py-0.5 text-[10px] hover:bg-surface-2"
                      onClick={() =>
                        mut.update.mutate({
                          id: step.id,
                          patch: { reminder_sent_at: new Date().toISOString() },
                        })
                      }
                    >
                      Acknowledge
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {myProjects.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            No active projects assigned to {engineer?.full_name ?? "this engineer"}.
          </p>
        )}

        {myProjects.map((p) => {
          const machine = data.machines.find((m) => m.id === p.machine_id);
          const list = stepsByProject.get(p.id) ?? [];
          return (
            <section key={p.id} className="rounded-lg border bg-card">
              <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {p.project_code ?? `#${p.nr ?? "—"}`}
                </span>
                <h2 className="text-sm font-semibold">{p.title}</h2>
                <StatusBadge status={p.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {machine ? machine.code : "Unscheduled"} · {fmt(p.start_date)} →{" "}
                  {fmt(p.end_date)}
                </span>
                <button
                  className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
                  onClick={() => startDraft(p)}
                >
                  <Plus className="size-3" /> Step
                </button>
              </header>

              <ul className="divide-y">
                {list.map((s) => {
                  const state = reminderState(s, todayIso);
                  return (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                      <button
                        aria-label={s.done ? "Mark not done" : "Mark done"}
                        className={cn(
                          "flex size-4.5 shrink-0 items-center justify-center rounded border",
                          s.done && "border-primary bg-primary text-primary-foreground",
                        )}
                        onClick={() =>
                          mut.update.mutate({
                            id: s.id,
                            patch: {
                              done: !s.done,
                              done_at: !s.done ? new Date().toISOString() : null,
                            },
                          })
                        }
                      >
                        {s.done && <Check className="size-3" />}
                      </button>
                      <span
                        className={cn(
                          "font-medium",
                          s.done && "text-muted-foreground line-through",
                        )}
                      >
                        {s.title}
                      </span>
                      {s.critical && (
                        <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                          CRITICAL
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        start {fmt(s.planned_start) ?? "—"} · due {fmt(s.due_date) ?? "—"}
                      </span>
                      <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
                        {s.reminder_enabled ? (
                          <span
                            className={cn(
                              "flex items-center gap-1",
                              state === "due" && "text-warning",
                              state === "overdue" && "text-destructive",
                            )}
                            title={`Remind ${s.reminder_days_before}d before start`}
                          >
                            <Bell className="size-3" />
                            {s.reminder_days_before}d
                          </span>
                        ) : (
                          <BellOff className="size-3" />
                        )}
                        <button
                          aria-label="Delete step"
                          className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => mut.remove.mutate(s.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </span>
                    </li>
                  );
                })}
                {list.length === 0 && draftProjectId !== p.id && (
                  <li className="px-3 py-3 text-xs text-muted-foreground">
                    No steps defined yet.
                  </li>
                )}

                {draftProjectId === p.id && draft && (
                  <li className="space-y-2 bg-surface-2/60 px-3 py-2.5">
                    <input
                      autoFocus
                      className="h-8 w-full rounded-md border bg-card px-2 text-xs"
                      placeholder="Step title, e.g. Prepare specimens"
                      value={draft.title ?? ""}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1">
                        Start
                        <input
                          type="date"
                          className="h-7 rounded border bg-card px-1.5"
                          value={draft.planned_start ?? ""}
                          onChange={(e) =>
                            setDraft({ ...draft, planned_start: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        Due
                        <input
                          type="date"
                          className="h-7 rounded border bg-card px-1.5"
                          value={draft.due_date ?? ""}
                          onChange={(e) =>
                            setDraft({ ...draft, due_date: e.target.value || null })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={draft.critical ?? false}
                          onChange={(e) => setDraft({ ...draft, critical: e.target.checked })}
                        />
                        Critical
                      </label>
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={draft.reminder_enabled ?? true}
                          onChange={(e) =>
                            setDraft({ ...draft, reminder_enabled: e.target.checked })
                          }
                        />
                        Remind
                        <select
                          className="h-7 rounded border bg-card px-1"
                          value={draft.reminder_days_before ?? 2}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              reminder_days_before: Number(e.target.value),
                            })
                          }
                        >
                          {REMINDER_OPTIONS.map((d) => (
                            <option key={d} value={d}>
                              {d}d before
                            </option>
                          ))}
                        </select>
                      </label>
                      <span className="ml-auto flex gap-1.5">
                        <button
                          className="rounded-md border px-2.5 py-1"
                          onClick={() => {
                            setDraft(null);
                            setDraftProjectId(null);
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground disabled:opacity-50"
                          disabled={!draft.title?.trim()}
                          onClick={saveDraft}
                        >
                          Add step
                        </button>
                      </span>
                    </div>
                  </li>
                )}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
