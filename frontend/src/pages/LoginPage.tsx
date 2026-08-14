import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AcademicCapIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { TextInput, Field } from "../components/FormFields";
import { Alert } from "../components/Alert";
import { AmbientBackground } from "../components/AmbientBackground";
import { ThemeToggle } from "../components/ThemeToggle";
import { errorMessage } from "../api/client";

const DEMO_ACCOUNTS = [
  { role: "Principal", email: "principal@edutrack.school" },
  { role: "Teacher", email: "sana.tariq@edutrack.school" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate((location.state as any)?.from ?? "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-white lg:flex-row dark:bg-navy-900">
      {/* Branding panel — full column on desktop, compact hero strip on mobile */}
      <div className="relative flex shrink-0 flex-col justify-between overflow-hidden bg-mesh-hero px-6 pb-16 pt-8 text-white lg:w-1/2 lg:px-12 lg:py-12">
        <AmbientBackground className="pointer-events-none absolute inset-0 h-full w-full opacity-70" />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1px, transparent 1px)", backgroundSize: "22px 22px" }}
        />

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-glow-teal ring-1 ring-inset ring-white/20 backdrop-blur-sm">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-lg font-bold">EduTrack AI</span>
        </motion.div>

        {/* Compact tagline — mobile hero only */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 mt-4 max-w-xs text-sm text-brand-100/90 lg:hidden"
        >
          Syllabus, tests, grading, and analytics &mdash; all connected.
        </motion.p>

        {/* Full headline — desktop only */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 hidden lg:block"
        >
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Run your school's term end-to-end &mdash; syllabus, tests, grading, and analytics, all connected.
          </h1>
          <p className="mt-4 max-w-md text-brand-100/90">
            AI drafts, your staff approve. Built for real classrooms, not enterprise budgets.
          </p>
        </motion.div>

        <p className="relative z-10 hidden text-sm text-brand-200 lg:block">&copy; {new Date().getFullYear()} EduTrack AI</p>
      </div>

      {/* Form panel — overlaps the hero as a rounded sheet on mobile */}
      <div className="relative z-10 -mt-8 flex w-full flex-1 flex-col items-center rounded-t-[2rem] bg-[#F5F6FC] px-6 pb-10 pt-8 dark:bg-navy-900 lg:mt-0 lg:w-1/2 lg:justify-center lg:rounded-none lg:px-8 lg:py-12">
        <div className="absolute right-5 top-5 lg:right-8 lg:top-8">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm pt-6 lg:pt-0"
        >
          <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white sm:text-[26px]">
            Welcome back
          </h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Sign in to your teacher or principal account.</p>

          <form
            onSubmit={handleSubmit}
            className="relative mt-7 space-y-4 overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-glass ring-1 ring-inset ring-white/40 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_25px_60px_-20px_rgba(0,0,0,0.55)] dark:ring-white/5"
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-400/70 to-transparent" />

            {error && <Alert type="error">{error}</Alert>}

            <Field label="Email">
              <div className="relative">
                <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <TextInput
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@school.edu"
                  className="pl-10"
                />
              </div>
            </Field>
            <Field label="Password">
              <div className="relative">
                <LockClosedIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <TextInput
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Button type="submit" size="lg" className="w-full tracking-wide" loading={loading}>
              Sign in
            </Button>
          </form>

          {import.meta.env.DEV && (
            <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Demo accounts <span className="font-normal text-slate-400 normal-case dark:text-slate-500">&middot; password: Password123!</span>
              </p>
              <div className="mt-2.5 space-y-1">
                {DEMO_ACCOUNTS.map((acc) => (
                  <DemoAccountRow key={acc.email} role={acc.role} email={acc.email} />
                ))}
              </div>
            </div>
          )}

          <p className="mt-6 text-center text-[11px] text-slate-400 dark:text-slate-500 lg:hidden">
            &copy; {new Date().getFullYear()} EduTrack AI
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function DemoAccountRow({ role, email }: { role: string; email: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={clsx(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
            role === "Principal"
              ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
              : "bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300"
          )}
        >
          {role}
        </span>
        <span className="truncate font-mono text-[11.5px] text-slate-600 dark:text-slate-300">{email}</span>
      </span>
      {copied ? (
        <CheckIcon className="h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
      ) : (
        <ClipboardDocumentIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500" />
      )}
    </button>
  );
}
