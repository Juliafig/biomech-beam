import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AuthCard({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className={cn("panel w-full max-w-sm p-6", className)}>
        <div className="mb-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Lab planning interface
          </div>
          <h1 className="mt-1 text-lg font-semibold">{title}</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
