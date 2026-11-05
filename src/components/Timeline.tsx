import { memo, useCallback, useMemo, useRef, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { AlertTriangle } from "lucide-react";
import {
  ZOOMS,
  conflictsFor,
  daysBetween,
  earliestSlot,
  endForWorkingDays,
  isNonWorking,
  iso,
  timelineRange,
  workingDays,
  type Project,
  type Zoom,
} from "@/lib/lab";
import type { LabData } from "@/lib/useLabData";
import { statusBarClass } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import { useUpdateProject } from "@/lib/queries";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const ROW_H = 46;
const LABEL_W = 168;

type DragState = {
  id: string;
  mode: "move" | "left" | "right";
  startX: number;
  startY: number;
  dx: number;
  dy: number;
};

type PendingMove = {
  project: Project;
  machineId: string;
  start: string;
  end: string;
  clashes: Project[];
};

type DayInfo = {
  iso: string;
  nonWorking: boolean;
  today: boolean;
  weekday: string;
  dayOfMonth: string;
};

export function Timeline({
  data,
  anchor,
  zoom,
  onSelect,
  onCreate,
}: {
  data: LabData;
  anchor: Date;
  zoom: Zoom;
  onSelect: (p: Project) => void;
  onCreate: (machineId: string, date: string) => void;
}) {
  const { machines, projects, holidaySet, conflicts } = data;
  const px = ZOOMS[zoom].px;
  const { start, days } = useMemo(() => timelineRange(anchor, zoom), [anchor, zoom]);
  const gridRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pending, setPending] = useState<PendingMove | null>(null);
  const [hoverCell, setHoverCell] = useState<{ machineId: string; idx: number } | null>(null);
  const update = useUpdateProject();

  // Day metadata is computed once per range instead of on every render of every cell.
  const dayInfo = useMemo<DayInfo[]>(() => {
    const todayIso = iso(new Date());
    return days.map((d) => {
      const dIso = iso(d);
      return {
        iso: dIso,
        nonWorking: isNonWorking(d, holidaySet),
        today: dIso === todayIso,
        weekday: format(d, "EEEEE"),
        dayOfMonth: format(d, "d"),
      };
    });
  }, [days, holidaySet]);

  const months = useMemo(() => {
    const out: { label: string; span: number }[] = [];
    for (const d of days) {
      const label = format(d, zoom === "quarter" ? "MMM yy" : "MMMM yyyy");
      const last = out[out.length - 1];
      if (last && last.label === label) last.span += 1;
      else out.push({ label, span: 1 });
    }
    return out;
  }, [days, zoom]);

  // Group scheduled projects by machine once, instead of filtering per row on every render.
  const byMachine = useMemo(() => {
    const map = new Map<string, Project[]>();
    for (const p of projects) {
      if (!p.machine_id || !p.start_date || !p.end_date) continue;
      const list = map.get(p.machine_id);
      if (list) list.push(p);
      else map.set(p.machine_id, [p]);
    }
    return map;
  }, [projects]);

  const idxFromX = useCallback(
    (clientX: number) => {
      const el = gridRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return Math.max(
        0,
        Math.min(days.length - 1, Math.floor((clientX - rect.left + el.scrollLeft) / px)),
      );
    },
    [days.length, px],
  );
  const dateFromX = useCallback(
    (clientX: number) => iso(addDays(start, idxFromX(clientX))),
    [idxFromX, start],
  );

  const commit = useCallback(
    (project: Project, machineId: string, startDate: string, endDate: string, force = false) => {
      const clashes = conflictsFor(
        { id: project.id, machine_id: machineId, start_date: startDate, end_date: endDate },
        projects,
      );
      if (clashes.length && !force) {
        setPending({ project, machineId, start: startDate, end: endDate, clashes });
        return;
      }
      update.mutate({
        id: project.id,
        patch: {
          machine_id: machineId,
          start_date: startDate,
          end_date: endDate,
          planned_days: workingDays(startDate, endDate, holidaySet),
        },
      });
    },
    [holidaySet, projects, update],
  );

  const onPointerDown = (e: React.PointerEvent, p: Project, mode: DragState["mode"]) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: p.id, mode, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    // Only re-render when the block actually snaps to a new day/row.
    const sameCell =
      Math.round(dx / px) === Math.round(drag.dx / px) &&
      Math.round(dy / ROW_H) === Math.round(drag.dy / ROW_H);
    if (sameCell) return;
    setDrag({ ...drag, dx, dy });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = projects.find((x) => x.id === drag.id);
    const current = { ...drag, dx: e.clientX - drag.startX, dy: e.clientY - drag.startY };
    setDrag(null);
    if (!p || !p.start_date || !p.end_date) return;
    const deltaDays = Math.round(current.dx / px);
    const deltaRows = current.mode === "move" ? Math.round(current.dy / ROW_H) : 0;
    const rowIdx = machines.findIndex((m) => m.id === p.machine_id);
    const targetRow = Math.max(0, Math.min(machines.length - 1, rowIdx + deltaRows));
    const machineId = machines[targetRow]?.id ?? p.machine_id!;

    let s = parseISO(p.start_date);
    let e2 = parseISO(p.end_date);
    if (current.mode === "move") {
      s = addDays(s, deltaDays);
      e2 = addDays(e2, deltaDays);
    } else if (current.mode === "left") {
      s = addDays(s, deltaDays);
      if (s > e2) s = e2;
    } else {
      e2 = addDays(e2, deltaDays);
      if (e2 < s) e2 = s;
    }
    if (deltaDays === 0 && deltaRows === 0) {
      onSelect(p);
      return;
    }
    commit(p, machineId, iso(s), iso(e2));
  };

  const handleDrop = (e: React.DragEvent, machineId: string) => {
    e.preventDefault();
    setHoverCell(null);
    const id = e.dataTransfer.getData("text/project-id");
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    const dropDate = parseISO(dateFromX(e.clientX));
    const endDate = endForWorkingDays(dropDate, p.planned_days || 1, holidaySet);
    commit(p, machineId, iso(dropDate), iso(endDate));
  };

  const todayIdx = dayInfo.findIndex((d) => d.today);
  const gridWidth = days.length * px;

  return (
    <div className="panel overflow-hidden">
      <div className="flex">
        {/* machine labels */}
        <div className="shrink-0 border-r bg-surface" style={{ width: LABEL_W }}>
          <div className="h-[52px] border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Machine
          </div>
          {machines.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between border-b px-3"
              style={{ height: ROW_H }}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{m.name}</div>
                <div className="truncate text-[10px] text-muted-foreground">
                  {m.capacity_range ?? "special rig"}
                </div>
              </div>
              <span className="tabular rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {byMachine.get(m.id)?.length ?? 0}
              </span>
            </div>
          ))}
        </div>

        {/* grid */}
        <div className="relative flex-1 overflow-x-auto" ref={gridRef}>
          <div style={{ width: gridWidth }}>
            <TimelineHeader months={months} dayInfo={dayInfo} px={px} />

            {/* rows */}
            <div
              className="relative"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
            >
              {/* One column layer for all rows (instead of machines × days cells). */}
              <DayColumns dayInfo={dayInfo} px={px} height={machines.length * ROW_H} />

              {todayIdx >= 0 && (
                <div
                  className="pointer-events-none absolute top-0 z-20 w-px bg-today"
                  style={{ left: todayIdx * px, height: machines.length * ROW_H }}
                />
              )}

              {machines.map((m) => (
                <div
                  key={m.id}
                  className="relative border-b"
                  style={{ height: ROW_H }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    const idx = idxFromX(e.clientX);
                    // dragover fires continuously; only update state when the cell changes.
                    setHoverCell((h) =>
                      h && h.machineId === m.id && h.idx === idx ? h : { machineId: m.id, idx },
                    );
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setHoverCell((h) => (h?.machineId === m.id ? null : h));
                    }
                  }}
                  onDrop={(e) => handleDrop(e, m.id)}
                  onDoubleClick={(e) => onCreate(m.id, dateFromX(e.clientX))}
                >
                  {hoverCell?.machineId === m.id && (
                    <div
                      className="pointer-events-none absolute inset-y-0 bg-today/20"
                      style={{ left: hoverCell.idx * px, width: px }}
                    />
                  )}

                  {(byMachine.get(m.id) ?? []).map((p) => {
                    const s = parseISO(p.start_date!);
                    const e2 = parseISO(p.end_date!);
                    const offset = daysBetween(start, s);
                    const span = daysBetween(s, e2) + 1;
                    if (offset + span < 0 || offset > days.length) return null;
                    const isDragging = drag?.id === p.id;
                    const dxDays = isDragging ? Math.round(drag.dx / px) : 0;
                    const dyRows =
                      isDragging && drag.mode === "move" ? Math.round(drag.dy / ROW_H) : 0;
                    const left = (offset + (isDragging && drag.mode !== "right" ? dxDays : 0)) * px;
                    const width =
                      (span +
                        (isDragging && drag.mode === "right" ? dxDays : 0) -
                        (isDragging && drag.mode === "left" ? dxDays : 0)) *
                      px;
                    const conflicted = conflicts.has(p.id);
                    return (
                      <div
                        key={p.id}
                        onPointerDown={(e) => onPointerDown(e, p, "move")}
                        className={cn(
                          "group absolute top-1 z-10 flex h-[38px] cursor-grab touch-none select-none items-center gap-1.5 overflow-hidden rounded border-l-[3px] px-1.5 text-left shadow-sm transition-shadow hover:shadow-md",
                          statusBarClass(p.status),
                          conflicted && "ring-2 ring-destructive/70",
                          isDragging && "z-30 cursor-grabbing opacity-90 shadow-lg",
                        )}
                        style={{
                          left,
                          width: Math.max(px, width),
                          transform: dyRows ? `translateY(${dyRows * ROW_H}px)` : undefined,
                        }}
                        title={`${p.title} · ${data.customerName(p.customer_id)} · ${p.start_date} → ${p.end_date}`}
                      >
                        <span
                          onPointerDown={(e) => onPointerDown(e, p, "left")}
                          className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        />
                        {conflicted && <AlertTriangle className="size-3 shrink-0 text-destructive" />}
                        <div className="min-w-0 leading-tight">
                          <div className="truncate text-[11px] font-semibold">{p.title}</div>
                          {width > 110 && (
                            <div className="truncate text-[10px] opacity-80">
                              {data.customerName(p.customer_id)} ·{" "}
                              {data.employeeInitials(p.responsible_id)}
                            </div>
                          )}
                        </div>
                        <span
                          onPointerDown={(e) => onPointerDown(e, p, "right")}
                          className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConflictDialog
        pending={pending}
        data={data}
        onClose={() => setPending(null)}
        onForce={() => {
          if (!pending) return;
          commit(pending.project, pending.machineId, pending.start, pending.end, true);
          toast.warning("Conflict kept — machine is double booked.");
          setPending(null);
        }}
        onAutoFix={() => {
          if (!pending) return;
          const slot = earliestSlot(
            pending.machineId,
            pending.project.planned_days || 1,
            parseISO(pending.start),
            projects,
            holidaySet,
            pending.project.id,
          );
          commit(pending.project, pending.machineId, slot.start, slot.end, true);
          toast.success(`Moved to next free slot: ${slot.start} → ${slot.end}`);
          setPending(null);
        }}
      />
    </div>
  );
}

/** Month + day header. Memoised: it only changes when the range or zoom changes. */
const TimelineHeader = memo(function TimelineHeader({
  months,
  dayInfo,
  px,
}: {
  months: { label: string; span: number }[];
  dayInfo: DayInfo[];
  px: number;
}) {
  return (
    <div className="sticky top-0 z-20 bg-surface">
      <div className="flex h-[26px] border-b">
        {months.map((m, i) => (
          <div
            key={i}
            className="flex items-center border-r px-2 text-[11px] font-semibold text-foreground/80"
            style={{ width: m.span * px }}
          >
            <span className="sticky left-1 truncate">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="flex h-[26px] border-b">
        {dayInfo.map((d) => (
          <div
            key={d.iso}
            className={cn(
              "flex flex-col items-center justify-center border-r text-[9px] leading-none text-muted-foreground",
              d.nonWorking && "bg-weekend",
              d.today && "bg-today/15 font-bold text-today",
            )}
            style={{ width: px }}
          >
            {px >= 20 && <span>{d.weekday}</span>}
            <span className={cn("tabular", px < 13 && "text-[8px]")}>{d.dayOfMonth}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Vertical day columns (grid lines + weekend/holiday shading) shared by all machine rows. */
const DayColumns = memo(function DayColumns({
  dayInfo,
  px,
  height,
}: {
  dayInfo: DayInfo[];
  px: number;
  height: number;
}) {
  return (
    <div className="pointer-events-none absolute left-0 top-0 flex" style={{ height }}>
      {dayInfo.map((d) => (
        <div
          key={d.iso}
          className={cn("h-full border-r border-grid", d.nonWorking && "bg-weekend")}
          style={{ width: px }}
        />
      ))}
    </div>
  );
});

function ConflictDialog({
  pending,
  data,
  onClose,
  onForce,
  onAutoFix,
}: {
  pending: PendingMove | null;
  data: LabData;
  onClose: () => void;
  onForce: () => void;
  onAutoFix: () => void;
}) {
  return (
    <AlertDialog open={Boolean(pending)} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-destructive" /> Machine conflict
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>
                <strong>{pending?.project.title}</strong> on{" "}
                {data.machineCode(pending?.machineId ?? null)} ({pending?.start} → {pending?.end})
                overlaps:
              </p>
              <ul className="space-y-1">
                {pending?.clashes.map((c) => (
                  <li key={c.id} className="rounded border bg-muted/50 px-2 py-1 text-xs">
                    {c.title} · {c.start_date} → {c.end_date}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:justify-between">
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onAutoFix}>
              Move to next free slot
            </Button>
            <AlertDialogAction onClick={onForce}>Keep conflict</AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
