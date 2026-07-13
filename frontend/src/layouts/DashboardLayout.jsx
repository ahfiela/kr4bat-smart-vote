import React, { useMemo } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const adminName = auth?.name || 'Administrator';

  const cols = 32;
  const rows = 14;
  const totalTiles = cols * rows;

  const tiles = useMemo(() => {
    return Array.from({ length: totalTiles }).map((_, index) => {
      const c = index % cols;
      const scanDelay = c * 0.12;
      const glitchPattern = Math.random() * 1.8;
      const isHole = Math.random() < 0.15;
      return { id: index, delay: scanDelay + glitchPattern, isHole };
    });
  }, [totalTiles, cols]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const getMenuClass = (path) => {
    const isActive = location.pathname === path;
    return `w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-x-hidden selection:bg-blue-600/30 selection:text-blue-200">
      <div className="absolute inset-0 pointer-events-none grid grid-cols-32 grid-rows-14 gap-[2px] p-2 opacity-70 z-0">
        {tiles.map((tile) => (
          <div
            key={tile.id}
            className={`scan-tile rounded-[3px] bg-white/[0.01] transition-all duration-700 ${tile.isHole ? 'opacity-0' : ''}`}
            style={{ animationDelay: `${tile.delay}s` }}
          />
        ))}
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="w-72 bg-slate-900/60 backdrop-blur-xl border-r border-white/5 flex flex-col justify-between p-6 shrink-0">
          <div>
            <div className="flex items-center space-x-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold tracking-wider shadow-lg shadow-blue-500/20">
                V4
              </div>
              <div>
                <h2 className="font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">VoteSmartK4</h2>
                <p className="text-[10px] text-blue-400 font-bold tracking-widest uppercase">Admin Panel</p>
              </div>
            </div>

            <nav className="space-y-2">
              <Link to="/admin/sessions" className={getMenuClass('/admin/sessions')}>
                <ion-icon name="time" className="text-lg"></ion-icon>
                <span>Sesi Pemilihan</span>
              </Link>
              <Link to="/admin/candidates" className={getMenuClass('/admin/candidates')}>
                <ion-icon name="people" className="text-lg"></ion-icon>
                <span>Data Kandidat</span>
              </Link>
              <Link to="/admin/voters" className={getMenuClass('/admin/voters')}>
                <ion-icon name="id-card" className="text-lg"></ion-icon>
                <span>Daftar Pemilih</span>
              </Link>
            </nav>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-blue-400">
                {adminName.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-slate-200 truncate">{adminName}</p>
                <p className="text-xs text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2.5 rounded-xl text-xs font-bold border border-red-500/10 transition-all duration-300 cursor-pointer"
            >
              <ion-icon name="log-out"></ion-icon>
              <span>Keluar Sistem</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-8 overflow-y-auto max-h-screen">
          <Outlet />
        </main>
      </div>

      <style>{`
        @keyframes waveScanner {
          0%, 100% { background-color: transparent; box-shadow: none; }
          25% { background-color: rgba(235, 240, 248, 0.28); box-shadow: 0 0 10px rgba(235, 240, 248, 0.2); }
          50%, 75% { background-color: rgba(255, 255, 255, 0.04); box-shadow: none; }
        }
        .scan-tile { animation: waveScanner 5s infinite ease-in-out; border: 1px solid rgba(255, 255, 255, 0.04); }
      `}</style>
    </div>
  );
}