"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { initialMutationState, type MutationActionState } from "@/lib/action-state";
import { SuccessCheck } from "@/components/success-check";
import { cn } from "@/lib/utils";

type MutationAction = (state: MutationActionState, formData: FormData) => Promise<MutationActionState>;

function SubmitButton({ label, destructive }: { label: string; destructive?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-wait disabled:opacity-60",
        destructive ? "bg-red-600 hover:bg-red-500" : "bg-slate-950 hover:bg-slate-800",
      )}
    >
      {pending ? "Saving…" : label}
    </button>
  );
}

export function MutationDialog({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel = "Save changes",
  destructive = false,
  redirectTo,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: MutationAction;
  children: ReactNode;
  submitLabel?: string;
  destructive?: boolean;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState<MutationActionState>(initialMutationState);
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <span onClick={() => { setFeedback(initialMutationState); setOpen(true); }}>{trigger}</span>
      {feedback.status === "error" && feedback.message && <p className="visible mt-2 text-xs text-red-600" role="alert">{feedback.message}</p>}
      <SuccessCheck
        show={feedback.status === "success"}
        label={feedback.message || "Saved"}
        onDismiss={() => setFeedback(initialMutationState)}
      />
      {open && (
        <div className="visible pointer-events-auto fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false);
        }}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descriptionId : undefined}
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
              <div>
                <h2 id={titleId} className="text-xl font-bold text-slate-950">{title}</h2>
                {description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
              </div>
              <button type="button" onClick={() => setOpen(false)} className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            <DialogForm
              action={action}
              submitLabel={submitLabel}
              destructive={destructive}
              onCancel={() => setOpen(false)}
              onSuccess={(state) => {
                setFeedback(state);
                setOpen(false);
                if (redirectTo) router.replace(redirectTo);
                else router.refresh();
              }}
            >
              {children}
            </DialogForm>
          </section>
        </div>
      )}
    </>
  );
}

function DialogForm({
  action,
  children,
  submitLabel,
  destructive,
  onCancel,
  onSuccess,
}: {
  action: MutationAction;
  children: ReactNode;
  submitLabel: string;
  destructive: boolean;
  onCancel: () => void;
  onSuccess: (state: MutationActionState) => void;
}) {
  const [state, formAction] = useActionState(action, initialMutationState);
  useEffect(() => {
    if (state.status === "success") onSuccess(state);
  }, [onSuccess, state]);

  return (
    <form action={formAction} className="p-5 sm:p-6">
      {children}
      {state.status === "error" && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{state.message}</p>}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="min-h-10 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button>
        <SubmitButton label={submitLabel} destructive={destructive} />
      </div>
    </form>
  );
}
