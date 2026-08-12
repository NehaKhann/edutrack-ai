import {
  Children,
  isValidElement,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronUpDownIcon } from "@heroicons/react/24/outline";
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
  "block w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500 dark:hover:border-white/25";

export function TextInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(inputBase, className)} {...rest} />;
}

interface SelectOption {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function parseOptions(children: ReactNode): SelectOption[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child)) return [];
    const props = child.props as { value?: string | number; children?: ReactNode; disabled?: boolean };
    return [{ value: props.value === undefined ? "" : String(props.value), label: props.children, disabled: props.disabled }];
  });
}

interface SelectProps {
  value?: string | number;
  defaultValue?: string | number;
  onChange?: (e: { target: { value: string } }) => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
}

const triggerBase =
  "flex w-full items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-900 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 dark:border-white/15 dark:bg-navy-800 dark:text-slate-100 dark:hover:border-white/25";

export function Select({ value, defaultValue, onChange, className, disabled, children }: SelectProps) {
  const options = useMemo(() => parseOptions(children), [children]);
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState(() => (defaultValue === undefined ? "" : String(defaultValue)));
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(null);

  const current = value === undefined ? internal : String(value);
  const selected = options.find((o) => o.value === current);

  // The trigger can sit inside a Card (backdrop-blur creates its own stacking context), which would
  // trap a same-DOM absolutely-positioned panel behind later sibling cards regardless of z-index.
  // Portaling to document.body and positioning from the trigger's real screen coordinates avoids that.
  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const spaceBelow = window.innerHeight - r.bottom;
      const openUpward = spaceBelow < 260 && r.top > spaceBelow;
      setRect({ top: openUpward ? r.top : r.bottom, left: r.left, width: r.width, openUpward });
    }
    updateRect();
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function choose(opt: SelectOption) {
    if (opt.disabled) return;
    setInternal(opt.value);
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={clsx(triggerBase, disabled && "cursor-not-allowed opacity-60", className)}
      >
        <span className={clsx("truncate", !selected && "text-slate-400 dark:text-slate-500")}>
          {selected ? selected.label : "Select..."}
        </span>
        <ChevronUpDownIcon
          className={clsx("h-4 w-4 shrink-0 text-slate-400 transition-transform dark:text-slate-500", open && "rotate-180")}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: rect.openUpward ? 4 : -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: rect.openUpward ? 4 : -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              role="listbox"
              style={{
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                transform: rect.openUpward ? "translateY(calc(-100% - 6px))" : "translateY(6px)",
              }}
              className="z-50 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-navy-800"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={opt.value === current}
                  disabled={opt.disabled}
                  onClick={() => choose(opt)}
                  className={clsx(
                    "flex w-full items-center rounded-lg px-3 py-1.5 text-left text-sm transition-colors",
                    opt.disabled
                      ? "cursor-default text-slate-400 dark:text-slate-500"
                      : opt.value === current
                        ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300" {...props} />;
}
