-- Migration: add food/beverage logging + exercise notes + exercise_sets table
-- Run once against Neon: psql $DATABASE_URL -f pipeline/migrate.sql

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS coffee_count     INT,
  ADD COLUMN IF NOT EXISTS breakfast_notes  TEXT,
  ADD COLUMN IF NOT EXISTS lunch_notes      TEXT,
  ADD COLUMN IF NOT EXISTS dinner_notes     TEXT,
  ADD COLUMN IF NOT EXISTS snack_notes      TEXT,
  ADD COLUMN IF NOT EXISTS general_notes    TEXT;

-- Migration: allow fractional coffee counts (e.g. 0.5 cup)
ALTER TABLE entries
  ALTER COLUMN coffee_count TYPE NUMERIC;

ALTER TABLE exercise_sessions
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS exercise_sets (
  id                  SERIAL PRIMARY KEY,
  exercise_session_id INT NOT NULL REFERENCES exercise_sessions(id) ON DELETE CASCADE,
  exercise_name       TEXT,
  sets                INT,
  reps                INT,
  weight_lbs          NUMERIC,
  notes               TEXT
);
