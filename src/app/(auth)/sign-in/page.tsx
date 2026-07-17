import { AuthForm } from "@/components/auth-form";
import { isRegistrationEnabled } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <><h1 className="text-2xl font-bold">Sign in</h1><p className="mt-2 mb-6 text-sm text-slate-500">Access your private project workspace.</p><AuthForm mode="sign-in" registrationEnabled={isRegistrationEnabled()} /></>;
}
