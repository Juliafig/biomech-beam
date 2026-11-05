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
