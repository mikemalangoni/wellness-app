"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
  LineChart,
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

function fmt(dateStr: string) {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="px-4 py-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {label}
        </p>
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

export default function SleepPage() {
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

  useEffect(() => {
    load();
  }, [load]);

  const sleepRows = entries.filter((e) => e.sleep_duration != null);

  const durations = sleepRows.map((e) =>
    e.sleep_duration ? parseFloat(e.sleep_duration) : null
  );
  const hrvValues = entries.map((e) =>
    e.hrv ? parseFloat(e.hrv) : null
  );

  const durationTrend = rollingMean(durations);
  const hrvTrend = rollingMean(hrvValues);

  const durationData = entries.map((e, i) => ({
    date: fmt(e.date),
    Duration: e.sleep_duration ? parseFloat(e.sleep_duration) : null,
    "7-day avg": durationTrend[i] != null ? parseFloat(durationTrend[i]!.toFixed(2)) : null,
  }));

  const hrvData = entries.map((e, i) => ({
    date: fmt(e.date),
    HRV: e.hrv ? parseFloat(e.hrv) : null,
    "7-day avg": hrvTrend[i] != null ? parseFloat(hrvTrend[i]!.toFixed(1)) : null,
  }));

  const stageData = entries.map((e) => {
    const durationMin = e.sleep_duration ? parseFloat(e.sleep_duration) * 60 : null;
    const awakePct =
      e.awake_min != null && durationMin
        ? parseFloat(((parseFloat(e.awake_min) / durationMin) * 100).toFixed(1))
        : null;
    return {
      date: fmt(e.date),
      Deep: e.deep_pct != null ? parseFloat((parseFloat(e.deep_pct) * 100).toFixed(1)) : null,
      REM: e.rem_pct != null ? parseFloat((parseFloat(e.rem_pct) * 100).toFixed(1)) : null,
      Core: e.core_pct != null ? parseFloat((parseFloat(e.core_pct) * 100).toFixed(1)) : null,
      Awake: awakePct,
    };
  });

  // Summary stats
  const avgSleep = durations.filter(Boolean).length
    ? (durations.filter(Boolean).reduce((a, b) => a! + b!, 0)! /
        durations.filter(Boolean).length).toFixed(1)
    : "—";

  const pctTarget = durations.filter(Boolean).length
    ? Math.round(
        (durations.filter((d) => d != null && d >= 8).length /
          durations.filter(Boolean).length) *
          100
      )
    : null;

  const hrvFiltered = hrvValues.filter((v): v is number => v !== null);
  const avgHrv = hrvFiltered.length
    ? Math.round(hrvFiltered.reduce((a, b) => a + b, 0) / hrvFiltered.length)
    : null;

  const tickCount = range === "7d" ? 7 : range === "30d" ? 10 : range === "90d" ? 12 : 14;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sleep</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {sleepRows.length} nights logged
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

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Avg Duration"
          value={avgSleep !== "—" ? `${avgSleep}h` : "—"}
          sub="vs 8h target"
        />
        <StatCard
          label="Nights ≥ 8h"
          value={pctTarget != null ? `${pctTarget}%` : "—"}
          sub="hit target"
        />
        <StatCard
          label="Avg HRV"
          value={avgHrv != null ? `${avgHrv} ms` : "—"}
          sub="quality proxy"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          Loading…
        </div>
      ) : (
        <>
          {/* Duration chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sleep Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={durationData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={Math.floor(durationData.length / tickCount)}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}h`}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={8}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 2"
                    label={{ value: "8h target", position: "right", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Bar dataKey="Duration" fill="#93c5fd" opacity={0.7} radius={[2, 2, 0, 0]} />
                  <Line
                    dataKey="7-day avg"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* HRV chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">HRV</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={hrvData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={Math.floor(hrvData.length / tickCount)}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} stroke="hsl(var(--border))" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    dataKey="HRV"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: "#3b82f6" }}
                    connectNulls
                  />
                  <Line
                    dataKey="7-day avg"
                    stroke="#f97316"
                    strokeWidth={2}
                    strokeOpacity={0.6}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Stage breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Sleep Stage Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={stageData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={Math.floor(stageData.length / tickCount)}
                    stroke="hsl(var(--border))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    stroke="hsl(var(--border))"
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Deep" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="REM" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="Core" stackId="a" fill="#a78bfa" />
                  <Bar dataKey="Awake" stackId="a" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
