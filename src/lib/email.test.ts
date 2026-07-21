import { afterEach, describe, expect, it, vi } from "vitest";
import { BrevoEmailProvider, parseSender } from "@/lib/email";

describe("Brevo transactional email provider", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("maps the controlled email model to Brevo without exposing the API key in the body", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "accepted" }), { status: 201 }));
    vi.stubGlobal("fetch", request);
    await new BrevoEmailProvider("private-api-key", "WorkAtlas <sender@example.com>").send({
      to: "recipient@example.net",
      subject: "Verify",
      text: "Plain text",
      html: "<p>HTML</p>",
    });

    expect(request).toHaveBeenCalledWith("https://api.brevo.com/v3/smtp/email", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "api-key": "private-api-key" }),
    }));
    const options = request.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(options.body))).toEqual({
      sender: { name: "WorkAtlas", email: "sender@example.com" },
      to: [{ email: "recipient@example.net" }],
      subject: "Verify",
      textContent: "Plain text",
      htmlContent: "<p>HTML</p>",
    });
    expect(String(options.body)).not.toContain("private-api-key");
  });

  it("rejects malformed sender configuration before making a request", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(new BrevoEmailProvider("key", "not-an-email").send({ to: "recipient@example.net", subject: "x", text: "x", html: "x" })).rejects.toThrow(/EMAIL_FROM/);
    expect(request).not.toHaveBeenCalled();
  });

  it("accepts named and plain sender addresses", () => {
    expect(parseSender("WorkAtlas <sender@example.com>")).toEqual({ name: "WorkAtlas", email: "sender@example.com" });
    expect(parseSender("sender@example.com")).toEqual({ name: "WorkAtlas", email: "sender@example.com" });
  });
});
