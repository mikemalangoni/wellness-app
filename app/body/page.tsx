"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  LineChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fillDateSpine, fmtDate } from "@/lib/charts";

type RangeKey = "30d" | "90d" | "6m" | "all";

const RANGES: { label: string; value: RangeKey }[] = [
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "6 months", value: "6m" },
  { label: "All time", value: "all" },
];

const DAYS: Record<string, number> = { "30d": 30, "90d": 90, "6m": 180 };

// Hansons palette — strict to cover colors only
const Y = "#F2B800";          // yellow (MARATHON text)
const R = "#e8394a";          // red (runner's vest — lightened for legibility on gray)
const W = "#c8d4dc";          // light steel — visible on gray background
const STEEL = "#5e7485";      // steel gray (cover background behind runner)
const CARD_BG = "border-[#4a5e6d]";
const CARD_STYLE = { background: STEEL };
const AXIS_TICK = { fontSize: 11, fill: "#ffffff" };
const AXIS_STROKE = "#4a5e6d";
const GRID = "#4a5e6d";

// Only cover colors — yellow, red, white
const TYPE_COLORS: Record<string, string> = {
  Run: Y,
  Strength: R,
  Walk: W,
  Cycling: W,
  Yoga: W,
  Swimming: W,
};

function buildQuery(range: RangeKey, endpoint: string) {
  if (range === "all") return `/api/${endpoint}`;
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - DAYS[range] * 86_400_000)
    .toISOString()
    .split("T")[0];
  return `/api/${endpoint}?from=${from}&to=${to}`;
}

function rollingMean(values: (number | null)[], window = 5): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

/** Returns [sortKey (ms timestamp of Monday), display label] */
function weekStart(dateStr: string): [number, string] {
  // Parse as local date (not UTC) to avoid off-by-one-day errors in UTC-negative timezones.
  // "2026-04-06" parsed as UTC midnight becomes April 5 locally in e.g. Eastern time,
  // which flips the day-of-week and pushes the week bucket back by a full week.
  const [y, mo, dy] = String(dateStr).slice(0, 10).split("-").map(Number);
  const d = new Date(y, mo - 1, dy);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return [d.getTime(), d.toLocaleDateString("en-US", { month: "short", day: "numeric" })];
}

function formatPace(minPerMile: number): string {
  const mins = Math.floor(minPerMile);
  const secs = Math.round((minPerMile - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function DarkStatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className={CARD_BG} style={CARD_STYLE}>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-white/60 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold mt-1" style={{ color: Y }}>{value}</p>
        {sub && <p className="text-xs text-white/80 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#4a5e6d] px-3 py-2 text-xs shadow-md space-y-1" style={CARD_STYLE}>
      <p className="font-medium text-white">{label}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          p.value != null && (
            <p key={p.name} className="flex items-center gap-1.5 text-white">
              <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: p.color }} />
              {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            </p>
          )
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DarkLegend({ payload }: { payload?: any[] }) {
  if (!payload?.length) return null;
  return (
    <div className="flex flex-wrap gap-3 justify-center pt-1">
      {payload.map((p: any) => (
        <div key={p.value} className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm" style={{ background: p.color }} />
          <span className="text-xs text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function BodyPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessions, setSessions] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [exRes, enRes] = await Promise.all([
      fetch(buildQuery(range, "exercise")),
      fetch(buildQuery(range, "entries")),
    ]);
    const WORKOUT_TYPES = new Set(["Run", "Walk", "Strength"]);
    const allSessions = await exRes.json();
    setSessions(allSessions.filter((s: { activity_type: string }) => WORKOUT_TYPES.has(s.activity_type)));
    const rawEntries = await enRes.json();
    const today = new Date().toISOString().slice(0, 10);
    const to = today;
    const from = range === "all" ? null : new Date(Date.now() - DAYS[range] * 86_400_000).toISOString().split("T")[0];
    const start = from ?? (rawEntries.length ? String(rawEntries[0].date).slice(0, 10) : today);
    setEntries(fillDateSpine(rawEntries, start, to));
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  // ── Frequency ──────────────────────────────────────────────────────────────
  const totalSessions = sessions.length;
  const daysActive = new Set(sessions.map((s) => s.date)).size;
  const totalDays = entries.length;
  const pctActive = totalDays ? Math.round((daysActive / totalDays) * 100) : 0;

  // Sessions per week by type
  const weekMap: Record<string, { sortKey: number; counts: Record<string, number> }> = {};
  sessions.forEach((s) => {
    const [sortKey, label] = weekStart(s.date);
    if (!weekMap[label]) weekMap[label] = { sortKey, counts: {} };
    const t = s.activity_type ?? "Other";
    weekMap[label].counts[t] = (weekMap[label].counts[t] ?? 0) + 1;
  });
  const weekData = Object.entries(weekMap)
    .sort(([, a], [, b]) => a.sortKey - b.sortKey)
    .map(([week, { counts }]) => ({ week, ...counts }));

  const activityTypes = [...new Set(sessions.map((s) => s.activity_type ?? "Other"))];

  // Type breakdown for summary
  const typeCounts = activityTypes
    .map((t) => ({ type: t, count: sessions.filter((s) => s.activity_type === t).length }))
    .sort((a, b) => b.count - a.count);

  // ── HR by type ────────────────────────────────────────────────────────────
  const typesWithHr = activityTypes.filter((t) =>
    sessions.some((s) => s.activity_type === t && s.hr_avg != null)
  );

  // Build date-indexed HR data per type
  const allDates = [...new Set(sessions.map((s) => s.date))].sort();
  const hrByTypeData = allDates.map((date) => {
    const row: Record<string, number | string | null> = { date: fmtDate(date) };
    typesWithHr.forEach((t) => {
      const match = sessions.find((s) => s.date === date && s.activity_type === t && s.hr_avg != null);
      row[t] = match ? parseFloat(match.hr_avg) : null;
    });
    return row;
  });

  // ── Runs: Pace & Effort ───────────────────────────────────────────────────
  const runs = sessions
    .filter((s) => s.activity_type === "Run" && s.distance_mi && s.duration_min)
    .map((s) => ({
      date: s.date,
      dateFmt: fmtDate(s.date),
      pace: parseFloat(s.duration_min) / parseFloat(s.distance_mi),
      effort: s.effort ? parseFloat(s.effort) : null,
      hr: s.hr_avg ? parseFloat(s.hr_avg) : null,
      distance: parseFloat(s.distance_mi),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const paceValues = runs.map((r) => r.pace);
  const paceTrend = rollingMean(paceValues, 5);

  const runChartData = runs.map((r, i) => ({
    date: r.dateFmt,
    Pace: parseFloat(r.pace.toFixed(2)),
    "Pace trend": paceTrend[i] != null ? parseFloat(paceTrend[i]!.toFixed(2)) : null,
    Effort: r.effort,
    HR: r.hr,
  }));

  // Bubble chart: bucket by effort + pace (rounded to nearest 0.5 min/mi), size = count
  const bubbleMap: Record<string, { effort: number; pace: number; count: number }> = {};
  runs.filter((r) => r.effort != null).forEach((r) => {
    const roundedPace = Math.round(r.pace * 2) / 2;
    const key = `${r.effort}-${roundedPace}`;
    if (!bubbleMap[key]) bubbleMap[key] = { effort: r.effort as number, pace: roundedPace, count: 0 };
    bubbleMap[key].count++;
  });
  const paceScatterData = Object.values(bubbleMap);

  const tickInterval = range === "30d" ? 3 : range === "90d" ? 8 : 12;
  const weekTickInterval = Math.max(0, Math.floor(weekData.length / 6));

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {/* Hansons-style stacked title */}
          <div className="flex items-stretch gap-3">
            <div className="w-[5px] rounded-sm" style={{ background: R }} />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60 leading-none mb-0.5">
                Training
              </p>
              <h1
                className="text-5xl font-black uppercase leading-none tracking-tight"
                style={{ color: Y }}
              >
                Body
              </h1>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white/60 leading-none mt-0.5">
                Log
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40 uppercase tracking-widest pl-4">
            {totalSessions} sessions · {daysActive} active days
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Frequency stats */}
      <div className="grid grid-cols-3 gap-3">
        <DarkStatCard label="Sessions" value={String(totalSessions)} sub="selected period" />
        <DarkStatCard label="Days Active" value={`${pctActive}%`} sub={`${daysActive} of ${totalDays} days`} />
        <DarkStatCard
          label="Top Activity"
          value={typeCounts[0]?.type ?? "—"}
          sub={typeCounts[0] ? `${typeCounts[0].count} sessions` : undefined}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
      ) : (
        <>
          {/* Sessions per week */}
          <Card className={CARD_BG} style={CARD_STYLE}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                Sessions per Week
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weekData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="week" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={weekTickInterval} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
                  <Legend content={<DarkLegend />} />
                  {activityTypes.map((t) => (
                    <Bar key={t} dataKey={t} stackId="a" fill={TYPE_COLORS[t] ?? "#6b7280"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* HR by type */}
          {typesWithHr.length > 0 && (
            <Card className={CARD_BG} style={CARD_STYLE}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                  Avg HR by Workout Type
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={hrByTypeData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                    <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={tickInterval} />
                    <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} domain={["auto", "auto"]} />
                    <Tooltip content={<DarkTooltip />} />
                    <Legend content={<DarkLegend />} />
                    {typesWithHr.map((t) => (
                      <Line
                        key={t}
                        dataKey={t}
                        stroke={TYPE_COLORS[t] ?? "#6b7280"}
                        strokeWidth={0}
                        dot={{ r: 4, fill: TYPE_COLORS[t] ?? "#6b7280" }}
                        activeDot={{ r: 5 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Runs: Pace over time */}
          {runs.length > 0 && (
            <>
              <Card className={CARD_BG} style={CARD_STYLE}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                    Run Pace Over Time
                  </CardTitle>
                  <p className="text-xs text-white/80">min/mile — lower is faster</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={runChartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                      <XAxis dataKey="date" tick={AXIS_TICK} stroke={AXIS_STROKE} interval={Math.max(0, Math.floor(runChartData.length / 8))} />
                      <YAxis
                        reversed
                        tick={AXIS_TICK}
                        stroke={AXIS_STROKE}
                        tickFormatter={(v) => formatPace(v)}
                        domain={["auto", "auto"]}
                      />
                      <Tooltip
                        content={<DarkTooltip />}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        formatter={(v: any, name: any) =>
                          typeof name === "string" && name.toLowerCase().includes("pace") ? formatPace(v as number) : v
                        }
                      />
                      <Line dataKey="Pace" stroke={Y} strokeWidth={1.5} dot={{ r: 3, fill: Y }} connectNulls />
                      <Line dataKey="Pace trend" stroke={Y} strokeWidth={2.5} strokeOpacity={0.5} dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Pace vs Effort scatter */}
              {paceScatterData.length >= 3 && (
                <Card className={CARD_BG} style={CARD_STYLE}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-yellow-400 uppercase tracking-wide">
                      Pace vs Effort
                    </CardTitle>
                    <p className="text-xs text-white/80">Each dot is one run — effort 1–5, pace in min/mile</p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                        <XAxis
                          dataKey="effort"
                          type="number"
                          domain={[1, 5]}
                          ticks={[1, 2, 3, 4, 5]}
                          tick={AXIS_TICK}
                          stroke={AXIS_STROKE}
                          label={{ value: "Effort", position: "insideBottom", offset: -10, fontSize: 11, fill: "#ffffff" }}
                        />
                        <YAxis
                          dataKey="pace"
                          type="number"
                          reversed
                          tick={AXIS_TICK}
                          stroke={AXIS_STROKE}
                          tickFormatter={(v) => formatPace(v)}
                          domain={["auto", "auto"]}
                        />
                        <ZAxis dataKey="count" range={[60, 600]} name="Runs" />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            const d = payload[0].payload;
                            return (
                              <div className="rounded-lg border border-[#4a5e6d] px-3 py-2 text-xs shadow-md space-y-1" style={CARD_STYLE}>
                                <p className="flex items-center gap-1.5 text-white"><span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: Y }} />Pace: {formatPace(d.pace)}/mi</p>
                                <p className="flex items-center gap-1.5 text-white"><span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: R }} />Effort: {d.effort}/5</p>
                                <p className="text-white">{d.count} {d.count === 1 ? "run" : "runs"}</p>
                              </div>
                            );
                          }}
                        />
                        <Scatter data={paceScatterData} fill={Y} opacity={0.7} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
