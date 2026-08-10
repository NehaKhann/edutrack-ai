import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { AcademicCapIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { TextInput, Field } from "../components/FormFields";
import { Alert } from "../components/Alert";
import { AmbientBackground } from "../components/AmbientBackground";
import { ThemeToggle } from "../components/ThemeToggle";
import { errorMessage } from "../api/client";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="flex min-h-screen w-full">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-mesh-hero p-12 text-white lg:flex">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shadow-glow-teal backdrop-blur-sm">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <span className="font-display text-lg font-bold">EduTrack AI</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10"
        >
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">
            Run your school's term end-to-end &mdash; syllabus, tests, grading, and analytics, all connected.
          </h1>
          <p className="mt-4 max-w-md text-brand-100/90">
            AI drafts, your staff approve. Built for real classrooms, not enterprise budgets.
          </p>
        </motion.div>

        <p className="relative z-10 text-sm text-brand-200">&copy; {new Date().getFullYear()} EduTrack AI</p>
      </div>

      <div className="relative flex w-full flex-col items-center justify-center bg-[#F5F6FC] px-6 dark:bg-navy-900 lg:w-1/2">
        <div className="absolute right-5 top-5">
          <ThemeToggle />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 shadow-glow-brand">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-navy-900 dark:text-white">EduTrack AI</span>
            </div>
          </div>

          <h2 className="font-display text-2xl font-bold tracking-tight text-navy-900 dark:text-white">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sign in to your teacher or principal account.</p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4 rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-glass backdrop-blur-sm dark:border-white/10 dark:bg-white/5"
          >
            {error && <Alert type="error">{error}</Alert>}
            <Field label="Email">
              <TextInput
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              Sign in
            </Button>
          </form>

          <div className="mt-6 rounded-xl border border-slate-200/70 bg-white/70 p-3 text-xs text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            <p className="font-semibold text-slate-700 dark:text-slate-200">Demo accounts (password: Password123!)</p>
            <p className="mt-1">Principal: principal@edutrack.school</p>
            <p>Teacher: sana.tariq@edutrack.school</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
