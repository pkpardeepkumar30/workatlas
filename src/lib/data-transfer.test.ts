import ExcelJS from "exceljs";
import { describe, expect, it, vi } from "vitest";
import { documentToExcel, excelToDocument, parseTransferBuffer, serializeTransferDocument } from "@/lib/data-transfer-formats";
import { dataTransferDocumentSchema, getTransferCounts, type ConflictStrategy, type DataTransferDocument } from "@/lib/data-transfer-schema";
import { buildExportDocument, importTransferDocument, validateTransferDocument, type DataTransferRepository } from "@/lib/data-transfer-service";

const projectId = "11111111-1111-4111-8111-111111111111";
const taskId = "22222222-2222-4222-8222-222222222222";
const commentId = "33333333-3333-4333-8333-333333333333";
const fixedDate = new Date("2026-07-17T10:00:00.000Z");

function documentFixture(): DataTransferDocument {
  return {
    metadata: { exportVersion: "1.0", exportedAt: fixedDate.toISOString(), application: "WorkAtlas", account: { name: "Alice", email: "alice@example.test" } },
    projects: [{
      id: projectId, title: "Research", description: "Private notes", area: "Science", status: "active", priority: "high",
      nextAction: "Review", repositoryUrl: null, isPublic: false, targetDate: "2026-12-31", tags: ["important", "paper"],
      createdAt: fixedDate.toISOString(), updatedAt: fixedDate.toISOString(),
      tasks: [{ id: taskId, title: "Read", description: "Chapter 1", status: "in_progress", priority: "critical", dueDate: "2026-08-01", deadlineAt: "2026-08-01T12:00:00.000Z", reminderMinutes: 60, reminderAt: "2026-08-01T11:00:00.000Z", position: 4, tags: ["reading"], createdAt: fixedDate.toISOString(), updatedAt: fixedDate.toISOString() }],
      comments: [{ id: commentId, taskId, body: "Keep this hierarchy", createdAt: fixedDate.toISOString(), updatedAt: fixedDate.toISOString() }],
    }],
  };
}

function repository(overrides: Partial<DataTransferRepository> = {}): DataTransferRepository {
  return {
    loadOwnedData: vi.fn(async () => ({ projects: [], tasks: [], comments: [] })),
    importDocument: vi.fn(async () => ({
      projects: { created: 1, updated: 0, skipped: 0 }, tasks: { created: 1, updated: 0, skipped: 0 }, comments: { created: 1, updated: 0, skipped: 0 },
    })),
    recordAudit: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("user data export and import", () => {
  it("exports only rows returned for the authenticated owner and excludes security fields", async () => {
    const loadOwnedData = vi.fn(async (ownerId: string) => {
      expect(ownerId).toBe("owner-a");
      return {
        projects: [{ id: projectId, title: "Research", description: "Notes", area: "Science", status: "active" as const, priority: "high" as const, nextAction: "Review", repositoryUrl: null, isPublic: false, targetDate: null, tags: [], createdAt: fixedDate, updatedAt: fixedDate }],
        tasks: [{ id: taskId, projectId, title: "Read", description: "", status: "todo" as const, priority: "medium" as const, dueDate: null, deadlineAt: null, reminderMinutes: null, reminderAt: null, position: 0, tags: [], createdAt: fixedDate, updatedAt: fixedDate }],
        comments: [],
      };
    });
    const exported = await buildExportDocument({ id: "owner-a", name: "Alice", email: "alice@example.test" }, repository({ loadOwnedData }), fixedDate);
    expect(getTransferCounts(exported)).toEqual({ projects: 1, tasks: 1, comments: 0 });
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toMatch(/password|session|token|api.?key|ownerId/i);
    expect(loadOwnedData).toHaveBeenCalledTimes(1);
    expect(loadOwnedData).toHaveBeenCalledWith("owner-a");
  });

  it("round-trips the complete hierarchy through canonical JSON", async () => {
    const original = documentFixture();
    const buffer = await serializeTransferDocument(original, "json");
    const parsed = await parseTransferBuffer(buffer, "json");
    const importDocument = vi.fn(repository().importDocument);
    const result = await importTransferDocument("new-owner", parsed, "create_new", "json", repository({ importDocument }));
    expect(result.success).toBe(true);
    expect(importDocument).toHaveBeenCalledWith("new-owner", original, "create_new", "json");
    expect((result as { counts: object }).counts).toEqual({ projects: 1, tasks: 1, comments: 1 });
  });

  it.each(["create_new", "skip_existing", "update_matching"] as ConflictStrategy[])("passes the %s conflict strategy into the controlled repository", async (strategy) => {
    const importDocument = vi.fn(repository().importDocument);
    await importTransferDocument("owner", documentFixture(), strategy, "json", repository({ importDocument }));
    expect(importDocument).toHaveBeenCalledWith("owner", expect.any(Object), strategy, "json");
  });

  it("rejects unknown security and ownership fields before any write", async () => {
    const malicious = { ...documentFixture(), passwordHash: "stolen", ownerId: "another-user", sessionToken: "secret" };
    const importDocument = vi.fn(repository().importDocument);
    const result = await importTransferDocument("owner", malicious, "update_matching", "json", repository({ importDocument }));
    expect(result.success).toBe(false);
    expect(importDocument).not.toHaveBeenCalled();
  });

  it("rejects duplicate IDs and cross-project comment references", () => {
    const duplicate = documentFixture();
    duplicate.projects.push(structuredClone(duplicate.projects[0]));
    expect(validateTransferDocument(duplicate).success).toBe(false);
    const invalidReference = documentFixture();
    invalidReference.projects[0].comments[0].taskId = "44444444-4444-4444-8444-444444444444";
    expect(validateTransferDocument(invalidReference).success).toBe(false);
  });

  it("propagates a transaction failure without reporting a partial success", async () => {
    const state = { committed: 0 };
    const importDocument = vi.fn(async () => {
      const pending = state.committed + 1;
      expect(pending).toBe(1);
      throw new Error("database failure before commit");
    });
    await expect(importTransferDocument("owner", documentFixture(), "create_new", "json", repository({ importDocument }))).rejects.toThrow("database failure");
    expect(state.committed).toBe(0);
  });

  it("maps every JSON field through Excel and back", async () => {
    const original = documentFixture();
    const result = dataTransferDocumentSchema.parse(await excelToDocument(await documentToExcel(original)));
    expect(result).toEqual(original);
  });

  it("rejects formulas in imported Excel cells", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await documentToExcel(documentFixture())) as never);
    workbook.getWorksheet("Projects")!.getCell("B2").value = { formula: "HYPERLINK(\https://evil.test\)", result: "click" };
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await expect(excelToDocument(buffer)).rejects.toThrow(/formula/);
  });
});
