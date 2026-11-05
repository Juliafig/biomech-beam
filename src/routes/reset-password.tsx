import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Set a new password — Lab Planner" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Use at least 8 characters.");
    if (password !== confirm) return setError("The passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    toast.success("Password updated.");
    navigate({ to: "/" });
  };

  if (session === undefined) {
    return (
      <AuthCard title="Set a new password">
        <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" />
      </AuthCard>
    );
  }

  if (!session) {
    return (
      <AuthCard title="Link expired">
        <p className="text-sm text-muted-foreground">
          This reset link is no longer valid. Request a new one from the sign-in page.
        </p>
        <Button className="mt-4 w-full" onClick={() => navigate({ to: "/login" })}>
          Back to sign in
        </Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="confirm">Repeat password</Label>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p
            role="alert"
            className="rounded border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
          Save password
        </Button>
      </form>
    </AuthCard>
  );
}
