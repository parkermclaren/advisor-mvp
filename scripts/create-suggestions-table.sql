-- Create the suggested_follow_ups table if it doesn't exist
CREATE TABLE IF NOT EXISTS suggested_follow_ups (
  id SERIAL PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES chat_sessions(chat_id) ON DELETE CASCADE,
  prompts JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE(chat_id)
);

-- Create an index on chat_id for faster lookups
CREATE INDEX IF NOT EXISTS suggested_follow_ups_chat_id_idx ON suggested_follow_ups(chat_id);

-- Add a comment to the table
COMMENT ON TABLE suggested_follow_ups IS 'Stores suggested follow-up prompts for each chat session';

-- Grant appropriate permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON suggested_follow_ups TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE suggested_follow_ups_id_seq TO authenticated, service_role; 