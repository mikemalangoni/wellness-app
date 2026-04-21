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
