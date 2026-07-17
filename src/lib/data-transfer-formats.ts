import ExcelJS from "exceljs";
import { parseDocument, stringify as stringifyYaml } from "yaml";
import type { DataTransferDocument } from "@/lib/data-transfer-schema";

export type TransferFormat = "json" | "yaml" | "xlsx";

export function getTransferFormat(filename: string): TransferFormat {
  const extension = filename.toLowerCase().split(".").pop();
  if (extension === "json") return "json";
  if (extension === "yaml" || extension === "yml") return "yaml";
  if (extension === "xlsx") return "xlsx";
  throw new Error("Unsupported file type. Use a WorkAtlas .json, .yaml, .yml, or .xlsx file.");
}

function text(value: unknown, field: string) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object" && "formula" in value) throw new Error(`Excel field ${field} contains a formula, which is not allowed.`);
  if (typeof value === "object" && "text" in value && typeof value.text === "string") return value.text;
  throw new Error(`Excel field ${field} has an unsupported cell value.`);
}

function nullableText(value: unknown, field: string) {
  const result = text(value, field).trim();
  return result || null;
}

function booleanValue(value: unknown, field: string) {
  if (typeof value === "boolean") return value;
  const normalized = text(value, field).trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Excel field ${field} must be true or false.`);
}

function integerValue(value: unknown, field: string) {
  const number = typeof value === "number" ? value : Number(text(value, field));
  if (!Number.isSafeInteger(number)) throw new Error(`Excel field ${field} must be an integer.`);
  return number;
}

function tagsValue(value: unknown, field: string) {
  const raw = text(value, field).trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((tag) => typeof tag !== "string")) throw new Error();
    return parsed;
  } catch {
    throw new Error(`Excel field ${field} must be a JSON array of tag strings.`);
  }
}

function worksheetRows(worksheet: ExcelJS.Worksheet) {
  const headers: string[] = [];
  worksheet.getRow(1).eachCell((cell, column) => { headers[column] = text(cell.value, `${worksheet.name}.header`).trim(); });
  const rows: Array<Record<string, unknown>> = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    if (!row.hasValues) continue;
    const record: Record<string, unknown> = {};
    headers.forEach((header, column) => { if (header) record[header] = row.getCell(column).value; });
    rows.push(record);
  }
  return rows;
}

function requireWorksheet(workbook: ExcelJS.Workbook, name: string) {
  const worksheet = workbook.getWorksheet(name);
  if (!worksheet) throw new Error(`Excel workbook is missing the ${name} sheet.`);
  return worksheet;
}

export async function documentToExcel(document: DataTransferDocument) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "WorkAtlas";
  workbook.created = new Date(document.metadata.exportedAt);

  const metadata = workbook.addWorksheet("Metadata");
  metadata.addRow(["key", "value"]);
  metadata.addRows([
    ["exportVersion", document.metadata.exportVersion],
    ["exportedAt", document.metadata.exportedAt],
    ["application", document.metadata.application],
    ["accountName", document.metadata.account.name],
    ["accountEmail", document.metadata.account.email],
  ]);

  const projects = workbook.addWorksheet("Projects");
  projects.addRow(["id", "title", "description", "area", "status", "priority", "nextAction", "repositoryUrl", "isPublic", "targetDate", "tags", "createdAt", "updatedAt"]);
  for (const project of document.projects) projects.addRow([
    project.id, project.title, project.description, project.area, project.status, project.priority,
    project.nextAction, project.repositoryUrl ?? "", project.isPublic, project.targetDate ?? "",
    JSON.stringify(project.tags), project.createdAt, project.updatedAt,
  ]);

  const tasks = workbook.addWorksheet("Tasks");
  tasks.addRow(["projectId", "id", "title", "description", "status", "priority", "dueDate", "position", "tags", "createdAt", "updatedAt"]);
  for (const project of document.projects) for (const task of project.tasks) tasks.addRow([
    project.id, task.id, task.title, task.description, task.status, task.priority, task.dueDate ?? "",
    task.position, JSON.stringify(task.tags), task.createdAt, task.updatedAt,
  ]);

  const comments = workbook.addWorksheet("Comments");
  comments.addRow(["projectId", "id", "taskId", "body", "createdAt", "updatedAt"]);
  for (const project of document.projects) for (const comment of project.comments) comments.addRow([
    project.id, comment.id, comment.taskId ?? "", comment.body, comment.createdAt, comment.updatedAt,
  ]);

  for (const worksheet of workbook.worksheets) {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.getRow(1).font = { bold: true };
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function excelToDocument(buffer: Buffer): Promise<unknown> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const metadataEntries = worksheetRows(requireWorksheet(workbook, "Metadata"));
  const values = Object.fromEntries(metadataEntries.map((row) => [text(row.key, "Metadata.key"), text(row.value, "Metadata.value")]));
  const projectRows = worksheetRows(requireWorksheet(workbook, "Projects"));
  const taskRows = worksheetRows(requireWorksheet(workbook, "Tasks"));
  const commentRows = worksheetRows(requireWorksheet(workbook, "Comments"));

  const projects = projectRows.map((row) => ({
    id: text(row.id, "Projects.id"), title: text(row.title, "Projects.title"), description: text(row.description, "Projects.description"),
    area: text(row.area, "Projects.area"), status: text(row.status, "Projects.status"), priority: text(row.priority, "Projects.priority"),
    nextAction: text(row.nextAction, "Projects.nextAction"), repositoryUrl: nullableText(row.repositoryUrl, "Projects.repositoryUrl"),
    isPublic: booleanValue(row.isPublic, "Projects.isPublic"), targetDate: nullableText(row.targetDate, "Projects.targetDate"),
    tags: tagsValue(row.tags, "Projects.tags"), createdAt: text(row.createdAt, "Projects.createdAt"), updatedAt: text(row.updatedAt, "Projects.updatedAt"),
    tasks: [] as unknown[], comments: [] as unknown[],
  }));
  const projectMap = new Map(projects.map((project) => [project.id, project]));

  for (const row of taskRows) {
    const projectId = text(row.projectId, "Tasks.projectId");
    const project = projectMap.get(projectId);
    if (!project) throw new Error(`Task references unknown project ${projectId}.`);
    project.tasks.push({
      id: text(row.id, "Tasks.id"), title: text(row.title, "Tasks.title"), description: text(row.description, "Tasks.description"),
      status: text(row.status, "Tasks.status"), priority: text(row.priority, "Tasks.priority"), dueDate: nullableText(row.dueDate, "Tasks.dueDate"),
      position: integerValue(row.position, "Tasks.position"), tags: tagsValue(row.tags, "Tasks.tags"),
      createdAt: text(row.createdAt, "Tasks.createdAt"), updatedAt: text(row.updatedAt, "Tasks.updatedAt"),
    });
  }
  for (const row of commentRows) {
    const projectId = text(row.projectId, "Comments.projectId");
    const project = projectMap.get(projectId);
    if (!project) throw new Error(`Comment references unknown project ${projectId}.`);
    project.comments.push({
      id: text(row.id, "Comments.id"), taskId: nullableText(row.taskId, "Comments.taskId"), body: text(row.body, "Comments.body"),
      createdAt: text(row.createdAt, "Comments.createdAt"), updatedAt: text(row.updatedAt, "Comments.updatedAt"),
    });
  }

  return {
    metadata: {
      exportVersion: values.exportVersion,
      exportedAt: values.exportedAt,
      application: values.application,
      account: { name: values.accountName, email: values.accountEmail },
    },
    projects,
  };
}

export async function parseTransferBuffer(buffer: Buffer, format: TransferFormat): Promise<unknown> {
  if (format === "xlsx") return excelToDocument(buffer);
  const source = buffer.toString("utf8");
  if (format === "json") return JSON.parse(source);
  const document = parseDocument(source, { uniqueKeys: true });
  if (document.errors.length) throw new Error(document.errors[0].message);
  return document.toJS({ maxAliasCount: 20 });
}

export async function serializeTransferDocument(document: DataTransferDocument, format: TransferFormat) {
  if (format === "xlsx") return documentToExcel(document);
  if (format === "yaml") return Buffer.from(stringifyYaml(document, { aliasDuplicateObjects: false }), "utf8");
  return Buffer.from(`${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export const transferContentTypes: Record<TransferFormat, string> = {
  json: "application/json; charset=utf-8",
  yaml: "application/yaml; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
