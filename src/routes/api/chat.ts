import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type ChatRequestBody = { messages?: unknown };

const SYSTEM = `You are the planning assistant of a biomechanical testing laboratory.
You help engineers plan projects on test machines (S1-S5, D1-D5, P7, MTS Bionix, Instron Screw Test Rig).

Rules:
- Always inspect the current plan with the read tools before answering.
- Work in ISO dates (yyyy-MM-dd). "CW30" means ISO calendar week 30 of the current year (or the year the user names); the week starts on Monday.
- Only weekdays are working days; lab holidays are returned by the tools.
- NEVER change data yourself. When a change is needed, call propose_schedule_change or propose_new_project so the user can review and confirm it. One tool call per proposed change.
- Keep prose answers short and concrete. Reference project titles and machine codes.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as ChatRequestBody;
        if (!Array.isArray(messages)) {
          return new Response("Messages are required", { status: 400 });
        }

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const listMachines = tool({
          description: "List all test machines with code, name and capacity range.",
          inputSchema: z.object({}),
          execute: async () => {
            const { data } = await supabaseAdmin
              .from("machines")
              .select("id, code, name, capacity_range, active")
              .order("sort_order");
            return data ?? [];
          },
        });

        const listProjects = tool({
          description:
            "List projects, optionally filtered by machine code and/or a date window. Returns scheduling fields.",
          inputSchema: z.object({
            machineCode: z.string().nullable(),
            from: z.string().nullable(),
            to: z.string().nullable(),
          }),
          execute: async ({ machineCode, from, to }) => {
            const { data: machines } = await supabaseAdmin
              .from("machines")
              .select("id, code");
            const byId = new Map((machines ?? []).map((m) => [m.id, m.code]));
            const { data } = await supabaseAdmin
              .from("projects")
              .select(
                "id, nr, title, project_code, status, priority, start_date, end_date, planned_days, machine_id, deadline",
              )
              .order("start_date", { nullsFirst: false });
            let rows = (data ?? []).map((p) => ({
              ...p,
              machine: p.machine_id ? (byId.get(p.machine_id) ?? null) : null,
            }));
            if (machineCode) {
              rows = rows.filter(
                (r) => r.machine?.toLowerCase() === machineCode.toLowerCase(),
              );
            }
            if (from) rows = rows.filter((r) => !r.end_date || r.end_date >= from);
            if (to) rows = rows.filter((r) => !r.start_date || r.start_date <= to);
            return rows.slice(0, 120);
          },
        });

        const listHolidays = tool({
          description: "List configured laboratory holidays (non-working days).",
          inputSchema: z.object({}),
          execute: async () => {
            const { data } = await supabaseAdmin.from("holidays").select("day, label").order("day");
            return data ?? [];
          },
        });

        const today = tool({
          description: "Get today's date in ISO format.",
          inputSchema: z.object({}),
          execute: async () => ({ today: new Date().toISOString().slice(0, 10) }),
        });

        const proposeScheduleChange = tool({
          description:
            "Propose moving/rescheduling an existing project. The user must confirm; nothing is saved by this tool.",
          inputSchema: z.object({
            projectId: z.string(),
            projectTitle: z.string(),
            machineCode: z.string().nullable(),
            startDate: z.string().nullable(),
            endDate: z.string().nullable(),
            reason: z.string(),
          }),
          execute: async (input) => ({ kind: "schedule_change", ...input }),
        });

        const proposeNewProject = tool({
          description:
            "Propose creating a new project. The user must confirm; nothing is saved by this tool.",
          inputSchema: z.object({
            title: z.string(),
            customerName: z.string().nullable(),
            machineCode: z.string().nullable(),
            startDate: z.string().nullable(),
            plannedDays: z.number(),
            priority: z.enum(["low", "normal", "high", "urgent"]),
            status: z.enum([
              "quotation_sent",
              "ordered",
              "in_preparation",
              "can_be_started",
              "currently_running",
              "maintenance",
              "finished",
            ]),
            reason: z.string(),
          }),
          execute: async (input) => ({ kind: "new_project", ...input }),
        });

        const gateway = createLovableAiGatewayProvider(key);

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: SYSTEM,
            messages: await convertToModelMessages(messages as UIMessage[]),
            stopWhen: stepCountIs(50),
            tools: {
              today,
              list_machines: listMachines,
              list_projects: listProjects,
              list_holidays: listHolidays,
              propose_schedule_change: proposeScheduleChange,
              propose_new_project: proposeNewProject,
            },
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages as UIMessage[],
            onFinish: async ({ responseMessage }) => {
              const user = (messages as UIMessage[]).at(-1);
              const rows = [] as { role: string; parts: unknown }[];
              if (user?.role === "user") rows.push({ role: "user", parts: user.parts });
              rows.push({ role: "assistant", parts: responseMessage.parts });
              const { error } = await supabaseAdmin.from("chat_messages").insert(rows as never);
              if (error) console.error("chat persist failed", error);
            },
          });
        } catch (e) {
          console.error(e);
          return new Response(
            e instanceof Error ? e.message : "AI assistant failed",
            { status: 500 },
          );
        }
      },
    },
  },
});
