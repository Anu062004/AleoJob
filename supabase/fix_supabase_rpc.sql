-- SQL Script to fix "function public.set_app_config ... not found"
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)

CREATE OR REPLACE FUNCTION set_app_config(setting_name text, setting_value text)
RETURNS void AS $$
BEGIN
  -- This sets a session-level configuration variable
  -- which can be used in RLS policies via: current_setting('app.aleo_address', true)
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the anon and authenticated roles
GRANT EXECUTE ON FUNCTION set_app_config(text, text) TO anon;
GRANT EXECUTE ON FUNCTION set_app_config(text, text) TO authenticated;

COMMENT ON FUNCTION set_app_config IS 'Sets a session-level config variable for RLS policies.';
