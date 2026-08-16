import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { PaperAirplaneIcon, MicrophoneIcon, StopIcon, XMarkIcon, DocumentIcon } from "@heroicons/react/24/outline";
import { useVoiceRecorder } from "./useVoiceRecorder";
import { EmojiPickerButton } from "./EmojiPickerButton";
import { AttachmentMenuButton } from "./AttachmentMenuButton";

interface Props {
  onSendText: (text: string) => Promise<void>;
  onSendFile: (file: File, caption?: string) => Promise<void>;
  onSendVoice: (blob: Blob, durationSeconds: number) => Promise<void>;
  disabled?: boolean;
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageComposer({ onSendText, onSendFile, onSendVoice, disabled }: Props) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recorder = useVoiceRecorder();

  // Revoke the object URL whenever the staged attachment changes or the composer unmounts.
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  function handlePickEmoji(emoji: string) {
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => prev + emoji);
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const next = text.slice(0, start) + emoji + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + emoji.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  function handleFilePicked(file: File) {
    setPendingFile(file);
    setPendingPreviewUrl(file.type.startsWith("image/") || file.type.startsWith("video/") ? URL.createObjectURL(file) : null);
    textareaRef.current?.focus();
  }

  function cancelPendingFile() {
    setPendingFile(null);
    setPendingPreviewUrl(null);
  }

  async function handleSend() {
    if (sending) return;
    if (pendingFile) {
      setSending(true);
      try {
        await onSendFile(pendingFile, text.trim() || undefined);
        setPendingFile(null);
        setPendingPreviewUrl(null);
        setText("");
      } finally {
        setSending(false);
      }
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await onSendText(trimmed);
      setText("");
    } finally {
      setSending(false);
    }
  }

  async function handleStopRecording() {
    const result = await recorder.stop();
    if (!result) return;
    setSending(true);
    try {
      await onSendVoice(result.blob, result.durationSeconds);
    } finally {
      setSending(false);
    }
  }

  const busy = disabled || sending;
  const hasContent = Boolean(text.trim()) || Boolean(pendingFile);

  if (recorder.recording) {
    return (
      <div className="flex items-center gap-3 border-t border-slate-200/70 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-navy-800/60">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-coral-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral-500" />
        </span>
        <span className="flex-1 text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
          Recording… {formatElapsed(recorder.elapsed)}
        </span>
        <button
          type="button"
          onClick={() => recorder.cancel()}
          aria-label="Cancel recording"
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08]"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={handleStopRecording}
          aria-label="Send voice message"
          className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow-brand"
        >
          <StopIcon className="h-5 w-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200/70 bg-white/90 px-3 py-3 dark:border-white/10 dark:bg-navy-800/60 sm:px-4">
      {recorder.error && <p className="mb-2 text-xs text-coral-600 dark:text-coral-300">{recorder.error}</p>}

      {pendingFile && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-white/10 dark:bg-white/[0.04]">
          {pendingFile.type.startsWith("image/") && pendingPreviewUrl ? (
            <img src={pendingPreviewUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : pendingFile.type.startsWith("video/") && pendingPreviewUrl ? (
            <video src={pendingPreviewUrl} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
              <DocumentIcon className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{pendingFile.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{formatBytes(pendingFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={cancelPendingFile}
            disabled={busy}
            aria-label="Remove attachment"
            className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-white/[0.1]"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <AttachmentMenuButton onPick={handleFilePicked} disabled={busy} />
        <EmojiPickerButton onPick={handlePickEmoji} disabled={busy} />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={busy}
          rows={1}
          placeholder={pendingFile ? "Add a caption (optional)" : "Type a message"}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-400 focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        {hasContent ? (
          <button
            type="button"
            disabled={busy}
            onClick={handleSend}
            aria-label="Send message"
            className={clsx(
              "grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow-brand transition-opacity",
              busy && "opacity-60"
            )}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => recorder.start()}
            aria-label="Record voice message"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/[0.08]"
          >
            <MicrophoneIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
