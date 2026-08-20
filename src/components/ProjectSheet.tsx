import { useEffect, useMemo, useState } from "react";
import { parseISO } from "date-fns";
import { CalendarClock, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  PRIORITIES,
  STATUS_META,
  STATUS_ORDER,
  endForWorkingDays,
  fmt,
  iso,
  suggestSlots,
  workingDays,
  type Priority,
  type Project,
  type ProjectStatus,
} from "@/lib/lab";
import type { LabData } from "@/lib/useLabData";
import { useCreateProject, useDeleteProject, useUpdateProject } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ProjectDraft = Partial<Project>;

const NONE = "__none__";

export function ProjectSheet({
  draft,
  data,
  onClose,
}: {
  draft: ProjectDraft | null;
  data: LabData;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProjectDraft>({});
  const update = useUpdateProject();
  const create = useCreateProject();
  const remove = useDeleteProject();

  useEffect(() => {
    if (draft) setForm({ planned_days: 1, status: "in_preparation", priority: "normal", ...draft });
  }, [draft]);

  const isNew = !form.id;
  const set = (patch: ProjectDraft) => setForm((f) => ({ ...f, ...patch }));

  const suggestions = useMemo(() => {
    if (!draft) return [];
    return suggestSlots(
      { ...(form as Project), planned_days: form.planned_days || 1 },
      data.machines,
      data.projects,
      data.holidaySet,
    );
  }, [draft, form, data]);

  const applyDays = (days: number) => {
    if (form.start_date) {
      const end = endForWorkingDays(parseISO(form.start_date), days, data.holidaySet);
      set({ planned_days: days, end_date: iso(end) });
    } else set({ planned_days: days });
  };

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("Title is required.");
      return;
    }
    const payload: ProjectDraft = {
      ...form,
      planned_days:
        form.start_date && form.end_date
          ? workingDays(form.start_date, form.end_date, data.holidaySet)
          : (form.planned_days ?? 1),
    };
    delete (payload as Record<string, unknown>)["id"];
    if (isNew) {
      await create.mutateAsync(payload);
      toast.success("Project created.");
    } else {
      await update.mutateAsync({ id: form.id!, patch: payload });
      toast.success("Project saved.");
    }
    onClose();
  };

  return (
    <Sheet open={Boolean(draft)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <SheetTitle className="pr-6 text-base">
            {isNew ? "New project" : form.title}
          </SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            {form.status && <StatusBadge status={form.status} />}
            <span className="text-xs">
              {data.machineCode(form.machine_id ?? null)} · {fmt(form.start_date ?? null)} →{" "}
              {fmt(form.end_date ?? null)}
            </span>
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4 px-4 pb-6">
          <Field label="Title">
            <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Opportunity">
              <Input
                value={form.opportunity_code ?? ""}
                onChange={(e) => set({ opportunity_code: e.target.value })}
              />
            </Field>
            <Field label="Project code">
              <Input
                value={form.project_code ?? ""}
                onChange={(e) => set({ project_code: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Customer">
              <Select
                value={form.customer_id ?? NONE}
                onValueChange={(v) => set({ customer_id: v === NONE ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {data.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Responsible">
              <Select
                value={form.responsible_id ?? NONE}
                onValueChange={(v) => set({ responsible_id: v === NONE ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {data.employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.initials} · {e.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <Select
                value={form.status ?? "in_preparation"}
                onValueChange={(v) => set({ status: v as ProjectStatus })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Priority">
              <Select
                value={form.priority ?? "normal"}
                onValueChange={(v) => set({ priority: v as Priority })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Machine">
              <Select
                value={form.machine_id ?? NONE}
                onValueChange={(v) => set({ machine_id: v === NONE ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {data.machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.code} · {m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Preferred machine">
              <Select
                value={form.preferred_machine_id ?? NONE}
                onValueChange={(v) => set({ preferred_machine_id: v === NONE ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {data.machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Start">
              <Input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set({ start_date: e.target.value || null })}
              />
            </Field>
            <Field label="End">
              <Input
                type="date"
                value={form.end_date ?? ""}
                onChange={(e) => set({ end_date: e.target.value || null })}
              />
            </Field>
            <Field label="Working days">
              <Input
                type="number"
                min={1}
                value={form.planned_days ?? 1}
                onChange={(e) => applyDays(Math.max(1, Number(e.target.value) || 1))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Deadline">
              <Input
                type="date"
                value={form.deadline ?? ""}
                onChange={(e) => set({ deadline: e.target.value || null })}
              />
            </Field>
            <Field label="Price (€)">
              <Input
                type="number"
                value={form.price ?? ""}
                onChange={(e) =>
                  set({ price: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes ?? ""}
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>

          <div className="rounded-md border bg-surface p-3">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
              <Wand2 className="size-3.5" /> Suggested free slots
            </div>
            <div className="grid gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s.machineId + s.start}
                  onClick={() =>
                    set({ machine_id: s.machineId, start_date: s.start, end_date: s.end })
                  }
                  className="flex items-center justify-between rounded border bg-card px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <span className="font-medium">{data.machineCode(s.machineId)}</span>
                  <span className="tabular text-muted-foreground">
                    {fmt(s.start, "dd MMM")} → {fmt(s.end, "dd MMM")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button onClick={save} disabled={update.isPending || create.isPending}>
              {isNew ? "Create project" : "Save changes"}
            </Button>
            {!isNew && (
              <>
                <Button
                  variant="outline"
                  onClick={() => set({ machine_id: null, start_date: null, end_date: null })}
                >
                  <CalendarClock className="size-4" /> Unschedule
                </Button>
                <Button
                  variant="ghost"
                  className="ml-auto text-destructive hover:text-destructive"
                  onClick={async () => {
                    await remove.mutateAsync(form.id!);
                    toast.success("Project deleted.");
                    onClose();
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
