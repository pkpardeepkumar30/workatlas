import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/", request.url), 303);
  } catch (error) {
    console.error("Sign-out service failed", error);
    return NextResponse.json({ error: "Sign-out is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
