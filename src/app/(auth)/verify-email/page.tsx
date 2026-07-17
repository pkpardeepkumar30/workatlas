import Link from "next/link";
import { VerifyEmailForm } from "@/components/account-security-forms";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  if (!token) return <><h1 className="text-2xl font-bold">Invalid verification link</h1><p className="mt-3 text-sm text-slate-500">Sign in to request a fresh verification email.</p><Link href="/sign-in" className="mt-6 inline-flex font-semibold text-indigo-600">Go to sign in</Link></>;
  return <><h1 className="text-2xl font-bold">Verify your email</h1><p className="mt-2 mb-6 text-sm text-slate-500">Confirm this single-use link to activate authenticated WorkAtlas pages.</p><VerifyEmailForm token={token} /></>;
}
