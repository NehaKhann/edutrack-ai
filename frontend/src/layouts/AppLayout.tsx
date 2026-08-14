import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDaysIcon,
  CalendarIcon,
  BookOpenIcon,
  Squares2X2Icon,
  ArrowRightStartOnRectangleIcon,
  AcademicCapIcon,
  UserCircleIcon,
  UsersIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  PencilSquareIcon,
  ClipboardDocumentCheckIcon,
  IdentificationIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthContext";
import { AmbientBackground } from "../components/AmbientBackground";
import { ThemeToggle } from "../components/ThemeToggle";
import * as notificationsApi from "../api/notifications";
import type { AppNotification } from "../types/notification";

const teacherNav = [
  { to: "/teacher/lesson-plan", label: "Today's Plan", icon: CalendarDaysIcon },
  { to: "/teacher/syllabus", label: "Syllabus", icon: BookOpenIcon },
  { to: "/teacher/diary", label: "Class Diary", icon: PencilSquareIcon },
  { to: "/teacher/attendance", label: "Attendance", icon: ClipboardDocumentCheckIcon },
  { to: "/teacher/my-attendance", label: "My Attendance & Leave", icon: IdentificationIcon },
  { to: "/teacher/timetable", label: "My Timetable", icon: TableCellsIcon },
  { to: "/search", label: "Search", icon: MagnifyingGlassIcon },
  { to: "/teacher/profile", label: "My Profile", icon: UserCircleIcon },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
];

const principalNav = [
  { to: "/principal/coverage", label: "Coverage Grid", icon: Squares2X2Icon },
  { to: "/principal/timetable", label: "Timetable", icon: TableCellsIcon },
  { to: "/principal/diary", label: "Class Diary", icon: PencilSquareIcon },
  { to: "/principal/attendance", label: "Attendance", icon: ClipboardDocumentCheckIcon },
  { to: "/principal/teacher-attendance", label: "Teacher Attendance", icon: IdentificationIcon },
  { to: "/principal/teachers", label: "Teacher Directory", icon: UsersIcon },
  { to: "/search", label: "Search", icon: MagnifyingGlassIcon },
  { to: "/calendar", label: "Calendar", icon: CalendarIcon },
];

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
  const roleLabel = user.role === "TEACHER" ? "Teacher" : user.role === "PRINCIPAL" ? "Principal" : "Admin";

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-500 shadow-glow-brand">
          <AcademicCapIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-display text-sm font-bold leading-tight text-white">Metropolitan School</div>
          <div className="text-[11px] text-brand-300">North Campus 1</div>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
          className="ml-auto rounded-lg p-1.5 text-brand-200 hover:bg-white/10 md:hidden"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-gradient-to-r from-brand-600/90 to-brand-500/70 text-white shadow-glow-brand"
                  : "text-brand-200 hover:translate-x-0.5 hover:bg-white/[0.08] hover:text-white"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-brand-200 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
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
            <div className="hidden h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-coral-500 to-amber-400 text-xs font-bold text-white shadow-sm sm:grid">
              {initialsOf(user.name)}
            </div>
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
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    notificationsApi
      .unreadCount()
      .then((res) => setUnread(res.count))
      .catch(() => {});
    const interval = window.setInterval(() => {
      notificationsApi
        .unreadCount()
        .then((res) => setUnread(res.count))
        .catch(() => {});
    }, 30000);
    return () => window.clearInterval(interval);
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
    if (!loaded) {
      notificationsApi
        .list()
        .then((list) => {
          setNotifications(list);
          setLoaded(true);
        })
        .catch(() => {});
    }
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
  }, [open, loaded]);

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
              <div className="border-b border-slate-100 px-4 py-3 dark:border-white/[0.08]">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
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
                      className={clsx(
                        "border-b border-slate-50 px-4 py-3 text-sm last:border-b-0 dark:border-white/[0.05]",
                        !n.read && "bg-brand-50/60 dark:bg-brand-500/[0.08]"
                      )}
                    >
                      <p className="text-slate-700 dark:text-slate-200">{n.message}</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{timeAgo(n.createdAt)}</p>
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
