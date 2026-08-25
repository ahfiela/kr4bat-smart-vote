import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../../api/client';

export default function RoomMonitorPanel({ session, onBack, onUpdateSession }) {
  const [sessionDetail, setSessionDetail] = useState(session);
  const [candidates, setCandidates] = useState(session.candidates || []);
  const [classes, setClasses] = useState([]);
  
  // Real-time polling
  const [isLive, setIsLive] = useState(true);
  const pollingRef = useRef(null);

  // Level 2 Kloter selection
  const [selectedKloter, setSelectedKloter] = useState('');

  // Level 2 Manual Search Voter
  const [voterSearchQuery, setVoterSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Golput Monitoring
  const [participation, setParticipation] = useState(null);
  const [detailGroup, setDetailGroup] = useState(null);

  // Messages
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSessionData = async () => {
    try {
      const res = await apiClient.get(`/admin/sessions/${session.id}`);
      if (res.data.status === 'success') {
        setSessionDetail(res.data.data);
        setCandidates(res.data.data.candidates || []);
      }
    } catch (err) {
      console.error('Gagal mengambil data monitor room:', err);
    }

    try {
      const res = await apiClient.get(`/admin/sessions/${session.id}/participation`);
      if (res.data.status === 'success') {
        setParticipation(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data partisipasi:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const [classRes, catRes] = await Promise.all([
        apiClient.get('/admin/voters/classes'),
        apiClient.get('/admin/categories'),
      ]);

      const classList = classRes.data.status === 'success' ? classRes.data.data : [];
      const catList = catRes.data.status === 'success' ? catRes.data.data.map((c) => c.name) : [];

      const combined = Array.from(new Set([...classList, ...catList])).sort();
      setClasses(combined);
    } catch (err) {
      console.error('Gagal memuat daftar kelas:', err);
    }
  };

  useEffect(() => {
    fetchSessionData();
    fetchClasses();
  }, [session.id]);

  useEffect(() => {
    if (isLive) {
      pollingRef.current = setInterval(() => {
        fetchSessionData();
      }, 4000);
    } else {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isLive, session.id]);

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Action Buttons (Start / End Session)
  const handleStartSession = async () => {
    resetMessages();
    try {
      const res = await apiClient.patch(`/admin/sessions/${session.id}/status`, { status: 'ACTIVE' });
      if (res.data.status === 'success') {
        setSuccessMessage('Bilik resmi dibuka (ACTIVE)! Pemilih dapat memberikan suara sekarang.');
        fetchSessionData();
        onUpdateSession && onUpdateSession();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal memulai sesi bilik');
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm('PERHATIAN: Mengakhiri sesi ini akan MENGUNCI BILIK PERMANEN. Sesi tidak dapat diaktivasi ulang dan akan dipindahkan ke menu History (Riwayat). Yakin ingin mengakhiri sesi?')) return;
    resetMessages();
    try {
      const res = await apiClient.patch(`/admin/sessions/${session.id}/status`, { status: 'ARCHIVED' });
      if (res.data.status === 'success') {
        setSuccessMessage('Sesi bilik telah diakhiri dan dikunci permanen di History.');
        fetchSessionData();
        onUpdateSession && onUpdateSession();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengakhiri sesi bilik');
    }
  };

  // Activate Live Kloter (Requirement 3)
  const handleActivateKloter = async () => {
    if (!selectedKloter) return;
    resetMessages();
    try {
      const res = await apiClient.post(`/admin/sessions/${session.id}/kloter/activate`, {
        kloter: selectedKloter,
      });
      if (res.data.status === 'success') {
        setSuccessMessage(`Kloter '${selectedKloter}' resmi AKTIF! Pemilih di luar kloter ini akan ditolak otomatis.`);
        fetchSessionData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengaktifkan kloter');
    }
  };

  // Complete & Lock Kloter
  const handleCompleteKloter = async () => {
    if (!selectedKloter) return;
    resetMessages();
    try {
      const res = await apiClient.post(`/admin/sessions/${session.id}/kloter/complete`, {
        kloter: selectedKloter,
      });
      if (res.data.status === 'success') {
        setSuccessMessage(`Kloter '${selectedKloter}' berhasil diproses dan dikunci.`);
        setSelectedKloter('');
        fetchSessionData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengunci kloter');
    }
  };

  // Voter Search Real-Time
  const handleSearchVoter = async (q) => {
    setVoterSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await apiClient.get('/admin/voters', { params: { search: q } });
      if (res.data.status === 'success') {
        setSearchResults(res.data.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Add specific voter to room
  const handleAddVoterToRoom = async (voterIdentifier, voterName) => {
    resetMessages();
    try {
      const res = await apiClient.post(`/admin/sessions/${session.id}/add-voter`, {
        identifier: voterIdentifier,
      });
      if (res.data.status === 'success') {
        setSuccessMessage(`Izin vote untuk ${voterName} (${voterIdentifier}) berhasil diberikan!`);
        fetchSessionData();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal memberikan izin vote');
    }
  };

  // Calculate total votes
  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes_count || 0), 0);

  // Filter available kloter options based on Level 1 Scope
  const allowedRoles = sessionDetail.allowed_roles || ['SISWA', 'GURU_STAF', 'MITRA'];
  const completedKloters = sessionDetail.completed_kloters || [];

  // Build Kloter Options
  const rawKloterOptions = [];
  if (allowedRoles.includes('SISWA')) {
    classes.forEach((cls) => rawKloterOptions.push({ label: `Kelas: ${cls}`, value: cls }));
  }
  if (allowedRoles.includes('GURU_STAF')) {
    rawKloterOptions.push({ label: 'Guru & Staf Sekolah', value: 'GURU_STAF' });
  }
  if (allowedRoles.includes('MITRA')) {
    rawKloterOptions.push({ label: 'Mitra & Petugas Operasional', value: 'MITRA' });
  }

  // Filter out already completed kloters
  const availableKloterOptions = rawKloterOptions.filter(
    (opt) => !completedKloters.includes(opt.value)
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      {/* Top Header Navigation */}
      <div className="bg-white p-4 md:p-6 rounded-3xl border border-slate-200 text-slate-900 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0">
            <button
              onClick={onBack}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-1.5 cursor-pointer"
            >
              ← Kembali ke Daftar Bilik
            </button>
            <h2 className="text-lg md:text-2xl font-black text-slate-900 flex flex-wrap items-center gap-2">
              <span className="truncate">Monitor Internal: {sessionDetail.name}</span>
              <span className={`text-xs px-3 py-0.5 rounded-full font-extrabold border shrink-0 ${
                sessionDetail.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                sessionDetail.status === 'ARCHIVED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                {sessionDetail.status}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Kode Room: <span className="font-mono font-bold text-blue-600">{sessionDetail.room_code}</span> • Tahun: {sessionDetail.year}
            </p>
          </div>

          {/* Action-Based Control Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {sessionDetail.status !== 'ACTIVE' && (
              <button
                onClick={handleStartSession}
                className="px-4 py-2.5 rounded-xl font-extrabold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>▶ Mulai Sesi</span>
              </button>
            )}

            {sessionDetail.status === 'ACTIVE' && (
              <button
                onClick={handleEndSession}
                className="px-4 py-2.5 rounded-xl font-extrabold text-xs bg-red-600 hover:bg-red-700 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>⏹ Akhiri Sesi</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-200 p-3 rounded-2xl">
          ⚠️ {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
          ✓ {successMessage}
        </div>
      )}

      {/* Main Grid: Control Filters Level 2 & Realtime Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Filter Hak Pilih Level 2 (Kloter & Manual Search) */}
        <div className="space-y-6">
          
          {/* Kloter Dropdown Filter */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider">
                Filter Level 2: Kloter Sesi
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Scope Level 1</span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Pilih kloter kelas / kategori yang sedang diproses voting. Kloter yang diselesaikan akan dikunci dan dihapus dari dropdown berikutnya.
            </p>

            {sessionDetail.active_kloter && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">KLOTER AKTIF SAAT INI</span>
                  <span className="text-sm font-extrabold text-emerald-900">{sessionDetail.active_kloter}</span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await apiClient.post(`/admin/sessions/${session.id}/kloter/activate`, { kloter: null });
                    fetchSessionData();
                  }}
                  className="text-[10px] font-bold text-red-600 hover:underline cursor-pointer"
                >
                  Bebaskan Kloter
                </button>
              </div>
            )}

            <div className="space-y-3">
              <select
                value={selectedKloter}
                onChange={(e) => setSelectedKloter(e.target.value)}
                className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 font-medium"
              >
                <option value="">-- Pilih Kloter Kelas --</option>
                {availableKloterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!selectedKloter}
                  onClick={handleActivateKloter}
                  className="rounded-xl py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
                >
                  ⚡ Aktifkan Kloter
                </button>

                <button
                  type="button"
                  disabled={!selectedKloter}
                  onClick={handleCompleteKloter}
                  className="rounded-xl py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
                >
                  🔒 Kunci Kloter
                </button>
              </div>
            </div>

            {completedKloters.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Kloter Dikunci / Selesai:</span>
                <div className="flex flex-wrap gap-1">
                  {completedKloters.map((k) => (
                    <span key={k} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      ✓ {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Pencarian Manual Personil Spesifik */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider">
                Pencarian Manual (Personil Spesifik)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Cari siswa/personil spesifik lintas kelas (misal anggota ekskul) untuk diberi izin akses vote langsung saat itu juga.
              </p>
            </div>

            <div>
              <input
                type="text"
                value={voterSearchQuery}
                onChange={(e) => handleSearchVoter(e.target.value)}
                placeholder="Ketik nama atau NISN..."
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {isSearching && <p className="text-xs text-slate-400">Mencari pemilih...</p>}

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {searchResults.map((voter) => {
                  const isAllowed = sessionDetail.allowed_voters?.includes(voter.identifier);

                  return (
                    <div key={voter.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{voter.name}</p>
                        <p className="text-[10px] text-slate-500">{voter.identifier} • {voter.class || voter.role}</p>
                      </div>

                      {isAllowed ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-md">
                          Diizinkan
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddVoterToRoom(voter.identifier, voter.name)}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition-all cursor-pointer shrink-0"
                        >
                          + Add ke Bilik
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Golput Monitoring */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-xs font-black text-blue-600 uppercase tracking-wider">
                Golput Monitoring (Belum Memilih)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">
                Klik kelas / peran untuk melihat daftar nama yang sudah &amp; belum memberikan suara.
              </p>
            </div>

            {participation && participation.groups.length > 0 && (
              <p className="text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                Ringkasan: <b>{participation.total_voted}</b>/{participation.total_eligible} sudah vote •{' '}
                <b className={participation.not_voted > 0 ? 'text-red-600' : 'text-emerald-600'}>
                  {participation.not_voted} golput
                </b>
              </p>
            )}

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {(participation?.groups || []).map((g) => {
                const pct = g.total > 0 ? Math.round((g.voted / g.total) * 100) : 0;
                const notVoted = g.total - g.voted;

                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setDetailGroup(g)}
                    className="w-full bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-300 rounded-xl p-3 text-left transition-all cursor-pointer space-y-2"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {g.type === 'CLASS' ? `Kelas: ${g.label}` : g.label}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {g.voted}/{g.total} sudah vote •{' '}
                          <span className={notVoted > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                            {notVoted} belum
                          </span>
                        </p>
                      </div>
                      <ion-icon name="chevron-forward" style={{ fontSize: '14px' }}></ion-icon>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}

              {(!participation || participation.groups.length === 0) && (
                <p className="text-xs text-slate-400 italic">Belum ada data pemilih untuk sesi ini.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Realtime Voting Monitor & Charts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Perolehan Suara Real-time Bilik</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Total suara terhitung: <span className="font-extrabold text-blue-600 text-sm">{totalVotes}</span> suara
                  {participation && (
                    <> / <span className={`font-extrabold text-sm ${participation.not_voted > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{participation.not_voted}</span> belum vote</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-600 font-medium flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLive}
                    onChange={(e) => setIsLive(e.target.checked)}
                    className="rounded accent-blue-600"
                  />
                  <span>Live Sync (4s)</span>
                </label>
                <button
                  onClick={fetchSessionData}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 text-xs transition-all cursor-pointer"
                  title="Segarkan Data"
                >
                  <ion-icon name="refresh"></ion-icon>
                </button>
              </div>
            </div>

            {/* Candidates Vote Bar */}
            {candidates.length > 0 ? (
              <div className="space-y-4">
                {candidates.map((candidate) => {
                  const percent = totalVotes > 0 ? Math.round((candidate.votes_count / totalVotes) * 100) : 0;

                  return (
                    <div key={candidate.id} className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                            #{candidate.candidate_number}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm">
                              {candidate.name} {candidate.wakil_name ? `& ${candidate.wakil_name}` : ''}
                            </h4>
                            {candidate.vision && (
                              <p className="text-[11px] text-slate-500 font-medium">Visi: {candidate.vision}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-base font-black text-blue-600">{candidate.votes_count}</span>
                          <span className="text-xs text-slate-500 ml-1">({percent}%)</span>
                        </div>
                      </div>

                      <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-100">
                        <div
                          className="bg-blue-600 h-full rounded-full transition-all duration-500 shadow-xs"
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-6 text-center">Belum ada kandidat terdaftar di bilik ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* Popup Detail Golput per Kelas/Role */}
      {detailGroup && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4"
          onClick={() => setDetailGroup(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[85vh] flex flex-col space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 truncate">
                  {detailGroup.type === 'CLASS' ? `Kelas: ${detailGroup.label}` : detailGroup.label}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {detailGroup.voted}/{detailGroup.total} sudah vote •{' '}
                  <span className={detailGroup.total - detailGroup.voted > 0 ? 'text-red-600 font-bold' : 'text-emerald-600 font-bold'}>
                    {detailGroup.total - detailGroup.voted} belum vote
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailGroup(null)}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs transition-all cursor-pointer shrink-0"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 -mx-2 px-2">
              {detailGroup.voters.map((v) => (
                <div key={v.identifier} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{v.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {v.identifier}{v.class ? ` • ${v.class}` : ''}
                    </p>
                  </div>
                  {v.voted ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                      ✓ Sudah Vote
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md shrink-0">
                      Belum Vote
                    </span>
                  )}
                </div>
              ))}
              {detailGroup.voters.length === 0 && (
                <p className="py-4 text-xs text-slate-400 italic text-center">Tidak ada pemilih pada grup ini.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
