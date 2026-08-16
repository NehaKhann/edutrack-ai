import { useState } from "react";
import { Modal } from "./Modal";
import { Field, TextInput } from "./FormFields";
import { Alert } from "./Alert";
import { Button } from "./Button";
import { changeMyPassword } from "../api/teacherProfile";
import { errorMessage } from "../api/client";

export function ChangePasswordModal({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => void }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

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
      reset();
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Change Password" widthClass="max-w-sm">
      <div className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        <Field label="Current password">
          <TextInput type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="New password" hint="At least 8 characters.">
          <TextInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label="Confirm new password">
          <TextInput type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
        </Field>
        <Button
          className="w-full justify-center"
          onClick={handleSubmit}
          loading={saving}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          Update password
        </Button>
      </div>
    </Modal>
  );
}
