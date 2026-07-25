import React, { useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const adminName = auth?.name || 'Administrator';

  // Tiles pattern for light theme background (matches Voter Portal style)
  const cols = 28;
  const rows = 14;
  const totalTiles = cols * rows;

  const tiles = useMemo(() => {
    return Array.from({ length: totalTiles }).map((_, index) => {
      const c = index % cols;
      const scanDelay = (c % 10) * 0.2;
      return { id: index, delay: scanDelay };
    });
  }, [totalTiles]);

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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Soft Tile Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 z-0">
        <div className="grid grid-cols-12 md:grid-cols-28 gap-2.5 p-4 max-w-7xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="aspect-square bg-slate-200/50 rounded-lg animate-pulse"
              style={{ animationDuration: '4s', animationDelay: `${tile.delay}s` }}
            />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar Panel - Light Theme Harmonized */}
        <aside className="w-72 bg-white/80 backdrop-blur-md border-r border-slate-200/80 flex flex-col justify-between p-6 shrink-0 shadow-xs">
          <div>
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black tracking-wider shadow-md">
                V4
              </div>
              <div>
                <h2 className="font-black tracking-tight text-slate-900 text-base">VoteSmartK4</h2>
                <p className="text-[10px] text-blue-600 font-extrabold tracking-widest uppercase">Admin Panel</p>
              </div>
            </div>

            <nav className="space-y-1.5">
              <Link to="/admin/sessions" className={getMenuClass('/admin/sessions')}>
                <ion-icon name="time-outline" style={{ fontSize: '18px' }}></ion-icon>
                <span>Bilik Suara Aktif</span>
              </Link>
              <Link to="/admin/categories" className={getMenuClass('/admin/categories')}>
                <ion-icon name="list-outline" style={{ fontSize: '18px' }}></ion-icon>
                <span>Lis Hak Pilih & Kelas</span>
              </Link>
              <Link to="/admin/candidates" className={getMenuClass('/admin/candidates')}>
                <ion-icon name="people-outline" style={{ fontSize: '18px' }}></ion-icon>
                <span>Data Kandidat</span>
              </Link>
              <Link to="/admin/voters" className={getMenuClass('/admin/voters')}>
                <ion-icon name="id-card-outline" style={{ fontSize: '18px' }}></ion-icon>
                <span>Daftar Pemilih</span>
              </Link>
              <Link to="/admin/settings" className={getMenuClass('/admin/settings')}>
                <ion-icon name="settings-outline" style={{ fontSize: '18px' }}></ion-icon>
                <span>Pengaturan Admin</span>
              </Link>
            </nav>
          </div>

          <div className="border-t border-slate-200/80 pt-4 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-xs">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{adminName}</p>
                <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Administrator
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl text-xs font-bold border border-red-100 transition-all duration-200 cursor-pointer"
            >
              <span>Keluar Sistem</span>
              <span>🚪</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto max-h-screen">
          <Outlet />
        </main>
      </div>

      <style>{`
        .font-sans { font-family: 'Inter', sans-serif !important; }
      `}</style>
    </div>
  );
}