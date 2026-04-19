import sql from "@/lib/db";
import { LogForm } from "./LogForm";
import type { InitialData } from "./LogForm";

export const dynamic = "force-dynamic";

async function getTodayEntry(): Promise<InitialData> {
  const [entry] = await sql`
    SELECT
      date::text AS date,
      sleep_duration, hrv,
      deep_min, core_min, rem_min, awake_min,
      mood, focus,
      water_oz, alcohol_count, alcohol_desc,
      rest_day,
      TO_CHAR(bed_time, 'HH24:MI')  AS bed_time,
      TO_CHAR(wake_time, 'HH24:MI') AS wake_time
    FROM entries
    WHERE date = CURRENT_DATE
  `;

  const gi = await sql`
    SELECT
      TO_CHAR(event_time, 'HH24:MI') AS event_time,
      bristol,
      CASE urgency WHEN 1 THEN 'low' WHEN 2 THEN 'moderate' WHEN 3 THEN 'high' ELSE '' END AS urgency
    FROM gi_events
    WHERE date = CURRENT_DATE
    ORDER BY event_time
  `;

  const ex = await sql`
    SELECT activity_type, duration_min, hr_avg, effort, distance_mi
    FROM exercise_sessions
    WHERE date = CURRENT_DATE
    ORDER BY id
  `;

  if (!entry) return {
    gi_events: gi.map((e) => ({
      event_time: e.event_time ?? "",
      bristol: Number(e.bristol),
      urgency: (e.urgency ?? "") as "low" | "moderate" | "high" | "",
    })),
    exercise_sessions: ex.map((e) => ({
      activity_type: e.activity_type ?? "",
      duration_min: e.duration_min != null ? Number(e.duration_min) : null,
      hr_avg: e.hr_avg != null ? Number(e.hr_avg) : null,
      effort: e.effort != null ? Number(e.effort) : null,
      distance_mi: e.distance_mi != null ? Number(e.distance_mi) : null,
    })),
  };

  return {
    ...entry,
    sleep_duration: entry.sleep_duration != null ? Number(entry.sleep_duration) : undefined,
    hrv: entry.hrv != null ? Number(entry.hrv) : undefined,
    deep_min: entry.deep_min != null ? Number(entry.deep_min) : undefined,
    core_min: entry.core_min != null ? Number(entry.core_min) : undefined,
    rem_min: entry.rem_min != null ? Number(entry.rem_min) : undefined,
    awake_min: entry.awake_min != null ? Number(entry.awake_min) : undefined,
    mood: entry.mood != null ? Number(entry.mood) : undefined,
    focus: entry.focus != null ? Number(entry.focus) : undefined,
    water_oz: entry.water_oz != null ? Number(entry.water_oz) : undefined,
    alcohol_count: entry.alcohol_count != null ? Number(entry.alcohol_count) : undefined,
    gi_events: gi.map((e) => ({
      event_time: e.event_time ?? "",
      bristol: Number(e.bristol),
      urgency: (e.urgency ?? "") as "low" | "moderate" | "high" | "",
    })),
    exercise_sessions: ex.map((e) => ({
      activity_type: e.activity_type ?? "",
      duration_min: e.duration_min != null ? Number(e.duration_min) : null,
      hr_avg: e.hr_avg != null ? Number(e.hr_avg) : null,
      effort: e.effort != null ? Number(e.effort) : null,
      distance_mi: e.distance_mi != null ? Number(e.distance_mi) : null,
    })),
  };
}

export default async function LogPage() {
  const initial = await getTodayEntry();
  return <LogForm initial={initial} />;
}
