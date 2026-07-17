import Link from "next/link";

export default function CheckResetEmailPage() {
  return <><h1 className="text-2xl font-bold">Check your email</h1><p className="mt-3 text-sm leading-6 text-slate-500">If an account can receive email at the address provided, a single-use reset link will arrive shortly. Check spam folders before requesting another link.</p><Link href="/sign-in" className="mt-6 inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Back to sign in</Link></>;
}
