import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../auth/AuthContext";
import * as chatApi from "../api/chat";
import { errorMessage } from "../api/client";
import * as realtime from "../lib/realtime";
import type { Conversation } from "../types/chat";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { Toast } from "../components/Toast";
import { EmptyState } from "../components/EmptyState";
import { ConversationList } from "../components/chat/ConversationList";
import { MessageThread } from "../components/chat/MessageThread";
import { NewChatModal } from "../components/chat/NewChatModal";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

const CONVERSATIONS_POLL_MS = 15000;

export function ChatPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshConversations = useCallback(() => {
    return chatApi
      .listConversations()
      .then(setConversations)
      .catch((err) => setError(errorMessage(err)));
  }, []);

  useEffect(() => {
    setLoading(true);
    refreshConversations().finally(() => setLoading(false));

    // While connected, pushed updates below keep the list current — the poll only matters as a fallback.
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !realtime.isConnected()) refreshConversations();
    }, CONVERSATIONS_POLL_MS);

    const unsubscribe = realtime.subscribe<Conversation>("/user/queue/chat-updates", (updated) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === updated.id);
        const next = exists ? prev.map((c) => (c.id === updated.id ? updated : c)) : [updated, ...prev];
        return [...next].sort((a, b) => {
          const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return bt - at;
        });
      });
    });

    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [refreshConversations]);

  // Deep link from a chat notification click, e.g. /chat?conversationId=5 — jump straight to that thread.
  useEffect(() => {
    const targetId = Number(searchParams.get("conversationId"));
    if (!targetId) return;
    if (conversations.some((c) => c.id === targetId)) {
      setSelectedId(targetId);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, conversations, setSearchParams]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function handleCreated(conversation: Conversation) {
    setModalOpen(false);
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      return exists ? prev : [conversation, ...prev];
    });
    setSelectedId(conversation.id);
  }

  if (!user) return null;

  return (
    <div className="flex h-[calc(100vh-12rem)] min-h-[520px] flex-col">
      <PageHeader title="Chat" description="Message teachers and the Principal directly, or start a group." />

      <Card className="flex min-h-0 flex-1 overflow-hidden p-0">
        <div
          className={clsx(
            "w-full shrink-0 border-r border-slate-200/70 dark:border-white/10 md:w-80",
            selected && "hidden md:block"
          )}
        >
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={(c) => setSelectedId(c.id)}
            onNewChat={() => setModalOpen(true)}
            loading={loading}
          />
        </div>

        <div className={clsx("min-w-0 flex-1", !selected && "hidden md:flex")}>
          {selected ? (
            <MessageThread
              key={selected.id}
              conversation={selected}
              currentUserId={user.id}
              onBack={() => setSelectedId(null)}
              onActivity={refreshConversations}
              onError={setError}
            />
          ) : (
            <div className="hidden h-full w-full items-center justify-center md:flex">
              <EmptyState
                icon={<ChatBubbleLeftRightIcon className="h-10 w-10" />}
                title="Select a conversation"
                description="Pick a chat from the list, or start a new one."
              />
            </div>
          )}
        </div>
      </Card>

      <NewChatModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      <Toast message={error} type="error" onClose={() => setError(null)} />
    </div>
  );
}
