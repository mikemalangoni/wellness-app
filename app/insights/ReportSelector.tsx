"use client";

import { useRouter } from "next/navigation";

interface Props {
  dates: string[];
  selected: string;
}

export function ReportSelector({ dates, selected }: Props) {
  const router = useRouter();

  return (
    <select
      value={selected}
      onChange={(e) => router.push(`/insights?date=${e.target.value}`)}
      className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground"
    >
      {dates.map((d) => (
        <option key={d} value={d}>
          {new Date(d + "T12:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </option>
      ))}
    </select>
  );
}
