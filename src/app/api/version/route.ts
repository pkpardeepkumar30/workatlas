import { NextResponse } from "next/server";
import { RELEASE_ID } from "@/generated/release";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ release: RELEASE_ID });
}
