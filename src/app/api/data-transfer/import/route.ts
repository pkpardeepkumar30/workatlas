import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataTransferRepository, recordFailedImport } from "@/lib/drizzle-data-transfer-repository";
import { getTransferFormat, parseTransferBuffer, type TransferFormat } from "@/lib/data-transfer-formats";
import { conflictStrategySchema, MAX_IMPORT_FILE_BYTES } from "@/lib/data-transfer-schema";
import { importTransferDocument, validateTransferDocument } from "@/lib/data-transfer-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  let format: TransferFormat = "json";
  const auditFailure = (reason: string) => recordFailedImport(user.id, format, reason).catch(() => undefined);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_FILE_BYTES + 65_536) {
    await auditFailure("upload exceeds file-size limit");
    return NextResponse.json({ error: "The upload exceeds the 5 MB import limit." }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    await auditFailure("invalid multipart upload");
    return NextResponse.json({ error: "The upload could not be read." }, { status: 400 });
  }

  const file = form.get("file");
  const strategyResult = conflictStrategySchema.safeParse(form.get("strategy"));
  if (!strategyResult.success) {
    await auditFailure("invalid conflict strategy");
    return NextResponse.json({ error: "Choose a valid conflict strategy." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    await auditFailure("missing file");
    return NextResponse.json({ error: "Choose a non-empty export file." }, { status: 400 });
  }
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    await auditFailure("file exceeds size limit");
    return NextResponse.json({ error: "The file exceeds the 5 MB import limit." }, { status: 413 });
  }

  let input: unknown;
  try {
    format = getTransferFormat(file.name);
    input = await parseTransferBuffer(Buffer.from(await file.arrayBuffer()), format);
  } catch (error) {
    await auditFailure(error instanceof Error ? error.message : "file parse failed");
    return NextResponse.json({ error: error instanceof Error ? error.message : "The file could not be read." }, { status: 400 });
  }

  const validation = validateTransferDocument(input);
  if (!validation.success) {
    await auditFailure("validation failed");
    return NextResponse.json({ ok: false, errors: validation.errors }, { status: 400 });
  }

  try {
    const imported = await importTransferDocument(user.id, validation.document, strategyResult.data, format, dataTransferRepository);
    if (!imported.success) return NextResponse.json({ ok: false, errors: imported.errors }, { status: 400 });
    return NextResponse.json({ ok: true, counts: imported.counts, result: imported.result });
  } catch (error) {
    await auditFailure(error instanceof Error ? error.message : "transaction failed");
    return NextResponse.json({ error: "Nothing was imported. The transaction was rolled back." }, { status: 500 });
  }
}
