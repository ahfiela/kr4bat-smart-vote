import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardSession from './pages/admin/DashboardSession';
import DashboardVoter from './pages/voter/DashboardVoter';

import DashboardSchoolClasses from './pages/admin/DashboardSchoolClasses';
import DashboardCategory from './pages/admin/DashboardCategory';
import DashboardVoters from './pages/admin/DashboardVoters';
import DashboardHistory from './pages/admin/DashboardHistory';
import DashboardSettingsAdmin from './pages/admin/DashboardSettingsAdmin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/sessions" replace />} />
            <Route path="sessions" element={<DashboardSession />} />
            <Route path="classes" element={<DashboardSchoolClasses />} />
            <Route path="categories" element={<DashboardCategory />} />
            <Route path="voters" element={<DashboardVoters />} />
            <Route path="history" element={<DashboardHistory />} />
            <Route path="settings" element={<DashboardSettingsAdmin />} />
          </Route>

          <Route
            path="/voter/dashboard"
            element={
              <ProtectedRoute allowedRoles={['SISWA', 'GURU_STAF', 'MITRA']}>
                <DashboardVoter />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}