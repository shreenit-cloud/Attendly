import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/context/authStore';
import { Navbar } from '@/components/common/Navbar';
import { LoginPage } from '@/pages/auth/Login';
import { StudentLoginPage } from '@/pages/auth/StudentLogin';
import { TeacherDashboard } from '@/pages/teacher/Dashboard';
import { LiveKiosk } from '@/pages/teacher/LiveKiosk';
import { StudentDashboard } from '@/pages/student/Dashboard';
import { LandingPage } from '@/pages/Landing';
import { RegisterPage } from '@/pages/auth/Register';
import { CreateClass } from '@/pages/teacher/CreateClass';
import { RosterPage } from '@/pages/teacher/Roster';

const queryClient = new QueryClient();

function ProtectedRoute({ children, role }: { children: React.ReactNode; role: 'teacher' | 'student' }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || user?.role !== role) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/student-login" element={<StudentLoginPage />} />
            <Route path="/teacher/register" element={<RegisterPage role="teacher" />} />
            <Route path="/student-register" element={<RegisterPage role="student" />} />
            <Route path="/teacher/kiosk/:classId" element={<ProtectedRoute role="teacher"><Navbar /><LiveKiosk /></ProtectedRoute>} />
            <Route path="/teacher/classes/new" element={<ProtectedRoute role="teacher"><Navbar /><CreateClass /></ProtectedRoute>} />
            <Route path="/teacher/classes/:classId/roster" element={<ProtectedRoute role="teacher"><Navbar /><RosterPage /></ProtectedRoute>} />
            <Route path="/teacher/*" element={<ProtectedRoute role="teacher"><Navbar /><TeacherDashboard /></ProtectedRoute>} />
            <Route path="/student/*" element={<ProtectedRoute role="student"><Navbar /><StudentDashboard /></ProtectedRoute>} />
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}