import { STATUS_META, type Priority, type ProjectStatus } from "@/lib/lab";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<ProjectStatus, string> = {
  currently_running: "bg-running-soft text-running border-running/30",
  can_be_started: "bg-ready-soft text-ready border-ready/30",
  in_preparation: "bg-prep-soft text-prep border-prep/30",
  ordered: "bg-ordered-soft text-ordered border-ordered/30",
  quotation_sent: "bg-quoted-soft text-quoted border-quoted/30",
  maintenance: "bg-maintenance-soft text-maintenance border-maintenance/30",
  finished: "bg-done-soft text-done border-done/30",
};

export const statusBarClass = (s: ProjectStatus) => STATUS_CLASS[s];

export function StatusBadge({
  status,
  className,
  short,
}: {
  status: ProjectStatus;
  className?: string;
  short?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        STATUS_CLASS[status],
        className,
      )}
    >
      {short ? STATUS_META[status].short : STATUS_META[status].label}
    </span>
  );
}

const PRIO_CLASS: Record<Priority, string> = {
  urgent: "bg-destructive/10 text-destructive border-destructive/30",
  high: "bg-warning-soft text-warning border-warning/30",
  normal: "bg-muted text-muted-foreground border-border",
  low: "bg-muted/50 text-muted-foreground border-border",
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium capitalize leading-none",
        PRIO_CLASS[priority],
      )}
    >
      {priority}
    </span>
  );
}
