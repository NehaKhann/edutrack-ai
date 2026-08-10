import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({
  className,
  interactive,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={clsx(
        "animate-fade-up rounded-2xl border border-slate-200/70 bg-white/90 shadow-card backdrop-blur-sm transition-all duration-200",
        "dark:border-white/10 dark:bg-navy-800/60 dark:shadow-none",
        interactive && "cursor-pointer hover:-translate-y-1 hover:border-brand-200 hover:shadow-glow-brand dark:hover:border-brand-400/40",
        !interactive && "hover:shadow-glass",
        className
      )}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("border-b border-slate-100 px-5 py-4 dark:border-white/[0.08]", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("px-5 py-4", className)} {...rest} />;
}
