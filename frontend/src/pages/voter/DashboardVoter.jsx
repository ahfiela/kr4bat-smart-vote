import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export default function DashboardSession() {
  const [sessions, setSessions] = useState([]);
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [roomCode, setRoomCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/admin/sessions', {
        name,
        year,
        room_code: roomCode,
      });

      if (res.data.status === 'success') {
        setSuccessMessage('Sesi berhasil dibuat!');
        setName('');
        setRoomCode('');
        fetchSessions();
      }
    } catch (err) {
      const message = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || 'Gagal membuat sesi baru';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (sessionId, newStatus) => {
    resetMessages();
    try {
      await apiClient.patch(`/admin/sessions/${sessionId}/status`, { status: newStatus });
      fetchSessions();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengubah status sesi');
    }
  };

  const statusBadge = (status) => {
    const map = {
      DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      ARCHIVED: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    };
    return map[status] || map.DRAFT;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Control Room Sesi Pemilihan
          </h1>
          <p className="text-xs text-slate-400">Organisasikan bilik suara elektronik sekolah secara real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-fit">
          <h3 className="text-lg font-bold text-slate-200 mb-4">Buat Sesi Baru</h3>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Nama Sesi</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pemilihan Ketua OSIS 2026"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Tahun</label>
              <input
                type="number"
                required
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Kode Ruangan</label>
              <input
                type="text"
                required
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="OSIS2026"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="text-xs text-red-400 font-semibold">⚠️ {errorMessage}</div>
            )}
            {successMessage && (
              <div className="text-xs text-emerald-400 font-semibold">✓ {successMessage}</div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all"
            >
              {isLoading ? 'Menyimpan...' : 'Buat Sesi'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Daftar Bilik Suara Aktif</h3>

          {isFetching && <p className="text-sm text-slate-500">Memuat data sesi...</p>}
          {!isFetching && sessions.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada sesi pemilihan yang dibuat.</p>
          )}

          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-slate-200">{session.name}</h4>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(session.status)}`}>
                      {session.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Kode: <span className="font-mono text-slate-400">{session.room_code}</span> • {session.year} • {session.candidates_count ?? 0} kandidat
                  </p>
                </div>

                <select
                  value={session.status}
                  onChange={(e) => handleStatusChange(session.id, e.target.value)}
                  className="bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 px-3 py-2 focus:outline-none"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ARCHIVED">ARCHIVED</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}