import { useMemo, useState, type DragEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  CircleAlert,
  CircleDot,
  CircleDashed,
  CircleCheck,
  GripVertical,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { useLabData } from "@/lib/useLabData";
import {
  useAllSteps,
  useStepMutations,
  type ProjectStep,
  type ProjectStepStatus,
} from "@/lib/queries";
import { fmt, iso, type Employee, type Project } from "@/lib/lab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/engineer")({
  head: () => ({
    meta: [
      { title: "My Projects — Lab Planner" },
      {
        name: "description",
        content: "Engineer view: projects you lead, project steps, and reminders for critical steps.",
      },
      { property: "og:title", content: "My Projects — Lab Planner" },
      { property: "og:description", content: "Project steps and critical-step reminders per engineer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EngineerPage,
});

const REMINDER_OPTIONS = [0, 1, 2, 3, 5, 7];

const STEP_COLUMNS: Array<{
  status: ProjectStepStatus;
  label: string;
  icon: typeof CircleDashed;
  tone: string;
  dot: string;
}> = [
  { status: "todo", label: "To do", icon: CircleDashed, tone: "bg-surface", dot: "text-muted-foreground" },
  { status: "in_progress", label: "In progress", icon: CircleDot, tone: "bg-ready-soft/60", dot: "text-ready" },
  { status: "completed", label: "Completed", icon: CircleCheck, tone: "bg-running-soft/50", dot: "text-running" },
];

function reminderState(step: ProjectStep, todayIso: string) {
  if (step.status === "completed" || !step.reminder_enabled || !step.planned_start) return null;
  const trigger = new Date(step.planned_start);
  trigger.setDate(trigger.getDate() - step.reminder_days_before);
  if (todayIso >= step.planned_start) return "overdue";
  if (todayIso >= iso(trigger)) return "due";
  return null;
}

function EngineerPage() {
  const data = useLabData();
  const steps = useAllSteps();
  const mut = useStepMutations();
  const [engineerId, setEngineerId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<ProjectStep> | null>(null);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const engineer: Employee | null =
    data.employees.find((employee) => employee.id === engineerId) ?? data.employees[0] ?? null;

  const myProjects = useMemo(
    () => data.projects.filter((project) => project.responsible_id === engineer?.id && project.status !== "finished"),
    [data.projects, engineer],
  );

  const stepsByProject = useMemo(() => {
    const map = new Map<string, ProjectStep[]>();
    for (const step of steps.data ?? []) {
      const list = map.get(step.project_id) ?? [];
      list.push(step);
      map.set(step.project_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sequence - b.sequence);
    return map;
  }, [steps.data]);

  const todayIso = iso(new Date());

  const reminders = useMemo(() => {
    const mine = new Set(myProjects.map((project) => project.id));
    return (steps.data ?? [])
      .filter((step) => mine.has(step.project_id))
      .map((step) => ({ step, state: reminderState(step, todayIso) }))
      .filter((item) => item.state)
      .sort((a, b) => (a.step.planned_start ?? "").localeCompare(b.step.planned_start ?? ""));
  }, [steps.data, myProjects, todayIso]);

  const startDraft = (project: Project) => {
    const existing = stepsByProject.get(project.id) ?? [];
    setDraftProjectId(project.id);
    setDraft({
      title: "",
      sequence: existing.length + 1,
      status: "todo",
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

  const changeStatus = (step: ProjectStep, status: ProjectStepStatus) => {
    if (step.status === status) return;
    mut.update.mutate({ id: step.id, patch: { status } });
  };

  const dropStep = (event: DragEvent<HTMLDivElement>, projectId: string, status: ProjectStepStatus) => {
    event.preventDefault();
    const stepId = event.dataTransfer.getData("text/project-step") || draggedStepId;
    const step = (stepsByProject.get(projectId) ?? []).find((item) => item.id === stepId);
    if (step) changeStatus(step, status);
    setDraggedStepId(null);
    setDropTarget(null);
  };

  return (
    <AppShell
      actions={
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserRound className="size-4" />
          <select
            className="h-8 rounded-md border bg-card px-2 text-xs text-foreground"
            value={engineer?.id ?? ""}
            onChange={(event) => setEngineerId(event.target.value)}
          >
            {data.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name} ({employee.initials})
              </option>
            ))}
          </select>
        </label>
      }
    >
      <div className="mx-auto max-w-6xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold">
            {engineer ? `${engineer.full_name} — my projects` : "My projects"}
          </h1>
          <p className="text-xs text-muted-foreground">
            Projects you lead, their steps, and reminders for critical steps.{" "}
            {engineer?.email ? (
              <span>
                Reminder address: <span className="font-mono">{engineer.email}</span> (in-app alerts only for now).
              </span>
            ) : null}
          </p>
        </div>

        {reminders.length > 0 && (
          <section className="rounded-lg border border-warning/40 bg-warning/10 p-3">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-warning-foreground">
              <Bell className="size-3.5" /> Reminders due
            </h2>
            <ul className="space-y-1.5">
              {reminders.map(({ step, state }) => {
                const project = myProjects.find((item) => item.id === step.project_id);
                return (
                  <li key={step.id} className="flex flex-wrap items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs">
                    <CircleAlert className={cn("size-3.5 shrink-0", state === "overdue" ? "text-destructive" : "text-warning")} />
                    <span className="font-medium">{step.title}</span>
                    <span className="text-muted-foreground">
                      {project?.title} · starts {fmt(step.planned_start)}{state === "overdue" ? " — start date reached" : ""}
                    </span>
                    <Button
                      className="ml-auto h-6 px-2 text-[10px]"
                      size="sm"
                      variant="outline"
                      onClick={() => mut.update.mutate({ id: step.id, patch: { reminder_sent_at: new Date().toISOString() } })}
                    >
                      Acknowledge
                    </Button>
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

        {myProjects.map((project) => {
          const machine = data.machines.find((item) => item.id === project.machine_id);
          const list = stepsByProject.get(project.id) ?? [];
          return (
            <section key={project.id} className="overflow-hidden rounded-lg border bg-card">
              <header className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {project.project_code ?? `#${project.nr ?? "—"}`}
                </span>
                <h2 className="text-sm font-semibold">{project.title}</h2>
                <StatusBadge status={project.status} />
                <span className="ml-auto text-xs text-muted-foreground">
                  {machine ? machine.code : "Unscheduled"} · {fmt(project.start_date)} → {fmt(project.end_date)}
                </span>
                <Button className="h-7 px-2 text-[11px]" size="sm" onClick={() => startDraft(project)}>
                  <Plus className="size-3" /> Step
                </Button>
              </header>

              <div className="grid gap-px bg-border md:grid-cols-3">
                {STEP_COLUMNS.map((column) => {
                  const ColumnIcon = column.icon;
                  const columnSteps = list.filter((step) => step.status === column.status);
                  const targetId = `${project.id}:${column.status}`;
                  return (
                    <div
                      key={column.status}
                      className={cn("min-h-40 p-2.5 transition-colors", column.tone, dropTarget === targetId && "ring-2 ring-inset ring-primary")}
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDropTarget(targetId);
                      }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => dropStep(event, project.id, column.status)}
                    >
                      <div className="mb-2 flex items-center gap-1.5">
                        <ColumnIcon className={cn("size-3.5", column.dot)} />
                        <h3 className="text-[11px] font-semibold uppercase">{column.label}</h3>
                        <span className="ml-auto rounded bg-card/80 px-1.5 font-mono text-[10px] text-muted-foreground">
                          {columnSteps.length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {columnSteps.map((step) => {
                          const reminder = reminderState(step, todayIso);
                          return (
                            <article
                              key={step.id}
                              draggable
                              className={cn(
                                "group cursor-grab rounded-md border bg-card p-2.5 shadow-sm transition-opacity active:cursor-grabbing",
                                draggedStepId === step.id && "opacity-40",
                              )}
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = "move";
                                event.dataTransfer.setData("text/project-step", step.id);
                                setDraggedStepId(step.id);
                              }}
                              onDragEnd={() => {
                                setDraggedStepId(null);
                                setDropTarget(null);
                              }}
                            >
                              <div className="flex items-start gap-1.5">
                                <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className={cn("text-xs font-semibold", step.status === "completed" && "text-muted-foreground line-through")}>
                                      {step.title}
                                    </h4>
                                    {step.critical && (
                                      <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[9px] font-semibold text-destructive">CRITICAL</span>
                                    )}
                                  </div>
                                  <p className="mt-1 text-[10px] text-muted-foreground">
                                    Start {fmt(step.planned_start) ?? "—"} · Due {fmt(step.due_date) ?? "—"}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-1.5 border-t pt-2">
                                {step.reminder_enabled ? (
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 text-[10px] text-muted-foreground",
                                      reminder === "due" && "text-warning",
                                      reminder === "overdue" && "text-destructive",
                                    )}
                                    title={`Remind ${step.reminder_days_before}d before start`}
                                  >
                                    <Bell className="size-3" /> {step.reminder_days_before}d
                                  </span>
                                ) : (
                                  <BellOff className="size-3 text-muted-foreground" />
                                )}
                                <label className="ml-auto">
                                  <span className="sr-only">Status for {step.title}</span>
                                  <select
                                    className="h-6 max-w-28 rounded border bg-card px-1 text-[10px] text-foreground"
                                    value={step.status}
                                    onChange={(event) => changeStatus(step, event.target.value as ProjectStepStatus)}
                                    onPointerDown={(event) => event.stopPropagation()}
                                  >
                                    {STEP_COLUMNS.map((option) => (
                                      <option key={option.status} value={option.status}>{option.label}</option>
                                    ))}
                                  </select>
                                </label>
                                <Button
                                  aria-label={`Delete ${step.title}`}
                                  className="size-6 p-0"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => mut.remove.mutate(step.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                            </article>
                          );
                        })}
                        {columnSteps.length === 0 && (
                          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed bg-card/40 px-3 text-center text-[10px] text-muted-foreground">
                            Drop a step here
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {draftProjectId === project.id && draft && (
                <div className="space-y-2 border-t bg-surface-2/60 px-3 py-2.5">
                  <input
                    autoFocus
                    className="h-8 w-full rounded-md border bg-card px-2 text-xs"
                    placeholder="Step title, e.g. Prepare specimens"
                    value={draft.title ?? ""}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                  />
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <label className="flex items-center gap-1">
                      Start
                      <input
                        type="date"
                        className="h-7 rounded border bg-card px-1.5"
                        value={draft.planned_start ?? ""}
                        onChange={(event) => setDraft({ ...draft, planned_start: event.target.value || null })}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      Due
                      <input
                        type="date"
                        className="h-7 rounded border bg-card px-1.5"
                        value={draft.due_date ?? ""}
                        onChange={(event) => setDraft({ ...draft, due_date: event.target.value || null })}
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={draft.critical ?? false} onChange={(event) => setDraft({ ...draft, critical: event.target.checked })} />
                      Critical
                    </label>
                    <label className="flex items-center gap-1">
                      <input type="checkbox" checked={draft.reminder_enabled ?? true} onChange={(event) => setDraft({ ...draft, reminder_enabled: event.target.checked })} />
                      Remind
                      <select
                        className="h-7 rounded border bg-card px-1"
                        value={draft.reminder_days_before ?? 2}
                        onChange={(event) => setDraft({ ...draft, reminder_days_before: Number(event.target.value) })}
                      >
                        {REMINDER_OPTIONS.map((days) => <option key={days} value={days}>{days}d before</option>)}
                      </select>
                    </label>
                    <span className="ml-auto flex gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDraft(null);
                          setDraftProjectId(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button size="sm" disabled={!draft.title?.trim()} onClick={saveDraft}>Add step</Button>
                    </span>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}