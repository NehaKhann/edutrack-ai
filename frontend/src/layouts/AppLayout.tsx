import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDaysIcon,
  BookOpenIcon,
  Squares2X2Icon,
  ArrowRightStartOnRectangleIcon,
  AcademicCapIcon,
  UserCircleIcon,
  UsersIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../auth/AuthContext";

const teacherNav = [
  { to: "/teacher/lesson-plan", label: "Today's Plan", icon: CalendarDaysIcon },
  { to: "/teacher/syllabus", label: "Syllabus", icon: BookOpenIcon },
  { to: "/teacher/profile", label: "My Profile", icon: UserCircleIcon },
];

const principalNav = [
  { to: "/principal/coverage", label: "Coverage Grid", icon: Squares2X2Icon },
  { to: "/principal/teachers", label: "Teacher Directory", icon: UsersIcon },
];

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
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <AcademicCapIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight text-white">EduTrack AI</div>
          <div className="text-[11px] text-brand-300">School Operations</div>
        </div>
        <button
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close menu"
          className="ml-auto rounded-lg p-1.5 text-brand-200 hover:bg-brand-800 md:hidden"
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
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive ? "bg-brand-700 text-white shadow-sm" : "text-brand-200 hover:bg-brand-800 hover:text-white"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-brand-800 px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-200 transition-colors hover:bg-brand-800 hover:text-white"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col bg-brand-900 text-brand-100 md:flex">{sidebarContent}</aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-900/50 md:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-brand-900 text-brand-100 md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 md:hidden"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="text-sm text-slate-500">
              <span className="hidden sm:inline">Signed in as </span>
              <span className="font-medium text-slate-800">{user.name}</span>
            </div>
          </div>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{roleLabel}</span>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
