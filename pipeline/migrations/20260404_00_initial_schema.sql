-- Migration: 20260404_00_initial_schema
-- Safe to re-run: yes (IF NOT EXISTS throughout)
-- Applied: 2026-04-04 (reconstructed baseline — was not originally captured in version control)
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
COMMENT ON COLUMN entries.coffee_count       IS 'Number of coffees consumed. Upgraded to NUMERIC in 20260419_00 to support fractional values.';
COMMENT ON COLUMN entries.bm_count           IS 'Bowel movement count for the day. Aggregated from gi_events on each ingest/save.';
COMMENT ON COLUMN entries.avg_bristol        IS 'Average Bristol stool scale score (1–7) across all gi_events for the day.';
COMMENT ON COLUMN entries.max_urgency        IS 'Highest urgency level logged across gi_events (1=low, 2=moderate, 3=high).';
COMMENT ON COLUMN entries.total_exercise_min IS 'Total exercise time in minutes. Upgraded to NUMERIC in 20260419_00 for fractional support.';
COMMENT ON COLUMN entries.did_exercise       IS 'True if any exercise_sessions exist for this date.';
COMMENT ON COLUMN entries.rest_day           IS 'True if the day was explicitly flagged as a rest day in the Spine Log.';

CREATE TABLE IF NOT EXISTS gi_events (
  id          SERIAL PRIMARY KEY,
  date        DATE,
  event_time  TIME,
  bristol     INT,
  urgency     INT
);

COMMENT ON TABLE gi_events IS 'One row per bowel movement event. Multiple events may exist per date. Aggregates (bm_count, avg_bristol, max_urgency) are written back to entries on each ingest/save.';
COMMENT ON COLUMN gi_events.id         IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN gi_events.date       IS 'Calendar date of the event. References entries.date.';
COMMENT ON COLUMN gi_events.event_time IS 'Time of the bowel movement event.';
COMMENT ON COLUMN gi_events.bristol    IS 'Bristol stool scale score (1–7). 1=hard lumps, 7=watery.';
COMMENT ON COLUMN gi_events.urgency    IS 'Urgency level: 1=low, 2=moderate, 3=high.';

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id            SERIAL PRIMARY KEY,
  date          DATE,
  activity_type TEXT,
  activity_raw  TEXT,
  duration_min  INT
);

COMMENT ON TABLE exercise_sessions IS 'One row per exercise block within a day. Multiple sessions may exist per date. duration_min upgraded to NUMERIC in 20260419_00.';
COMMENT ON COLUMN exercise_sessions.id            IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN exercise_sessions.date          IS 'Calendar date of the session. References entries.date.';
COMMENT ON COLUMN exercise_sessions.activity_type IS 'Normalized activity category: Run, Walk, Strength, Cycling, Yoga, Swimming, Movement, or Other.';
COMMENT ON COLUMN exercise_sessions.activity_raw  IS 'Original activity text as parsed from the Spine Log before normalization.';
COMMENT ON COLUMN exercise_sessions.duration_min  IS 'Duration in minutes. Upgraded to NUMERIC in 20260419_00 (e.g. 23:09 → 23.15).';

CREATE TABLE IF NOT EXISTS reports (
  id            SERIAL PRIMARY KEY,
  week_start    DATE,
  content       TEXT,
  generated_at  TIMESTAMP
);

COMMENT ON TABLE reports IS 'One row per weekly AI-generated synthesis report. Produced every Monday by the GitHub Actions workflow using GitHub Models (gpt-4o-mini) against the prior 7 days of entries.';
COMMENT ON COLUMN reports.id           IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN reports.week_start   IS 'Start date of the analyzed week.';
COMMENT ON COLUMN reports.content      IS 'Full markdown synthesis text as generated by the AI model.';
COMMENT ON COLUMN reports.generated_at IS 'Timestamp when the report was generated.';
