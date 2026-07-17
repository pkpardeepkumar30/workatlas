import { createHmac, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessions, users } from "@/db/schema";
import { db } from "@/lib/db";
import { getAuthEnvironment, getEmailEnvironment } from "@/lib/env";

export const SESSION_COOKIE = "workatlas_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  emailVerifiedAt: Date | null;
};

function hashSessionToken(token: string) {
  return createHmac("sha256", getAuthEnvironment().sessionSecret).update(token).digest("hex");
}

function cookieOptions(maxAge: number) {
  const environment = getAuthEnvironment();
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: environment.secureCookie,
    path: "/",
    maxAge,
    expires: new Date(Date.now() + maxAge * 1000),
  };
}

export function isRegistrationEnabled() {
  return getAuthEnvironment().registrationEnabled;
}

export async function setSessionCookie(user: SessionUser) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await db.insert(sessions).values({ userId: user.id, tokenHash: hashSessionToken(token), expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, cookieOptions(SESSION_MAX_AGE));
}

export async function clearSessionCookie() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
  store.set(SESSION_COOKIE, "", cookieOptions(0));
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [result] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, emailVerifiedAt: users.emailVerifiedAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return result ?? null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (getEmailEnvironment().verificationRequired && !user.emailVerifiedAt) redirect("/verify-email/pending");
  return user;
}
