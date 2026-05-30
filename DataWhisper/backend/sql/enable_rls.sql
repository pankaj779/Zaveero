-- Row Level Security (multi-tenant isolation) for DataWhisper.
--
-- Upgrade: denormalized workspace_id on report_schedules (required for cron + RLS context).
-- Safe to run multiple times.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'report_schedules'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'report_schedules' AND column_name = 'workspace_id'
    ) THEN
      ALTER TABLE report_schedules ADD COLUMN workspace_id uuid REFERENCES workspaces(id);
      UPDATE report_schedules rs SET workspace_id = sr.workspace_id FROM saved_reports sr WHERE sr.id = rs.report_id;
      ALTER TABLE report_schedules ALTER COLUMN workspace_id SET NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_report_schedules_workspace_id ON report_schedules(workspace_id);
    END IF;
  END IF;
END $$;

-- Prerequisites:
--   1. Apply after Prisma has created all tables (prisma db push / migrate).
--   2. The application sets transaction-local GUC app.workspace_id on each authenticated request
--      (see app.db.workspace_transaction and middleware_rls).
--   3. RLS is enforced for non-superuser roles. PostgreSQL superusers BYPASS RLS — use a dedicated
--      non-superuser DATABASE_URL in production to get real isolation. Table owners also bypass RLS
--      unless FORCE ROW LEVEL SECURITY is set (we set it below).
--
-- Apply manually: psql "$DATABASE_URL" -f backend/sql/enable_rls.sql
-- Docker: backend/docker-entrypoint.sh runs this automatically after `prisma db push`.
--
-- Revert: run the DROP section at the bottom (or restore from backup).

-- Workspace-scoped tables (direct workspace_id column)
ALTER TABLE db_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_connections FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON db_connections;
CREATE POLICY tenant_isolation ON db_connections
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON query_history;
CREATE POLICY tenant_isolation ON query_history
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON saved_reports;
CREATE POLICY tenant_isolation ON saved_reports
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

ALTER TABLE saved_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_dashboards FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON saved_dashboards;
CREATE POLICY tenant_isolation ON saved_dashboards
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON audit_logs;
CREATE POLICY tenant_isolation ON audit_logs
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON user_usage;
CREATE POLICY tenant_isolation ON user_usage
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

-- metadata_versions: scoped via db_connections.workspace_id
ALTER TABLE metadata_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE metadata_versions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON metadata_versions;
CREATE POLICY tenant_isolation ON metadata_versions
  USING (
    EXISTS (
      SELECT 1 FROM db_connections c
      WHERE c.id = metadata_versions.connection_id
        AND c.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM db_connections c
      WHERE c.id = metadata_versions.connection_id
        AND c.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  );

-- lineage_edges: scoped via metadata_versions -> db_connections
ALTER TABLE lineage_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineage_edges FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON lineage_edges;
CREATE POLICY tenant_isolation ON lineage_edges
  USING (
    EXISTS (
      SELECT 1
      FROM metadata_versions mv
      JOIN db_connections c ON c.id = mv.connection_id
      WHERE mv.id = lineage_edges.metadata_version_id
        AND c.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM metadata_versions mv
      JOIN db_connections c ON c.id = mv.connection_id
      WHERE mv.id = lineage_edges.metadata_version_id
        AND c.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  );

-- crawl_sources: workspace-scoped
ALTER TABLE crawl_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_sources FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON crawl_sources;
CREATE POLICY tenant_isolation ON crawl_sources
  USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
  WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);

-- crawl_sessions: scoped via crawl_sources.workspace_id
ALTER TABLE crawl_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_sessions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON crawl_sessions;
CREATE POLICY tenant_isolation ON crawl_sessions
  USING (
    EXISTS (
      SELECT 1 FROM crawl_sources cs
      WHERE cs.id = crawl_sessions.crawl_source_id
        AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawl_sources cs
      WHERE cs.id = crawl_sessions.crawl_source_id
        AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  );

-- code_lineage_nodes: scoped via crawl_sources.workspace_id
ALTER TABLE code_lineage_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_lineage_nodes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON code_lineage_nodes;
CREATE POLICY tenant_isolation ON code_lineage_nodes
  USING (
    EXISTS (
      SELECT 1 FROM crawl_sources cs
      WHERE cs.id = code_lineage_nodes.crawl_source_id
        AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM crawl_sources cs
      WHERE cs.id = code_lineage_nodes.crawl_source_id
        AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
    )
  );

-- discovered_resources: workspace-scoped (denormalized workspace_id for fast filtering + RLS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'discovered_resources'
  ) THEN
    ALTER TABLE discovered_resources ENABLE ROW LEVEL SECURITY;
    ALTER TABLE discovered_resources FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON discovered_resources;
    CREATE POLICY tenant_isolation ON discovered_resources
      USING (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid)
      WITH CHECK (workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid);
  END IF;
END $$;

-- code_symbol_edges: scoped via crawl_sources.workspace_id (same shape as code_lineage_nodes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'code_symbol_edges'
  ) THEN
    ALTER TABLE code_symbol_edges ENABLE ROW LEVEL SECURITY;
    ALTER TABLE code_symbol_edges FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_isolation ON code_symbol_edges;
    CREATE POLICY tenant_isolation ON code_symbol_edges
      USING (
        EXISTS (
          SELECT 1 FROM crawl_sources cs
          WHERE cs.id = code_symbol_edges.crawl_source_id
            AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM crawl_sources cs
          WHERE cs.id = code_symbol_edges.crawl_source_id
            AND cs.workspace_id = (NULLIF(current_setting('app.workspace_id', true), ''))::uuid
        )
      );
  END IF;
END $$;

-- report_schedules: NOT covered by RLS so the internal cron can list due rows across all tenants.
-- Rows include workspace_id for per-job workspace_transaction + saved_reports remains RLS-protected.
-- Protect cron with X-Cron-Secret; do not expose schedule listing publicly.

-- users / workspaces: intentionally NOT covered by RLS so login/register/join can query by email
-- without a prior workspace session variable. Tenant data remains protected on child tables above.

-- Grant the non-superuser app role access to all existing tables/sequences.
-- This is idempotent — safe to run on every startup.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO datawhisper_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO datawhisper_app;
