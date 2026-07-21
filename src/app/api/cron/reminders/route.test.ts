import { describe, expect, it } from "vitest";
import { validBearerToken } from "@/lib/cron-auth";

describe("reminder scheduler authentication", () => {
  const secret = "a-secure-reminder-secret-that-is-long-enough";

  it("fails closed when the server secret is missing or the bearer token differs", () => {
    expect(validBearerToken(new Request("https://example.test/api/cron/reminders"), undefined)).toBe(false);
    expect(validBearerToken(new Request("https://example.test/api/cron/reminders", { headers: { authorization: "Bearer wrong" } }), secret)).toBe(false);
  });

  it("accepts only the exact bearer token", () => {
    const request = new Request("https://example.test/api/cron/reminders", { headers: { authorization: `Bearer ${secret}` } });
    expect(validBearerToken(request, secret)).toBe(true);
  });
});
