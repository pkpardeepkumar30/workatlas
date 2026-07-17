import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { isRegistrationEnabled } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SignUpPage() {
  if (!isRegistrationEnabled()) {
    return (
      <>
        <h1 className="text-2xl font-bold">Registration is invite-only</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">New account creation is currently disabled. Existing members can continue to sign in.</p>
        <Link href="/sign-in" className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Go to sign in</Link>
      </>
    );
  }
  return <><h1 className="text-2xl font-bold">Create an account</h1><p className="mt-2 mb-6 text-sm text-slate-500">Each account sees only its own projects and tasks.</p><AuthForm mode="sign-up" /></>;
}
