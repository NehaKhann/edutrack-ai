import { useEffect, useState } from "react";
import clsx from "clsx";
import { ArrowDownTrayIcon, DocumentIcon, CheckIcon, TrashIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import * as chatApi from "../../api/chat";
import type { ChatMessage } from "../../types/chat";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function useBlobUrl(messageId: number, enabled: boolean) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let objectUrl: string | null = null;
    let cancelled = false;
    chatApi.loadFileBlob(messageId).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [messageId, enabled]);
  return url;
}

export function MessageBubble({
  message,
  mine,
  showSender,
  read,
  onDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  showSender: boolean;
  read?: boolean;
  onDelete?: () => void;
}) {
  const isVideo = message.type === "DOCUMENT" && (message.mimeType?.startsWith("video/") ?? false);
  const needsBlob = !message.deleted && (message.type === "IMAGE" || message.type === "VOICE" || isVideo);
  const blobUrl = useBlobUrl(message.id, needsBlob);

  return (
    <div className={clsx("group flex items-end gap-1.5", mine ? "justify-end" : "justify-start")}>
      {mine && !message.deleted && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete message"
          title="Delete for everyone"
          className="mb-1 shrink-0 rounded-full p-1 text-slate-400 opacity-0 transition-opacity hover:bg-coral-50 hover:text-coral-600 focus-visible:opacity-100 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-coral-500/15 dark:hover:text-coral-400"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      )}
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[65%]",
          message.deleted
            ? "rounded-bl-md border border-dashed border-slate-300 bg-transparent text-slate-400 dark:border-white/15 dark:text-slate-500"
            : mine
              ? "rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white"
              : "rounded-bl-md border border-slate-200/70 bg-white text-slate-800 dark:border-white/10 dark:bg-navy-800 dark:text-slate-100"
        )}
      >
        {showSender && !mine && !message.deleted && (
          <div className="mb-0.5 text-xs font-semibold text-brand-600 dark:text-brand-300">{message.senderName}</div>
        )}

        {message.deleted ? (
          <p className="flex items-center gap-1.5 italic">
            <NoSymbolIcon className="h-3.5 w-3.5 shrink-0" />
            {mine ? "You deleted this message" : "This message was deleted"}
          </p>
        ) : (
          <>
            {message.type === "TEXT" && <p className="whitespace-pre-wrap break-words">{message.content}</p>}

            {message.type === "IMAGE" &&
              (blobUrl ? (
                <img src={blobUrl} alt={message.fileName ?? "Image"} className="max-h-72 w-full rounded-lg object-cover" />
              ) : (
                <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-black/10 text-xs">Loading photo…</div>
              ))}

            {message.type === "VOICE" &&
              (blobUrl ? (
                <audio controls src={blobUrl} className="h-10 w-56 max-w-full" />
              ) : (
                <p className="text-xs opacity-80">Loading voice message…</p>
              ))}

            {isVideo &&
              (blobUrl ? (
                <video controls src={blobUrl} className="max-h-72 w-full rounded-lg" />
              ) : (
                <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-black/10 text-xs">Loading video…</div>
              ))}

            {message.type === "DOCUMENT" && !isVideo && (
              <button
                type="button"
                onClick={() => chatApi.downloadFile(message.id, message.fileName ?? "file")}
                className={clsx(
                  "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                  mine ? "bg-white/15 hover:bg-white/20" : "bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.05] dark:hover:bg-white/[0.09]"
                )}
              >
                <DocumentIcon className="h-8 w-8 shrink-0 opacity-90" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{message.fileName ?? "Document"}</span>
                  <span className={clsx("block text-xs", mine ? "text-white/70" : "text-slate-400 dark:text-slate-500")}>
                    {formatBytes(message.fileSize)}
                  </span>
                </span>
                <ArrowDownTrayIcon className="h-4 w-4 shrink-0 opacity-80" />
              </button>
            )}

            {message.type !== "TEXT" && message.content && (
              <p className="mt-1.5 whitespace-pre-wrap break-words">{message.content}</p>
            )}
          </>
        )}

        <div
          className={clsx(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            message.deleted ? "text-slate-400 dark:text-slate-500" : mine ? "text-white/70" : "text-slate-400 dark:text-slate-500"
          )}
        >
          {formatTime(message.createdAt)}
          {mine &&
            !message.deleted &&
            (read ? (
              <span className="relative inline-flex h-3 w-4 text-sky-300" title="Read">
                <CheckIcon className="absolute left-0 h-3 w-3" strokeWidth={3} />
                <CheckIcon className="absolute left-1.5 h-3 w-3" strokeWidth={3} />
              </span>
            ) : (
              <CheckIcon className="h-3 w-3 text-white/60" strokeWidth={3} title="Sent" />
            ))}
        </div>
      </div>
    </div>
  );
}
