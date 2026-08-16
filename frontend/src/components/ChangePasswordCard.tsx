import { useState } from "react";
import { KeyIcon } from "@heroicons/react/24/outline";
import { Card, CardHeader, CardBody } from "./Card";
import { Field, TextInput } from "./FormFields";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { changeMyPassword } from "../api/teacherProfile";
import { errorMessage } from "../api/client";

export function ChangePasswordCard({ forced = false, onChanged }: { forced?: boolean; onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSaving(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={forced ? "ring-2 ring-amber-400/60 dark:ring-amber-500/40" : undefined}>
      <CardHeader>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          <KeyIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" /> Change Password
        </h3>
      </CardHeader>
      <CardBody className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Field label={forced ? "Temporary password" : "Current password"}>
          <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="Confirm new password">
          <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button onClick={handleSubmit} loading={saving} disabled={!currentPassword || !newPassword || !confirmPassword}>
          Update password
        </Button>
      </CardBody>
    </Card>
  );
}
