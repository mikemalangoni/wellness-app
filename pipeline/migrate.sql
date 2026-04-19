-- Migration: add food/beverage logging + exercise notes + exercise_sets table
-- Run once against Neon: psql $DATABASE_URL -f pipeline/migrate.sql

ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS coffee_count     INT,
  ADD COLUMN IF NOT EXISTS breakfast_notes  TEXT,
  ADD COLUMN IF NOT EXISTS lunch_notes      TEXT,
  ADD COLUMN IF NOT EXISTS dinner_notes     TEXT,
  ADD COLUMN IF NOT EXISTS snack_notes      TEXT,
  ADD COLUMN IF NOT EXISTS general_notes    TEXT;

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
