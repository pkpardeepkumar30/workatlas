"use client";

import { Menu } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export const menuItemClass = "flex w-full min-h-10 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500";

export function ActionMenu({ label, children }: { label: string; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={container} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Menu size={18} aria-hidden="true" />
      </button>
      {open && <div
        role="menu"
        aria-label={label}
        className="absolute right-0 top-11 z-40 min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
      >
        {children}
      </div>}
    </div>
  );
}
