import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { isRegistrationEnabled, setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!isRegistrationEnabled()) {
    return NextResponse.json({ error: "Registration is currently invite-only. Ask an administrator for access." }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email)).limit(1);
    if (existing[0]) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [user] = await db.insert(users).values({ name: parsed.data.name, email: parsed.data.email, passwordHash }).returning();
    await setSessionCookie({ id: user.id, name: user.name, email: user.email, role: user.role });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Registration service failed", error);
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 503 });
  }
}

export const runtime = "nodejs";
