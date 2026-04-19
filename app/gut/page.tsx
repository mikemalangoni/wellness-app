"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  LineChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
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

type RangeKey = "7d" | "30d" | "90d" | "all";

const RANGES: { label: string; value: RangeKey }[] = [
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
];

const DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

function buildQuery(range: RangeKey) {
  const to = new Date().toISOString().split("T")[0];
  if (range === "all") return { url: "/api/entries", from: null, to };
  const from = new Date(Date.now() - DAYS[range] * 86_400_000)
    .toISOString()
    .split("T")[0];
  return { url: `/api/entries?from=${from}&to=${to}`, from, to };
}

function rollingMean(values: (number | null)[], window = 7): (number | null)[] {
  return values.map((_, i) => {
    const slice = values
      .slice(Math.max(0, i - window + 1), i + 1)
      .filter((v): v is number => v !== null);
    return slice.length ? slice.reduce((a, b) => a + b, 0) / slice.length : null;
  });
}

function pearson(xs: (number | null)[], ys: (number | null)[]): number | null {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => x != null && y != null && !isNaN(x as number) && !isNaN(y as number)) as [number, number][];
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

function CorrelationCard({ label, r, meaning }: { label: string; r: number | null; meaning?: string }) {
  if (r === null) {
    return (
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <span className="text-sm">{label}</span>
        <span className="text-xs text-muted-foreground">Not enough data</span>
      </div>
    );
  }
  return (
    <div className="rounded-lg border px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm">{label}</span>
        <div className="text-right ml-4 shrink-0">
          <span className={`text-sm font-semibold ${correlationColor(r)}`}>
            {r > 0 ? "+" : ""}{r.toFixed(2)}
          </span>
          <p className={`text-xs ${correlationColor(r)}`}>{correlationLabel(r)}</p>
        </div>
      </div>
      {meaning && (
        <p className="text-xs text-muted-foreground mt-1.5">{meaning}</p>
      )}
    </div>
  );
}

const GUT_MEANINGS: Record<string, { positive: string; negative: string; negligible: string }> = {
  "Exercise → Bristol score": {
    positive: "Exercise days tend to produce better-formed stools. Movement stimulates gut motility.",
    negative: "Higher-intensity exercise days coincide with looser stools — possibly from blood flow shunting away from the gut.",
    negligible: "Exercise doesn't appear to meaningfully affect stool consistency in your data.",
  },
  "Exercise → BM frequency": {
    positive: "You tend to go more often on days you exercise. Movement speeds up gut transit.",
    negative: "Exercise days coincide with fewer BMs — possibly timing or dehydration effects.",
    negligible: "Exercise doesn't appear to affect how often you go.",
  },
  "Water intake → Bristol score": {
    positive: "Higher water intake associates with better stool consistency. Hydration helps form well-shaped stools.",
    negative: "Oddly, more water coincides with looser stools in your data — worth checking if high-water days overlap with other factors.",
    negligible: "Water intake doesn't show a consistent effect on stool consistency.",
  },
  "Water intake → BM frequency": {
    positive: "More water tends to mean more frequent BMs. Adequate hydration keeps transit moving.",
    negative: "Higher water intake coincides with fewer BMs in your data — likely a confounding factor rather than a direct effect.",
    negligible: "Water intake doesn't appear to affect BM frequency.",
  },
};

function gutMeaning(label: string, r: number): string | undefined {
  const m = GUT_MEANINGS[label];
  if (!m) return undefined;
  if (Math.abs(r) < 0.15) return m.negligible;
  return r > 0 ? m.positive : m.negative;
}

const AXIS_TICK = { fontSize: 11, fill: "#374151" };
const AXIS_STROKE = "#9ca3af";
const GRID_STROKE = "#d1d5db";

export default function GutPage() {
  const [range, setRange] = useState<RangeKey>("30d");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { url, from, to } = buildQuery(range);
    const res = await fetch(url);
    const raw = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    const start = from ?? (raw.length ? String(raw[0].date).slice(0, 10) : today);
    setEntries(fillDateSpine(raw, start, today));
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const bmCounts = entries.map((e) => e.bm_count != null ? parseFloat(e.bm_count) : null);
  const bristols = entries.map((e) => e.avg_bristol != null ? parseFloat(e.avg_bristol) : null);
  const exerciseMins = entries.map((e) => e.total_exercise_min != null ? parseFloat(e.total_exercise_min) : null);
  const waterOz = entries.map((e) => e.water_oz != null ? parseFloat(e.water_oz) : null);

  const bmTrend = rollingMean(bmCounts);
  const bristolTrend = rollingMean(bristols);

  const bmData = entries.map((e, i) => ({
    date: fmtDate(e.date),
    "BMs": bmCounts[i],
    "7-day avg": bmTrend[i] != null ? parseFloat(bmTrend[i]!.toFixed(2)) : null,
  }));

  const bristolData = entries.map((e, i) => ({
    date: fmtDate(e.date),
    "Bristol": bristols[i],
    "7-day avg": bristolTrend[i] != null ? parseFloat(bristolTrend[i]!.toFixed(2)) : null,
  }));

  const bmValues = bmCounts.filter((v): v is number => v !== null);
  const bristolValues = bristols.filter((v): v is number => v !== null);

  const avgBm = bmValues.length
    ? (bmValues.reduce((a, b) => a + b, 0) / bmValues.length).toFixed(1)
    : "—";
  const avgBristol = bristolValues.length
    ? (bristolValues.reduce((a, b) => a + b, 0) / bristolValues.length).toFixed(1)
    : "—";

  const tickCount = range === "7d" ? 7 : range === "30d" ? 10 : range === "90d" ? 12 : 14;

  const exBristol = pearson(exerciseMins, bristols);
  const exBm = pearson(exerciseMins, bmCounts);
  const waterBristol = pearson(waterOz, bristols);
  const waterBm = pearson(waterOz, bmCounts);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Gut</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bmValues.length} days with GI data
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
        <StatCard label="Avg BMs / day" value={avgBm !== "—" ? avgBm : "—"} sub="selected period" />
        <StatCard
          label="Avg Bristol"
          value={avgBristol !== "—" ? avgBristol : "—"}
          sub="4 = optimal"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <>
          {/* BM frequency */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">BM Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={bmData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={AXIS_TICK} interval={Math.floor(bmData.length / tickCount)} stroke={AXIS_STROKE} />
                  <YAxis tick={AXIS_TICK} stroke={AXIS_STROKE} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="BMs" fill="#6ee7b7" opacity={0.8} radius={[2, 2, 0, 0]} />
                  <Line dataKey="7-day avg" stroke="#f97316" strokeWidth={2.5} dot={false} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bristol score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Bristol Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={bristolData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                  <XAxis dataKey="date" tick={AXIS_TICK} interval={Math.floor(bristolData.length / tickCount)} stroke={AXIS_STROKE} />
                  <YAxis domain={[1, 7]} ticks={[1, 2, 3, 4, 5, 6, 7]} tick={AXIS_TICK} stroke={AXIS_STROKE} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={4}
                    stroke="#9ca3af"
                    strokeDasharray="4 2"
                    label={{ value: "optimal", position: "right", fontSize: 10, fill: "#6b7280" }}
                  />
                  <Line dataKey="Bristol" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 2, fill: "#3b82f6" }} connectNulls />
                  <Line dataKey="7-day avg" stroke="#f97316" strokeWidth={2.5} strokeOpacity={0.7} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Correlations */}
          <div>
            <h2 className="text-sm font-semibold mb-3">Correlations</h2>
            <p className="text-xs text-muted-foreground mb-3">
              How exercise and water intake associate with gut health. Use 90d or all-time for the most reliable signal.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Exercise</p>
                <CorrelationCard label="Exercise → Bristol score" r={exBristol} meaning={exBristol !== null ? gutMeaning("Exercise → Bristol score", exBristol) : undefined} />
                <CorrelationCard label="Exercise → BM frequency" r={exBm} meaning={exBm !== null ? gutMeaning("Exercise → BM frequency", exBm) : undefined} />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">Water</p>
                <CorrelationCard label="Water intake → Bristol score" r={waterBristol} meaning={waterBristol !== null ? gutMeaning("Water intake → Bristol score", waterBristol) : undefined} />
                <CorrelationCard label="Water intake → BM frequency" r={waterBm} meaning={waterBm !== null ? gutMeaning("Water intake → BM frequency", waterBm) : undefined} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
