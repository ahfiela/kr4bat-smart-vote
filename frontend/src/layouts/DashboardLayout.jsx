import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const adminName = auth?.name || 'Administrator';

  // Mobile sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isSidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const getMenuClass = (path) => {
    const isActive = location.pathname === path;
    return `w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-xs md:text-sm font-bold transition-all duration-200 cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };

  // Reusable sidebar nav content
  const SidebarNav = () => (
    <>
      <div>
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black tracking-wider shadow-md shrink-0">
            V4
          </div>
          <div>
            <h2 className="font-black tracking-tight text-slate-900 text-base">VoteSmartK4</h2>
            <p className="text-[10px] text-blue-600 font-extrabold tracking-widest uppercase">Admin Panel</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          <Link to="/admin/sessions" className={getMenuClass('/admin/sessions')}>
            <ion-icon name="grid-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>Bilik Suara Aktif</span>
          </Link>
          <Link to="/admin/classes" className={getMenuClass('/admin/classes')}>
            <ion-icon name="school-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>Manajemen Kelas</span>
          </Link>
          <Link to="/admin/categories" className={getMenuClass('/admin/categories')}>
            <ion-icon name="shapes-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>Kategori Sesi</span>
          </Link>
          <Link to="/admin/voters" className={getMenuClass('/admin/voters')}>
            <ion-icon name="id-card-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>Daftar Pemilih</span>
          </Link>
          <Link to="/admin/history" className={getMenuClass('/admin/history')}>
            <ion-icon name="archive-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>History (Riwayat)</span>
          </Link>
          <Link to="/admin/settings" className={getMenuClass('/admin/settings')}>
            <ion-icon name="settings-outline" style={{ fontSize: '18px' }}></ion-icon>
            <span>Pengaturan Admin</span>
          </Link>
        </nav>
      </div>

      <div className="border-t border-slate-200/80 pt-4 space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs shrink-0">
            {adminName.charAt(0).toUpperCase()}
          </div>
          <div className="truncate min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{adminName}</p>
            <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Administrator
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold border border-red-100 transition-all duration-200 cursor-pointer"
        >
          <ion-icon name="log-out-outline" style={{ fontSize: '16px' }}></ion-icon>
          <span>Keluar Sistem</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Mobile Top Navbar (z-20) */}
      <header className="lg:hidden sticky top-0 z-20 w-full px-4 py-3 flex items-center justify-between bg-white border-b border-slate-200/80 shadow-xs">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
          aria-label="Buka Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
            V4
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight text-sm">VoteSmartK4</span>
        </div>

        <button
          onClick={handleLogout}
          className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-all"
        >
          <ion-icon name="log-out-outline" style={{ fontSize: '14px' }}></ion-icon>
          <span>Keluar</span>
        </button>
      </header>

      {/* Mobile Overlay Backdrop (z-40) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar Drawer (z-50 - highest layer above header & backdrop) */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw] bg-white flex flex-col justify-between p-6 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer"
          aria-label="Tutup Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <SidebarNav />
      </aside>

      {/* Desktop Main Layout Wrapper */}
      <div className="relative z-10 flex min-h-[calc(100vh-53px)] lg:min-h-screen">
        {/* Sidebar - Desktop (always visible, sticky) */}
        <aside className="hidden lg:flex w-64 xl:w-72 bg-white border-r border-slate-200/80 flex-col justify-between p-6 shrink-0 shadow-xs min-h-screen">
          <SidebarNav />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto min-h-full min-w-0">
          <Outlet />
        </main>
      </div>

      <style>{`
        .font-sans { font-family: 'Inter', sans-serif !important; }
      `}</style>
    </div>
  );
}