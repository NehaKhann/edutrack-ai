import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDaysIcon,
  CalendarIcon,
  BookOpenIcon,
  HomeIcon,
  Squares2X2Icon,
  ArrowRightStartOnRectangleIcon,
  UserCircleIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  PencilSquareIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  IdentificationIcon,
  TableCellsIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthContext";
import { AmbientBackground } from "../components/AmbientBackground";
import { ThemeToggle } from "../components/ThemeToggle";
import * as notificationsApi from "../api/notifications";
import * as chatApi from "../api/chat";
import * as realtime from "../lib/realtime";
import type { AppNotification } from "../types/notification";

type NavSection = "main" | "tools";
interface NavItem {
  to: string;
  label: string;
  icon: typeof CalendarDaysIcon;
  section: NavSection;
}

const teacherNav: NavItem[] = [
  { to: "/teacher/lesson-plan", label: "Today's Plan", icon: CalendarDaysIcon, section: "main" },
  { to: "/teacher/syllabus", label: "Syllabus", icon: BookOpenIcon, section: "main" },
  { to: "/teacher/diary", label: "Class Diary", icon: PencilSquareIcon, section: "main" },
  { to: "/teacher/attendance", label: "Class Attendance", icon: ClipboardDocumentCheckIcon, section: "main" },
  { to: "/teacher/my-attendance", label: "My Attendance", icon: IdentificationIcon, section: "main" },
  { to: "/teacher/leave", label: "Leave & Skipped Classes", icon: ClipboardDocumentListIcon, section: "main" },
  { to: "/teacher/timetable", label: "My Timetable", icon: TableCellsIcon, section: "main" },
  { to: "/chat", label: "Chat", icon: ChatBubbleLeftRightIcon, section: "tools" },
  { to: "/search", label: "Search", icon: MagnifyingGlassIcon, section: "tools" },
  { to: "/teacher/profile", label: "My Profile", icon: UserCircleIcon, section: "tools" },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon, section: "tools" },
];

const principalNav: NavItem[] = [
  { to: "/principal/home", label: "Home", icon: HomeIcon, section: "main" },
  { to: "/principal/coverage", label: "Coverage Grid", icon: Squares2X2Icon, section: "main" },
  { to: "/principal/timetable", label: "Timetable", icon: TableCellsIcon, section: "main" },
  { to: "/principal/diary", label: "Class Diary", icon: PencilSquareIcon, section: "main" },
  { to: "/principal/attendance", label: "Class Attendance", icon: ClipboardDocumentCheckIcon, section: "main" },
  { to: "/principal/teacher-attendance", label: "Teacher Attendance", icon: IdentificationIcon, section: "main" },
  { to: "/principal/teachers", label: "Teacher Directory", icon: UsersIcon, section: "main" },
  { to: "/principal/audit-log", label: "Audit Log", icon: ShieldCheckIcon, section: "main" },
  { to: "/chat", label: "Chat", icon: ChatBubbleLeftRightIcon, section: "tools" },
  { to: "/search", label: "Search", icon: MagnifyingGlassIcon, section: "tools" },
  { to: "/principal/profile", label: "My Profile", icon: UserCircleIcon, section: "tools" },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon, section: "tools" },
];

/** One sidebar row — active state gets a stronger fill, a glowing left accent bar, and bolder white text. */
function SidebarLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        clsx(
          "group relative flex items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-sm transition-all duration-200",
          isActive
            ? "bg-gradient-to-r from-brand-500 to-brand-600 font-semibold text-white shadow-glow-brand"
            : "font-medium text-brand-200 hover:translate-x-0.5 hover:bg-white/[0.08] hover:text-white"
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-white shadow-[0_0_6px_1px_rgba(255,255,255,0.55)]" />
          )}
          <item.icon
            className={clsx(
              "h-5 w-5 shrink-0 transition-opacity duration-200",
              isActive ? "opacity-100" : "opacity-80 group-hover:opacity-100"
            )}
          />
          <span className="truncate">{item.label}</span>
          {item.to === "/chat" && <ChatUnreadBadge />}
        </>
      )}
    </NavLink>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const navItems = user.role === "TEACHER" ? teacherNav : principalNav;
  const mainItems = navItems.filter((i) => i.section === "main");
  const toolsItems = navItems.filter((i) => i.section === "tools");
  const roleLabel = user.role === "TEACHER" ? "Teacher" : user.role === "PRINCIPAL" ? "Principal" : "Admin";

  const sidebarContent = (
    <>
      <div className="flex items-center gap-3 px-5 pb-5 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-glow-brand ring-1 ring-inset ring-white/10">
          <img src="/icons/icon-192.png" alt="" className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-[15px] font-bold leading-tight text-white">Metropolitan School</div>
          <div className="mt-0.5 text-[11px] font-medium tracking-wide text-brand-300/90">North Campus 1</div>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
          className="ml-auto shrink-0 rounded-lg p-1.5 text-brand-200 hover:bg-white/10 md:hidden"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-5 border-t border-white/10" />

      <nav className="mt-5 flex flex-1 flex-col overflow-y-auto px-3 pb-2">
        <div className="flex flex-col gap-1.5">
          {mainItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-brand-300/60">Tools</div>
        <div className="flex flex-col gap-1.5">
          {toolsItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-3.5">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-sm font-medium text-brand-200 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 opacity-80" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AmbientBackground />

      {/* Desktop sidebar */}
      <aside className="relative z-10 hidden w-64 flex-shrink-0 flex-col overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-brand-900 text-brand-100 shadow-glass md:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "20px 20px" }}
        />
        <div className="relative z-10 flex h-full flex-col">{sidebarContent}</div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-navy-900/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-gradient-to-b from-navy-900 via-navy-800 to-brand-900 text-brand-100 shadow-glass md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header className="glass sticky top-0 z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200/70 px-4 shadow-sm dark:border-white/10 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/[0.08] md:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
              Signed in as <span className="font-medium text-slate-800 dark:text-slate-100">{user.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:ring-brand-500/20">
              {roleLabel}
            </span>
            {user.role === "TEACHER" ? (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral-500 to-amber-400 text-xs font-bold text-white shadow-sm">
                {initialsOf(user.name)}
              </div>
            ) : (
              <UserMenu />
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

const CHAT_UNREAD_POLL_MS = 15000;

function ChatUnreadBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    function poll() {
      chatApi
        .unreadCount()
        .then((res) => setCount(res.count))
        .catch(() => {});
    }
    poll();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && !realtime.isConnected()) poll();
    }, CHAT_UNREAD_POLL_MS);
    // A pushed conversation update means something changed for us — re-fetch the total rather than
    // trying to track every conversation's unread count locally just for this one badge.
    const unsubscribe = realtime.subscribe<unknown>("/user/queue/chat-updates", poll);
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded-full bg-coral-500 px-1.5 text-[10px] font-bold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, right: window.innerWidth - r.right });
    }
    updateRect();
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", handlePointer);
    };
  }, [open]);

  if (!user) return null;
  const roleLabel = user.role === "PRINCIPAL" ? "Principal" : "Admin";

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 dark:hover:bg-white/[0.08]"
      >
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral-500 to-amber-400 text-xs font-bold text-white shadow-sm">
          {initialsOf(user.name)}
        </div>
        <ChevronDownIcon className={clsx("h-3.5 w-3.5 text-slate-400 transition-transform dark:text-slate-500", open && "rotate-180")} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: rect.top + 8, right: rect.right }}
              className="z-50 w-64 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-navy-800"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-white/[0.08]">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-coral-500 to-amber-400 text-xs font-bold text-white shadow-sm">
                  {initialsOf(user.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                  <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="py-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/principal/profile");
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
                >
                  <UserCircleIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/[0.05]"
                >
                  <ArrowRightStartOnRectangleIcon className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  Sign out
                </button>
              </div>
              <div className="border-t border-slate-100 px-4 py-2 dark:border-white/[0.08]">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">{roleLabel}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    function pollUnread() {
      notificationsApi
        .unreadCount()
        .then((res) => setUnread(res.count))
        .catch(() => {});
    }
    pollUnread();
    const interval = window.setInterval(() => {
      if (!realtime.isConnected()) pollUnread();
    }, 30000);
    const unsubscribe = realtime.subscribe<AppNotification>("/user/queue/notifications", (n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnread((prev) => prev + 1);
    });
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    function updateRect() {
      const el = triggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.bottom, right: window.innerWidth - r.right });
    }
    updateRect();
    // Always refetch on open — notifications can arrive while the panel is closed, and caching
    // this behind a "loaded once" flag left the dropdown showing stale content until a page reload.
    notificationsApi
      .list()
      .then((list) => {
        setNotifications(list);
        setLoaded(true);
      })
      .catch(() => {});
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", handlePointer);
    return () => {
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", handlePointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleNotificationClick(n: AppNotification) {
    setOpen(false);
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.read) setUnread((prev) => Math.max(0, prev - 1));
    notificationsApi.dismiss(n.id).catch(() => {});
    if (n.link) navigate(n.link);
  }

  function handleRemove(e: ReactMouseEvent, n: AppNotification) {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    if (!n.read) setUnread((prev) => Math.max(0, prev - 1));
    notificationsApi.dismiss(n.id).catch(() => {});
  }

  function handleClearAll() {
    setNotifications([]);
    setUnread(0);
    notificationsApi.clearAll().catch(() => {});
  }

  async function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      try {
        await notificationsApi.markAllRead();
        setUnread(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      } catch {
        // non-critical
      }
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        aria-label="Notifications"
        onClick={handleToggle}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white/70 text-slate-500 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        <BellIcon className="h-[17px] w-[17px]" />
        {unread > 0 && (
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-coral-500 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#101410]" />
        )}
      </button>

      {createPortal(
        <AnimatePresence>
          {open && rect && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: rect.top + 8, right: rect.right }}
              className="z-50 w-80 max-w-[90vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-white/10 dark:bg-navy-800"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-white/[0.08]">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-slate-400 hover:text-coral-600 dark:text-slate-500 dark:hover:text-coral-400"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {!loaded ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">Loading…</div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">No notifications yet.</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleNotificationClick(n)}
                      onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(n)}
                      className={clsx(
                        "group relative flex w-full cursor-pointer items-start gap-2 border-b border-slate-50 px-4 py-3 pr-9 text-left text-sm transition-colors last:border-b-0 hover:bg-slate-50 dark:border-white/[0.05] dark:hover:bg-white/[0.05]",
                        !n.read && "bg-brand-50/60 dark:bg-brand-500/[0.08]"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-slate-700 dark:text-slate-200">{n.message}</p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</p>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove notification"
                        onClick={(e) => handleRemove(e, n)}
                        className="absolute right-2.5 top-2.5 rounded-full p-1 text-slate-300 opacity-0 transition-opacity hover:bg-slate-200 hover:text-slate-600 focus:opacity-100 group-hover:opacity-100 dark:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
