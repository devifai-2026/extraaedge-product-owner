-- Read-only Postgres role for Grafana. Run this ONCE against the SYSTEM database
-- (the same DB extraaedge-server uses, where the metrics_* views live).
--
--   1. In Render → your system Postgres → "Connect" → open a psql shell (or use
--      the External Connection string with psql locally).
--   2. Paste this, replacing CHANGE_ME_STRONG_PASSWORD with a strong password.
--   3. Put the resulting connection string into the Grafana service's
--      GF_DATABASE_* / datasource env (see grafana/README.md).
--
-- The role can ONLY read the curated metrics_* views — never the raw tables,
-- request/response bodies, secrets, or any write. Safe to expose to Grafana.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'grafana_ro') THEN
    CREATE ROLE grafana_ro LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
  END IF;
END$$;

-- No access to the schema's tables by default; grant USAGE + SELECT only on the
-- metrics views.
GRANT CONNECT ON DATABASE CURRENT_CATALOG TO grafana_ro;   -- (run connected to the target DB)
GRANT USAGE ON SCHEMA public TO grafana_ro;

GRANT SELECT ON
  metrics_requests,
  metrics_requests_1m,
  metrics_endpoint_1h,
  metrics_status_1m,
  metrics_tenants,
  metrics_tenant_activity_1h,
  metrics_support_open,
  metrics_signups_1d
TO grafana_ro;

-- Explicitly ensure it can't read the raw log or any future table by default.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM grafana_ro;
-- (the GRANT SELECT on the views above still stands — views aren't in "TABLES")

-- Verify:
--   \du grafana_ro
--   SET ROLE grafana_ro; SELECT count(*) FROM metrics_requests_1m; RESET ROLE;
