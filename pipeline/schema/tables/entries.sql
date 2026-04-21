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

COMMENT ON TABLE entries IS 'One row per calendar date. Primary table for all daily wellness metrics — sleep, HRV, mood, nutrition, hydration, and exercise aggregates.';

COMMENT ON COLUMN entries.date               IS 'Calendar date (primary key). Each date has exactly one row.';
COMMENT ON COLUMN entries.sleep_duration     IS 'Total hours of sleep (e.g. 7.4). Sourced from Apple Health via Spine Log.';
COMMENT ON COLUMN entries.bed_time           IS 'Bedtime timestamp (typically the previous evening).';
COMMENT ON COLUMN entries.wake_time          IS 'Wake time timestamp.';
COMMENT ON COLUMN entries.hrv               IS 'Heart rate variability in milliseconds. Sourced from Apple Health.';
COMMENT ON COLUMN entries.deep_min           IS 'Minutes spent in deep sleep stage.';
COMMENT ON COLUMN entries.core_min           IS 'Minutes spent in core sleep stage.';
COMMENT ON COLUMN entries.rem_min            IS 'Minutes spent in REM sleep stage.';
COMMENT ON COLUMN entries.awake_min          IS 'Minutes awake during the sleep window.';
COMMENT ON COLUMN entries.deep_pct           IS 'Fraction of sleep time in the deep stage (0–1).';
COMMENT ON COLUMN entries.core_pct           IS 'Fraction of sleep time in the core stage (0–1).';
COMMENT ON COLUMN entries.rem_pct            IS 'Fraction of sleep time in the REM stage (0–1).';
COMMENT ON COLUMN entries.mood               IS 'Self-reported mood rating 1–5 (1=very low, 5=excellent).';
COMMENT ON COLUMN entries.focus              IS 'Self-reported focus/cognitive rating 1–5 (1=very low, 5=excellent).';
COMMENT ON COLUMN entries.water_oz           IS 'Total water intake in ounces. Supports incremental adds via the log form.';
COMMENT ON COLUMN entries.coffee_count       IS 'Number of coffees consumed. Supports fractional values (e.g. 0.5 cup).';
COMMENT ON COLUMN entries.breakfast_notes    IS 'Free-text description of breakfast.';
COMMENT ON COLUMN entries.lunch_notes        IS 'Free-text description of lunch.';
COMMENT ON COLUMN entries.dinner_notes       IS 'Free-text description of dinner.';
COMMENT ON COLUMN entries.snack_notes        IS 'Free-text description of snacks.';
COMMENT ON COLUMN entries.general_notes      IS 'Free-text general notes for the day.';
COMMENT ON COLUMN entries.bm_count           IS 'Bowel movement count for the day. Aggregated from gi_events on each ingest/save.';
COMMENT ON COLUMN entries.avg_bristol        IS 'Average Bristol stool scale score (1–7) across all gi_events for the day.';
COMMENT ON COLUMN entries.max_urgency        IS 'Highest urgency level logged across gi_events (1=low, 2=moderate, 3=high).';
COMMENT ON COLUMN entries.total_exercise_min IS 'Total exercise time in decimal minutes. Aggregated from exercise_sessions on each ingest/save.';
COMMENT ON COLUMN entries.did_exercise       IS 'True if any exercise_sessions exist for this date.';
COMMENT ON COLUMN entries.rest_day           IS 'True if the day was explicitly flagged as a rest day in the Spine Log.';
