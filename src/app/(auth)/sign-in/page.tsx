import { AuthForm } from "@/components/auth-form";
import { isRegistrationEnabled } from "@/lib/auth";
import { getPublicEnvironment } from "@/lib/public-env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SignInPage() {
  const environment = getPublicEnvironment();
  return <><h1 className="text-2xl font-bold">Sign in</h1><p className="mt-2 mb-6 text-sm text-slate-500">Continue to your private WorkAtlas workspace.</p><AuthForm mode="sign-in" registrationEnabled={isRegistrationEnabled()} turnstileEnabled={environment.turnstileEnabled} turnstileSiteKey={environment.turnstileSiteKey} /></>;
}
