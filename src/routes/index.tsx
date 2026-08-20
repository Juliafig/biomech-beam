import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Timeline } from "@/components/Timeline";
import { ProjectSheet, type ProjectDraft } from "@/components/ProjectSheet";
import { StatusBadge } from "@/components/StatusBadge";
import { useLabData } from "@/lib/useLabData";
import { ZOOMS, endForWorkingDays, iso, type Zoom, type Project } from "@/lib/lab";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planning Board — Lab Planner" },
      {
        name: "description",
        content:
          "Drag-and-drop Gantt scheduling for biomechanical testing machines, with conflict detection and free-slot suggestions.",
      },
      { property: "og:title", content: "Planning Board — Lab Planner" },
      {
        property: "og:description",
        content: "Plan machine occupancy for your biomechanical testing laboratory.",
      },
    ],
  }),
  component: PlanningPage,
});

function PlanningPage() {
  const data = useLabData();
  const [anchor, setAnchor] = useState(() => addDays(new Date(), -3));
  const [zoom, setZoom] = useState<Zoom>("week");
  const [draft, setDraft] = useState<ProjectDraft | null>(null);

  const unscheduled = data.projects.filter(
    (p) => p.status !== "finished" && (!p.machine_id || !p.start_date || !p.end_date),
  );

  return (
    <AppShell
      actions={
        <>
          <div className="flex items-center gap-1 rounded-md border bg-card p-0.5">
            {(Object.keys(ZOOMS) as Zoom[]).map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={cn(
                  "rounded px-2 py-1 text-xs font-medium text-muted-foreground",
                  zoom === z && "bg-secondary text-foreground",
                )}
              >
                {ZOOMS[z].label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, -7))}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(addDays(new Date(), -3))}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => setAnchor(addDays(anchor, 7))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" onClick={() => setDraft({ title: "" })}>
            <Plus className="size-4" /> Project
          </Button>
        </>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        <div className="min-w-0 space-y-2">
          <div className="flex items-baseline justify-between">
            <h1 className="text-sm font-semibold">
              Machine occupancy · {format(anchor, "MMMM yyyy")}
            </h1>
            <span className="text-xs text-muted-foreground">
              Drag blocks to reschedule · double-click a row to add
            </span>
          </div>
          <Timeline
            data={data}
            anchor={anchor}
            zoom={zoom}
            onSelect={(p) => setDraft(p)}
            onCreate={(machineId, date) =>
              setDraft({
                title: "",
                machine_id: machineId,
                start_date: date,
                end_date: iso(endForWorkingDays(new Date(date), 1, data.holidaySet)),
                planned_days: 1,
              })
            }
          />
        </div>

        <aside className="panel h-fit p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Unscheduled ({unscheduled.length})
          </div>
          <div className="space-y-1.5">
            {unscheduled.map((p: Project) => (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/project-id", p.id)}
                onClick={() => setDraft(p)}
                className="cursor-grab rounded border bg-card p-2 text-xs hover:bg-accent"
              >
                <div className="truncate font-medium">{p.title}</div>
                <div className="mt-1 flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] text-muted-foreground">
                    {data.customerName(p.customer_id)}
                  </span>
                  <StatusBadge status={p.status} short />
                </div>
              </div>
            ))}
            {unscheduled.length === 0 && (
              <p className="text-xs text-muted-foreground">Everything is scheduled.</p>
            )}
          </div>
        </aside>
      </div>

      <ProjectSheet draft={draft} data={data} onClose={() => setDraft(null)} />
    </AppShell>
  );
}
