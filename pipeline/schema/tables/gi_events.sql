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

COMMENT ON TABLE gi_events IS 'One row per bowel movement event. Multiple events may exist per date. Aggregates (bm_count, avg_bristol, max_urgency) are written back to entries on each ingest/save.';

COMMENT ON COLUMN gi_events.id         IS 'Auto-incrementing primary key.';
COMMENT ON COLUMN gi_events.date       IS 'Calendar date of the event. References entries.date.';
COMMENT ON COLUMN gi_events.event_time IS 'Time of the bowel movement event.';
COMMENT ON COLUMN gi_events.bristol    IS 'Bristol stool scale score (1–7). 1=hard lumps, 7=watery.';
COMMENT ON COLUMN gi_events.urgency    IS 'Urgency level: 1=low, 2=moderate, 3=high.';
