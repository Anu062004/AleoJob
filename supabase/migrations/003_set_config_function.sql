-- Helper functions to set session configuration for RLS policies.
-- Clients in this repo call rpc('set_app_config', ...).

CREATE OR REPLACE FUNCTION public.set_app_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM pg_catalog.set_config(setting_name, setting_value, false);
END;
$$ LANGUAGE plpgsql;

-- Backward-compatible alias used by older scripts.
CREATE OR REPLACE FUNCTION public.set_config(setting_name TEXT, setting_value TEXT)
RETURNS void AS $$
BEGIN
  PERFORM public.set_app_config(setting_name, setting_value);
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.set_app_config(TEXT, TEXT) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_config(TEXT, TEXT) TO PUBLIC;













