-- Current state of the entries table.
-- One row per calendar date; primary table for all daily metrics.
-- Update this file whenever a migration changes this table.

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
  coffee_count        NUMERIC,
  breakfast_notes     TEXT,
  lunch_notes         TEXT,
  dinner_notes        TEXT,
  snack_notes         TEXT,
  general_notes       TEXT,
  bm_count            INT,
  avg_bristol         NUMERIC,
  max_urgency         INT,
  total_exercise_min  NUMERIC,
  did_exercise        BOOLEAN,
  rest_day            BOOLEAN
);
