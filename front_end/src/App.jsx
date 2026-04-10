import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Show, useUser } from '@clerk/react';
import useAppStore from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Landing from './pages/Landing';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import Roadmap from './pages/student/Roadmap';
import Mentor from './pages/student/Mentor';
import Documents from './pages/student/Documents';
import Disputes from './pages/student/Disputes';

// Shared
import StudentProfilePage from './pages/shared/StudentProfilePage';
import StudentListPage from './pages/shared/StudentListPage';

// Teacher pages
import TeacherClasses from './pages/teacher/Classes';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherAlerts from './pages/teacher/Alerts';
import TeacherProfile from './pages/teacher/TeacherProfile';

// Admin pages
import AdminAnalytics from './pages/admin/Analytics';
import AdminDisputes from './pages/admin/Disputes';
import AdminUsers from './pages/admin/Users';
import AdminProfile from './pages/admin/AdminProfile';

function StudentRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/disputes" element={<Disputes />} />
        <Route path="/profile" element={<StudentProfilePage />} />
        {/* Legacy redirect */}
        <Route path="/coding" element={<Navigate to="/profile?tab=coding" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function TeacherRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/teacher/classes" element={<TeacherClasses />} />
        <Route path="/teacher/assignments" element={<TeacherAssignments />} />
        <Route path="/teacher/attendance" element={<TeacherAttendance />} />
        <Route path="/teacher/alerts" element={<TeacherAlerts />} />
        <Route path="/teacher/profile" element={<TeacherProfile />} />
        <Route path="/teacher/students" element={<StudentListPage />} />
        <Route path="/teacher/students/:userId" element={<StudentProfilePage viewMode />} />
        <Route path="*" element={<Navigate to="/teacher/classes" replace />} />
      </Routes>
    </Layout>
  );
}

function AdminRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/admin/analytics" element={<AdminAnalytics />} />
        <Route path="/admin/disputes" element={<AdminDisputes />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/profile" element={<AdminProfile />} />
        <Route path="/admin/students" element={<StudentListPage />} />
        <Route path="/admin/students/:userId" element={<StudentProfilePage viewMode />} />
        <Route path="*" element={<Navigate to="/admin/analytics" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { currentUser, role } = useAppStore();
  const { isSignedIn, user } = useUser();
  
  // Sync Clerk auth state to Zustand mock store
  useEffect(() => {
    if (isSignedIn && user && !currentUser) {
      useAppStore.setState({ 
        currentUser: { id: user.id, name: user.fullName || 'System User', email: user.primaryEmailAddress?.emailAddress },
        role: 'student' // Default to student portal
      });
    }
  }, [isSignedIn, user, currentUser]);

  return (
    <>
      <Show when="signed-out">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login/*" element={<Login />} />
            <Route path="/signup/*" element={<SignUp />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </Show>

      <Show when="signed-in">
        {currentUser && (
          <BrowserRouter>
            {role === 'student' && <StudentRoutes />}
            {role === 'teacher' && <TeacherRoutes />}
            {role === 'admin' && <AdminRoutes />}
          </BrowserRouter>
        )}
      </Show>
    </>
  );
}
