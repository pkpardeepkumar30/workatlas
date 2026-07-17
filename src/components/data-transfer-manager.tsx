"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, CardContent, CardHeader, inputClass } from "@/components/ui";

type Preview = {
  format: "json" | "yaml" | "xlsx";
  counts: { projects: number; tasks: number; comments: number };
  export: { exportVersion: string; exportedAt: string; account: { name: string; email: string } };
};
type ValidationError = { field: string; message: string };

export function DataTransferManager() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [message, setMessage] = useState("");
  const [strategy, setStrategy] = useState("create_new");
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setErrors([]);
    setMessage("");
  }

  async function request(endpoint: "preview" | "import") {
    if (!file) return;
    setLoading(endpoint);
    setErrors([]);
    setMessage("");
    const body = new FormData();
    body.set("file", file);
    if (endpoint === "import") body.set("strategy", strategy);
    try {
      const response = await fetch(`/api/data-transfer/${endpoint}`, { method: "POST", body });
      const payload = await response.json() as { ok?: boolean; error?: string; errors?: ValidationError[]; counts?: Preview["counts"]; export?: Preview["export"]; format?: Preview["format"]; result?: Record<string, Record<string, number>> };
      if (!response.ok || !payload.ok) {
        setErrors(payload.errors ?? [{ field: "file", message: payload.error ?? "The request failed." }]);
        setPreview(null);
        return;
      }
      if (endpoint === "preview") {
        setPreview({ format: payload.format!, counts: payload.counts!, export: payload.export! });
      } else {
        const changed = Object.values(payload.result ?? {}).reduce((total, values) => total + (values.created ?? 0) + (values.updated ?? 0), 0);
        setMessage(`Import completed successfully. ${changed} records were created or updated.`);
        setPreview(null);
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      }
    } catch {
      setErrors([{ field: "request", message: "The server could not be reached. Nothing was imported." }]);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader><h2 className="font-bold">Export your workspace</h2></CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-slate-600">Downloads only your projects, tasks, comments and hierarchy. Passwords, sessions, tokens, API keys, permissions and security logs are excluded.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link prefetch={false} href="/api/data-transfer/export?format=json" className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Download JSON</Link>
            <Link prefetch={false} href="/api/data-transfer/export?format=yaml" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Download YAML</Link>
            <Link prefetch={false} href="/api/data-transfer/export?format=xlsx" className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Download Excel</Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">JSON version 1.0 is the canonical backup and import format. Keep exports private because they contain your workspace content.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="font-bold">Import into your account</h2></CardHeader>
        <CardContent>
          <label htmlFor="transfer-file" className="text-sm font-semibold">WorkAtlas export file</label>
          <input ref={inputRef} id="transfer-file" type="file" accept=".json,.yaml,.yml,.xlsx" onChange={chooseFile} disabled={Boolean(loading)} className={`${inputClass} mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1`} />
          <p className="mt-2 text-xs text-slate-500">Maximum 5 MB, 1,000 projects, 10,000 tasks and 20,000 comments.</p>
          <Button type="button" className="mt-4" disabled={!file || Boolean(loading)} onClick={() => request("preview")}>
            {loading === "preview" ? "Validating…" : "Validate and preview"}
          </Button>

          {errors.length > 0 && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"><p className="font-semibold text-red-800">The file was not accepted</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">{errors.slice(0, 20).map((error, index) => <li key={`${error.field}-${index}`}><code>{error.field}</code>: {error.message}</li>)}</ul>{errors.length > 20 && <p className="mt-2 text-xs text-red-700">Only the first 20 errors are shown.</p>}</div>}

          {preview && <div className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="font-semibold text-indigo-950">Validated export version {preview.export.exportVersion}</p>
            <p className="mt-1 text-sm text-indigo-900">{preview.counts.projects} projects · {preview.counts.tasks} tasks · {preview.counts.comments} comments</p>
            <p className="mt-1 text-xs text-indigo-700">Created {new Date(preview.export.exportedAt).toLocaleString()} for {preview.export.account.email}</p>
            <label htmlFor="conflict-strategy" className="mt-4 block text-sm font-semibold text-indigo-950">When matching IDs exist</label>
            <select id="conflict-strategy" value={strategy} onChange={(event) => setStrategy(event.target.value)} disabled={Boolean(loading)} className={`${inputClass} mt-2`}>
              <option value="create_new">Create new copies (recommended)</option>
              <option value="skip_existing">Skip existing projects and records</option>
              <option value="update_matching">Update records with matching IDs</option>
            </select>
            <p className="mt-2 text-xs text-indigo-700">All records are written only to the currently signed-in account. A failure rolls back the complete import.</p>
            <Button type="button" className="mt-4" disabled={Boolean(loading)} onClick={() => request("import")}>
              {loading === "import" ? "Importing…" : "Import validated file"}
            </Button>
          </div>}
          {message && <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">{message}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
