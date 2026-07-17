export type HealthPayload =
  | { status: "ok"; database: "connected" }
  | { status: "error"; database: "unavailable" };

export async function checkHealth(databaseCheck: () => Promise<unknown>): Promise<{ status: 200 | 503; payload: HealthPayload }> {
  try {
    await databaseCheck();
    return { status: 200, payload: { status: "ok", database: "connected" } };
  } catch {
    return { status: 503, payload: { status: "error", database: "unavailable" } };
  }
}
