"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGES: { label: string; value: RangeKey }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
];

const DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function buildQuery(range: RangeKey) {
  if (range === "all") return "/api/entries";
  const to = new Date().toISOString().split("T")[0];
  const from = new Date(Date.now() - DAYS[range] * 86_400_000)
    .toISOString()
    .split("T")[0];
  return `/api/entries?from=${from}&to=${to}`;
}

function rollingMean(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

function pearson(xs: number[], ys: number[]): number | null {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => x != null && y != null && !isNaN(x) && !isNaN(y)) as [number, number][];
  if (pairs.length < 5) return null;
  const n = pairs.length;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = Math.sqrt(
    pairs.reduce((s, [x]) => s + (x - mx) ** 2, 0) *
      pairs.reduce((s, [, y]) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? null : num / den;
}

function correlationLabel(r: number): string {
  const abs = Math.abs(r);
  const dir = r > 0 ? "positive" : "negative";
  if (abs >= 0.6) return `Strong ${dir}`;
  if (abs >= 0.35) return `Moderate ${dir}`;
  if (abs >= 0.15) return `Weak ${dir}`;
  return "Negligible";
}

function correlationColor(r: number): string {
  const abs = Math.abs(r);
  if (abs < 0.15) return "text-muted-foreground";
  if (r > 0) return abs >= 0.35 ? "text-green-500" : "text-green-400";
  return abs >= 0.35 ? "text-red-500" : "text-red-400";
}

function fmt(dateStr: string) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-md space-y-1">
      <p className="font-medium">{label}</p>
      {payload.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) =>
          p.value != null && (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
            </p>
          )
      )}
    </div>
  );
}

function CorrelationCard({
  label,
  r,
}: {
  label: string;
  r: number | null;
}) {
  if (r === null) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">Not enough data</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <span className="text-sm">{label}</span>
      <div className="text-right">
        <span className={`text-sm font-semibold ${correlationColor(r)}`}>
          {r > 0 ? "+" : ""}{r.toFixed(2)}
        </span>
        <p className={`text-xs ${correlationColor(r)}`}>{correlationLabel(r)}</p>
      </div>
    </div>
  );
}

export default function MindPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(buildQuery(range));
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const moods = entries.map((e) => (e.mood != null ? parseFloat(e.mood) : null));
  const focuses = entries.map((e) => (e.focus != null ? parseFloat(e.focus) : null));
  const sleepDurations = entries.map((e) => (e.sleep_duration != null ? parseFloat(e.sleep_duration) : null));
  const hrvs = entries.map((e) => (e.hrv != null ? parseFloat(e.hrv) : null));
  const exerciseMins = entries.map((e) => (e.total_exercise_min != null ? parseFloat(e.total_exercise_min) : null));

  const moodTrend = rollingMean(moods);
  const focusTrend = rollingMean(focuses);

  const chartData = entries.map((e, i) => ({
    date: fmt(e.date),
    Mood: moods[i],
    Focus: focuses[i],
    "Mood trend": moodTrend[i] != null ? parseFloat(moodTrend[i]!.toFixed(2)) : null,
    "Focus trend": focusTrend[i] != null ? parseFloat(focusTrend[i]!.toFixed(2)) : null,
  }));

  const moodValues = moods.filter((v): v is number => v !== null);
  const focusValues = focuses.filter((v): v is number => v !== null);

  const avgMood = moodValues.length
    ? (moodValues.reduce((a, b) => a + b, 0) / moodValues.length).toFixed(1)
    : "—";
  const avgFocus = focusValues.length
    ? (focusValues.reduce((a, b) => a + b, 0) / focusValues.length).toFixed(1)
    : "—";

  const tickCount = range === "7d" ? 7 : range === "30d" ? 10 : range === "90d" ? 12 : 14;

  // Correlations — use all-time data from what's loaded, pairs of non-null values
  const moodSleep = pearson(moods as number[], sleepDurations as number[]);
  const moodHrv = pearson(moods as number[], hrvs as number[]);
  const moodExercise = pearson(moods as number[], exerciseMins as number[]);
  const focusSleep = pearson(focuses as number[], sleepDurations as number[]);
  const focusHrv = pearson(focuses as number[], hrvs as number[]);
  const focusExercise = pearson(focuses as number[], exerciseMins as number[]);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Mind</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {moodValues.length} days logged
          </p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Avg Mood" value={avgMood !== "—" ? `${avgMood} / 5` : "—"} sub="selected period" />
        <StatCard label="Avg Focus" value={avgFocus !== "—" ? `${avgFocus} / 5` : "—"} sub="selected period" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <>
          {/* Mood & Focus chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mood &amp; Focus Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d1d5db" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#374151" }}
                    interval={Math.floor(chartData.length / tickCount)}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    domain={[1, 5]}
                    ticks={[1, 2, 3, 4, 5]}
                    tick={{ fontSize: 11, fill: "#374151" }}
                    stroke="#9ca3af"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: "#374151" }} />
                  {/* Raw values */}
                  <Line dataKey="Mood" stroke="#6366f1" strokeWidth={1} dot={{ r: 2, fill: "#6366f1" }} opacity={0.5} connectNulls />
                  <Line dataKey="Focus" stroke="#22c55e" strokeWidth={1} dot={{ r: 2, fill: "#22c55e" }} opacity={0.5} connectNulls />
                  {/* Trendlines */}
                  <Line dataKey="Mood trend" stroke="#6366f1" strokeWidth={2.5} dot={false} connectNulls />
                  <Line dataKey="Focus trend" stroke="#22c55e" strokeWidth={2.5} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Correlations */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Correlations</h2>
            <p className="text-xs text-muted-foreground mb-3">
              How strongly sleep, HRV, and exercise associate with your mood and focus. Correlation doesn&apos;t prove causation, but consistent patterns are worth noting. Use 90d or all-time for the most reliable signal.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Mood</p>
                <CorrelationCard label="Sleep duration → Mood" r={moodSleep} />
                <CorrelationCard label="HRV → Mood" r={moodHrv} />
                <CorrelationCard label="Exercise → Mood" r={moodExercise} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Focus</p>
                <CorrelationCard label="Sleep duration → Focus" r={focusSleep} />
                <CorrelationCard label="HRV → Focus" r={focusHrv} />
                <CorrelationCard label="Exercise → Focus" r={focusExercise} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
