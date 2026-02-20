-- ONE-SHOT FIX: Prefunded escrow at posting
-- Copy/paste this entire script into Supabase SQL Editor and run once.

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

ALTER TABLE IF EXISTS public.escrows
  ALTER COLUMN freelancer_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.escrows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Employers can view own escrows" ON public.escrows;
CREATE POLICY "Employers can view own escrows"
ON public.escrows
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = escrows.employer_id
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
);

DROP POLICY IF EXISTS "Freelancers can view own escrows" ON public.escrows;
CREATE POLICY "Freelancers can view own escrows"
ON public.escrows
FOR SELECT
USING (
  escrows.freelancer_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = escrows.freelancer_id
      AND lower(p.aleo_address) = public.current_aleo_address()
  )
);

DROP POLICY IF EXISTS "Anyone can create escrows" ON public.escrows;
CREATE POLICY "Anyone can create escrows"
ON public.escrows
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can update escrows" ON public.escrows;
CREATE POLICY "Anyone can update escrows"
ON public.escrows
FOR UPDATE
USING (true)
WITH CHECK (true);

SELECT 'prefunded_escrow_posting_fix_applied' AS status;

