-- Add run-specific fields to exercise_sessions
ALTER TABLE exercise_sessions ADD COLUMN IF NOT EXISTS cadence_spm     INT;
ALTER TABLE exercise_sessions ADD COLUMN IF NOT EXISTS elevation_gain_ft NUMERIC;

COMMENT ON COLUMN exercise_sessions.cadence_spm        IS 'Running cadence in strides per minute. Only populated for Run sessions.';
COMMENT ON COLUMN exercise_sessions.elevation_gain_ft  IS 'Elevation gain in feet. Only populated for Run sessions.';
