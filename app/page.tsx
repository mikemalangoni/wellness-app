import Link from "next/link";
import sql from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Moon, Waves, Brain, Dumbbell, Droplets, Sparkles } from "lucide-react";

async function getSummary() {
  const [d7] = await sql`
    SELECT
      ROUND(AVG(mood)::numeric, 1)           AS avg_mood,
      ROUND(AVG(focus)::numeric, 1)          AS avg_focus,
      ROUND(AVG(sleep_duration)::numeric, 1) AS avg_sleep,
      ROUND(AVG(hrv)::numeric, 0)            AS avg_hrv,
      ROUND(AVG(avg_bristol)::numeric, 1)    AS avg_bristol,
      ROUND(AVG(water_oz)::numeric, 0)       AS avg_water,
      ROUND(AVG(bm_count)::numeric, 1)       AS avg_bm,
      COUNT(*)                               AS days
    FROM entries
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
  `;

  const [d30] = await sql`
    SELECT
      ROUND(AVG(mood)::numeric, 1)           AS avg_mood,
      ROUND(AVG(focus)::numeric, 1)          AS avg_focus,
      ROUND(AVG(sleep_duration)::numeric, 1) AS avg_sleep,
      ROUND(AVG(hrv)::numeric, 0)            AS avg_hrv,
      ROUND(AVG(avg_bristol)::numeric, 1)    AS avg_bristol,
      ROUND(AVG(water_oz)::numeric, 0)       AS avg_water,
      ROUND(AVG(bm_count)::numeric, 1)       AS avg_bm,
      COUNT(*)                               AS days
    FROM entries
    WHERE date >= CURRENT_DATE - INTERVAL '30 days'
  `;

  const [prev30] = await sql`
    SELECT
      ROUND(AVG(mood)::numeric, 1)           AS avg_mood,
      ROUND(AVG(sleep_duration)::numeric, 1) AS avg_sleep,
      ROUND(AVG(hrv)::numeric, 0)            AS avg_hrv
    FROM entries
    WHERE date >= CURRENT_DATE - INTERVAL '60 days'
      AND date < CURRENT_DATE - INTERVAL '30 days'
  `;

  return { d7, d30, prev30 };
}

async function getLatestReport(): Promise<{ content: string; period_start: string; period_end: string } | null> {
  const rows = await sql`
    SELECT content, period_start::text, period_end::text
    FROM reports
    ORDER BY report_date DESC
    LIMIT 1
  `;
  return (rows[0] as { content: string; period_start: string; period_end: string }) ?? null;
}

function trendDirection(
  current: number | null,
  previous: number | null,
  higherIsBetter = true
): "up" | "down" | null {
  if (!current || !previous) return null;
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return null;
  if (higherIsBetter) return delta > 0 ? "up" : "down";
  return delta < 0 ? "up" : "down";
}

function TrendBadge({ direction }: { direction: "up" | "down" | null }) {
  if (!direction) return null;
  return (
    <span className={direction === "up" ? "text-green-500 text-xs" : "text-red-400 text-xs"}>
      {direction === "up" ? "↑" : "↓"}
    </span>
  );
}

export default async function OverviewPage() {
  const [{ d7, d30, prev30 }, latestReport] = await Promise.all([getSummary(), getLatestReport()]);

  const cards = [
    {
      title: "Sleep",
      value7: d7.avg_sleep ? `${d7.avg_sleep}h` : "—",
      value30: d30.avg_sleep ? `${d30.avg_sleep}h` : "—",
      direction: trendDirection(Number(d30.avg_sleep), Number(prev30.avg_sleep)),
    },
    {
      title: "HRV",
      value7: d7.avg_hrv ? `${d7.avg_hrv} ms` : "—",
      value30: d30.avg_hrv ? `${d30.avg_hrv} ms` : "—",
      direction: trendDirection(Number(d30.avg_hrv), Number(prev30.avg_hrv)),
    },
    {
      title: "Mood",
      value7: d7.avg_mood ? `${d7.avg_mood} / 5` : "—",
      value30: d30.avg_mood ? `${d30.avg_mood} / 5` : "—",
      direction: trendDirection(Number(d30.avg_mood), Number(prev30.avg_mood)),
    },
    {
      title: "Bristol",
      value7: d7.avg_bristol ? `${d7.avg_bristol}` : "—",
      value30: d30.avg_bristol ? `${d30.avg_bristol}` : "—",
      direction: null,
    },
    {
      title: "BMs / day",
      value7: d7.avg_bm ? `${d7.avg_bm}` : "—",
      value30: d30.avg_bm ? `${d30.avg_bm}` : "—",
      direction: null,
    },
    {
      title: "Water",
      value7: d7.avg_water ? `${d7.avg_water} oz` : "—",
      value30: d30.avg_water ? `${d30.avg_water} oz` : "—",
      direction: null,
    },
  ];

  const sections = [
    { href: "/sleep", icon: Moon, label: "Sleep", desc: "Duration, stages, HRV, consistency" },
    { href: "/gut", icon: Waves, label: "Gut", desc: "Bristol, frequency, urgency patterns" },
    { href: "/mind", icon: Brain, label: "Mind", desc: "Mood, focus, correlations" },
    { href: "/body", icon: Dumbbell, label: "Body", desc: "Exercise, activity, running" },
  ];

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {d30.days} entries in the last 30 days
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center justify-between">
                {card.title}
                <TrendBadge direction={card.direction} />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div>
                <p className="text-2xl font-semibold">{card.value7}</p>
                <p className="text-xs text-muted-foreground">7-day avg</p>
              </div>
              <div className="border-t pt-2">
                <p className="text-sm font-medium text-muted-foreground">{card.value30}</p>
                <p className="text-xs text-muted-foreground">30-day avg</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, label, desc }) => (
          <a
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          </a>
        ))}
      </div>

      <Link href="/insights" className="block rounded-lg border p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">Weekly Insights</p>
          </div>
          {latestReport && (
            <p className="text-xs text-muted-foreground">
              {new Date(latestReport.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(latestReport.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </p>
          )}
        </div>
        {latestReport ? (
          <p className="text-xs text-muted-foreground line-clamp-3">{latestReport.content}</p>
        ) : (
          <p className="text-xs text-muted-foreground">No report yet — generates Monday mornings.</p>
        )}
      </Link>
    </div>
  );
}
