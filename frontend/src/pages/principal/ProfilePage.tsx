import { EnvelopeIcon, IdentificationIcon } from "@heroicons/react/24/outline";
import { PageHeader } from "../../components/PageHeader";
import { Card, CardBody } from "../../components/Card";
import { ChangePasswordCard } from "../../components/ChangePasswordCard";
import { Toast } from "../../components/Toast";
import { useAuth } from "../../auth/AuthContext";
import { useState } from "react";

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function ProfilePage() {
  const { user } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  if (!user) return null;
  const roleLabel = user.role === "PRINCIPAL" ? "Principal" : "Admin";

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="Your account details and security settings." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardBody className="flex flex-col items-center gap-4 py-8">
              <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-coral-500 to-amber-400 text-2xl font-bold text-white shadow-sm">
                {initialsOf(user.name)}
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{user.name}</p>
                <span className="mt-1 inline-flex items-center rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
                  {roleLabel}
                </span>
              </div>
              <div className="w-full space-y-2 border-t border-slate-100 pt-4 dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <EnvelopeIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <IdentificationIcon className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" />
                  {roleLabel}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <ChangePasswordCard onChanged={() => setToast("Password changed successfully.")} />
        </div>
      </div>

      <Toast message={toast} onClose={() => setToast(null)} />
    </div>
  );
}
