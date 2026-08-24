import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import RoomWizardModal from './RoomWizardModal';
import RoomMonitorPanel from './RoomMonitorPanel';

export default function DashboardSession() {
  const [sessions, setSessions] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Active selected room for internal monitoring
  const [activeMonitorSession, setActiveMonitorSession] = useState(null);

  // Wizard Modal state
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const fetchSessions = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get('/admin/sessions');
      if (res.data.status === 'success') {
        setSessions(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data sesi:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const statusBadge = (status) => {
    const map = {
      DRAFT: 'bg-slate-100 text-slate-600 border-slate-200',
      ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ARCHIVED: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return map[status] || map.DRAFT;
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Hapus sesi pemilu ini? Semua data suara masuk dan kandidat terkait akan terhapus permanen!')) return;
    try {
      const res = await apiClient.delete(`/admin/sessions/${sessionId}`);
      if (res.data.status === 'success') {
        fetchSessions();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal menghapus sesi');
    }
  };

  // Filter sessions by search query
  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.room_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // If inspecting a specific active booth panel, render RoomMonitorPanel
  if (activeMonitorSession) {
    return (
      <RoomMonitorPanel
        session={activeMonitorSession}
        onBack={() => {
          setActiveMonitorSession(null);
          fetchSessions();
        }}
        onUpdateSession={fetchSessions}
      />
    );
  }

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Header & Main Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Dasbor Bilik Suara Aktif
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Eksklusif menampilkan daftar bilik suara aktif. Klik tombol "Selanjutnya" untuk masuk ke panel monitor internal.
          </p>
        </div>

        <button
          onClick={() => setIsWizardOpen(true)}
          className="rounded-xl px-5 py-3 text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <span className="text-base font-black">+</span>
          <span>Buat Room Baru (Wizard Flow)</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="w-full sm:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari bilik berdasarkan nama atau kode room..."
            className="w-full rounded-xl px-4 py-2.5 text-sm bg-white border border-slate-200/80 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium shrink-0">
          Total Bilik: <span className="font-extrabold text-slate-800">{filteredSessions.length}</span>
        </div>
      </div>

      {/* Main Grid: Active Room Cards */}
      {isFetching ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium">
          Memuat daftar bilik suara...
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center mx-auto text-xl font-bold">
            🗳️
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Belum Ada Room Sesi Pemilihan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            Klik tombol "Buat Room Baru (Wizard Flow)" di kanan atas untuk memulai pembuatan room secara linier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div
              key={session.id}
              className="bg-white border border-slate-200/80 hover:border-blue-500/50 rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 shadow-xs hover:shadow-md group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${statusBadge(session.status)}`}>
                      {session.status}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors mt-2">
                      {session.name}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all text-xs cursor-pointer opacity-0 group-hover:opacity-100"
                    title="Hapus Sesi"
                  >
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>

                <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 space-y-1.5 text-xs text-slate-600">
                  <div className="flex justify-between">
                    <span className="font-medium">Kode Room:</span>
                    <span className="font-mono font-bold text-blue-600">{session.room_code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tahun:</span>
                    <span className="font-bold text-slate-800">{session.year}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Kandidat Terdaftar:</span>
                    <span className="font-bold text-emerald-600">{session.candidates_count ?? 0} Kandidat</span>
                  </div>
                  {session.allowed_roles && (
                    <div className="flex justify-between border-t border-slate-200/60 pt-1.5 mt-1.5">
                      <span className="font-medium">Cakupan (Level 1):</span>
                      <span className="font-bold text-slate-800">{session.allowed_roles.join(', ')}</span>
                    </div>
                  )}
                </div>

                {session.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 italic font-medium">
                    "{session.description}"
                  </p>
                )}
              </div>

              {/* Browse Flow: "Selanjutnya" Button */}
              <div className="pt-6 border-t border-slate-100 mt-6">
                <button
                  onClick={() => setActiveMonitorSession(session)}
                  className="w-full py-3 rounded-2xl text-xs font-extrabold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-sm cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Selanjutnya</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Room Wizard Flow Modal */}
      <RoomWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          fetchSessions();
        }}
      />
    </div>
  );
}