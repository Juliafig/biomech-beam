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