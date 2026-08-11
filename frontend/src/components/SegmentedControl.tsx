import clsx from "clsx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  activeClass: string;
  activeGlowClass?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  size = "sm",
}: {
  options: SegmentedOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 dark:border-white/15">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.value)}
          className={clsx(
            "font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50",
            size === "md" ? "px-3.5 py-2.5 text-xs" : "px-2.5 py-1.5 text-[11px]",
            i > 0 && "border-l border-slate-300 dark:border-white/15",
            value === opt.value
              ? clsx(opt.activeClass, opt.activeGlowClass, "relative z-10 scale-[1.04]")
              : "bg-white/80 text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/[0.08]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
