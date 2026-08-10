import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import { SyllabusPage } from "./pages/teacher/SyllabusPage";
import { LessonPlanPage } from "./pages/teacher/LessonPlanPage";
import { ProfilePage } from "./pages/teacher/ProfilePage";
import { CoverageGridPage } from "./pages/principal/CoverageGridPage";
import { TeacherDirectoryPage } from "./pages/principal/TeacherDirectoryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { SearchPage } from "./pages/SearchPage";
import { useAuth } from "./auth/AuthContext";
import { FullPageSpinner } from "./components/Spinner";

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
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

          <Route element={<ProtectedRoute allow={["TEACHER"]} />}>
            <Route path="/teacher/syllabus" element={<SyllabusPage />} />
            <Route path="/teacher/lesson-plan" element={<LessonPlanPage />} />
            <Route path="/teacher/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<ProtectedRoute allow={["PRINCIPAL", "ADMIN"]} />}>
            <Route path="/principal/coverage" element={<CoverageGridPage />} />
            <Route path="/principal/teachers" element={<TeacherDirectoryPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
