import { NextResponse } from "next/server";
import sql from "@/lib/db";

// One-shot migration runner. Hit GET /api/migrate once to apply pending schema changes.
export async function GET() {
  try {
    await sql`ALTER TABLE entries ALTER COLUMN coffee_count TYPE NUMERIC`;
    await sql`ALTER TABLE entries ALTER COLUMN total_exercise_min TYPE NUMERIC`;
    await sql`ALTER TABLE exercise_sessions ALTER COLUMN duration_min TYPE NUMERIC`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[migrate]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
