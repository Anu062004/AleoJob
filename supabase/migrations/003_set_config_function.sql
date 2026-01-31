-- Helper function to set configuration for RLS policies
-- This allows RLS policies to access the current user's Aleo address

CREATE OR REPLACE FUNCTION set_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;

-- Note: In production, you would use Supabase Auth with custom JWT claims
-- This function is a workaround for development/testing









