-- Migration 008: Fix jobs RLS wallet context resolution.
-- Uses either:
-- 1) current_setting('app.aleo_address', true) from set_app_config RPC, or
-- 2) request header x-aleo-address passed by the client.

CREATE OR REPLACE FUNCTION public.current_aleo_address()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT lower(
    COALESCE(
      NULLIF(current_setting('app.aleo_address', TRUE), ''),
      NULLIF((current_setting('request.headers', TRUE)::json ->> 'x-aleo-address'), '')
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_aleo_address() TO PUBLIC;

DROP POLICY IF EXISTS "Giver reads own jobs" ON public.jobs;
CREATE POLICY "Giver reads own jobs"
ON public.jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = jobs.giver_id
      AND p.role = 'giver'
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
);

DROP POLICY IF EXISTS "Role-locked giver creates jobs" ON public.jobs;
DROP POLICY IF EXISTS "Job giver creates job" ON public.jobs;
DROP POLICY IF EXISTS "Anyone can create jobs" ON public.jobs;
CREATE POLICY "Role-locked giver creates jobs"
ON public.jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = jobs.giver_id
      AND p.role = 'giver'
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
);

DROP POLICY IF EXISTS "Giver updates own jobs" ON public.jobs;
CREATE POLICY "Giver updates own jobs"
ON public.jobs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = jobs.giver_id
      AND p.role = 'giver'
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = jobs.giver_id
      AND p.role = 'giver'
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
);
