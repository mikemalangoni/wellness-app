import sql from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (date) {
    const [report] = await sql`
      SELECT report_date, period_start, period_end, content, generated_at
      FROM reports
      WHERE report_date = ${date}
    `;
    if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(report);
  }

  // Default: return most recent + list of available report dates
  const [latest] = await sql`
    SELECT report_date, period_start, period_end, content, generated_at
    FROM reports
    ORDER BY report_date DESC
    LIMIT 1
  `;

  const history = await sql`
    SELECT report_date
    FROM reports
    ORDER BY report_date DESC
    LIMIT 12
  `;

  return NextResponse.json({ latest, history });
}
