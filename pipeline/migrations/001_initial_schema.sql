-- Migration: 001_initial_schema
-- Safe to re-run: yes (IF NOT EXISTS throughout)
-- Applied: 2024 (reconstructed baseline — was not originally captured in version control)
-- Description: Initial table creation for all core objects.

CREATE TABLE IF NOT EXISTS entries (
  date                DATE        PRIMARY KEY,
  sleep_duration      NUMERIC,
  bed_time            TIMESTAMP,
  wake_time           TIMESTAMP,
  hrv                 INT,
  deep_min            NUMERIC,
  core_min            NUMERIC,
  rem_min             NUMERIC,
  awake_min           NUMERIC,
  deep_pct            NUMERIC,
  core_pct            NUMERIC,
  rem_pct             NUMERIC,
  mood                INT,
  focus               INT,
  water_oz            NUMERIC,
  coffee_count        INT,
  bm_count            INT,
  avg_bristol         NUMERIC,
  max_urgency         INT,
  total_exercise_min  INT,
  did_exercise        BOOLEAN,
  rest_day            BOOLEAN
);

CREATE TABLE IF NOT EXISTS gi_events (
  id          SERIAL PRIMARY KEY,
  date        DATE,
  event_time  TIME,
  bristol     INT,
  urgency     INT
);

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id            SERIAL PRIMARY KEY,
  date          DATE,
  activity_type TEXT,
  activity_raw  TEXT,
  duration_min  INT
);

CREATE TABLE IF NOT EXISTS reports (
  id            SERIAL PRIMARY KEY,
  week_start    DATE,
  content       TEXT,
  generated_at  TIMESTAMP
);
