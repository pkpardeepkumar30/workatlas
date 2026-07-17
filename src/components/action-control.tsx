import Link from "next/link";
import type { ButtonConfig } from "@/config/schemas";
import { getRegisteredAction } from "@/registries/actions";
import { cn } from "@/lib/utils";

const variantClasses = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-500",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  dark: "bg-slate-950 text-white hover:bg-slate-800",
  text: "text-slate-600 hover:text-slate-950",
} as const;

export function ActionControl({
  button,
  className,
}: {
  button: ButtonConfig;
  className?: string;
}) {
  const action = getRegisteredAction(button.action);
  const classes = cn(
    "inline-flex min-h-10 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold transition",
    variantClasses[button.variant],
    className,
  );

  if (action.kind === "form") {
    return (
      <form action={action.endpoint} method={action.method}>
        <button type="submit" className={classes}>{button.label}</button>
      </form>
    );
  }

  return <Link href={action.href} className={classes}>{button.label}</Link>;
}

