import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogIn, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { emailDomain, fetchAllowedDomains, useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/AuthCard";

type Mode = "signin" | "signup" | "forgot";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Sign in — Lab Planner" }] }),
  component: LoginPage,
});

/** Only allow in-app redirects (prevents open redirects to other sites). */
const safeRedirect = (target?: string) =>
  target && target.startsWith("/") && !target.startsWith("//") ? target : "/";

function LoginPage() {
  const { session, recovering } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (recovering) navigate({ to: "/reset-password" });
    else if (session) navigate({ to: safeRedirect(redirect) });
  }, [session, recovering, redirect, navigate]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const domains = await fetchAllowedDomains();
        if (!domains.includes(emailDomain(cleanEmail))) {
          throw new Error(
            `Please use your company email (${domains.map((d) => "@" + d).join(", ") || "no domains configured"}).`,
          );
        }
        if (password.length < 8) throw new Error("Use at least 8 characters for the password.");
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw error;
        setNotice("Check your inbox and click the confirmation link, then sign in here.");
        setMode("signin");
        setPassword("");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setNotice("If an account exists for this email, a reset link is on its way.");
        setMode("signin");
      }
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard
      title={
        mode === "signin" ? "Sign in" : mode === "signup" ? "Create your account" : "Reset password"
      }
    >
      <form onSubmit={submit} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="email">Company email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {mode !== "forgot" && (
          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded border border-destructive/40 bg-destructive/10 px-2.5 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="flex items-start gap-1.5 rounded border border-running/40 bg-running-soft px-2.5 py-2 text-xs">
            <MailCheck className="mt-0.5 size-3.5 shrink-0" /> {notice}
          </p>
        )}

        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs">
        {mode === "signin" ? (
          <>
            <LinkButton onClick={() => switchMode("signup")}>Create an account</LinkButton>
            <LinkButton onClick={() => switchMode("forgot")}>Forgot password?</LinkButton>
          </>
        ) : (
          <LinkButton onClick={() => switchMode("signin")}>Back to sign in</LinkButton>
        )}
      </div>
    </AuthCard>
  );
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(msg)) return "Wrong email or password.";
  if (/email not confirmed/i.test(msg))
    return "Please confirm your email first (check your inbox).";
  if (/database error saving new user/i.test(msg))
    return "Sign-up is restricted to company email addresses.";
  return msg;
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}
