import clsx from "clsx";
import { PlusIcon, UserGroupIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import type { Conversation } from "../../types/chat";
import { EmptyState } from "../EmptyState";
import { SkeletonRows } from "../Skeleton";

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function shortTime(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat,
  loading,
}: {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (conv: Conversation) => void;
  onNewChat: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-slate-200/70 px-4 py-3.5 dark:border-white/10">
        <h2 className="font-display text-base font-semibold text-navy-900 dark:text-white">Chats</h2>
        <button
          type="button"
          onClick={onNewChat}
          aria-label="Start new chat"
          className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-glow-brand transition-transform hover:scale-105"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3">
            <SkeletonRows count={6} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-4">
            <EmptyState
              title="No conversations yet"
              description="Start a chat with a colleague or create a group."
              action={
                <button type="button" onClick={onNewChat} className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-300">
                  Start a chat
                </button>
              }
            />
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c)}
              className={clsx(
                "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors dark:border-white/[0.05]",
                selectedId === c.id ? "bg-brand-50 dark:bg-brand-500/[0.08]" : "hover:bg-slate-50 dark:hover:bg-white/[0.04]"
              )}
            >
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-sm font-bold text-white">
                {c.type === "GROUP" ? <UserGroupIcon className="h-5 w-5" /> : initialsOf(c.displayName) || <UserCircleIcon className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{c.displayName}</span>
                  <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{shortTime(c.lastMessageAt)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {c.lastMessagePreview ?? "No messages yet"}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white">
                      {c.unreadCount > 99 ? "99+" : c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
