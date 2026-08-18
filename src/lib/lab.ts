import {
  addDays,
  differenceInCalendarDays,
  format,
  isWeekend,
  parseISO,
  startOfWeek,
} from "date-fns";

export type Machine = {
  id: string;
  code: string;
  name: string;
  capacity_range: string | null;
  sort_order: number;
  active: boolean;
};

export type Customer = { id: string; name: string };
export type Employee = { id: string; initials: string; full_name: string };
export type Holiday = { id: string; day: string; label: string };

export type ProjectStatus =
  | "quotation_sent"
  | "ordered"
  | "in_preparation"
  | "can_be_started"
  | "currently_running"
  | "maintenance"
  | "finished";

export type Priority = "low" | "normal" | "high" | "urgent";

export type Project = {
  id: string;
  nr: number | null;
  opportunity_code: string | null;
  quote: string | null;
  project_code: string | null;
  customer_id: string | null;
  title: string;
  price: number | null;
  responsible_id: string | null;
  start_date: string | null;
  end_date: string | null;
  planned_days: number;
  machine_id: string | null;
  preferred_machine_id: string | null;
  status: ProjectStatus;
  priority: Priority;
  deadline: string | null;
  notes: string | null;
};

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; token: string; short: string }
> = {
  quotation_sent: { label: "Quotation sent", token: "quoted", short: "Quoted" },
  ordered: { label: "Ordered — no specimens yet", token: "ordered", short: "Ordered" },
  in_preparation: { label: "In preparation", token: "prep", short: "Prep" },
  can_be_started: { label: "Can be started", token: "ready", short: "Ready" },
  currently_running: { label: "Currently running", token: "running", short: "Running" },
  maintenance: { label: "Maintenance / calibration", token: "maintenance", short: "Service" },
  finished: { label: "Finished", token: "done", short: "Done" },
};

export const STATUS_ORDER: ProjectStatus[] = [
  "currently_running",
  "can_be_started",
  "in_preparation",
  "ordered",
  "quotation_sent",
  "maintenance",
  "finished",
];

export const PRIORITIES: Priority[] = ["urgent", "high", "normal", "low"];

export const statusStyle = (status: ProjectStatus) => {
  const t = STATUS_META[status].token;
  return {
    bar: `bg-${t}-soft border-${t}`,
    dot: `bg-${t}`,
    text: `text-${t}`,
  };
};

/* ---------- date helpers ---------- */

export const iso = (d: Date) => format(d, "yyyy-MM-dd");
export const toDate = (s: string) => parseISO(s);
export const fmt = (s: string | null, pattern = "dd MMM yyyy") =>
  s ? format(parseISO(s), pattern) : "—";

export const isNonWorking = (d: Date, holidays: Set<string>) =>
  isWeekend(d) || holidays.has(iso(d));

/** Inclusive count of working days between two dates. */
export function workingDays(
  start: string | null,
  end: string | null,
  holidays: Set<string>,
): number {
  if (!start || !end) return 0;
  let d = parseISO(start);
  const e = parseISO(end);
  let n = 0;
  while (d <= e) {
    if (!isNonWorking(d, holidays)) n++;
    d = addDays(d, 1);
  }
  return n;
}

/** First working day on or after d. */
export function nextWorkingDay(d: Date, holidays: Set<string>): Date {
  let cur = d;
  while (isNonWorking(cur, holidays)) cur = addDays(cur, 1);
  return cur;
}

/** End date so that [start..end] contains exactly `days` working days. */
export function endForWorkingDays(start: Date, days: number, holidays: Set<string>): Date {
  let cur = nextWorkingDay(start, holidays);
  let counted = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (!isNonWorking(cur, holidays)) counted++;
    if (counted >= Math.max(1, days)) return cur;
    cur = addDays(cur, 1);
  }
}

export const daysBetween = (a: Date, b: Date) => differenceInCalendarDays(b, a);

/* ---------- scheduling logic ---------- */

export const isScheduled = (p: Project) => Boolean(p.machine_id && p.start_date && p.end_date);

export function overlaps(a: Project, b: Project) {
  if (!a.start_date || !a.end_date || !b.start_date || !b.end_date) return false;
  return a.start_date <= b.end_date && b.start_date <= a.end_date;
}

/** Ids of projects that clash with another project on the same machine. */
export function conflictIds(projects: Project[]): Set<string> {
  const out = new Set<string>();
  const byMachine = new Map<string, Project[]>();
  for (const p of projects) {
    if (!isScheduled(p) || p.status === "finished") continue;
    const list = byMachine.get(p.machine_id!) ?? [];
    list.push(p);
    byMachine.set(p.machine_id!, list);
  }
  for (const list of byMachine.values()) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i], list[j])) {
          out.add(list[i].id);
          out.add(list[j].id);
        }
      }
    }
  }
  return out;
}

export function conflictsFor(
  candidate: { id?: string; machine_id: string | null; start_date: string; end_date: string },
  projects: Project[],
): Project[] {
  if (!candidate.machine_id) return [];
  return projects.filter(
    (p) =>
      p.id !== candidate.id &&
      p.machine_id === candidate.machine_id &&
      p.status !== "finished" &&
      isScheduled(p) &&
      p.start_date! <= candidate.end_date &&
      candidate.start_date <= p.end_date!,
  );
}

export type Slot = { machineId: string; start: string; end: string };

/** Earliest free window of `days` working days on a machine, from `from`. */
export function earliestSlot(
  machineId: string,
  days: number,
  from: Date,
  projects: Project[],
  holidays: Set<string>,
  excludeId?: string,
): Slot {
  let cursor = nextWorkingDay(from, holidays);
  for (let guard = 0; guard < 800; guard++) {
    const end = endForWorkingDays(cursor, days, holidays);
    const clash = conflictsFor(
      { id: excludeId, machine_id: machineId, start_date: iso(cursor), end_date: iso(end) },
      projects,
    );
    if (clash.length === 0) return { machineId, start: iso(cursor), end: iso(end) };
    const latest = clash.reduce((m, c) => (c.end_date! > m ? c.end_date! : m), clash[0].end_date!);
    cursor = nextWorkingDay(addDays(parseISO(latest), 1), holidays);
  }
  const end = endForWorkingDays(cursor, days, holidays);
  return { machineId, start: iso(cursor), end: iso(end) };
}

/** Ranked slot suggestions across machines (preferred machine first). */
export function suggestSlots(
  project: Project,
  machines: Machine[],
  projects: Project[],
  holidays: Set<string>,
  from = new Date(),
): Slot[] {
  const pref = project.preferred_machine_id ?? project.machine_id;
  return machines
    .filter((m) => m.active)
    .map((m) =>
      earliestSlot(m.id, project.planned_days || 1, from, projects, holidays, project.id),
    )
    .sort((a, b) => {
      if (a.start !== b.start) return a.start < b.start ? -1 : 1;
      if (a.machineId === pref) return -1;
      if (b.machineId === pref) return 1;
      return 0;
    })
    .slice(0, 5);
}

/* ---------- utilisation ---------- */

export function utilisation(
  machineId: string,
  projects: Project[],
  holidays: Set<string>,
  from: Date,
  to: Date,
) {
  let capacity = 0;
  let d = from;
  while (d <= to) {
    if (!isNonWorking(d, holidays)) capacity++;
    d = addDays(d, 1);
  }
  const booked = new Set<string>();
  for (const p of projects) {
    if (p.machine_id !== machineId || !isScheduled(p)) continue;
    let cur = parseISO(p.start_date!);
    const e = parseISO(p.end_date!);
    while (cur <= e) {
      if (cur >= from && cur <= to && !isNonWorking(cur, holidays)) booked.add(iso(cur));
      cur = addDays(cur, 1);
    }
  }
  return { capacity, booked: booked.size, pct: capacity ? booked.size / capacity : 0 };
}

/* ---------- timeline scale ---------- */

export type Zoom = "day" | "week" | "month" | "quarter";

export const ZOOMS: Record<Zoom, { label: string; px: number; span: number }> = {
  day: { label: "Day", px: 56, span: 14 },
  week: { label: "Week", px: 26, span: 42 },
  month: { label: "Month", px: 13, span: 92 },
  quarter: { label: "3 months", px: 7, span: 182 },
};

export function timelineRange(anchor: Date, zoom: Zoom) {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let i = 0; i < ZOOMS[zoom].span; i++) days.push(addDays(start, i));
  return { start, days, end: days[days.length - 1] };
}
