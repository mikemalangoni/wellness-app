-- Current state of the reports table.
-- One row per weekly AI-generated synthesis report.
-- Update this file whenever a migration changes this table.

CREATE TABLE IF NOT EXISTS reports (
  id            SERIAL PRIMARY KEY,
  week_start    DATE,
  content       TEXT,
  generated_at  TIMESTAMP
);
