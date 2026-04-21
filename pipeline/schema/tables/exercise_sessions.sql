-- Current state of the exercise_sessions table.
-- One row per exercise block within a day.
-- Update this file whenever a migration changes this table.

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id            SERIAL PRIMARY KEY,
  date          DATE,
  activity_type TEXT,
  activity_raw  TEXT,
  duration_min  NUMERIC,
  notes         TEXT
);

COMMENT ON TABLE exercise_sessions IS 'One row per exercise block within a day. Multiple sessions may exist per date. duration_min is stored as decimal minutes (e.g. 23:09 → 23.15).';

COMMENT ON COLUMN exercise_sessions.id            IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN exercise_sessions.date          IS 'Calendar date of the session. References entries.date.';
COMMENT ON COLUMN exercise_sessions.activity_type IS 'Normalized activity category: Run, Walk, Strength, Cycling, Yoga, Swimming, Movement, or Other.';
COMMENT ON COLUMN exercise_sessions.activity_raw  IS 'Original activity text as parsed from the Spine Log before normalization.';
COMMENT ON COLUMN exercise_sessions.duration_min  IS 'Duration in decimal minutes (e.g. a 23:09 session is stored as 23.15). Supports MM:SS and H:MM:SS input.';
COMMENT ON COLUMN exercise_sessions.notes         IS 'Free-text notes about the session.';
