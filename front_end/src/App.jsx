import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAppStore from './store';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import RoleSelection from './pages/RoleSelection';
import ResetPassword from './pages/ResetPassword';

// Student pages
import StudentDashboard from './pages/student/Dashboard';
import Roadmap from './pages/student/Roadmap';
import Mentor from './pages/student/Mentor';
import Documents from './pages/student/Documents';
import CodingProfile from './pages/student/CodingProfile';
import Disputes from './pages/student/Disputes';

// Teacher pages
import TeacherClasses from './pages/teacher/Classes';
import TeacherAssignments from './pages/teacher/Assignments';
import TeacherAttendance from './pages/teacher/Attendance';
import TeacherAlerts from './pages/teacher/Alerts';
import StudentDetail from './pages/teacher/StudentDetail';

// Admin pages
import AdminAnalytics from './pages/admin/Analytics';
import AdminDisputes from './pages/admin/Disputes';
import AdminUsers from './pages/admin/Users';

function StudentRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/mentor" element={<Mentor />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/coding" element={<CodingProfile />} />
        <Route path="/disputes" element={<Disputes />} />
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
        <Route path="/teacher/student/:id" element={<StudentDetail />} />
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
        <Route path="*" element={<Navigate to="/admin/analytics" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const { currentUser, role } = useAppStore();

  return (
    <BrowserRouter>
      {!currentUser ? (
        <Routes>
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Login />} />
        </Routes>
      ) : !role ? (
        <Routes>
          <Route path="/select-role" element={<RoleSelection />} />
          <Route path="*" element={<Navigate to="/select-role" replace />} />
        </Routes>
      ) : (
        <>
          {role === 'student' && <StudentRoutes />}
          {role === 'teacher' && <TeacherRoutes />}
          {role === 'admin' && <AdminRoutes />}
        </>
      )}
    </BrowserRouter>
  );
}
