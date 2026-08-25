import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays } from "date-fns";
import { AlertTriangle, CalendarX2, CircleSlash, Gauge } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProjectSheet, type ProjectDraft } from "@/components/ProjectSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { useLabData } from "@/lib/useLabData";
import { STATUS_META, STATUS_ORDER, fmt, iso, utilisation } from "@/lib/lab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Lab Dashboard — Lab Planner" },
      {
        name: "description",
        content:
          "Machine utilisation, project pipeline and attention-required alerts for the biomechanical testing laboratory.",
      },
      { property: "og:title", content: "Lab Dashboard — Lab Planner" },
      {
        property: "og:description",
        content: "KPIs, utilisation and scheduling alerts at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const data = useLabData();
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  const today = new Date();
  const horizonEnd = addDays(today, 29);

  const active = data.projects.filter((p) => p.status !== "finished");
  const running = data.projects.filter((p) => p.status === "currently_running");
  const unscheduled = active.filter((p) => !p.machine_id || !p.start_date || !p.end_date);
  const conflicting = active.filter((p) => data.conflicts.has(p.id));
  const deadlineRisk = active.filter(
    (p) => p.deadline && p.end_date && p.end_date > p.deadline,
  );
  const noDeadlineSoon = active.filter(
    (p) => p.deadline && !p.end_date && p.deadline <= iso(horizonEnd),
  );

  const util = useMemo(
    () =>
      data.machines.map((m) => ({
        machine: m,
        ...utilisation(m.id, data.projects, data.holidaySet, today, horizonEnd),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.machines, data.projects, data.holidaySet],
  );

  const avgUtil = util.length ? util.reduce((s, u) => s + u.pct, 0) / util.length : 0;

  const pipeline = STATUS_ORDER.map((s) => ({
    status: s,
    count: data.projects.filter((p) => p.status === s).length,
  }));

  const attention = [
    ...conflicting.map((p) => ({ p, why: "Machine double booked", icon: AlertTriangle })),
    ...deadlineRisk.map((p) => ({ p, why: `Ends after deadline ${fmt(p.deadline)}`, icon: CalendarX2 })),
    ...unscheduled.map((p) => ({ p, why: "Not scheduled yet", icon: CircleSlash })),
    ...noDeadlineSoon.map((p) => ({ p, why: `Deadline ${fmt(p.deadline)} — no plan`, icon: CalendarX2 })),
  ];

  return (
    <AppShell>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Active projects" value={active.length} hint={`${running.length} running now`} />
          <Kpi
            label="Avg. utilisation (30 d)"
            value={`${Math.round(avgUtil * 100)}%`}
            hint={`${data.machines.length} machines`}
          />
          <Kpi
            label="Conflicts"
            value={conflicting.length}
            hint="Overlapping bookings"
            tone={conflicting.length ? "bad" : "ok"}
          />
          <Kpi
            label="Unscheduled"
            value={unscheduled.length}
            hint="Awaiting a machine slot"
            tone={unscheduled.length ? "warn" : "ok"}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="panel p-4">
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <Gauge className="size-4" /> Machine utilisation · next 30 working days
            </h2>
            <div className="space-y-2.5">
              {util.map((u) => (
                <div key={u.machine.id} className="grid grid-cols-[110px_1fr_58px] items-center gap-2">
                  <div className="truncate text-xs font-medium">{u.machine.code}</div>
                  <div className="h-2.5 overflow-hidden rounded bg-surface-2">
                    <div
                      className={cn(
                        "h-full rounded transition-all",
                        u.pct > 0.9 ? "bg-destructive" : u.pct > 0.6 ? "bg-warning" : "bg-running",
                      )}
                      style={{ width: `${Math.min(100, u.pct * 100)}%` }}
                    />
                  </div>
                  <div className="tabular text-right text-xs text-muted-foreground">
                    {Math.round(u.pct * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-4">
            <h2 className="mb-3 text-sm font-semibold">Pipeline by status</h2>
            <div className="space-y-2">
              {pipeline.map((row) => (
                <div key={row.status} className="flex items-center justify-between gap-2">
                  <StatusBadge status={row.status} />
                  <span className="tabular text-sm font-semibold">{row.count}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              {STATUS_META.currently_running.label} projects occupy machines today.
            </p>
          </section>
        </div>

        <section className="panel p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <AlertTriangle className="size-4 text-warning" /> Attention required ({attention.length})
          </h2>
          <div className="grid gap-1.5 md:grid-cols-2">
            {attention.map(({ p, why, icon: Icon }, i) => (
              <button
                key={`${p.id}-${i}`}
                onClick={() => setDraft(p)}
                className="flex items-center gap-2 rounded border bg-card px-2.5 py-2 text-left text-xs hover:bg-accent"
              >
                <Icon className="size-3.5 shrink-0 text-warning" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {why} · {data.machineCode(p.machine_id)}
                  </span>
                </span>
                <StatusBadge status={p.status} short />
              </button>
            ))}
            {attention.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing needs attention. Nice.</p>
            )}
          </div>
        </section>
      </div>

      <ProjectSheet draft={draft} data={data} onClose={() => setDraft(null)} />
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone = "ok",
}: {
  label: string;
  value: string | number;
  hint: string;
  tone?: "ok" | "warn" | "bad";
}) {
  return (
    <div className="panel p-4">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "tabular mt-1 text-2xl font-semibold",
          tone === "bad" && "text-destructive",
          tone === "warn" && "text-warning",
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
