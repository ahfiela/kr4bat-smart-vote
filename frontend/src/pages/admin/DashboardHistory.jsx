import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import WinnerAnnouncementBoard from '../../components/WinnerAnnouncementBoard';

export default function DashboardHistory() {
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [isFetching, setIsFetching] = useState(true);

  const fetchArchivedSessions = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get('/admin/sessions');
      if (res.data.status === 'success') {
        const archived = res.data.data.filter((s) => s.status === 'ARCHIVED');
        setArchivedSessions(archived);
        if (archived.length > 0) {
          fetchSessionDetail(archived[0].id);
        }
      }
    } catch (err) {
      console.error('Gagal memuat riwayat pemilu:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const fetchSessionDetail = async (sessionId) => {
    try {
      const res = await apiClient.get(`/admin/sessions/${sessionId}`);
      if (res.data.status === 'success') {
        setSelectedSession(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat rincian sesi:', err);
    }
  };

  useEffect(() => {
    fetchArchivedSessions();
  }, []);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            History &amp; Riwayat Pemilu
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Arsip resmi sesi pemilihan yang telah diakhiri (Mode Read-Only &amp; Papan Pengumuman Pemenang)
          </p>
        </div>

        <div className="text-xs font-bold text-amber-700 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-200">
          🔒 Status Read-Only
        </div>
      </div>

      {isFetching ? (
        <div className="py-12 text-center text-slate-400 text-xs font-medium">
          Memuat riwayat sesi pemilihan...
        </div>
      ) : archivedSessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center mx-auto text-xl font-bold">
            📜
          </div>
          <h3 className="text-base font-extrabold text-slate-800">Belum Ada Sesi yang Diarsipkan</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
            Ketika sesi di bilik suara diakhiri (ARCHIVED), data sesi akan otomatis terkunci permanen dan dipindahkan ke halaman History ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* List Sesi Archived */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Daftar Sesi Berakhir ({archivedSessions.length})
            </h3>

            <div className="space-y-3">
              {archivedSessions.map((session) => {
                const isSelected = selectedSession?.id === session.id;
                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => fetchSessionDetail(session.id)}
                    className={`w-full text-left p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        isSelected ? 'bg-white/20 text-white border-white/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        ARCHIVED
                      </span>
                      <span className={`text-xs font-mono font-bold ${isSelected ? 'text-blue-100' : 'text-blue-600'}`}>
                        {session.room_code}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-base mt-2 leading-snug">{session.name}</h4>
                    <p className={`text-xs mt-1 font-medium ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                      Kategori: {session.category?.name || 'Sesi Pemilihan'} • {session.year}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Audit & Winner Announcement Board */}
          <div className="lg:col-span-2 space-y-6">
            {selectedSession ? (
              <div className="space-y-6">
                
                {/* Winner Announcement Board with Export Button */}
                <WinnerAnnouncementBoard session={selectedSession} />

                {/* Candidate Results Breakdown */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-5 shadow-xs">
                  <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
                    Audit Perolehan Suara Paslon
                  </h3>

                  <div className="space-y-4">
                    {selectedSession.candidates?.map((candidate) => {
                      const totalVotes = selectedSession.candidates.reduce((sum, c) => sum + (c.votes_count || 0), 0);
                      const percent = totalVotes > 0 ? Math.round(((candidate.votes_count || 0) / totalVotes) * 100) : 0;

                      return (
                        <div key={candidate.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                                #{candidate.candidate_number}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-slate-900 text-sm">
                                  {candidate.name} {candidate.wakil_name ? `& ${candidate.wakil_name}` : ''}
                                </h4>
                                {candidate.vision && (
                                  <p className="text-xs text-slate-500 font-medium line-clamp-1">Visi: {candidate.vision}</p>
                                )}
                              </div>
                            </div>

                            <div className="text-right">
                              <span className="text-lg font-black text-blue-600">{candidate.votes_count || 0}</span>
                              <span className="text-xs text-slate-500 ml-1">({percent}%)</span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-medium">
                Pilih salah satu sesi di sebelah kiri untuk melihat papan pengumuman pemenang dan audit data.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
