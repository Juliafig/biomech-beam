import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import ReactMarkdown from "react-markdown";
import { Bot, Check, Send, Sparkles, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useLabData } from "@/lib/useLabData";
import {
  ensureCustomer,
  useChatHistory,
  useClearChatHistory,
  useCreateProject,
  useUpdateProject,
} from "@/lib/queries";
import { endForWorkingDays, toDate } from "@/lib/lab";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Planning Assistant — Lab Planner" },
      {
        name: "description",
        content:
          "Chat with the AI planning assistant to optimise machine occupancy and schedule new projects.",
      },
      { property: "og:title", content: "AI Planning Assistant — Lab Planner" },
      {
        property: "og:description",
        content: "Optimise machine occupancy and schedule projects via chat.",
      },
    ],
  }),
  component: AssistantPage,
});

type ScheduleProposal = {
  kind: "schedule_change";
  projectId: string;
  projectTitle: string;
  machineCode: string | null;
  startDate: string | null;
  endDate: string | null;
  reason: string;
};

type NewProjectProposal = {
  kind: "new_project";
  title: string;
  customerName: string | null;
  machineCode: string | null;
  startDate: string | null;
  plannedDays: number;
  priority: "low" | "normal" | "high" | "urgent";
  status: string;
  reason: string;
};

type Proposal = ScheduleProposal | NewProjectProposal;

function isProposal(v: unknown): v is Proposal {
  return (
    typeof v === "object" &&
    v !== null &&
    ((v as { kind?: string }).kind === "schedule_change" ||
      (v as { kind?: string }).kind === "new_project")
  );
}

function AssistantPage() {
  const data = useLabData();
  const history = useChatHistory();
  const clearHistory = useClearChatHistory();
  const updateProject = useUpdateProject();
  const createProject = useCreateProject();

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      (history.data ?? []).map((m) => ({
        id: m.id,
        role: m.role as UIMessage["role"],
        parts: m.parts as UIMessage["parts"],
      })),
    [history.data],
  );

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: "lab-assistant",
    transport,
    onError: (e) => toast.error(e.message),
  });

  // Hydrate persisted history once loaded.
  const hydrated = useRef(false);
  useEffect(() => {
    if (!hydrated.current && history.data && messages.length === 0) {
      hydrated.current = true;
      setMessages(initialMessages);
    }
  }, [history.data, initialMessages, messages.length, setMessages]);

  const [input, setInput] = useState("");
  const [decided, setDecided] = useState<Record<string, "applied" | "dismissed">>({});
  const taRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    taRef.current?.focus();
  }, [status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const submit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  };

  const applyProposal = async (key: string, p: Proposal) => {
    try {
      if (p.kind === "schedule_change") {
        const machine = p.machineCode
          ? data.machines.find((m) => m.code.toLowerCase() === p.machineCode!.toLowerCase())
          : null;
        await updateProject.mutateAsync({
          id: p.projectId,
          patch: {
            ...(machine ? { machine_id: machine.id } : {}),
            ...(p.startDate ? { start_date: p.startDate } : {}),
            ...(p.endDate ? { end_date: p.endDate } : {}),
          },
        });
      } else {
        const machine = p.machineCode
          ? data.machines.find((m) => m.code.toLowerCase() === p.machineCode!.toLowerCase())
          : null;
        const customerId = p.customerName ? await ensureCustomer(p.customerName) : null;
        const end =
          p.startDate && p.plannedDays
            ? endForWorkingDays(toDate(p.startDate), p.plannedDays, data.holidaySet)
            : null;
        await createProject.mutateAsync({
          title: p.title,
          customer_id: customerId,
          machine_id: machine?.id ?? null,
          start_date: p.startDate,
          end_date: end ? end.toISOString().slice(0, 10) : null,
          planned_days: p.plannedDays || 1,
          priority: p.priority,
          status: p.status as never,
        });
      }
      setDecided((d) => ({ ...d, [key]: "applied" }));
      toast.success("Change applied to the plan");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply change");
    }
  };

  const renderPart = (m: UIMessage, i: number, part: UIMessage["parts"][number]) => {
    const key = `${m.id}-${i}`;
    if (part.type === "text") {
      return (
        <div key={key} className="prose prose-sm max-w-none text-sm">
          <ReactMarkdown>{part.text}</ReactMarkdown>
        </div>
      );
    }
    if (part.type.startsWith("tool-")) {
      const tp = part as unknown as {
        type: string;
        toolCallId: string;
        state: string;
        output?: unknown;
      };
      const name = tp.type.replace(/^tool-/, "");
      if (tp.state === "output-available" && isProposal(tp.output)) {
        const p = tp.output;
        const decision = decided[tp.toolCallId];
        return (
          <div key={key} className="rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <Sparkles className="size-3.5 text-primary" />
              {p.kind === "schedule_change" ? "Proposed reschedule" : "Proposed new project"}
            </div>
            <div className="space-y-0.5 text-muted-foreground">
              {p.kind === "schedule_change" ? (
                <>
                  <div>
                    Project: <span className="font-medium text-foreground">{p.projectTitle}</span>
                  </div>
                  <div>
                    Machine: {p.machineCode ?? "unchanged"} · {p.startDate ?? "?"} →{" "}
                    {p.endDate ?? "?"}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    Title: <span className="font-medium text-foreground">{p.title}</span>
                  </div>
                  <div>
                    Machine: {p.machineCode ?? "unassigned"} · start {p.startDate ?? "?"} ·{" "}
                    {p.plannedDays} working days · {p.priority}
                  </div>
                </>
              )}
              <div className="italic">{p.reason}</div>
            </div>
            {decision ? (
              <div
                className={cn(
                  "mt-2 text-[11px] font-medium",
                  decision === "applied" ? "text-primary" : "text-muted-foreground",
                )}
              >
                {decision === "applied" ? "✓ Applied to the plan" : "Dismissed"}
              </div>
            ) : (
              <div className="mt-2 flex gap-1.5">
                <button
                  className="flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 font-medium text-primary-foreground"
                  onClick={() => applyProposal(tp.toolCallId, p)}
                >
                  <Check className="size-3" /> Apply
                </button>
                <button
                  className="flex items-center gap-1 rounded-md border px-2.5 py-1"
                  onClick={() => setDecided((d) => ({ ...d, [tp.toolCallId]: "dismissed" }))}
                >
                  <X className="size-3" /> Dismiss
                </button>
              </div>
            )}
          </div>
        );
      }
      return (
        <div
          key={key}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          <Bot className="size-3" />
          {tp.state === "output-available" ? `Checked ${name}` : `Checking ${name}…`}
        </div>
      );
    }
    return null;
  };

  return (
    <AppShell
      actions={
        <button
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            clearHistory.mutate();
            setMessages([]);
            setDecided({});
          }}
        >
          <Trash2 className="size-3.5" /> New conversation
        </button>
      }
    >
      <div className="mx-auto flex h-[calc(100vh-7.5rem)] max-w-3xl flex-col">
        <div className="mb-2">
          <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Sparkles className="size-4 text-primary" /> Planning assistant
          </h1>
          <p className="text-xs text-muted-foreground">
            Ask about occupancy, free slots or new projects — e.g. “optimise the occupancy of
            machine S1” or “add a new fatigue project on S2 starting CW30”. The assistant proposes
            changes; nothing is saved until you confirm.
          </p>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-lg border bg-card p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              No messages yet — ask the assistant to optimise a machine or schedule a project.
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] space-y-2 rounded-lg px-3 py-2",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2",
                )}
              >
                {m.parts.map((part, i) => renderPart(m, i, part))}
              </div>
            </div>
          ))}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Bot className="size-3.5 animate-pulse" /> Assistant is thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error.message}
            </div>
          )}
        </div>

        <div className="mt-3 flex items-end gap-2">
          <textarea
            ref={taRef}
            rows={2}
            className="flex-1 resize-none rounded-md border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Ask the planning assistant…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            disabled={isLoading || !input.trim()}
            onClick={() => void submit()}
          >
            <Send className="size-4" /> Send
          </button>
        </div>
      </div>
    </AppShell>
  );
}
