import { describe, expect, it, vi } from "vitest";
import { checkHealth } from "@/lib/health";

describe("health check", () => {
  it("reports a connected database without implementation details", async () => {
    await expect(checkHealth(vi.fn(async () => 1))).resolves.toEqual({ status: 200, payload: { status: "ok", database: "connected" } });
  });
  it("returns a non-200 safe response when the query fails", async () => {
    const result = await checkHealth(vi.fn(async () => { throw new Error("secret connection details"); }));
    expect(result).toEqual({ status: 503, payload: { status: "error", database: "unavailable" } });
    expect(JSON.stringify(result)).not.toContain("secret connection details");
  });
});
