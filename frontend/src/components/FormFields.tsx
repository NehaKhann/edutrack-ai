import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>}
    </label>
  );
}

const inputBase =
  "block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputBase, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={clsx(inputBase, "bg-white dark:bg-navy-800", className)} {...rest}>
      {children}
    </select>
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" {...props} />;
}
