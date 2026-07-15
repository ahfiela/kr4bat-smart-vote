import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';

export default function DashboardSession() {
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);

  // Form Fields
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [roomCode, setRoomCode] = useState('');
  const [allowedClasses, setAllowedClasses] = useState([]);

  // Active Detailed Session (for real-time chart viewing)
  const [detailSession, setDetailSession] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(null);

  // States
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

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/admin/categories');
      if (res.data.status === 'success') {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data kategori:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/admin/voters/classes');
      if (res.data.status === 'success') {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil daftar kelas:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchCategories();
    fetchClasses();
  }, []);

  // Polling for selected session detail
  const fetchSessionDetail = async (id) => {
    try {
      const res = await apiClient.get(`/admin/sessions/${id}`);
      if (res.data.status === 'success') {
        setDetailSession(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat detail sesi:', err);
    }
  };

  useEffect(() => {
    if (detailSession && isPolling) {
      pollingRef.current = setInterval(() => {
        fetchSessionDetail(detailSession.id);
      }, 5000); // refresh every 5 seconds
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [detailSession?.id, isPolling]);

  const handleSelectSessionDetail = (session) => {
    resetMessages();
    if (detailSession?.id === session.id) {
      // toggle close
      setDetailSession(null);
      setIsPolling(false);
    } else {
      fetchSessionDetail(session.id);
      setIsPolling(true);
    }
  };

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
        category_id: categoryId,
        year,
        room_code: roomCode,
        allowed_classes: allowedClasses.length > 0 ? allowedClasses : null,
      });

      if (res.data.status === 'success') {
        setSuccessMessage('Sesi berhasil dibuat!');
        setName('');
        setCategoryId('');
        setRoomCode('');
        setAllowedClasses([]);
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
      const res = await apiClient.patch(`/admin/sessions/${sessionId}/status`, { status: newStatus });
      if (res.data.status === 'success') {
        setSuccessMessage(res.data.message);
        fetchSessions();
        // If it's the currently opened detail session, update it
        if (detailSession?.id === sessionId) {
          fetchSessionDetail(sessionId);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengubah status sesi');
    }
  };

  const handlePublishResults = async (sessionId) => {
    resetMessages();
    try {
      const res = await apiClient.post(`/admin/sessions/${sessionId}/publish`);
      if (res.data.status === 'success') {
        setSuccessMessage('Hasil pemilu berhasil disubmit dan dipublikasikan!');
        fetchSessions();
        if (detailSession?.id === sessionId) {
          fetchSessionDetail(sessionId);
        }
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mempublikasikan hasil');
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Hapus sesi pemilu ini? Semua data suara masuk dan kandidat terkait akan terhapus permanen!')) return;
    resetMessages();
    try {
      const res = await apiClient.delete(`/admin/sessions/${sessionId}`);
      if (res.data.status === 'success') {
        setSuccessMessage('Sesi pemilihan berhasil dihapus.');
        setDetailSession(null);
        setIsPolling(false);
        fetchSessions();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus sesi');
    }
  };

  const handleClassCheckboxChange = (cls) => {
    if (allowedClasses.includes(cls)) {
      setAllowedClasses(allowedClasses.filter((c) => c !== cls));
    } else {
      setAllowedClasses([...allowedClasses, cls]);
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

  const calculateTotalVotes = (session) => {
    if (!session || !session.candidates) return 0;
    return session.candidates.reduce((sum, c) => sum + (c.votes_count || 0), 0);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Control Room Sesi Pemilihan
          </h1>
          <p className="text-xs text-slate-400">Organisasikan bilik suara elektronik sekolah secara real-time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Buat Sesi */}
        <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-fit">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Kategori</label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-850 border border-white/5 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
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
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Kode Ruangan Khusus</label>
              <input
                type="text"
                required
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="OSIS2026"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">
                Daftar Kelas yang Diperbolehkan <span className="text-[10px] text-slate-500">(Kosongkan = Semua Kelas)</span>
              </label>
              {classes.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">Harap tambahkan data pemilih yang memiliki kelas terlebih dahulu.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto bg-slate-900/60 p-2.5 border border-white/5 rounded-xl">
                  {classes.map((cls) => (
                    <label key={cls} className="flex items-center gap-1.5 text-xs text-slate-300 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowedClasses.includes(cls)}
                        onChange={() => handleClassCheckboxChange(cls)}
                        className="rounded accent-blue-500"
                      />
                      <span>{cls}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/15 p-2.5 rounded-lg">
                ⚠️ {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/15 p-2.5 rounded-lg">
                ✓ {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
            >
              {isLoading ? 'Menyimpan...' : 'Buat Sesi'}
            </button>
          </form>
        </div>

        {/* Kolom Kanan: Daftar Sesi Aktif */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-200">Daftar Bilik Suara Aktif</h3>

          {isFetching && <p className="text-sm text-slate-500">Memuat data sesi...</p>}
          {!isFetching && sessions.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada sesi pemilihan yang dibuat.</p>
          )}

          <div className="space-y-4">
            {sessions.map((session) => {
              const isDetailOpen = detailSession?.id === session.id;

              return (
                <div
                  key={session.id}
                  className={`bg-[#1e293b]/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-white/10 transition-all duration-300 ${isDetailOpen ? 'ring-1 ring-blue-500/30' : ''}`}
                >
                  <div className="p-5 flex items-center justify-between gap-4 flex-wrap">
                    <div className="cursor-pointer flex-1 min-w-0" onClick={() => handleSelectSessionDetail(session)}>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-slate-200">{session.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(session.status)}`}>
                          {session.status}
                        </span>
                        {session.results_published && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-600/20 text-emerald-400 border-emerald-600/20">
                            PUBLISHED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Kode Room: <span className="font-mono font-bold text-slate-400">{session.room_code}</span> • Kategori: <span className="text-blue-400 font-bold">{session.category?.name || '—'}</span> • {session.year} • {session.candidates_count ?? 0} kandidat
                      </p>
                      {session.allowed_classes && (
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          Terbatas untuk kelas: {session.allowed_classes.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        value={session.status}
                        onChange={(e) => handleStatusChange(session.id, e.target.value)}
                        className="bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 px-3 py-2 focus:outline-none"
                      >
                        <option value="DRAFT">DRAFT</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="ARCHIVED">ARCHIVED</option>
                      </select>

                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/10 transition-all text-sm cursor-pointer"
                        title="Hapus Sesi"
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>

                  {/* Realtime Vote Chart */}
                  {isDetailOpen && (
                    <div className="px-5 pb-5 pt-3 border-t border-white/5 bg-white/[0.01] space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Perolehan Suara Real-time</h5>
                          <p className="text-[10px] text-slate-500">Auto-update setiap 5 detik</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={isPolling}
                              onChange={(e) => setIsPolling(e.target.checked)}
                              className="rounded accent-blue-500"
                            />
                            <span>Live Update</span>
                          </label>
                          <button
                            onClick={() => fetchSessionDetail(session.id)}
                            className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 transition-all text-xs"
                            title="Segarkan Data"
                          >
                            <ion-icon name="refresh"></ion-icon>
                          </button>
                        </div>
                      </div>

                      {detailSession.candidates && detailSession.candidates.length > 0 ? (
                        <div className="space-y-3">
                          {detailSession.candidates.map((candidate) => {
                            const totalVotes = calculateTotalVotes(detailSession);
                            const percent = totalVotes > 0 ? Math.round((candidate.votes_count / totalVotes) * 100) : 0;

                            return (
                              <div key={candidate.id} className="space-y-1">
                                <div className="flex justify-between text-xs font-bold text-slate-300">
                                  <span className="flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-md bg-blue-600/20 text-blue-400 border border-blue-600/20 flex items-center justify-center text-[10px] font-black">
                                      {candidate.candidate_number}
                                    </span>
                                    {candidate.name}
                                  </span>
                                  <span>{candidate.votes_count} suara ({percent}%)</span>
                                </div>
                                <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden border border-white/5">
                                  <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${percent}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">Belum ada kandidat terdaftar untuk sesi ini.</p>
                      )}

                      {session.status === 'ARCHIVED' && !session.results_published && (
                        <div className="pt-2 border-t border-white/5 flex justify-end">
                          <button
                            onClick={() => handlePublishResults(session.id)}
                            className="rounded-xl px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer flex items-center gap-1"
                          >
                            <ion-icon name="checkmark-circle"></ion-icon>
                            <span>Submit & Publikasikan Hasil</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}