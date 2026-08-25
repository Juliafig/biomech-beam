import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Plus, Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProjectSheet, type ProjectDraft } from "@/components/ProjectSheet";
import { PriorityBadge, StatusBadge } from "@/components/StatusBadge";
import { useLabData } from "@/lib/useLabData";
import { STATUS_META, STATUS_ORDER, fmt, type ProjectStatus } from "@/lib/lab";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Project List — Lab Planner" },
      {
        name: "description",
        content:
          "Searchable, filterable list of all biomechanical testing projects with status, machine, dates and responsible engineer.",
      },
      { property: "og:title", content: "Project List — Lab Planner" },
      {
        property: "og:description",
        content: "Search and filter every testing project in the laboratory.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProjectsPage,
});

const ALL = "all";

function ProjectsPage() {
  const data = useLabData();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [machine, setMachine] = useState<string>(ALL);
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.projects.filter((p) => {
      if (status !== ALL && p.status !== status) return false;
      if (machine !== ALL && p.machine_id !== machine) return false;
      if (!needle) return true;
      return [
        p.title,
        p.project_code,
        p.opportunity_code,
        p.quote,
        data.customerName(p.customer_id),
        data.employeeInitials(p.responsible_id),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [data, q, status, machine]);

  return (
    <AppShell
      actions={
        <Button size="sm" onClick={() => setDraft({ title: "" })}>
          <Plus className="size-4" /> Project
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, code, customer…"
              className="pl-8"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={machine} onValueChange={setMachine}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All machines</SelectItem>
              {data.machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{rows.length} projects</span>
        </div>

        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-surface text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                {["Nr", "Project", "Customer", "Status", "Machine", "Start", "End", "Days", "Resp.", "Prio"].map(
                  (h) => (
                    <th key={h} className="border-b px-3 py-2 text-left font-semibold">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setDraft(p)}
                  className={cn(
                    "cursor-pointer border-b transition-colors hover:bg-accent/60",
                    data.conflicts.has(p.id) && "bg-destructive/5",
                  )}
                >
                  <td className="tabular px-3 py-2 text-xs text-muted-foreground">{p.nr ?? "—"}</td>
                  <td className="max-w-72 px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      {data.conflicts.has(p.id) && (
                        <AlertTriangle className="size-3.5 shrink-0 text-destructive" />
                      )}
                      <span className="truncate font-medium">{p.title}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {p.project_code ?? p.opportunity_code ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{data.customerName(p.customer_id)}</td>
                  <td className="px-3 py-2"><StatusBadge status={p.status as ProjectStatus} short /></td>
                  <td className="px-3 py-2 text-xs font-medium">{data.machineCode(p.machine_id)}</td>
                  <td className="tabular px-3 py-2 text-xs">{fmt(p.start_date, "dd MMM")}</td>
                  <td className="tabular px-3 py-2 text-xs">{fmt(p.end_date, "dd MMM")}</td>
                  <td className="tabular px-3 py-2 text-xs">{p.planned_days}</td>
                  <td className="px-3 py-2 text-xs">{data.employeeInitials(p.responsible_id)}</td>
                  <td className="px-3 py-2"><PriorityBadge priority={p.priority} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-10 text-center text-sm text-muted-foreground">
                    No projects match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProjectSheet draft={draft} data={data} onClose={() => setDraft(null)} />
    </AppShell>
  );
}
