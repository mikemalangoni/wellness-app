-- Current state of the exercise_sets table.
-- One row per set within a strength exercise session.
-- Update this file whenever a migration changes this table.

CREATE TABLE IF NOT EXISTS exercise_sets (
  id                  SERIAL PRIMARY KEY,
  exercise_session_id INT NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  exercise_name       TEXT,
  sets                INT,
  reps                INT,
  weight_lbs          NUMERIC,
  notes               TEXT
);
