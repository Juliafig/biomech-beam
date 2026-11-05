-- Lab Planner: full database setup for a NEW Supabase project.
-- Paste this whole file into Supabase → SQL Editor → Run.
-- It is the concatenation of supabase/migrations/*.sql (in order).
-- BEFORE running: change 'applus.com' (search for it below) to your company email domain.

-- ===== 20260818165715_375d2b55-3c44-4517-ba6a-5c3f6f5c0a39.sql =====

CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  capacity_range text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.machines TO anon, authenticated;
GRANT ALL ON public.machines TO service_role;
ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "machines open" ON public.machines FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO anon, authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers open" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initials text NOT NULL UNIQUE,
  full_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO anon, authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees open" ON public.employees FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  label text NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO anon, authenticated;
GRANT ALL ON public.holidays TO service_role;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "holidays open" ON public.holidays FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nr int,
  opportunity_code text,
  quote text,
  project_code text,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  title text NOT NULL,
  price numeric,
  responsible_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  start_date date,
  end_date date,
  planned_days int NOT NULL DEFAULT 1,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  preferred_machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_preparation',
  priority text NOT NULL DEFAULT 'normal',
  deadline date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO anon, authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects open" ON public.projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER projects_touch BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.machines (code, name, capacity_range, sort_order) VALUES
 ('S1','S1','500 N - 10 kN',1),('S2','S2','500 N - 10 kN',2),('S3','S3','500 N - 10 kN',3),
 ('S4','S4','500 N - 10 kN',4),('S5','S5','500 N - 10 kN',5),
 ('D1','D1','500 N - 14 kN',6),('D2','D2','500 N - 14 kN',7),('D3','D3','500 N - 14 kN',8),
 ('D4','D4','500 N - 14 kN',9),('D5','D5','500 N - 14 kN',10),
 ('P7','P7',NULL,11),('MTS','MTS Bionix',NULL,12),('INS','Instron Screw Test Rig',NULL,13);

INSERT INTO public.customers (name) VALUES
 ('Implantcast'),('Amplitude'),('Medacta'),('Zimmer Biomet'),('Smith & Nephew'),('Aesculap'),('Stryker'),('Corin');

INSERT INTO public.employees (initials, full_name) VALUES
 ('RPA','R. Pareja'),('JFM','Julia Figueroa Martinez'),('SSC','S. Schmidt'),('MKL','M. Klein'),('TBR','T. Braun');


-- ===== 20260818165741_412bddb8-3851-4642-8930-5bec3d1dc98c.sql =====

INSERT INTO public.holidays (day,label) VALUES
 ('2026-10-03','German Unity Day'),('2026-12-24','Christmas Eve'),('2026-12-25','Christmas Day'),('2026-12-26','Boxing Day'),('2026-12-31','New Year Eve');

INSERT INTO public.projects (nr,opportunity_code,quote,project_code,customer_id,title,price,responsible_id,start_date,end_date,planned_days,machine_id,preferred_machine_id,status,priority,deadline)
SELECT v.nr,v.opp,v.quote,v.pcode,c.id,v.title,v.price,e.id,v.sd::date,v.ed::date,v.days,m.id,m.id,v.status,v.prio,v.deadline::date
FROM (VALUES
 (1,'HR1','122500','F024/26','Implantcast','ASTM F1875 Fretting Corrosion',5000,'RPA','2026-08-17','2026-08-21',5,'S1','currently_running','high','2026-09-01'),
 (2,'HR2','122501','F025/26','Amplitude','ASTM F2068 Femoral Stem Fatigue',4500,'JFM','2026-08-24','2026-08-28',5,'S1','can_be_started','normal','2026-09-15'),
 (3,'HR3','122502','F026/26','Medacta','ASTM F3090 Dynamic Loading',4000,'SSC','2026-08-19','2026-09-01',10,'S2','currently_running','normal','2026-09-20'),
 (4,'HR4','122503','F027/26','Zimmer Biomet','ISO 7206-6 Neck Fatigue',6200,'MKL','2026-09-01','2026-09-11',9,'S3','in_preparation','high','2026-09-30'),
 (5,'HR5','122504','F028/26','Smith & Nephew','ASTM F1717 Spinal Construct',7100,'TBR','2026-08-25','2026-09-04',9,'D1','can_be_started','urgent','2026-09-10'),
 (6,'HR6','122505','F029/26','Aesculap','ISO 14242-1 Hip Wear',15000,'RPA','2026-09-07','2026-10-02',20,'MTS','in_preparation','high','2026-10-15'),
 (7,'HR7','122506','F030/26','Stryker','ASTM F543 Screw Torsion',3200,'JFM','2026-08-31','2026-09-03',4,'INS','can_be_started','normal','2026-09-18'),
 (8,'HR8','122507','F031/26','Corin','ASTM F2996 Stem FEA Validation',5400,'SSC','2026-09-14','2026-09-18',5,'S4','in_preparation','normal','2026-10-01'),
 (9,'HR9','122508','F032/26','Medacta','ASTM F1820 Knee Constraint',4800,'MKL','2026-08-10','2026-08-14',5,'S5','finished','normal','2026-08-20'),
 (10,'HR10','122509','F033/26','Implantcast','Maintenance / Calibration',0,'TBR','2026-09-21','2026-09-23',3,'D2','maintenance','normal',NULL),
 (11,'HR11','122510','F034/26','Amplitude','ISO 7206-4 Endurance',6600,'RPA','2026-08-12','2026-08-17',4,'D3','currently_running','normal','2026-08-28')
) AS v(nr,opp,quote,pcode,cust,title,price,resp,sd,ed,days,mach,status,prio,deadline)
JOIN public.customers c ON c.name=v.cust
JOIN public.employees e ON e.initials=v.resp
JOIN public.machines m ON m.code=v.mach;

INSERT INTO public.projects (nr,opportunity_code,quote,project_code,customer_id,title,price,responsible_id,planned_days,preferred_machine_id,status,priority,deadline)
SELECT v.nr,v.opp,v.quote,v.pcode,c.id,v.title,v.price,e.id,v.days,m.id,v.status,v.prio,v.deadline::date
FROM (VALUES
 (12,'HR12','122511','F035/26','Stryker','ASTM F1875 Taper Corrosion',5200,'JFM',5,'S1','ordered','high','2026-09-25'),
 (13,'HR13','122512','F036/26','Corin','ISO 7206-10 Static Compression',3900,'SSC',3,'S2','can_be_started','normal','2026-10-05'),
 (14,'HR14','122513','F037/26','Aesculap','ASTM F1717 Vertebrectomy',7400,'MKL',8,'D1','quotation_sent','low','2026-11-01'),
 (15,'HR15','122514','F038/26','Zimmer Biomet','ASTM F2077 Intervertebral Device',8800,'TBR',10,'D4','ordered','urgent','2026-09-28'),
 (16,'HR16','122515','F039/26','Smith & Nephew','ASTM F543 Pull-out Strength',2900,'RPA',2,'INS','in_preparation','normal','2026-10-12')
) AS v(nr,opp,quote,pcode,cust,title,price,resp,days,mach,status,prio,deadline)
JOIN public.customers c ON c.name=v.cust
JOIN public.employees e ON e.initials=v.resp
JOIN public.machines m ON m.code=v.mach;


-- ===== 20260821163206_73114953-fca7-4272-aac1-0d67d02d9546.sql =====
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

-- ===== 20260826081013_26b9ff60-352f-4644-b3c4-6101fd2cbbca.sql =====
ALTER TABLE public.project_steps
ADD COLUMN status text NOT NULL DEFAULT 'todo';

ALTER TABLE public.project_steps
ADD CONSTRAINT project_steps_status_check
CHECK (status IN ('todo', 'in_progress', 'completed'));

UPDATE public.project_steps
SET status = CASE WHEN done THEN 'completed' ELSE 'todo' END;

CREATE OR REPLACE FUNCTION public.sync_project_step_completion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'completed' THEN
    NEW.done := true;
    NEW.done_at := COALESCE(NEW.done_at, now());
  ELSE
    NEW.done := false;
    NEW.done_at := NULL;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER project_steps_sync_completion
BEFORE INSERT OR UPDATE OF status ON public.project_steps
FOR EACH ROW
EXECUTE FUNCTION public.sync_project_step_completion();

-- ===== 20261105120000_require_login.sql =====
-- Require login: only confirmed users whose email domain is allowed can
-- read or change lab data. Replaces the previous "open to everyone" policies.
--
-- >>> EDIT the allowed domain(s) below before running this script. <<<

-- 1. Allowed email domains (readable by anyone so the sign-up form can check them).
CREATE TABLE IF NOT EXISTS public.allowed_email_domains (
  domain text PRIMARY KEY CHECK (domain = lower(domain) AND domain NOT LIKE '%@%')
);
ALTER TABLE public.allowed_email_domains ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.allowed_email_domains TO anon, authenticated;
GRANT ALL ON public.allowed_email_domains TO service_role;
DROP POLICY IF EXISTS "domains readable" ON public.allowed_email_domains;
CREATE POLICY "domains readable" ON public.allowed_email_domains
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.allowed_email_domains (domain) VALUES
  ('applus.com')            -- <<< change / add your company domain(s)
ON CONFLICT DO NOTHING;

-- 2. Helper functions.
CREATE OR REPLACE FUNCTION public.email_domain_allowed(email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_email_domains d
    WHERE d.domain = lower(split_part(email, '@', 2))
  );
$$;

-- True when the current user has confirmed their email and belongs to an allowed domain.
CREATE OR REPLACE FUNCTION public.is_lab_member()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND public.email_domain_allowed(u.email)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_lab_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_lab_member() TO authenticated;

-- 3. Reject sign-ups from other domains at the database level.
CREATE OR REPLACE FUNCTION public.check_signup_domain()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.email_domain_allowed(NEW.email) THEN
    RAISE EXCEPTION 'Sign-up is restricted to company email addresses';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS check_signup_domain ON auth.users;
CREATE TRIGGER check_signup_domain
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.check_signup_domain();

-- 4. Lab tables: members only (no anonymous access).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['machines','customers','employees','holidays','projects','project_steps'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || ' open', t);
    EXECUTE format('DROP POLICY IF EXISTS "lab members" ON public.%I', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format(
      'CREATE POLICY "lab members" ON public.%I FOR ALL TO authenticated
         USING ((SELECT public.is_lab_member())) WITH CHECK ((SELECT public.is_lab_member()))', t);
  END LOOP;
END $$;

-- 5. Assistant chat history: private to each user.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
DELETE FROM public.chat_messages WHERE user_id IS NULL;  -- old anonymous history
CREATE INDEX IF NOT EXISTS chat_messages_user_idx ON public.chat_messages(user_id, created_at);
DROP POLICY IF EXISTS "chat_messages open" ON public.chat_messages;
DROP POLICY IF EXISTS "own chat messages" ON public.chat_messages;
REVOKE ALL ON public.chat_messages FROM anon;
CREATE POLICY "own chat messages" ON public.chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid() AND (SELECT public.is_lab_member()))
  WITH CHECK (user_id = auth.uid() AND (SELECT public.is_lab_member()));

