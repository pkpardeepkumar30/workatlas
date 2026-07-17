import Link from "next/link";
import { ResetPasswordForm } from "@/components/account-security-forms";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  if (!token) return <><h1 className="text-2xl font-bold">Invalid reset link</h1><p className="mt-3 text-sm text-slate-500">Request a fresh password-reset email to continue.</p><Link href="/forgot-password" className="mt-6 inline-flex font-semibold text-indigo-600">Request another link</Link></>;
  return <><h1 className="text-2xl font-bold">Choose a new password</h1><p className="mt-2 mb-6 text-sm text-slate-500">This link can be used once. A successful reset signs out every existing WorkAtlas session.</p><ResetPasswordForm token={token} /></>;
}
