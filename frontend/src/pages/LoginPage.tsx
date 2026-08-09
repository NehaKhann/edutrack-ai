import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AcademicCapIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { TextInput, Field } from "../components/FormFields";
import { Alert } from "../components/Alert";
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
      <div className="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <AcademicCapIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-bold">EduTrack AI</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold leading-tight">
            Run your school's term end-to-end &mdash; syllabus, tests, grading, and analytics, all connected.
          </h1>
          <p className="mt-4 max-w-md text-brand-100">
            AI drafts, your staff approve. Built for real classrooms, not enterprise budgets.
          </p>
        </div>
        <p className="text-sm text-brand-200">&copy; {new Date().getFullYear()} EduTrack AI</p>
      </div>

      <div className="flex w-full flex-col items-center justify-center bg-slate-50 px-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
                <AcademicCapIcon className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-slate-900">EduTrack AI</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your teacher or principal account.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-500">
            <p className="font-semibold text-slate-700">Demo accounts (password: Password123!)</p>
            <p className="mt-1">Principal: principal@edutrack.school</p>
            <p>Teacher: sana.tariq@edutrack.school</p>
          </div>
        </div>
      </div>
    </div>
  );
}
