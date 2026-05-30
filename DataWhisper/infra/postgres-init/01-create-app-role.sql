-- Create a non-superuser role for the application.
-- Superusers BYPASS RLS — the app must connect as this role for tenant isolation.
-- This runs automatically on first `docker compose up` via docker-entrypoint-initdb.d.

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'datawhisper_app') THEN
    CREATE ROLE datawhisper_app WITH LOGIN PASSWORD 'datawhisper_app_secret';
  END IF;
END $$;

-- Grant the app role full access to the database objects (but NOT superuser)
GRANT ALL PRIVILEGES ON DATABASE datawhisper TO datawhisper_app;
GRANT ALL PRIVILEGES ON SCHEMA public TO datawhisper_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO datawhisper_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO datawhisper_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO datawhisper_app;
