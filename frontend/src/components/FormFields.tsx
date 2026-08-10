import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputBase =
  "block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-shadow focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputBase, className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select className={clsx(inputBase, "bg-white", className)} {...rest}>
      {children}
    </select>
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1 block text-sm font-medium text-slate-700" {...props} />;
}
