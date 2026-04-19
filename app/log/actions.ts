"use server";

import sql from "@/lib/db";

const URGENCY_MAP = { low: 1, moderate: 2, high: 3 } as const;

export type GIEventInput = {
  event_time: string;
  bristol: number;
  urgency: "low" | "moderate" | "high" | "";
};

export type ExerciseInput = {
  activity_type: string;
  duration_min: number | null;
  hr_avg: number | null;
  effort: number | null;
  distance_mi: number | null;
  notes: string;
};

export type LogInput = {
  date: string;
  sleep_duration: number | null;
  bed_time: string;
  wake_time: string;
  hrv: number | null;
  deep_min: number | null;
  core_min: number | null;
  rem_min: number | null;
  awake_min: number | null;
  mood: number | null;
  focus: number | null;
  water_oz: number | null;
  alcohol_count: number | null;
  alcohol_desc: string;
  coffee_count: number | null;
  breakfast_notes: string;
  lunch_notes: string;
  dinner_notes: string;
  snack_notes: string;
  general_notes: string;
  gi_events: GIEventInput[];
  exercise_sessions: ExerciseInput[];
  rest_day: boolean;
};

function bedDatetime(date: string, timeStr: string): string | null {
  if (!timeStr) return null;
  const [h] = timeStr.split(":").map(Number);
  if (h >= 12) {
    const d = new Date(date + "T12:00:00");
    d.setDate(d.getDate() - 1);
    return `${d.toISOString().slice(0, 10)}T${timeStr}:00`;
  }
  return `${date}T${timeStr}:00`;
}

export async function saveLog(
  input: LogInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { date } = input;

    // Sleep stage percentages
    const stageMins = [input.deep_min, input.core_min, input.rem_min, input.awake_min];
    const stageTotal = stageMins.reduce((s: number, v) => s + (v ?? 0), 0);
    const deep_pct = stageTotal > 0 && input.deep_min != null ? input.deep_min / stageTotal : null;
    const core_pct = stageTotal > 0 && input.core_min != null ? input.core_min / stageTotal : null;
    const rem_pct = stageTotal > 0 && input.rem_min != null ? input.rem_min / stageTotal : null;

    // GI aggregates
    const validGI = input.gi_events.filter((e) => e.bristol > 0);
    const bm_count = validGI.length || null;
    const avg_bristol =
      validGI.length > 0
        ? Math.round((validGI.reduce((s, e) => s + e.bristol, 0) / validGI.length) * 100) / 100
        : null;
    const max_urgency =
      validGI.length > 0
        ? Math.max(...validGI.map((e) => URGENCY_MAP[e.urgency as keyof typeof URGENCY_MAP] ?? 1))
        : null;

    // Exercise aggregates
    const validEx = input.exercise_sessions.filter((e) => e.activity_type);
    const total_exercise_min = validEx.reduce((s, e) => s + (e.duration_min ?? 0), 0) || null;
    const did_exercise = validEx.length > 0;

    const bed_dt = bedDatetime(date, input.bed_time);
    const wake_dt = input.wake_time ? `${date}T${input.wake_time}:00` : null;

    await sql`
      INSERT INTO entries (
        date, sleep_duration, bed_time, wake_time, hrv,
        deep_min, core_min, rem_min, awake_min,
        deep_pct, core_pct, rem_pct,
        mood, focus,
        water_oz, alcohol_count, alcohol_desc,
        coffee_count, breakfast_notes, lunch_notes, dinner_notes, snack_notes, general_notes,
        bm_count, avg_bristol, max_urgency,
        total_exercise_min, did_exercise, rest_day
      ) VALUES (
        ${date}::date,
        ${input.sleep_duration}, ${bed_dt}::timestamp, ${wake_dt}::timestamp, ${input.hrv},
        ${input.deep_min}, ${input.core_min}, ${input.rem_min}, ${input.awake_min},
        ${deep_pct}, ${core_pct}, ${rem_pct},
        ${input.mood}, ${input.focus},
        ${input.water_oz}, ${input.alcohol_count || null}, ${input.alcohol_desc || null},
        ${input.coffee_count || null},
        ${input.breakfast_notes || null}, ${input.lunch_notes || null},
        ${input.dinner_notes || null}, ${input.snack_notes || null}, ${input.general_notes || null},
        ${bm_count}, ${avg_bristol}, ${max_urgency},
        ${total_exercise_min}, ${did_exercise}, ${input.rest_day}
      )
      ON CONFLICT (date) DO UPDATE SET
        sleep_duration     = EXCLUDED.sleep_duration,
        bed_time           = EXCLUDED.bed_time,
        wake_time          = EXCLUDED.wake_time,
        hrv                = EXCLUDED.hrv,
        deep_min           = EXCLUDED.deep_min,
        core_min           = EXCLUDED.core_min,
        rem_min            = EXCLUDED.rem_min,
        awake_min          = EXCLUDED.awake_min,
        deep_pct           = EXCLUDED.deep_pct,
        core_pct           = EXCLUDED.core_pct,
        rem_pct            = EXCLUDED.rem_pct,
        mood               = EXCLUDED.mood,
        focus              = EXCLUDED.focus,
        water_oz           = EXCLUDED.water_oz,
        alcohol_count      = EXCLUDED.alcohol_count,
        alcohol_desc       = EXCLUDED.alcohol_desc,
        coffee_count       = EXCLUDED.coffee_count,
        breakfast_notes    = EXCLUDED.breakfast_notes,
        lunch_notes        = EXCLUDED.lunch_notes,
        dinner_notes       = EXCLUDED.dinner_notes,
        snack_notes        = EXCLUDED.snack_notes,
        general_notes      = EXCLUDED.general_notes,
        bm_count           = EXCLUDED.bm_count,
        avg_bristol        = EXCLUDED.avg_bristol,
        max_urgency        = EXCLUDED.max_urgency,
        total_exercise_min = EXCLUDED.total_exercise_min,
        did_exercise       = EXCLUDED.did_exercise,
        rest_day           = EXCLUDED.rest_day
    `;

    await sql`DELETE FROM gi_events WHERE date = ${date}::date`;
    for (const ev of validGI) {
      await sql`
        INSERT INTO gi_events (date, event_time, bristol, urgency)
        VALUES (
          ${date}::date,
          ${ev.event_time || null}::time,
          ${ev.bristol},
          ${URGENCY_MAP[ev.urgency as keyof typeof URGENCY_MAP] ?? null}
        )
      `;
    }

    await sql`DELETE FROM exercise_sessions WHERE date = ${date}::date`;
    for (const ex of validEx) {
      await sql`
        INSERT INTO exercise_sessions (date, activity_type, activity_raw, duration_min, hr_avg, effort, distance_mi, notes)
        VALUES (
          ${date}::date,
          ${ex.activity_type}, ${ex.activity_type},
          ${ex.duration_min}, ${ex.hr_avg}, ${ex.effort}, ${ex.distance_mi},
          ${ex.notes || null}
        )
      `;
    }

    return { success: true };
  } catch (e) {
    console.error("saveLog error:", e);
    return { success: false, error: String(e) };
  }
}
