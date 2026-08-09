import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';

export default function DashboardVoter() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [availableSessions, setAvailableSessions] = useState([]);
  const [votedSessionIds, setVotedSessionIds] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Flow State
  const [verificationSession, setVerificationSession] = useState(null); // session undergoing token check
  const [tokenInput, setTokenInput] = useState('');

  const [activeBooth, setActiveBooth] = useState(null); // { session, candidates }
  const [viewingProfileCandidate, setViewingProfileCandidate] = useState(null); // candidate object for detail view
  const [selectingCandidate, setSelectingCandidate] = useState(null); // candidate object for vote confirmation modal

  // New Modals based on screenshots
  const [showVoteSuccessModal, setShowVoteSuccessModal] = useState(false);
  const [lastVotedSessionName, setLastVotedSessionName] = useState('');
  const [alreadyVotedModalSession, setAlreadyVotedModalSession] = useState(null);

  // Tiles pattern for light theme background
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

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // 1. Fetch available sessions
      const resSessions = await apiClient.get('/voter/sessions');
      if (resSessions.data.status === 'success') {
        setAvailableSessions(resSessions.data.data);
      }

      // 2. Fetch history to know which sessions voter already voted in
      const resHistory = await apiClient.get('/voter/history');
      if (resHistory.data.status === 'success') {
        const ids = resHistory.data.data.map((h) => h.voting_session_id);
        setVotedSessionIds(ids);
      }
    } catch (err) {
      console.error('Gagal mengambil data pemilih:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const resetMessages = () => {
    setErrorMessage('');
  };

  // Click session button -> If already voted, open Already Voted Modal; otherwise open Token Modal
  const handleSelectSession = (session) => {
    const hasVoted = votedSessionIds.includes(session.id);
    if (hasVoted) {
      setAlreadyVotedModalSession(session);
      return;
    }

    setVerificationSession(session);
    setTokenInput('');
    resetMessages();
  };

  // Submit token / room code
  const handleVerifyToken = async (e) => {
    e.preventDefault();
    if (!verificationSession || !tokenInput.trim()) return;

    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/voter/room/verify', {
        session_id: verificationSession.id,
        room_code: tokenInput.trim().toUpperCase(),
      });

      if (res.data.status === 'success') {
        setActiveBooth(res.data.data);
        setVerificationSession(null);
        setTokenInput('');
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Token yang Anda masukkan salah!');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit vote
  const handleConfirmVote = async () => {
    if (!activeBooth || !selectingCandidate) return;

    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/voter/vote', {
        voting_session_id: activeBooth.session.id,
        candidate_id: selectingCandidate.id,
      });

      if (res.data.status === 'success') {
        const sessionName = activeBooth.session.name;
        setLastVotedSessionName(sessionName);

        // Add to voted ids locally
        setVotedSessionIds([...votedSessionIds, activeBooth.session.id]);

        setSelectingCandidate(null);
        setViewingProfileCandidate(null);
        setActiveBooth(null);

        // Show Green Success Modal
        setShowVoteSuccessModal(true);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengirimkan suara.');
      setSelectingCandidate(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Split multi-line text into list items
  const parseListItems = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Soft Rounded Tile Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 z-0">
        <div className="grid grid-cols-12 md:grid-cols-28 gap-2.5 p-4 max-w-7xl mx-auto">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="aspect-square bg-slate-200/40 rounded-lg animate-pulse"
              style={{ animationDuration: '4s', animationDelay: `${tile.delay}s` }}
            />
          ))}
        </div>
      </div>

      {/* Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex justify-between items-center bg-white/70 backdrop-blur-md border-b border-slate-200/60 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black flex items-center justify-center text-xs shadow-sm">
            V4
          </div>
          <span className="font-extrabold text-slate-800 tracking-tight text-sm">VoteSmartK4</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-800 leading-none">{auth?.name}</p>
            <p className="text-[10px] text-blue-600 font-semibold uppercase mt-0.5">{auth?.role}</p>
          </div>
          {/* Top Right Logout Button (Keluar 🚪) matching screenshot */}
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <span>Keluar</span>
            <span>🚪</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-10 max-w-5xl w-full mx-auto">

        {/* ----------------------------------------------------
            SCREEN 1: SELECT ELECTION SESSION (Pilih Sesi Pemilihan)
            ---------------------------------------------------- */}
        {!activeBooth && !viewingProfileCandidate && (
          <div className="w-full max-w-xl text-center space-y-8 animate-fade-in">
            <div className="space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Pilih Sesi Pemilihan
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Silahkan pilih sesi pemilihan. Anda mungkin akan diminta memasukkan token untuk memasuki sesi pemilihan.
              </p>
            </div>

            {isFetching && (
              <div className="py-8 text-xs text-slate-400 font-medium">Memuat sesi pemilihan aktif...</div>
            )}

            {!isFetching && availableSessions.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-2 shadow-xs">
                <div className="text-3xl">🗳️</div>
                <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Pemilihan Aktif</h3>
                <p className="text-xs text-slate-500">
                  Saat ini tidak ada bilik suara aktif yang tersedia untuk kelompok Anda.
                </p>
              </div>
            )}

            {/* List of election session buttons */}
            <div className="space-y-4">
              {availableSessions.map((session) => {
                const hasVoted = votedSessionIds.includes(session.id);

                return (
                  <button
                    key={session.id}
                    onClick={() => handleSelectSession(session)}
                    className={`w-full font-bold py-4 px-6 rounded-2xl text-sm md:text-base transition-all duration-200 shadow-xs hover:shadow-md active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${
                      hasVoted
                        ? 'bg-white hover:bg-emerald-50/50 border-2 border-emerald-500 text-emerald-600'
                        : 'bg-white hover:bg-blue-50/50 border-2 border-blue-600/80 hover:border-blue-600 text-blue-600'
                    }`}
                  >
                    {hasVoted && (
                      <span className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0">
                        ✓
                      </span>
                    )}
                    <span>{session.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 2: TOKEN MODAL (Masukkan Token)
            ---------------------------------------------------- */}
        {verificationSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-7 max-w-sm w-full space-y-5 text-center shadow-2xl border border-slate-100">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Masukkan Token</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed px-2">
                  Silahkan masukkan token yang telah diberikan oleh pengelola untuk mengakses pemilihan.
                </p>
              </div>

              <form onSubmit={handleVerifyToken} className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Token</label>
                  <input
                    type="text"
                    required
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value.toUpperCase())}
                    placeholder="Masukkan token disini"
                    className="w-full rounded-xl px-4 py-3 text-sm text-slate-800 bg-slate-50 border border-slate-200 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all text-center tracking-wider font-mono"
                  />
                </div>

                {errorMessage && (
                  <div className="text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl text-center border border-red-100">
                    ⚠️ {errorMessage}
                  </div>
                )}

                <div className="space-y-2 pt-1">
                  <button
                    type="submit"
                    disabled={isLoading || !tokenInput.trim()}
                    className="w-full rounded-xl py-3 text-xs md:text-sm font-bold bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 transition-all cursor-pointer flex items-center justify-center"
                  >
                    {isLoading ? 'Verifikasi...' : 'Verifikasi'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVerificationSession(null);
                      setTokenInput('');
                      resetMessages();
                    }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 font-medium py-1.5 cursor-pointer block text-center transition-colors"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 3: CANDIDATE SELECTION GRID (Daftar Calon...)
            ---------------------------------------------------- */}
        {activeBooth && !viewingProfileCandidate && (
          <div className="w-full space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {activeBooth.session.name}
              </h1>

              <div className="inline-block bg-blue-50 border border-blue-100/60 text-blue-600 font-bold px-4 py-1 rounded-xl text-xs">
                Masa Bakti {activeBooth.session.year}—{(parseInt(activeBooth.session.year) || 2026) + 1}
              </div>
            </div>

            {/* Candidate Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {activeBooth.candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200 space-y-4"
                >
                  <div className="space-y-3">
                    {/* Paslon Number Badge */}
                    <div className="flex items-center justify-center">
                      <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-md">
                        #{cand.candidate_number}
                      </span>
                    </div>

                    {/* Photo Pair Ketua & Wakil */}
                    <div className="flex gap-2">
                      <div className="flex-1 rounded-xl overflow-hidden bg-slate-200 aspect-square flex items-center justify-center relative">
                        {cand.ketua_photo_path ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.ketua_photo_path}`}
                            alt={cand.name}
                            className="w-full h-full object-cover object-top"
                          />
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">Ketua</span>
                        )}
                        <span className="absolute bottom-1 left-1 text-[9px] font-black bg-black/50 text-white px-1.5 py-0.5 rounded-md">KETUA</span>
                      </div>
                      {cand.wakil_name && (
                        <div className="flex-1 rounded-xl overflow-hidden bg-slate-200 aspect-square flex items-center justify-center relative">
                          {cand.wakil_photo_path ? (
                            <img
                              src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.wakil_photo_path}`}
                              alt={cand.wakil_name}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <span className="text-slate-400 text-xs font-bold">Wakil</span>
                          )}
                          <span className="absolute bottom-1 left-1 text-[9px] font-black bg-black/50 text-white px-1.5 py-0.5 rounded-md">WAKIL</span>
                        </div>
                      )}
                    </div>

                    {/* Candidate Paslon Names */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-tight">
                        {cand.name}
                      </h3>
                      {cand.wakil_name && (
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                          & {cand.wakil_name}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        Pasangan Calon #{cand.candidate_number}
                      </p>
                    </div>
                  </div>

                  {/* Buttons Action */}
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={() => setSelectingCandidate(cand)}
                      className="w-full bg-[#3b82f6] hover:bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-xs active:scale-[0.99] cursor-pointer"
                    >
                      Pilih Kandidat
                    </button>

                    <button
                      onClick={() => setViewingProfileCandidate(cand)}
                      className="w-full bg-white hover:bg-slate-50 border border-blue-500 text-blue-600 font-semibold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="text-sm">ℹ</span>
                      <span>Lihat Profil</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 4: CANDIDATE PROFILE VIEW (Profil Kandidat)
            ---------------------------------------------------- */}
        {viewingProfileCandidate && (
          <div className="w-full space-y-6 animate-fade-in max-w-4xl mx-auto">
            {/* Top Navigation Back Link */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setViewingProfileCandidate(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>← Kembali</span>
              </button>

              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Profil Kandidat {viewingProfileCandidate.candidate_number}
              </h2>

              <div className="w-12"></div>
            </div>

            {/* Candidate Detail Cards Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              {/* Left Identity Card - Paslon */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm text-center space-y-4">
                <div className="inline-flex items-center justify-center gap-2 mb-1">
                  <span className="w-10 h-10 rounded-2xl bg-blue-600 text-white font-black text-base flex items-center justify-center shadow-md">
                    #{viewingProfileCandidate.candidate_number}
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pasangan Calon</span>
                </div>

                {/* Dual photo Ketua & Wakil */}
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="rounded-2xl overflow-hidden bg-slate-200 aspect-square flex items-center justify-center">
                      {viewingProfileCandidate.ketua_photo_path ? (
                        <img src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${viewingProfileCandidate.ketua_photo_path}`} alt={viewingProfileCandidate.name} className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">No Photo</span>
                      )}
                    </div>
                    <p className="text-[10px] font-extrabold text-blue-600 uppercase">Ketua</p>
                    <p className="text-xs font-bold text-slate-800 leading-tight">{viewingProfileCandidate.name}</p>
                    {viewingProfileCandidate.experience && <p className="text-[10px] text-slate-400">{viewingProfileCandidate.experience}</p>}
                  </div>

                  {viewingProfileCandidate.wakil_name && (
                    <div className="flex-1 space-y-1">
                      <div className="rounded-2xl overflow-hidden bg-slate-200 aspect-square flex items-center justify-center">
                        {viewingProfileCandidate.wakil_photo_path ? (
                          <img src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${viewingProfileCandidate.wakil_photo_path}`} alt={viewingProfileCandidate.wakil_name} className="w-full h-full object-cover object-top" />
                        ) : (
                          <span className="text-slate-400 text-xs font-bold">No Photo</span>
                        )}
                      </div>
                      <p className="text-[10px] font-extrabold text-emerald-600 uppercase">Wakil</p>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{viewingProfileCandidate.wakil_name}</p>
                      {viewingProfileCandidate.wakil_experience && <p className="text-[10px] text-slate-400">{viewingProfileCandidate.wakil_experience}</p>}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setSelectingCandidate(viewingProfileCandidate)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md"
                >
                  Pilih Paslon Ini
                </button>
              </div>

              {/* Right Vision & Mission Stacked Cards (Solid Blue) */}
              <div className="md:col-span-2 space-y-4">
                {/* Visi Card */}
                <div className="bg-[#3b82f6] text-white p-5 rounded-2xl shadow-sm space-y-2">
                  <h4 className="font-extrabold text-base">Visi</h4>
                  <p className="text-xs leading-relaxed opacity-95 font-medium">
                    {viewingProfileCandidate.vision}
                  </p>
                </div>

                {/* Misi Card */}
                <div className="bg-[#3b82f6] text-white p-5 rounded-2xl shadow-sm space-y-2">
                  <h4 className="font-extrabold text-base">Misi</h4>
                  <ol className="text-xs leading-relaxed opacity-95 font-medium space-y-1.5 list-decimal pl-4">
                    {parseListItems(viewingProfileCandidate.mission).map((item, idx) => (
                      <li key={idx}>{item.replace(/^\d+[\.\)]\s*/, '')}</li>
                    ))}
                  </ol>
                </div>

                {/* Proker / Pengalaman Card */}
                {viewingProfileCandidate.experience && (
                  <div className="bg-[#3b82f6] text-white p-5 rounded-2xl shadow-sm space-y-2">
                    <h4 className="font-extrabold text-base">Proker / Pengalaman</h4>
                    <ol className="text-xs leading-relaxed opacity-95 font-medium space-y-1.5 list-decimal pl-4">
                      {parseListItems(viewingProfileCandidate.experience).map((item, idx) => (
                        <li key={idx}>{item.replace(/^\d+[\.\)]\s*/, '')}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 5: CONFIRMATION MODAL (Konfirmasi Pilihan)
            ---------------------------------------------------- */}
        {selectingCandidate && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-7 max-w-sm w-full space-y-5 text-center shadow-2xl border border-slate-100">
              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Konfirmasi Pilihan</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed px-2">
                  Anda akan memberi suara kepada Paslon Nomor <span className="font-extrabold text-slate-900">#{selectingCandidate.candidate_number} — {selectingCandidate.name}{selectingCandidate.wakil_name ? ` & ${selectingCandidate.wakil_name}` : ''}</span> pada sesi {activeBooth?.session?.name || 'pemilihan ini'}.
                </p>
              </div>

              {/* Light Blue Warning Info Box */}
              <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs p-3.5 rounded-xl font-medium leading-relaxed">
                Pilihan yang telah dikirim tidak dapat diubah. Pastikan Anda telah memilih kandidat yang sesuai.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectingCandidate(null)}
                  disabled={isLoading}
                  className="flex-1 bg-white hover:bg-slate-50 border border-blue-500 text-blue-600 font-bold py-3 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmVote}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  {isLoading ? 'Mengirim...' : 'Ya, Kirim Suara'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 6: GREEN SUCCESS MODAL (Suara Berhasil Dikirim!)
            Matches screenshot 1 from recent upload
            ---------------------------------------------------- */}
        {showVoteSuccessModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-7 max-w-sm w-full space-y-5 text-center shadow-2xl border border-slate-100">
              {/* Green Checkmark Icon */}
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl font-black mx-auto shadow-md shadow-emerald-500/20">
                ✓
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Suara Berhasil Dikirim!</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed px-2">
                  Terima kasih telah berpartisipasi dalam {lastVotedSessionName || 'Pemilihan Ketua OSIS SMK Negeri 4 Bogor'}.
                </p>
              </div>

              {/* Light Green Info Box */}
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3 rounded-xl font-medium">
                Suara Anda telah tercatat dan tidak dapat diubah.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowVoteSuccessModal(false);
                    fetchData();
                  }}
                  className="w-full bg-[#24c07d] hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Kembali ke sesi pemilihan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 7: ALREADY VOTED MODAL (Anda Telah Memberikan Suara)
            Matches screenshot 3 from recent upload
            ---------------------------------------------------- */}
        {alreadyVotedModalSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl p-7 max-w-sm w-full space-y-5 text-center shadow-2xl border border-slate-100">
              {/* Blue Checkmark Icon Box */}
              <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xl font-black mx-auto shadow-md">
                ✓
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-extrabold text-slate-900">Anda Telah Memberikan Suara</h3>
                <p className="text-xs text-slate-400 font-medium leading-relaxed px-2">
                  Terima kasih telah berpartisipasi dalam pemilihan ini.
                </p>
              </div>

              {/* Light Blue Info Box */}
              <div className="bg-blue-50 border border-blue-100 text-blue-700 text-xs p-3.5 rounded-xl font-medium leading-relaxed">
                Setiap pemilih hanya dapat memberikan satu suara pada setiap sesi pemilihan.
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setAlreadyVotedModalSession(null)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs font-semibold text-slate-400">
        © 2026 VoteSmartK4.
      </footer>

      <style>{`
        .font-sans { font-family: 'Inter', sans-serif !important; }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}