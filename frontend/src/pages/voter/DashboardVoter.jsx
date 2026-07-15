import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';

export default function DashboardVoter() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState('pemilihan'); // pemilihan, riwayat, hasil

  // Data States
  const [availableSessions, setAvailableSessions] = useState([]);
  const [results, setResults] = useState([]);
  const [history, setHistory] = useState([]);

  // Room verification state
  const [verificationSession, setVerificationSession] = useState(null); // session currently verifying
  const [roomCode, setRoomCode] = useState('');
  
  // Voting Booth UI states
  const [votingBoothData, setVotingBoothData] = useState(null); // { session, candidates }
  const [selectedCandidate, setSelectedCandidate] = useState(null); // candidate object selected for confirmation

  // Loading & Message States
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Floating background grid (matches landing page style)
  const cols = 32;
  const rows = 12;
  const totalTiles = cols * rows;

  const tiles = useMemo(() => {
    return Array.from({ length: totalTiles }).map((_, index) => {
      const c = index % cols;
      const scanDelay = c * 0.15;
      const glitchPattern = Math.random() * 2.0;
      const isHole = Math.random() < 0.20;
      return { id: index, delay: scanDelay + glitchPattern, isHole };
    });
  }, [totalTiles, cols]);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const loadDashboardData = async () => {
    setIsFetching(true);
    try {
      if (activeTab === 'pemilihan') {
        const res = await apiClient.get('/voter/sessions');
        if (res.data.status === 'success') {
          setAvailableSessions(res.data.data);
        }
      } else if (activeTab === 'riwayat') {
        const res = await apiClient.get('/voter/history');
        if (res.data.status === 'success') {
          setHistory(res.data.data);
        }
      } else if (activeTab === 'hasil') {
        const res = await apiClient.get('/voter/results');
        if (res.data.status === 'success') {
          setResults(res.data.data);
        }
      }
    } catch (err) {
      console.error('Gagal mengambil data:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    resetMessages();
  }, [activeTab]);

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleEnterVerifyModal = (session) => {
    setVerificationSession(session);
    setRoomCode('');
    resetMessages();
  };

  const handleVerifyRoomCode = async (e) => {
    e.preventDefault();
    if (!verificationSession) return;

    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/voter/room/verify', {
        session_id: verificationSession.id,
        room_code: roomCode,
      });

      if (res.data.status === 'success') {
        // Enter voting booth
        setVotingBoothData(res.data.data);
        setVerificationSession(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Kode ruangan salah!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVote = async () => {
    if (!votingBoothData || !selectedCandidate) return;

    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/voter/vote', {
        voting_session_id: votingBoothData.session.id,
        candidate_id: selectedCandidate.id,
      });

      if (res.data.status === 'success') {
        // Vote registered successfully
        setSuccessMessage('Suara Anda berhasil dikirim!');
        setSelectedCandidate(null);
        // Leave booth after a short delay
        setTimeout(() => {
          setVotingBoothData(null);
          setActiveTab('pemilihan');
          loadDashboardData();
          resetMessages();
        }, 3000);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengirimkan suara.');
      setSelectedCandidate(null);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotalVotes = (session) => {
    if (!session || !session.candidates) return 0;
    return session.candidates.reduce((sum, c) => sum + (c.votes_count || 0), 0);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-[#2b6cb0] font-sans text-white antialiased overflow-x-hidden selection:bg-white selection:text-blue-700">
      {/* Background Animated Grid */}
      <div
        className="absolute inset-x-0 top-0 grid gap-1 p-4 pointer-events-none opacity-20 z-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 90%)'
        }}
      >
        {tiles.map((tile) =>
          tile.isHole ? (
            <div key={tile.id} className="aspect-square bg-transparent" />
          ) : (
            <div
              key={tile.id}
              className="scan-tile aspect-square rounded-[2px]"
              style={{ animationDelay: `${tile.delay}s` }}
            />
          )
        )}
      </div>

      <div className="absolute inset-0 bg-radial-gradient from-transparent via-blue-800/10 to-blue-900/40 pointer-events-none z-0"></div>

      {/* Main Wrapper */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Header Bar */}
        <header className="bg-white/10 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-700 flex items-center justify-center font-bold tracking-wider shadow-md">
              🗳️
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-none tracking-tight">VoteSmartK4</h1>
              <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-1">E-Voting Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-white">{auth?.name}</p>
              <p className="text-[10px] text-blue-200 font-bold uppercase">{auth?.role} • {auth?.user?.class || 'UMUM'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl bg-white/15 hover:bg-white/20 border border-white/10 px-4 py-2 text-xs font-bold transition-all duration-300 cursor-pointer"
            >
              <ion-icon name="log-out"></ion-icon>
              <span>Keluar</span>
            </button>
          </div>
        </header>

        {/* Outer Area */}
        <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto">
          {/* If Voter is in the Voting Booth */}
          {votingBoothData ? (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-white/10 border border-white/10 rounded-3xl p-6 backdrop-blur-md text-center max-w-2xl mx-auto space-y-2">
                <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold uppercase tracking-widest text-blue-200">
                  BILIK SUARA ELEKTRONIK
                </span>
                <h2 className="text-2xl font-black">{votingBoothData.session.name}</h2>
                <p className="text-xs text-blue-100">Silahkan pelajari visi misi dan berikan pilihan terbaik Anda. Pilihan bersifat rahasia.</p>
              </div>

              {successMessage && (
                <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 p-5 rounded-2xl max-w-xl mx-auto text-center space-y-2 animate-fade-in">
                  <div className="text-3xl">🎉</div>
                  <h4 className="font-bold text-lg">Pilihan Berhasil Dikirim!</h4>
                  <p className="text-xs">{successMessage}</p>
                  <p className="text-[10px] text-emerald-300/80">Kembali ke dashboard dalam beberapa detik...</p>
                </div>
              )}

              {errorMessage && (
                <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl max-w-xl mx-auto text-center font-bold text-xs">
                  ⚠️ {errorMessage}
                </div>
              )}

              {!successMessage && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                  {votingBoothData.candidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="bg-white/5 border border-white/10 hover:border-white/20 rounded-3xl p-6 flex flex-col justify-between backdrop-blur-sm transition-all duration-300 shadow-xl"
                    >
                      <div className="space-y-6">
                        {/* Candidate Identity */}
                        <div className="flex gap-4 items-center">
                          <div className="w-24 h-28 rounded-2xl bg-white/10 overflow-hidden shrink-0 flex items-center justify-center border border-white/10 text-4xl">
                            {cand.photo_path ? (
                              <img
                                src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.photo_path}`}
                                alt={cand.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.target.src = "🗳️" }}
                              />
                            ) : (
                              '🗳️'
                            )}
                          </div>

                          <div className="space-y-2">
                            <span className="inline-flex w-8 h-8 rounded-xl bg-white text-blue-700 font-black items-center justify-center text-sm shadow-md">
                              {cand.candidate_number}
                            </span>
                            <h3 className="text-xl font-bold leading-tight">{cand.name}</h3>
                          </div>
                        </div>

                        {/* Visi Misi */}
                        <div className="space-y-4 pt-4 border-t border-white/5">
                          <div>
                            <h5 className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Visi</h5>
                            <p className="text-xs leading-relaxed text-blue-50/90 font-medium">{cand.vision}</p>
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-1">Misi</h5>
                            <p className="text-xs leading-relaxed text-blue-50/90 font-medium whitespace-pre-line">{cand.mission}</p>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8">
                        <button
                          onClick={() => setSelectedCandidate(cand)}
                          className="w-full py-3.5 rounded-2xl text-sm font-bold bg-white text-blue-700 hover:scale-[1.01] transition-all cursor-pointer shadow-lg shadow-white/5 active:scale-[0.99]"
                        >
                          Pilih Kandidat Ini
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Confirmation Modal */}
              {selectedCandidate && (
                <div className="fixed inset-0 z-50 bg-[#0f172a]/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center animate-fade-in shadow-2xl">
                    <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-400 border border-blue-600/20 flex items-center justify-center text-3xl mx-auto">
                      🗳️
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-extrabold text-lg text-slate-100">Konfirmasi Pilihan Anda</h4>
                      <p className="text-xs text-slate-400 leading-relaxed px-2">
                        Anda akan memilih kandidat nomor <b>{selectedCandidate.candidate_number}</b>: <br />
                        <span className="font-bold text-blue-400 text-sm mt-1 inline-block">{selectedCandidate.name}</span> <br />
                        Pilihan Anda tidak dapat diubah setelah dikirimkan.
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleSubmitVote}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer shadow-lg shadow-blue-500/25"
                      >
                        {isLoading ? 'Mengirim...' : 'Ya, Kirim Suara'}
                      </button>
                      <button
                        onClick={() => setSelectedCandidate(null)}
                        disabled={isLoading}
                        className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Normal Dashboard Flow */
            <div className="space-y-8">
              {/* Tab Navigation */}
              <div className="flex justify-center bg-white/10 p-1 rounded-2xl border border-white/10 max-w-md mx-auto">
                <button
                  onClick={() => setActiveTab('pemilihan')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'pemilihan' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100 hover:bg-white/5'
                  }`}
                >
                  <ion-icon name="time"></ion-icon>
                  <span>Daftar Pemilihan</span>
                </button>

                <button
                  onClick={() => setActiveTab('riwayat')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'riwayat' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100 hover:bg-white/5'
                  }`}
                >
                  <ion-icon name="checkbox"></ion-icon>
                  <span>Riwayat Pilihan Saya</span>
                </button>

                <button
                  onClick={() => setActiveTab('hasil')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeTab === 'hasil' ? 'bg-white text-blue-700 shadow-md' : 'text-blue-100 hover:bg-white/5'
                  }`}
                >
                  <ion-icon name="pie-chart"></ion-icon>
                  <span>Hasil Pemilu</span>
                </button>
              </div>

              {/* Tab Content Areas */}
              <div className="space-y-4">
                {/* 1. Tab Pemilihan */}
                {activeTab === 'pemilihan' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-center">Bilik Suara Aktif</h2>

                    {isFetching && <p className="text-sm text-blue-200 text-center py-8">Memeriksa bilik suara...</p>}
                    {!isFetching && availableSessions.length === 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-blue-200">
                        <div className="text-4xl mb-2">🏝️</div>
                        <p className="text-sm font-bold">Tidak Ada Pemilihan yang Aktif</p>
                        <p className="text-xs text-blue-300 mt-1">Saat ini tidak ada bilik suara pemilu aktif yang menargetkan kelas Anda, atau Anda sudah menyalurkan hak suara Anda.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {availableSessions.map((session) => (
                        <div
                          key={session.id}
                          className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-sm shadow-xl"
                        >
                          <div className="space-y-2">
                            <span className="text-[9px] bg-blue-500/20 text-blue-200 font-bold px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider">
                              {session.category?.name || 'UMUM'}
                            </span>
                            <h4 className="font-bold text-lg leading-snug">{session.name}</h4>
                            <p className="text-[11px] text-blue-200">Masa Bakti: {session.year}</p>
                          </div>

                          <div className="pt-6">
                            <button
                              onClick={() => handleEnterVerifyModal(session)}
                              className="w-full rounded-xl py-3 text-xs font-bold bg-white text-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md"
                            >
                              Mulai Memilih
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Tab Riwayat Pilihan Saya */}
                {activeTab === 'riwayat' && (
                  <div className="space-y-6 max-w-xl mx-auto">
                    <h2 className="text-xl font-black text-center">Riwayat Pilihan Saya</h2>

                    {isFetching && <p className="text-sm text-blue-200 text-center py-8">Memuat riwayat...</p>}
                    {!isFetching && history.length === 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-blue-200">
                        <div className="text-4xl mb-2">📜</div>
                        <p className="text-sm font-bold">Belum Ada Riwayat Memilih</p>
                        <p className="text-xs text-blue-300 mt-1">Anda belum memberikan suara pada sesi pemilihan manapun.</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {history.map((hist) => (
                        <div
                          key={hist.id}
                          className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-sm flex justify-between items-center gap-4"
                        >
                          <div className="space-y-1">
                            <span className="text-[9px] bg-blue-500/20 text-blue-200 font-bold px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider">
                              {hist.voting_session?.category?.name || 'Pemilu'}
                            </span>
                            <h4 className="font-bold text-slate-100">{hist.voting_session?.name}</h4>
                            <p className="text-[11px] text-blue-200">Pilihan Anda: <b>No. {hist.candidate?.candidate_number} - {hist.candidate?.name}</b></p>
                          </div>

                          <span className="text-[10px] text-blue-300 shrink-0 text-right">
                            {new Date(hist.created_at).toLocaleDateString('id-ID', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Tab Hasil Pemilu */}
                {activeTab === 'hasil' && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-center">Hasil Pemilihan Umum Resmi</h2>
                    <p className="text-xs text-blue-100 text-center max-w-md mx-auto -mt-4">
                      Grafik resmi perolehan suara pemilu digital yang telah ditutup dan disubmit oleh panitia pemilihan.
                    </p>

                    {isFetching && <p className="text-sm text-blue-200 text-center py-8">Memuat hasil...</p>}
                    {!isFetching && results.length === 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-blue-200">
                        <div className="text-4xl mb-2">📊</div>
                        <p className="text-sm font-bold">Hasil Belum Diumumkan</p>
                        <p className="text-xs text-blue-300 mt-1">Saat ini belum ada hasil suara pemilihan yang dipublikasikan oleh panitia.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                      {results.map((session) => {
                        const totalVotes = calculateTotalVotes(session);

                        return (
                          <div
                            key={session.id}
                            className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-sm shadow-xl space-y-4"
                          >
                            <div>
                              <span className="text-[9px] bg-blue-500/20 text-blue-200 font-bold px-2 py-0.5 rounded-full border border-blue-500/20 uppercase tracking-wider">
                                {session.category?.name || 'SELESAI'}
                              </span>
                              <h4 className="font-bold text-lg mt-1 leading-snug">{session.name}</h4>
                              <p className="text-[10px] text-blue-200">Masa Bakti: {session.year} • Total Suara Masuk: {totalVotes}</p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-white/5">
                              {session.candidates.map((cand) => {
                                const percent = totalVotes > 0 ? Math.round((cand.votes_count / totalVotes) * 100) : 0;

                                return (
                                  <div key={cand.id} className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-blue-100">
                                      <span className="flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-white/20 text-white border border-white/15 flex items-center justify-center text-[10px] font-black">
                                          {cand.candidate_number}
                                        </span>
                                        {cand.name}
                                      </span>
                                      <span>{cand.votes_count} suara ({percent}%)</span>
                                    </div>
                                    <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden border border-white/5">
                                      <div
                                        className="bg-white h-full rounded-full transition-all duration-500"
                                        style={{ width: `${percent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Code Verification Modal */}
              {verificationSession && (
                <div className="fixed inset-0 z-50 bg-[#0f172a]/70 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-sm w-full space-y-6 text-center animate-fade-in shadow-2xl text-slate-100">
                    <div className="w-16 h-16 rounded-full bg-blue-600/10 text-blue-400 border border-blue-600/20 flex items-center justify-center text-3xl mx-auto">
                      🔑
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-extrabold text-lg">Masukkan Kode Ruangan</h4>
                      <p className="text-xs text-slate-400">
                        Sesi <b>{verificationSession.name}</b> memerlukan kode khusus untuk diakses. Minta kode ruangan kepada pengawas pemilihan.
                      </p>
                    </div>

                    <form onSubmit={handleVerifyRoomCode} className="space-y-4">
                      <input
                        type="text"
                        required
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="KODE RUANGAN"
                        className="w-full rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 bg-slate-800 border border-white/5 font-mono font-bold tracking-widest text-center focus:outline-none focus:border-blue-500"
                      />

                      {errorMessage && (
                        <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/15 p-2 px-3 rounded-lg text-center">
                          ⚠️ {errorMessage}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="flex-1 py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
                        >
                          {isLoading ? 'Verifikasi...' : 'Masuk Bilik'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setVerificationSession(null)}
                          disabled={isLoading}
                          className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Floating animations custom styling */}
      <style>{`
        .font-sans { font-family: 'Inter', sans-serif !important; }

        @keyframes waveScanner {
          0%, 100% { background-color: transparent; box-shadow: none; }
          25% { background-color: rgba(235, 240, 248, 0.16); box-shadow: 0 0 6px rgba(235, 240, 248, 0.1); }
          50%, 75% { background-color: rgba(255, 255, 255, 0.02); box-shadow: none; }
          88% { background-color: transparent; }
        }
        .scan-tile { animation: waveScanner 5.5s infinite ease-in-out; border: 1px solid rgba(255, 255, 255, 0.02); }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}