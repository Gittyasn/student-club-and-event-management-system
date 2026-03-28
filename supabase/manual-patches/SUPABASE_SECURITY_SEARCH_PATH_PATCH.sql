-- Fix Supabase advisor warning:
-- security_definer_without_search_path
--
-- This safely adds an explicit search_path to every SECURITY DEFINER
-- function inside the public schema.
--
-- Why:
-- Supabase Security Advisor warns when SECURITY DEFINER functions do not
-- define a search_path, because unqualified object resolution can be risky.

DO $$
DECLARE
    fn RECORD;
BEGIN
    FOR fn IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND NOT EXISTS (
              SELECT 1
              FROM unnest(coalesce(p.proconfig, '{}'::text[])) cfg
              WHERE cfg LIKE 'search_path=%'
          )
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
            fn.schema_name,
            fn.function_name,
            fn.identity_args
        );
    END LOOP;
END $$;

-- Verification:
-- After running this, re-run the advisor inspection query:
-- security_definer_without_search_path should become 0.
