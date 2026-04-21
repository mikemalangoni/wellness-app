-- Migration: 20260419_00_food_columns_exercise_notes_sets
-- Safe to re-run: yes (IF NOT EXISTS / idempotent TYPE casts throughout)
-- Applied: 2026-04-19
-- Description: Add food/beverage logging columns, exercise notes, fractional numeric
--   types for duration/coffee, and the exercise_sets child table.

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS coffee_count     INT,
  ADD COLUMN IF NOT EXISTS breakfast_notes  TEXT,
  ADD COLUMN IF NOT EXISTS lunch_notes      TEXT,
  ADD COLUMN IF NOT EXISTS dinner_notes     TEXT,
  ADD COLUMN IF NOT EXISTS snack_notes      TEXT,
  ADD COLUMN IF NOT EXISTS general_notes    TEXT;

-- Allow fractional coffee counts (e.g. 0.5 cup)
ALTER TABLE entries
  ALTER COLUMN coffee_count TYPE NUMERIC;

ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Allow decimal duration_min (MM:SS parsing stores fractional minutes)
ALTER TABLE exercise_sessions
  ALTER COLUMN duration_min TYPE NUMERIC;

ALTER TABLE entries
  ALTER COLUMN total_exercise_min TYPE NUMERIC;

CREATE TABLE IF NOT EXISTS exercise_sets (
  id                  SERIAL PRIMARY KEY,
  exercise_session_id INT NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  exercise_name       TEXT,
  sets                INT,
  reps                INT,
  weight_lbs          NUMERIC,
  notes               TEXT
);

-- Column comments for newly added / altered columns
COMMENT ON COLUMN entries.coffee_count       IS 'Number of coffees consumed. Supports fractional values (e.g. 0.5 cup).';
COMMENT ON COLUMN entries.breakfast_notes    IS 'Free-text description of breakfast.';
COMMENT ON COLUMN entries.lunch_notes        IS 'Free-text description of lunch.';
COMMENT ON COLUMN entries.dinner_notes       IS 'Free-text description of dinner.';
COMMENT ON COLUMN entries.snack_notes        IS 'Free-text description of snacks.';
COMMENT ON COLUMN entries.general_notes      IS 'Free-text general notes for the day.';
COMMENT ON COLUMN entries.total_exercise_min IS 'Total exercise time in decimal minutes. Aggregated from exercise_sessions on each ingest/save.';

COMMENT ON COLUMN exercise_sessions.duration_min IS 'Duration in decimal minutes (e.g. a 23:09 session is stored as 23.15). Supports MM:SS and H:MM:SS input.';
COMMENT ON COLUMN exercise_sessions.notes        IS 'Free-text notes about the session.';

COMMENT ON TABLE exercise_sets IS 'One row per set within a strength training session. Child of exercise_sessions; deleted automatically when the parent session is deleted.';
COMMENT ON COLUMN exercise_sets.id                  IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN exercise_sets.exercise_session_id IS 'FK to exercise_sessions.id. Cascade-deletes with the parent session.';
COMMENT ON COLUMN exercise_sets.exercise_name       IS 'Name of the exercise (e.g. Bench Press, Squat).';
COMMENT ON COLUMN exercise_sets.sets                IS 'Number of sets performed.';
COMMENT ON COLUMN exercise_sets.reps                IS 'Reps per set.';
COMMENT ON COLUMN exercise_sets.weight_lbs          IS 'Weight in pounds.';
COMMENT ON COLUMN exercise_sets.notes               IS 'Free-text notes for this set (e.g. RPE, form cues).';
