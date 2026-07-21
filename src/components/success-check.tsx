"use client";

import { Check } from "lucide-react";
import { useEffect } from "react";

export const SUCCESS_FEEDBACK_MS = 2_000;

export function SuccessCheck({ show, onDismiss, label = "Saved" }: { show: boolean; onDismiss?: () => void; label?: string }) {
  useEffect(() => {
    if (!show || !onDismiss) return;
    const timeout = window.setTimeout(onDismiss, SUCCESS_FEEDBACK_MS);
    return () => window.clearTimeout(timeout);
  }, [onDismiss, show]);

  if (!show) return null;
  return (
    <span
      role="status"
      aria-label={label}
      className="visible inline-grid size-7 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"
    >
      <Check size={16} strokeWidth={3} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
