import { NextRequest, NextResponse } from "next/server";
import sql from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const rows =
    from && to
      ? await sql`
          SELECT * FROM gi_events
          WHERE date >= ${from}::date AND date <= ${to}::date
          ORDER BY date, event_time
        `
      : await sql`SELECT * FROM gi_events ORDER BY date, event_time`;

  return NextResponse.json(rows);
}
