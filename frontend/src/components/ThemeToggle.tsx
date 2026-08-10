import { SunIcon, MoonIcon } from "@heroicons/react/24/outline";
import { useTheme } from "../theme/ThemeContext";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/70 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
    >
      <SunIcon className="h-[17px] w-[17px] scale-100 opacity-100 transition-all dark:scale-0 dark:opacity-0" />
      <MoonIcon className="absolute h-[17px] w-[17px] scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100" />
    </button>
  );
}
