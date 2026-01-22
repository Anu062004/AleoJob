-- Helper function to set configuration for RLS policies

CREATE OR REPLACE FUNCTION set_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;


