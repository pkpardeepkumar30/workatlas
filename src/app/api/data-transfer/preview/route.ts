import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTransferFormat, parseTransferBuffer } from "@/lib/data-transfer-formats";
import { MAX_IMPORT_FILE_BYTES } from "@/lib/data-transfer-schema";
import { validateTransferDocument } from "@/lib/data-transfer-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_FILE_BYTES + 65_536) return NextResponse.json({ error: "The upload exceeds the 5 MB import limit." }, { status: 413 });

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose a non-empty export file." }, { status: 400 });
    if (file.size > MAX_IMPORT_FILE_BYTES) return NextResponse.json({ error: "The file exceeds the 5 MB import limit." }, { status: 413 });
    const format = getTransferFormat(file.name);
    const input = await parseTransferBuffer(Buffer.from(await file.arrayBuffer()), format);
    const validated = validateTransferDocument(input);
    if (!validated.success) return NextResponse.json({ ok: false, errors: validated.errors }, { status: 400 });
    return NextResponse.json({ ok: true, format, counts: validated.counts, export: validated.document.metadata });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The file could not be read." }, { status: 400 });
  }
}
