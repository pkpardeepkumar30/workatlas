import { getTurnstileEnvironment } from "@/lib/env";

type TurnstileVerification = { success?: boolean; "error-codes"?: string[] };

export async function verifyTurnstileResponse({
  token,
  remoteIp,
  secretKey,
  fetchImplementation = fetch,
}: {
  token: string | undefined;
  remoteIp?: string;
  secretKey: string;
  fetchImplementation?: typeof fetch;
}) {
  if (!token) return false;
  const body = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
  try {
    const response = await fetchImplementation("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    if (!response.ok) return false;
    const result = await response.json() as TurnstileVerification;
    return result.success === true;
  } catch {
    return false;
  }
}

export async function validateTurnstileIfEnabled(token: string | undefined, remoteIp?: string) {
  const environment = getTurnstileEnvironment();
  if (!environment.enabled) return true;
  return verifyTurnstileResponse({ token, remoteIp, secretKey: environment.secretKey! });
}
