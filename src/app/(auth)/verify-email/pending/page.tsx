import { redirect } from "next/navigation";
import { ResendVerificationButton } from "@/components/account-security-forms";
import { getCurrentUser } from "@/lib/auth";

export default async function VerificationPendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  if (user.emailVerifiedAt) redirect("/dashboard");
  return <><h1 className="text-2xl font-bold">Verify your email</h1><p className="mt-3 mb-6 text-sm leading-6 text-slate-500">We sent a verification link to <span className="font-semibold text-slate-700">{user.email}</span>. Verify it before opening authenticated WorkAtlas pages.</p><ResendVerificationButton /></>;
}
