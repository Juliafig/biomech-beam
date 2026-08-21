ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email text;
UPDATE public.employees SET email = lower(replace(full_name,' ','.')) || '@lab-testing.example.com' WHERE email IS NULL;

CREATE TABLE IF NOT EXISTS public.project_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  sequence integer NOT NULL DEFAULT 0,
  planned_start date,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  done_at timestamptz,
  critical boolean NOT NULL DEFAULT false,
  reminder_days_before integer NOT NULL DEFAULT 2,
  reminder_enabled boolean NOT NULL DEFAULT true,
  reminder_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_steps TO anon, authenticated;
GRANT ALL ON public.project_steps TO service_role;
ALTER TABLE public.project_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "project_steps open" ON public.project_steps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER project_steps_touch BEFORE UPDATE ON public.project_steps FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE INDEX IF NOT EXISTS project_steps_project_idx ON public.project_steps(project_id);

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_messages open" ON public.chat_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS chat_messages_created_idx ON public.chat_messages(created_at);