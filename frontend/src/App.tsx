import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { SyllabusPage } from "./pages/teacher/SyllabusPage";
import { LessonPlanPage } from "./pages/teacher/LessonPlanPage";
import { ProfilePage } from "./pages/teacher/ProfilePage";
import { DiaryPage } from "./pages/teacher/DiaryPage";
import { AttendancePage } from "./pages/teacher/AttendancePage";
import { MyAttendancePage } from "./pages/teacher/MyAttendancePage";
import { LeaveAndSkipPage } from "./pages/teacher/LeaveAndSkipPage";
import { MyTimetablePage } from "./pages/teacher/MyTimetablePage";
import { CoverageGridPage } from "./pages/principal/CoverageGridPage";
import { TeacherDirectoryPage } from "./pages/principal/TeacherDirectoryPage";
import { DiaryOverviewPage } from "./pages/principal/DiaryOverviewPage";
import { AttendanceDashboardPage } from "./pages/principal/AttendanceDashboardPage";
import { TeacherAttendancePage } from "./pages/principal/TeacherAttendancePage";
import { TimetablePage } from "./pages/principal/TimetablePage";
import { AuditLogPage } from "./pages/principal/AuditLogPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SearchPage } from "./pages/SearchPage";
import { ChatPage } from "./pages/ChatPage";
import { useAuth } from "./auth/AuthContext";
import { FullPageSpinner } from "./components/Spinner";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "TEACHER" && user.mustChangePassword) return <Navigate to="/teacher/profile" replace />;
  return <Navigate to={user.role === "TEACHER" ? "/teacher/lesson-plan" : "/principal/coverage"} replace />;
}

export default function App() {
  const { loading } = useAuth();
  if (loading) return <FullPageSpinner />;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/chat" element={<ChatPage />} />

          <Route element={<ProtectedRoute allow={["TEACHER"]} />}>
            <Route path="/teacher/syllabus" element={<SyllabusPage />} />
            <Route path="/teacher/lesson-plan" element={<LessonPlanPage />} />
            <Route path="/teacher/profile" element={<ProfilePage />} />
            <Route path="/teacher/diary" element={<DiaryPage />} />
            <Route path="/teacher/attendance" element={<AttendancePage />} />
            <Route path="/teacher/my-attendance" element={<MyAttendancePage />} />
            <Route path="/teacher/leave" element={<LeaveAndSkipPage />} />
            <Route path="/teacher/timetable" element={<MyTimetablePage />} />
          </Route>

          <Route element={<ProtectedRoute allow={["PRINCIPAL", "ADMIN"]} />}>
            <Route path="/principal/coverage" element={<CoverageGridPage />} />
            <Route path="/principal/timetable" element={<TimetablePage />} />
            <Route path="/principal/teachers" element={<TeacherDirectoryPage />} />
            <Route path="/principal/diary" element={<DiaryOverviewPage />} />
            <Route path="/principal/attendance" element={<AttendanceDashboardPage />} />
            <Route path="/principal/teacher-attendance" element={<TeacherAttendancePage />} />
            <Route path="/principal/audit-log" element={<AuditLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
