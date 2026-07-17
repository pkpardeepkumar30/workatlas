import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await checkHealth(() => db.execute(sql`select 1`));
  return NextResponse.json(result.payload, { status: result.status });
}
