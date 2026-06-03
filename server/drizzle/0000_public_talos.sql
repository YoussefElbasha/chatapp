-- Baseline: schema introspected from an already-provisioned database.
-- The DDL is intentionally a no-op so drizzle records this as applied
-- without re-creating tables that already exist.
SELECT 1;
