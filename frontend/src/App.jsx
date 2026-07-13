import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardSession from './pages/admin/DashboardSession';
import DashboardVoter from './pages/voter/DashboardVoter';

const DashboardCandidate = () => (
  <div className="text-slate-400">Halaman Management Data Kandidat (Coming Soon)</div>
);
const DashboardVoterList = () => (
  <div className="text-slate-400">Halaman Management Daftar Pemilih (Coming Soon)</div>
);

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
            <Route path="candidates" element={<DashboardCandidate />} />
            <Route path="voters" element={<DashboardVoterList />} />
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