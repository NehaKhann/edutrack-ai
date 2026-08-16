import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, UserCircleIcon, UsersIcon } from "@heroicons/react/24/outline";
import * as chatApi from "../../api/chat";
import { errorMessage } from "../../api/client";
import * as realtime from "../../lib/realtime";
import type { ChatMessage, Conversation } from "../../types/chat";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { SkeletonRows } from "../Skeleton";

const POLL_INTERVAL_MS = 3000;

export function MessageThread({
  conversation,
  currentUserId,
  onBack,
  onActivity,
  onError,
}: {
  conversation: Conversation;
  currentUserId: number;
  onBack?: () => void;
  onActivity: () => void;
  onError: (message: string) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [readThroughAt, setReadThroughAt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | undefined>(undefined);
  const seenIdsRef = useRef<Set<number>>(new Set());

  const appendMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const fresh = incoming.filter((m) => !seenIdsRef.current.has(m.id));
      fresh.forEach((m) => seenIdsRef.current.add(m.id));
      if (fresh.length === 0) return prev;
      lastTimestampRef.current = fresh[fresh.length - 1].createdAt;
      return [...prev, ...fresh];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    seenIdsRef.current = new Set();
    lastTimestampRef.current = undefined;
    setMessages([]);
    setReadThroughAt(null);
    setLoading(true);

    chatApi
      .getMessages(conversation.id)
      .then((res) => {
        if (cancelled) return;
        res.messages.forEach((m) => seenIdsRef.current.add(m.id));
        lastTimestampRef.current = res.messages.length ? res.messages[res.messages.length - 1].createdAt : undefined;
        setMessages(res.messages);
        setReadThroughAt(res.readThroughAt);
      })
      .catch((err) => onError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));

    chatApi.markRead(conversation.id).then(onActivity).catch(() => {});

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      chatApi
        .getNewMessages(conversation.id, lastTimestampRef.current)
        .then((res) => {
          if (cancelled) return;
          // Refresh read-through status every tick, even with no new messages — that's how an
          // already-sent message's ticks turn blue shortly after the recipient opens the chat.
          setReadThroughAt(res.readThroughAt);
          if (res.messages.length === 0) return;
          appendMessages(res.messages);
          const hasIncoming = res.messages.some((m) => m.senderId !== currentUserId);
          if (hasIncoming) {
            chatApi.markRead(conversation.id).then(onActivity).catch(() => {});
          } else {
            onActivity();
          }
        })
        .catch(() => {});
    }, POLL_INTERVAL_MS);

    // Pushed messages land here the instant they're sent — the poll above keeps running regardless
    // (cheap, per-open-thread only) so read-receipt ticks keep refreshing live and there's still a
    // fallback if the socket is down; appendMessages' seenIdsRef de-dupes if both deliver the same one.
    const unsubscribe = realtime.subscribe<ChatMessage>("/user/queue/chat-messages", (m) => {
      if (cancelled || m.conversationId !== conversation.id) return;
      appendMessages([m]);
      if (m.senderId !== currentUserId) {
        chatApi.markRead(conversation.id).then(onActivity).catch(() => {});
      } else {
        onActivity();
      }
    });

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSendText(text: string) {
    try {
      const sent = await chatApi.sendMessage({ conversationId: conversation.id, type: "TEXT", content: text });
      appendMessages([sent]);
      onActivity();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function handleSendFile(file: File, caption?: string) {
    try {
      const type = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
      const sent = await chatApi.sendMessage({ conversationId: conversation.id, type, content: caption, file, fileName: file.name });
      appendMessages([sent]);
      onActivity();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  async function handleSendVoice(blob: Blob, durationSeconds: number) {
    try {
      const sent = await chatApi.sendMessage({
        conversationId: conversation.id,
        type: "VOICE",
        file: blob,
        fileName: "voice-message.webm",
        durationSeconds,
      });
      appendMessages([sent]);
      onActivity();
    } catch (err) {
      onError(errorMessage(err));
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200/70 px-4 py-3 dark:border-white/10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08] md:hidden"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
        )}
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
          {conversation.type === "GROUP" ? <UsersIcon className="h-5 w-5" /> : <UserCircleIcon className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{conversation.displayName}</div>
          {conversation.type === "GROUP" && <div className="text-xs text-slate-400 dark:text-slate-500">Group</div>}
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <SkeletonRows count={5} />
        ) : messages.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-400 dark:text-slate-500">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              mine={m.senderId === currentUserId}
              showSender={conversation.type === "GROUP"}
              read={Boolean(readThroughAt && m.createdAt <= readThroughAt)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <MessageComposer onSendText={handleSendText} onSendFile={handleSendFile} onSendVoice={handleSendVoice} />
    </div>
  );
}
