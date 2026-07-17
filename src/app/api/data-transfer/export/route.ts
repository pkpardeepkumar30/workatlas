import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dataTransferRepository } from "@/lib/drizzle-data-transfer-repository";
import { getTransferCounts } from "@/lib/data-transfer-schema";
import { buildExportDocument } from "@/lib/data-transfer-service";
import { serializeTransferDocument, transferContentTypes, type TransferFormat } from "@/lib/data-transfer-formats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const requested = request.nextUrl.searchParams.get("format") ?? "json";
  if (!(["json", "yaml", "xlsx"] as string[]).includes(requested)) {
    return NextResponse.json({ error: "Format must be json, yaml, or xlsx." }, { status: 400 });
  }
  const format = requested as TransferFormat;

  try {
    const document = await buildExportDocument(user, dataTransferRepository);
    const body = await serializeTransferDocument(document, format);
    const counts = getTransferCounts(document);
    await dataTransferRepository.recordAudit(user.id, {
      action: "export", format, status: "success",
      projectCount: counts.projects, taskCount: counts.tasks, commentCount: counts.comments,
      details: { exportVersion: document.metadata.exportVersion },
    });
    const date = document.metadata.exportedAt.slice(0, 10);
    return new NextResponse(body, {
      headers: {
        "Content-Type": transferContentTypes[format],
        "Content-Disposition": `attachment; filename="workatlas-export-${date}.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    await dataTransferRepository.recordAudit(user.id, {
      action: "export", format, status: "failed", projectCount: 0, taskCount: 0, commentCount: 0,
      details: { reason: error instanceof Error ? error.message.slice(0, 200) : "unknown error" },
    }).catch(() => undefined);
    return NextResponse.json({ error: "The export could not be created." }, { status: 500 });
  }
}
