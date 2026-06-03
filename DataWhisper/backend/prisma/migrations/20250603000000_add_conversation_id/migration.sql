-- Group chat turns into conversations (run once on Neon / Postgres)
ALTER TABLE query_history ADD COLUMN IF NOT EXISTS conversation_id UUID;
CREATE INDEX IF NOT EXISTS idx_query_history_conversation ON query_history (conversation_id, created_at DESC);
