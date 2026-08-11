import clsx from "clsx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  activeClass: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: SegmentedOption<T>[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  disabled?: boolean;
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
            "px-2.5 py-1.5 text-[11px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            i > 0 && "border-l border-slate-300 dark:border-white/15",
            value === opt.value
              ? opt.activeClass
              : "bg-white/80 text-slate-500 hover:bg-slate-50 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/[0.08]"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
