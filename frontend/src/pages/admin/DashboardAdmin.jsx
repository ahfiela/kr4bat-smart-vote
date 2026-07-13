// src/pages/DashboardAdmin.jsx
import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import DashboardSession from './DashboardSession';

export default function DashboardAdmin() {
  const [activeMenu, setActiveMenu] = useState('sesi'); // Mengontrol sub-halaman

  return (
    <DashboardLayout activeMenu={activeMenu} setActiveMenu={setActiveMenu}>
      {/* Kondisional Render Halaman Inti */}
      {activeMenu === 'sesi' && <DashboardSession />}
      {activeMenu === 'kandidat' && (
        <div className="animate-fade-in text-slate-400">Halaman Management Data Kandidat (Coming Soon)</div>
      )}
      {activeMenu === 'pemilih' && (
        <div className="animate-fade-in text-slate-400">Halaman Management Daftar Pemilih (Coming Soon)</div>
      )}
    </DashboardLayout>
  );
}