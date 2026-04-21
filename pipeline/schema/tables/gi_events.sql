-- Current state of the gi_events table.
-- One row per bowel movement event.
-- Update this file whenever a migration changes this table.

CREATE TABLE IF NOT EXISTS gi_events (
  id          SERIAL PRIMARY KEY,
  date        DATE,
  event_time  TIME,
  bristol     INT,
  urgency     INT
);
