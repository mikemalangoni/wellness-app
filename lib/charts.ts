/**
 * Given an array of entries (each with a `date` field, YYYY-MM-DD) and a
 * date range, return a new array that contains one entry per calendar day.
 * Days with no data get a stub object { date } with all other fields absent
 * (undefined), which Recharts treats as null — rendering a gap in lines and
 * no bar in bar charts.
 */
export function fillDateSpine<T extends { date: string }>(
  entries: T[],
  from: string,
  to: string
): (T | { date: string })[] {
  const map = new Map<string, T>();
  for (const e of entries) {
    map.set(String(e.date).slice(0, 10), e);
  }

  const result: (T | { date: string })[] = [];
  const end = new Date(to + "T12:00:00");
  const cur = new Date(from + "T12:00:00");

  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    result.push(map.get(key) ?? { date: key });
    cur.setDate(cur.getDate() + 1);
  }

  return result;
}

/** Format a YYYY-MM-DD date string as "Apr 17" without timezone shift. */
export function fmtDate(dateStr: string): string {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
