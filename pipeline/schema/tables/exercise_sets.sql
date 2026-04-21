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

COMMENT ON TABLE exercise_sets IS 'One row per set within a strength training session. Child of exercise_sessions; deleted automatically when the parent session is deleted.';

COMMENT ON COLUMN exercise_sets.id                  IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN exercise_sets.exercise_session_id IS 'FK to exercise_sessions.id. Cascade-deletes with the parent session.';
COMMENT ON COLUMN exercise_sets.exercise_name       IS 'Name of the exercise (e.g. Bench Press, Squat).';
COMMENT ON COLUMN exercise_sets.sets                IS 'Number of sets performed.';
COMMENT ON COLUMN exercise_sets.reps                IS 'Reps per set.';
COMMENT ON COLUMN exercise_sets.weight_lbs          IS 'Weight in pounds.';
COMMENT ON COLUMN exercise_sets.notes               IS 'Free-text notes for this set (e.g. RPE, form cues).';
