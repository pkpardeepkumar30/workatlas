import { ForgotPasswordForm } from "@/components/account-security-forms";
import { getPublicEnvironment } from "@/lib/public-env";

export default function ForgotPasswordPage() {
  const environment = getPublicEnvironment();
  return <><h1 className="text-2xl font-bold">Reset your password</h1><p className="mt-2 mb-6 text-sm leading-6 text-slate-500">Enter your account email. The confirmation response is intentionally the same whether or not an account exists.</p><ForgotPasswordForm turnstileSiteKey={environment.turnstileEnabled ? environment.turnstileSiteKey : undefined} /></>;
}
