"use client";

import { useTransition, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { saveLog, type GIEventInput, type ExerciseInput, type LogInput } from "./actions";

const ACTIVITY_TYPES = ["Run", "Walk", "Strength", "Cycling", "Yoga", "Swimming", "Movement", "Other"];

function to24h(t: string): string {
  const m = t.match(/(\d{1,2}):(\d{2})(am|pm)/i);
  if (!m) return "";
  let h = parseInt(m[1]);
  const min = m[2];
  const mer = m[3].toLowerCase();
  if (mer === "pm" && h !== 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${min}`;
}

type SleepFields = {
  sleep_duration?: string;
  bed_time?: string;
  wake_time?: string;
  hrv?: string;
  deep_min?: string;
  core_min?: string;
  rem_min?: string;
  awake_min?: string;
};

function parseSleepPaste(text: string): SleepFields {
  const r: SleepFields = {};
  const bw = text.match(/Bed:\s*(\d{1,2}:\d{2}(?:am|pm))\s*[→>-]+\s*Wake:\s*(\d{1,2}:\d{2}(?:am|pm))/i);
  if (bw) { r.bed_time = to24h(bw[1]); r.wake_time = to24h(bw[2]); }
  const dur = text.match(/Duration:\s*([\d.]+)/i);
  if (dur) r.sleep_duration = dur[1];
  const deep = text.match(/Deep:\s*(\d+)\s*min/i);   if (deep) r.deep_min = deep[1];
  const core = text.match(/Core:\s*(\d+)\s*min/i);   if (core) r.core_min = core[1];
  const rem  = text.match(/REM:\s*(\d+)\s*min/i);    if (rem)  r.rem_min  = rem[1];
  const awk  = text.match(/Awake:\s*(\d+)\s*min/i);  if (awk)  r.awake_min = awk[1];
  const hrv  = text.match(/HRV:\s*([\d.]+)\s*ms/i);  if (hrv)  r.hrv = hrv[1];
  return r;
}
const BRISTOL_LABELS: Record<number, string> = {
  1: "1 – Hard lumps",
  2: "2 – Lumpy",
  3: "3 – Cracked",
  4: "4 – Smooth",
  5: "5 – Soft",
  6: "6 – Mushy",
  7: "7 – Liquid",
};

function RatingInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`h-9 w-9 rounded-md border text-sm font-medium transition-colors ${
            value === n
              ? "border-foreground bg-foreground text-background"
              : "border-border hover:border-foreground/50"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function num(v: string): number | null {
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function int(v: string): number | null {
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

function parseDuration(v: string): number | null {
  const hhmmss = v.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hhmmss) return parseInt(hhmmss[1], 10) * 60 + parseInt(hhmmss[2], 10) + parseInt(hhmmss[3], 10) / 60;
  const mmss = v.match(/^(\d+):(\d{2})$/);
  if (mmss) return parseInt(mmss[1], 10) + parseInt(mmss[2], 10) / 60;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function splitDuration(raw: string): { h: string; m: string; s: string; showH: boolean } {
  const hhmmss = raw.match(/^(\d+):(\d{2}):(\d{2})$/);
  if (hhmmss) {
    const h = parseInt(hhmmss[1], 10);
    return { h: h > 0 ? hhmmss[1] : "", m: hhmmss[2], s: hhmmss[3], showH: h > 0 };
  }
  const mmss = raw.match(/^(\d+):(\d{2})$/);
  if (mmss) return { h: "", m: mmss[1], s: mmss[2], showH: false };
  const n = parseFloat(raw);
  if (!isNaN(n) && n > 0) {
    const totalSec = Math.round(n * 60);
    const s = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    if (totalMin >= 60) {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return { h: String(h), m: String(m).padStart(2, "0"), s: String(s).padStart(2, "0"), showH: true };
    }
    return { h: "", m: String(totalMin), s: String(s).padStart(2, "0"), showH: false };
  }
  return { h: "", m: "", s: "", showH: false };
}

function segsToRaw(h: string, m: string, s: string, showH: boolean): string {
  const mm = m || "0";
  const ss = s || "0";
  if (showH && parseInt(h || "0") > 0) {
    return `${parseInt(h)}:${mm.padStart(2, "0")}:${ss.padStart(2, "0")}`;
  }
  return `${mm}:${ss.padStart(2, "0")}`;
}

function today(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD in local time
}

export type InitialData = Partial<LogInput> & {
  gi_events?: GIEventInput[];
  exercise_sessions?: ExerciseInput[];
};

export function LogForm({ initial }: { initial: InitialData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Core fields
  const [date, setDate] = useState(initial.date ?? today());

  // Redirect to ?date=localDate on first load so the server fetches data
  // for the client's local date rather than the DB server's UTC date.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.get("date")) {
      router.replace(`/log?date=${today()}`);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [sleepPaste, setSleepPaste] = useState("");
  const [sleepDuration, setSleepDuration] = useState(initial.sleep_duration?.toString() ?? "");
  const [sleepDurationManual, setSleepDurationManual] = useState(!!initial.sleep_duration);
  const [bedTime, setBedTime] = useState(initial.bed_time ?? "");
  const [wakeTime, setWakeTime] = useState(initial.wake_time ?? "");
  const [hrv, setHrv] = useState(initial.hrv?.toString() ?? "");
  const [deepMin, setDeepMin] = useState(initial.deep_min?.toString() ?? "");
  const [coreMin, setCoreMin] = useState(initial.core_min?.toString() ?? "");
  const [remMin, setRemMin] = useState(initial.rem_min?.toString() ?? "");
  const [awakeMin, setAwakeMin] = useState(initial.awake_min?.toString() ?? "");
  const [mood, setMood] = useState<number | null>(initial.mood ?? null);
  const [focus, setFocus] = useState<number | null>(initial.focus ?? null);
  const [waterOz, setWaterOz] = useState(initial.water_oz?.toString() ?? "");
  const [waterAdd, setWaterAdd] = useState("");
  const [alcoholCount, setAlcoholCount] = useState(initial.alcohol_count?.toString() ?? "");
  const [alcoholDesc, setAlcoholDesc] = useState(initial.alcohol_desc ?? "");
  const [coffeeCount, setCoffeeCount] = useState(initial.coffee_count?.toString() ?? "");
  const [coffeeAdd, setCoffeeAdd] = useState("");
  const [breakfastNotes, setBreakfastNotes] = useState(initial.breakfast_notes ?? "");
  const [lunchNotes, setLunchNotes] = useState(initial.lunch_notes ?? "");
  const [dinnerNotes, setDinnerNotes] = useState(initial.dinner_notes ?? "");
  const [snackNotes, setSnackNotes] = useState(initial.snack_notes ?? "");
  const [generalNotes, setGeneralNotes] = useState(initial.general_notes ?? "");
  const [restDay, setRestDay] = useState(initial.rest_day ?? false);

  // Auto-compute duration from bed/wake only when not overridden by paste or manual edit
  useEffect(() => {
    if (sleepPaste) return;
    if (sleepDurationManual) return;
    if (!bedTime || !wakeTime) return;
    const [bh, bm] = bedTime.split(":").map(Number);
    const [wh, wm] = wakeTime.split(":").map(Number);
    let bedMins = bh * 60 + bm;
    const wakeMins = wh * 60 + wm;
    if (bh >= 12) bedMins -= 24 * 60;
    let diff = wakeMins - bedMins;
    if (diff <= 0) diff += 24 * 60;
    setSleepDuration((Math.round((diff / 60) * 10) / 10).toString());
  }, [bedTime, wakeTime, sleepDurationManual]); // eslint-disable-line react-hooks/exhaustive-deps

  const [giEvents, setGiEvents] = useState<GIEventInput[]>(
    initial.gi_events?.length ? initial.gi_events : []
  );
  const [exercises, setExercises] = useState<ExerciseInput[]>(
    initial.exercise_sessions?.length ? initial.exercise_sessions : []
  );
  const [exerciseHours, setExerciseHours] = useState<string[]>(() =>
    (initial.exercise_sessions ?? []).map((e) => splitDuration(e.duration_min?.toString() ?? "").h)
  );
  const [exerciseMins, setExerciseMins] = useState<string[]>(() =>
    (initial.exercise_sessions ?? []).map((e) => splitDuration(e.duration_min?.toString() ?? "").m)
  );
  const [exerciseSecs, setExerciseSecs] = useState<string[]>(() =>
    (initial.exercise_sessions ?? []).map((e) => splitDuration(e.duration_min?.toString() ?? "").s)
  );
  const [exerciseShowHours, setExerciseShowHours] = useState<boolean[]>(() =>
    (initial.exercise_sessions ?? []).map((e) => splitDuration(e.duration_min?.toString() ?? "").showH)
  );

  function addGI() {
    setGiEvents((prev) => [...prev, { event_time: "", bristol: 0, urgency: "" }]);
  }

  function updateGI(i: number, patch: Partial<GIEventInput>) {
    setGiEvents((prev) => prev.map((ev, idx) => (idx === i ? { ...ev, ...patch } : ev)));
  }

  function removeGI(i: number) {
    setGiEvents((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addExercise() {
    setExercises((prev) => [
      ...prev,
      { activity_type: "Run", duration_min: null, hr_avg: null, effort: null, distance_mi: null, notes: "" },
    ]);
    setExerciseHours((prev) => [...prev, ""]);
    setExerciseMins((prev) => [...prev, ""]);
    setExerciseSecs((prev) => [...prev, ""]);
    setExerciseShowHours((prev) => [...prev, false]);
  }

  function updateEx(i: number, patch: Partial<ExerciseInput>) {
    setExercises((prev) => prev.map((ex, idx) => (idx === i ? { ...ex, ...patch } : ex)));
  }

  function updateDurationSegment(i: number, field: "h" | "m" | "s", val: string) {
    const h = field === "h" ? val : (exerciseHours[i] ?? "");
    const m = field === "m" ? val : (exerciseMins[i] ?? "");
    const s = field === "s" ? val : (exerciseSecs[i] ?? "");
    const showH = exerciseShowHours[i] ?? false;
    if (field === "h") setExerciseHours((prev) => prev.map((v, idx) => idx === i ? val : v));
    else if (field === "m") setExerciseMins((prev) => prev.map((v, idx) => idx === i ? val : v));
    else setExerciseSecs((prev) => prev.map((v, idx) => idx === i ? val : v));
    updateEx(i, { duration_min: parseDuration(segsToRaw(h, m, s, showH)) });
  }

  function removeEx(i: number) {
    setExercises((prev) => prev.filter((_, idx) => idx !== i));
    setExerciseHours((prev) => prev.filter((_, idx) => idx !== i));
    setExerciseMins((prev) => prev.filter((_, idx) => idx !== i));
    setExerciseSecs((prev) => prev.filter((_, idx) => idx !== i));
    setExerciseShowHours((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit() {
    const input: LogInput = {
      date,
      sleep_duration: num(sleepDuration),
      bed_time: bedTime,
      wake_time: wakeTime,
      hrv: num(hrv),
      deep_min: num(deepMin),
      core_min: num(coreMin),
      rem_min: num(remMin),
      awake_min: num(awakeMin),
      mood,
      focus,
      water_oz: (num(waterOz) ?? 0) + (num(waterAdd) ?? 0) || null,
      alcohol_count: int(alcoholCount),
      alcohol_desc: alcoholDesc,
      coffee_count: (num(coffeeCount) ?? 0) + (num(coffeeAdd) ?? 0) || null,
      breakfast_notes: breakfastNotes,
      lunch_notes: lunchNotes,
      dinner_notes: dinnerNotes,
      snack_notes: snackNotes,
      general_notes: generalNotes,
      gi_events: giEvents,
      exercise_sessions: exercises,
      rest_day: restDay,
    };

    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveLog(input);
      if (result.success) {
        const newWater = (num(waterOz) ?? 0) + (num(waterAdd) ?? 0);
        const newCoffee = (num(coffeeCount) ?? 0) + (num(coffeeAdd) ?? 0);
        setWaterOz(newWater ? newWater.toString() : "");
        setWaterAdd("");
        setCoffeeCount(newCoffee ? newCoffee.toString() : "");
        setCoffeeAdd("");
        setSaved(true);
      } else {
        setError(result.error ?? "Save failed");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Log Entry</h1>
          <p className="text-sm text-muted-foreground mt-1">Record today's wellness data</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-40"
        />
      </div>

      {/* Sleep */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Sleep</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Paste from Claude</label>
            <textarea
              rows={3}
              placeholder={"Bed: 11:24pm → Wake: 7:20am\nDuration: 7.5 hrs | Apple Watch\nDeep: 27 min | Core: 324 min | REM: 101 min | Awake: 24 min\nHRV: 22 ms"}
              value={sleepPaste}
              onChange={(e) => {
                const text = e.target.value;
                setSleepPaste(text);
                const parsed = parseSleepPaste(text);
                if (parsed.sleep_duration) { setSleepDuration(parsed.sleep_duration); setSleepDurationManual(true); }
                if (parsed.bed_time)       setBedTime(parsed.bed_time);
                if (parsed.wake_time)      setWakeTime(parsed.wake_time);
                if (parsed.hrv)            setHrv(parsed.hrv);
                if (parsed.deep_min)       setDeepMin(parsed.deep_min);
                if (parsed.core_min)       setCoreMin(parsed.core_min);
                if (parsed.rem_min)        setRemMin(parsed.rem_min);
                if (parsed.awake_min)      setAwakeMin(parsed.awake_min);
              }}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-base font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">
                Duration (hrs){!sleepDurationManual && !sleepPaste && sleepDuration ? " (auto)" : ""}
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="24"
                placeholder="7.5"
                value={sleepDuration}
                onChange={(e) => {
                  setSleepDuration(e.target.value);
                  setSleepDurationManual(!!e.target.value);
                }}
                className="w-32"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Bed time</label>
                <Input type="time" value={bedTime} onChange={(e) => setBedTime(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Wake time</label>
                <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">HRV (ms)</label>
            <Input
              type="number"
              placeholder="45"
              value={hrv}
              onChange={(e) => setHrv(e.target.value)}
              className="w-32"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              Sleep stages (minutes)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Deep", value: deepMin, set: setDeepMin },
                { label: "Core", value: coreMin, set: setCoreMin },
                { label: "REM", value: remMin, set: setRemMin },
                { label: "Awake", value: awakeMin, set: setAwakeMin },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label className="text-xs text-muted-foreground">{label}</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={value}
                    onChange={(e) => set(e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mood & Focus */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Mood &amp; Focus</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Mood</label>
            <RatingInput value={mood} onChange={setMood} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Focus</label>
            <RatingInput value={focus} onChange={setFocus} />
          </div>
        </CardContent>
      </Card>

      {/* Intake */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Intake</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Water (oz)</label>
              <p className="text-sm font-medium mb-1">{waterOz || "0"} oz today</p>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Add oz"
                value={waterAdd}
                onChange={(e) => setWaterAdd(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Coffee (cups)</label>
              <p className="text-sm font-medium mb-1">{coffeeCount || "0"} cups today</p>
              <Input
                type="number"
                step="any"
                min="0"
                placeholder="Add cups"
                value={coffeeAdd}
                onChange={(e) => setCoffeeAdd(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Alcohol (drinks)</label>
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={alcoholCount}
                onChange={(e) => setAlcoholCount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Input
                type="text"
                placeholder="e.g. 2 beers"
                value={alcoholDesc}
                onChange={(e) => setAlcoholDesc(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Food */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Food</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Breakfast", value: breakfastNotes, set: setBreakfastNotes },
            { label: "Lunch",     value: lunchNotes,     set: setLunchNotes },
            { label: "Dinner",    value: dinnerNotes,    set: setDinnerNotes },
            { label: "Snack",     value: snackNotes,     set: setSnackNotes },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-xs text-muted-foreground">{label}</label>
              <Input
                type="text"
                placeholder="—"
                value={value}
                onChange={(e) => set(e.target.value)}
              />
            </div>
          ))}
          <div>
            <label className="text-xs text-muted-foreground">Notes</label>
            <Input
              type="text"
              placeholder="—"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* GI */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">GI Events</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addGI}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {giEvents.length === 0 && (
            <p className="text-xs text-muted-foreground">No events logged</p>
          )}
          {giEvents.map((ev, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="time"
                value={ev.event_time}
                onChange={(e) => updateGI(i, { event_time: e.target.value })}
                className="w-28"
              />
              <select
                value={ev.bristol}
                onChange={(e) => updateGI(i, { bristol: parseInt(e.target.value) })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1"
              >
                <option value={0}>Bristol…</option>
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <option key={n} value={n}>
                    {BRISTOL_LABELS[n]}
                  </option>
                ))}
              </select>
              <select
                value={ev.urgency}
                onChange={(e) =>
                  updateGI(i, { urgency: e.target.value as GIEventInput["urgency"] })
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm w-32"
              >
                <option value="">Urgency…</option>
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
              </select>
              <button
                type="button"
                onClick={() => removeGI(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Exercise */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Exercise</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={addExercise} disabled={restDay}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={restDay}
              onChange={(e) => {
                setRestDay(e.target.checked);
                if (e.target.checked) setExercises([]);
              }}
              className="h-4 w-4"
            />
            Rest day
          </label>
          {!restDay && exercises.length === 0 && (
            <p className="text-xs text-muted-foreground">No sessions logged</p>
          )}
          {exercises.map((ex, i) => (
            <div key={i} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center gap-2">
                <select
                  value={ex.activity_type}
                  onChange={(e) => updateEx(i, { activity_type: e.target.value })}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm flex-1"
                >
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeEx(i)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <label className="text-xs text-muted-foreground">Duration</label>
                  <div className="flex items-center gap-1 mt-1">
                    {!exerciseShowHours[i] ? (
                      <button
                        type="button"
                        onClick={() => setExerciseShowHours((p) => p.map((v, idx) => idx === i ? true : v))}
                        className="text-xs text-muted-foreground hover:text-foreground px-1 py-0.5 border border-border rounded leading-none"
                      >
                        +h
                      </button>
                    ) : (
                      <>
                        <Input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={exerciseHours[i] ?? ""}
                          onChange={(e) => updateDurationSegment(i, "h", e.target.value)}
                          className="w-9 text-center px-1"
                        />
                        <span className="text-xs text-muted-foreground">h</span>
                      </>
                    )}
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="00"
                      value={exerciseMins[i] ?? ""}
                      onChange={(e) => updateDurationSegment(i, "m", e.target.value)}
                      className="w-11 text-center px-1"
                    />
                    <span className="text-xs text-muted-foreground">:</span>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="00"
                      value={exerciseSecs[i] ?? ""}
                      onChange={(e) => updateDurationSegment(i, "s", e.target.value)}
                      className="w-11 text-center px-1"
                    />
                    <span className="text-xs text-muted-foreground">m:s</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">HR avg (bpm)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="155"
                    value={ex.hr_avg ?? ""}
                    onChange={(e) => updateEx(i, { hr_avg: int(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Effort (1–10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="6"
                    value={ex.effort ?? ""}
                    onChange={(e) => updateEx(i, { effort: int(e.target.value) })}
                  />
                </div>
                {(ex.activity_type === "Run" || ex.activity_type === "Walk" || ex.activity_type === "Cycling") && (
                  <div>
                    <label className="text-xs text-muted-foreground">Distance (mi)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="3.1"
                      value={ex.distance_mi ?? ""}
                      onChange={(e) => updateEx(i, { distance_mi: num(e.target.value) })}
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Squats 3×10 @ 185 lb, Bench 3×8 @ 135 lb"
                  value={ex.notes}
                  onChange={(e) => updateEx(i, { notes: e.target.value })}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      {saved && (
        <p className="text-sm text-green-600 rounded-md border border-green-500/50 bg-green-500/10 px-3 py-2">
          Saved
        </p>
      )}

      <Button onClick={handleSubmit} disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save entry"}
      </Button>
    </div>
  );
}
