import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckIcon } from "@heroicons/react/24/outline";
import * as chatApi from "../../api/chat";
import { errorMessage } from "../../api/client";
import type { Contact, Conversation } from "../../types/chat";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { Field, TextInput } from "../FormFields";
import { SegmentedControl } from "../SegmentedControl";
import { SkeletonRows } from "../Skeleton";

export function NewChatModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (conversation: Conversation) => void;
}) {
  const [mode, setMode] = useState<"direct" | "group">("direct");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode("direct");
    setGroupName("");
    setSelected(new Set());
    setError(null);
    setLoading(true);
    chatApi
      .listContacts()
      .then(setContacts)
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [open]);

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleStartDirect(contact: Contact) {
    setBusy(true);
    setError(null);
    try {
      const conversation = await chatApi.startDirect(contact.id);
      onCreated(conversation);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateGroup() {
    if (!groupName.trim() || selected.size === 0) return;
    setBusy(true);
    setError(null);
    try {
      const conversation = await chatApi.createGroup(groupName.trim(), Array.from(selected));
      onCreated(conversation);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New chat" widthClass="max-w-md">
      <div className="mb-4 flex justify-center">
        <SegmentedControl
          size="md"
          value={mode}
          onChange={setMode}
          options={[
            { value: "direct", label: "Direct message", activeClass: "bg-brand-600 text-white" },
            { value: "group", label: "Group", activeClass: "bg-brand-600 text-white" },
          ]}
        />
      </div>

      {error && <p className="mb-3 text-sm text-coral-600 dark:text-coral-300">{error}</p>}

      {mode === "group" && (
        <div className="mb-4">
          <Field label="Group name">
            <TextInput value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Staff Room" />
          </Field>
        </div>
      )}

      {loading ? (
        <SkeletonRows count={4} />
      ) : contacts.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400 dark:text-slate-500">No other staff accounts yet.</p>
      ) : (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {contacts.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={busy}
              onClick={() => (mode === "direct" ? handleStartDirect(c) : toggle(c.id))}
              className={clsx(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors disabled:opacity-50",
                mode === "group" && selected.has(c.id)
                  ? "bg-brand-50 dark:bg-brand-500/[0.08]"
                  : "hover:bg-slate-50 dark:hover:bg-white/[0.05]"
              )}
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                {c.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{c.name}</div>
                <div className="truncate text-xs text-slate-400 dark:text-slate-500">
                  {c.role === "PRINCIPAL" ? "Principal" : "Teacher"}
                </div>
              </div>
              {mode === "group" && selected.has(c.id) && (
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {mode === "group" && (
        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreateGroup} loading={busy} disabled={!groupName.trim() || selected.size === 0}>
            Create group
          </Button>
        </div>
      )}
    </Modal>
  );
}
