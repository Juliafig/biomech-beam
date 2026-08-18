
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
