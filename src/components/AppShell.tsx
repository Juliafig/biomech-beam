import { Link } from "@tanstack/react-router";
import {
  CalendarRange,
  LayoutDashboard,
  Sparkles,
  Table2,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Planning", icon: CalendarRange },
  { to: "/projects", label: "Projects", icon: Table2 },
  { to: "/engineer", label: "My Projects", icon: UserRound },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/assistant", label: "Assistant", icon: Sparkles },
] as const;

export function AppShell({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-brand bg-brand text-brand-foreground shadow-sm">
        <div className="flex min-h-14 flex-wrap items-center gap-4 px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-8 items-center border border-brand-foreground/25 bg-brand-foreground/10 px-2.5 leading-none">
              <span className="text-base font-bold italic">Applus</span>
              <span className="text-lg font-bold text-primary">+</span>
            </div>
            <div className="h-6 w-px bg-brand-foreground/25" />
            <div className="leading-tight">
              <div className="text-xs font-semibold uppercase">Lab planning interface</div>
              <div className="text-[10px] uppercase text-brand-foreground/60">
                Biomechanical division
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-0.5 bg-brand-foreground/10 p-0.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-xs font-medium text-brand-foreground/70 transition-colors hover:bg-brand-foreground/10 hover:text-brand-foreground"
                activeProps={{ className: "bg-card !text-brand shadow-sm" }}
              >
                <n.icon className="size-3.5" />
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 [&_.border-input]:border-brand-foreground/25 [&_.bg-background]:bg-brand-foreground/10 [&_.bg-card]:bg-brand-foreground/10 [&_.text-muted-foreground]:text-brand-foreground/70">{actions}</div>
        </div>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
