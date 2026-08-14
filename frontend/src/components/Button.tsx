import { forwardRef, type ButtonHTMLAttributes } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd"
>;

interface Props extends NativeButtonProps {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "group bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white shadow-glow-brand ring-1 ring-inset ring-white/15 hover:shadow-[0_14px_38px_-8px_rgba(21,102,51,0.65)] focus-visible:ring-brand-500 disabled:from-brand-300 disabled:to-brand-300 disabled:shadow-none disabled:ring-0",
  secondary:
    "bg-white/80 text-slate-700 border border-slate-200 backdrop-blur-sm hover:bg-white hover:shadow-md focus-visible:ring-brand-500 shadow-sm disabled:text-slate-400 dark:bg-white/[0.08] dark:text-slate-200 dark:border-white/10 dark:hover:bg-white/[0.12]",
  danger:
    "bg-gradient-to-br from-coral-600 to-coral-500 text-white shadow-glow-coral hover:shadow-[0_10px_30px_-6px_rgba(214,51,43,0.6)] focus-visible:ring-coral-500 disabled:from-coral-100 disabled:to-coral-100 disabled:shadow-none",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-500 dark:text-slate-300 dark:hover:bg-white/[0.08]",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", loading, className, disabled, children, ...rest }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={disabled || loading ? undefined : { scale: 1.02, y: -1 }}
        whileTap={disabled || loading ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        disabled={disabled || loading}
        className={clsx(
          "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl font-medium transition-[background,box-shadow,color] duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:ring-offset-navy-900",
          "disabled:cursor-not-allowed",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...rest}
      >
        {variant === "primary" && !disabled && !loading && (
          <span className="pointer-events-none absolute inset-y-0 left-0 w-1/4 -skew-x-12 bg-white/25 -translate-x-[150%] transition-transform duration-700 ease-out group-hover:translate-x-[500%]" />
        )}
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);
Button.displayName = "Button";
