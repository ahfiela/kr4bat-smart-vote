import React, { useState, useEffect } from 'react';
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

  const fetchData = async () => {
    setIsFetching(true);
    try {
      // Parallel fetch: sessions & history bersamaan agar lebih cepat tampil
      const [resSessions, resHistory] = await Promise.all([
        apiClient.get('/voter/sessions'),
        apiClient.get('/voter/history'),
      ]);

      if (resSessions.data.status === 'success') {
        setAvailableSessions(resSessions.data.data);
      }

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
        console.log(res.data.data)
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

  const votedCount = availableSessions.filter((s) => votedSessionIds.includes(s.id)).length;

  return (
    <div className="relative min-h-screen bg-[#f8fafc] font-sans text-slate-800 flex flex-col justify-between overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Header Bar */}
      <header className="relative z-10 w-full px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200/60 shadow-xs">
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
          {/* Top Right Logout Button (Keluar) matching screenshot */}
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ion-icon name="log-out-outline" style={{ fontSize: '14px' }}></ion-icon>
            <span>Keluar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-10 max-w-5xl w-full mx-auto">

        {/* ----------------------------------------------------
            SCREEN 1: SELECT ELECTION SESSION (Pilih Sesi Pemilihan)
            ---------------------------------------------------- */}
        {!activeBooth && !viewingProfileCandidate && (
          <div className="w-full max-w-3xl space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                Pilih Sesi Pemilihan
              </h1>
              <p className="text-xs md:text-sm text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                Silahkan pilih sesi pemilihan. Anda mungkin akan diminta memasukkan token untuk memasuki sesi pemilihan.
              </p>

              {!isFetching && availableSessions.length > 0 && (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 pt-1">
                  <span className="text-emerald-600">{votedCount}</span>
                  <span>dari</span>
                  <span className="text-slate-600">{availableSessions.length}</span>
                  <span>sesi telah Anda ikuti</span>
                </div>
              )}
            </div>

            {isFetching && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="status" aria-label="Memuat sesi pemilihan">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-full rounded-3xl bg-white border border-slate-100 p-5 space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded-md bg-slate-200 animate-pulse" style={{ width: `${70 - i * 8}%`, animationDelay: `${i * 0.15}s` }} />
                        <div className="h-3 rounded-md bg-slate-100 animate-pulse" style={{ width: '40%', animationDelay: `${i * 0.15}s` }} />
                      </div>
                    </div>
                    <div className="h-3 rounded-md bg-slate-100 animate-pulse w-full" />
                    <div className="h-9 rounded-xl bg-slate-100 animate-pulse w-full" />
                  </div>
                ))}
              </div>
            )}

            {!isFetching && availableSessions.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-2 shadow-xs">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ion-icon name="file-tray-outline" style={{ fontSize: '22px' }}></ion-icon>
                </div>
                <h3 className="font-bold text-slate-800 text-sm">Belum ada pemilihan aktif</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Saat ini tidak ada bilik suara aktif yang tersedia untuk kelompok Anda. Coba periksa lagi nanti.
                </p>
              </div>
            )}

            {/* Grid of election session ballot cards */}
            {!isFetching && availableSessions.length > 0 && (
              <div
                className={
                  availableSessions.length === 1
                    ? 'flex justify-center'
                    : 'grid grid-cols-1 md:grid-cols-2 gap-4'
                }
              >
                {availableSessions.map((session) => {
                  const hasVoted = votedSessionIds.includes(session.id);

                  return (
                    <button
                      key={session.id}
                      onClick={() => handleSelectSession(session)}
                      className={`group relative w-full ${
                        availableSessions.length === 1 ? 'max-w-sm' : ''
                      } text-left rounded-3xl bg-white border-2 transition-all duration-200 shadow-xs hover:shadow-lg active:scale-[0.99] cursor-pointer overflow-hidden flex flex-col ${
                        hasVoted
                          ? 'border-emerald-200 hover:border-emerald-300'
                          : 'border-slate-100 hover:border-blue-300'
                      }`}
                    >
                      {/* Top status strip */}
                      <div className={`h-1.5 w-full shrink-0 ${hasVoted ? 'bg-emerald-500' : 'bg-blue-600'}`} />

                      <div className="p-5 flex flex-col items-center gap-4 flex-1 text-center">
                        {/* Icon */}
                        <div
                          className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                            hasVoted ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}
                        >
                          <ion-icon
                            name={hasVoted ? 'checkmark-done' : 'file-tray-full-outline'}
                            style={{ fontSize: '20px' }}
                          ></ion-icon>
                        </div>

                        {/* Title + badges */}
                        <div className="w-full">
                          <h3 className="font-extrabold text-slate-900 text-sm md:text-base leading-snug line-clamp-2">
                            {session.name}
                          </h3>
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1.5">
                            {session.category && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                                {session.category.name}
                              </span>
                            )}
                            {session.year && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {session.year}—{parseInt(session.year) + 1}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {session.description && (
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {session.description}
                          </p>
                        )}

                        {/* Active kloter live indicator */}
                        {session.active_kloter && (
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 w-fit">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                            </span>
                            Kloter aktif: {session.active_kloter}
                          </div>
                        )}

                        {/* Perforated ticket divider */}
                        <div className="relative flex items-center w-full mt-auto pt-1">
                          <span className="absolute -left-5 w-4 h-4 rounded-full bg-[#f8fafc] border border-slate-100" />
                          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
                          <span className="absolute -right-5 w-4 h-4 rounded-full bg-[#f8fafc] border border-slate-100" />
                        </div>

                        {/* Bottom: candidate count + CTA */}
                        <div className="flex flex-col items-center gap-3 w-full">
                          {session.candidates?.length > 0 && (
                            <span className="flex items-center gap-1 text-[10px] md:text-[11px] text-slate-400 font-semibold">
                              <ion-icon name="people-outline" style={{ fontSize: '12px' }}></ion-icon>
                              {session.candidates.length} calon
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 px-4 py-2 rounded-xl text-[11px] md:text-xs font-bold transition-colors ${
                              hasVoted
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-600 text-white group-hover:bg-blue-700'
                            }`}
                          >
                            {hasVoted ? 'Sudah memilih' : 'Mulai memilih'}
                            <ion-icon name="chevron-forward" style={{ fontSize: '12px' }}></ion-icon>
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 2: TOKEN MODAL (Masukkan Token)
            ---------------------------------------------------- */}
        {verificationSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
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
          <div className="w-full space-y-8">
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
                        {cand.photo_path ? (
                          <img
                            src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.photo_path}`}
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
          <div className="w-full space-y-6 max-w-4xl mx-auto">
            {/* Top Navigation Back Link */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <button
                onClick={() => setViewingProfileCandidate(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer transition-colors self-start"
              >
                <span>← Kembali</span>
              </button>

              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Profil Kandidat {viewingProfileCandidate.candidate_number}
              </h2>

              <div className="hidden sm:block w-12"></div>
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
                      {viewingProfileCandidate.photo_path ? (
                        <img src={`${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${viewingProfileCandidate.photo_path}`} alt={viewingProfileCandidate.name} className="w-full h-full object-cover object-top" />
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
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
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
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
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

              <div className="pt-2 space-y-2">
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

                <a
                  href="/"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowVoteSuccessModal(false);
                    handleLogout();
                  }}
                  className="block w-full py-1.5 text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
                >
                  Kembali dan Keluar
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------
            SCREEN 7: ALREADY VOTED MODAL (Anda Telah Memberikan Suara)
            Matches screenshot 3 from recent upload
            ---------------------------------------------------- */}
        {alreadyVotedModalSession && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
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
      `}</style>
    </div>
  );
}