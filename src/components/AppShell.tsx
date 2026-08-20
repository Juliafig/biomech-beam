import { Link } from "@tanstack/react-router";
import { Activity, CalendarRange, LayoutDashboard, Table2 } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Planning", icon: CalendarRange },
  { to: "/projects", label: "Projects", icon: Table2 },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
] as const;

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-surface/95 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-primary text-primary-foreground">
              <Activity className="size-4" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight">Lab Planner</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Biomechanical testing
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-1 rounded-md bg-surface-2 p-0.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-card text-foreground shadow-sm" }}
              >
                <n.icon className="size-3.5" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">{actions}</div>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
