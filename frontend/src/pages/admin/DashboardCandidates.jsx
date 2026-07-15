import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export default function DashboardCandidates() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [candidates, setCandidates] = useState([]);

  // Form Fields
  const [candidateNumber, setCandidateNumber] = useState('');
  const [name, setName] = useState('');
  const [photo, setPhoto] = useState(null);
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSessions, setIsFetchingSessions] = useState(true);
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSessions = async () => {
    setIsFetchingSessions(true);
    try {
      const res = await apiClient.get('/admin/sessions');
      if (res.data.status === 'success') {
        setSessions(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedSessionId(res.data.data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Gagal memuat sesi:', err);
    } finally {
      setIsFetchingSessions(false);
    }
  };

  const fetchCandidates = async (sessionId) => {
    if (!sessionId) return;
    setIsFetchingCandidates(true);
    try {
      const res = await apiClient.get(`/admin/sessions/${sessionId}/candidates`);
      if (res.data.status === 'success') {
        setCandidates(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat kandidat:', err);
    } finally {
      setIsFetchingCandidates(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchCandidates(selectedSessionId);
      resetForm();
      resetMessages();
    }
  }, [selectedSessionId]);

  const resetForm = () => {
    setCandidateNumber('');
    setName('');
    setPhoto(null);
    setVision('');
    setMission('');
    setEditingId(null);
    // Reset file input value
    const fileInput = document.getElementById('photo-upload');
    if (fileInput) fileInput.value = '';
  };

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSessionId) return;

    resetMessages();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('candidate_number', candidateNumber);
    formData.append('name', name);
    formData.append('vision', vision);
    formData.append('mission', mission);
    if (photo) {
      formData.append('photo', photo);
    }

    try {
      let res;
      if (editingId) {
        // Karena Laravel butuh _method='PUT' di body FormData jika memakai route POST untuk update
        formData.append('_method', 'POST'); 
        res = await apiClient.post(`/admin/candidates/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await apiClient.post(`/admin/sessions/${selectedSessionId}/candidates`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data.status === 'success') {
        setSuccessMessage(editingId ? 'Kandidat berhasil diperbarui!' : 'Kandidat berhasil ditambahkan!');
        resetForm();
        fetchCandidates(selectedSessionId);
      }
    } catch (err) {
      const message = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || 'Terjadi kesalahan sistem';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditInit = (candidate) => {
    setEditingId(candidate.id);
    setCandidateNumber(candidate.candidate_number);
    setName(candidate.name);
    setVision(candidate.vision);
    setMission(candidate.mission);
    setPhoto(null);
    resetMessages();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus kandidat ini dari bilik suara?')) return;
    resetMessages();
    try {
      const res = await apiClient.delete(`/admin/candidates/${id}`);
      if (res.data.status === 'success') {
        setSuccessMessage('Kandidat berhasil dihapus!');
        fetchCandidates(selectedSessionId);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus kandidat');
    }
  };

  const selectedSessionInfo = sessions.find((s) => s.id.toString() === selectedSessionId);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Manajemen Data Kandidat
          </h1>
          <p className="text-xs text-slate-400">Kelola daftar paslon/kandidat di setiap sesi bilik suara pemilu</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 shrink-0">Pilih Sesi Pemilu:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-slate-800 border border-white/10 rounded-xl text-sm text-slate-200 px-4 py-2 focus:outline-none"
            disabled={isFetchingSessions}
          >
            {isFetchingSessions && <option>Memuat sesi...</option>}
            {!isFetchingSessions && sessions.length === 0 && <option>Belum ada sesi pemilu</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedSessionId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Kolom Kiri: Form Add/Edit */}
          <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-fit">
            <h3 className="text-lg font-bold text-slate-200 mb-4">
              {editingId ? 'Edit Kandidat' : 'Tambah Kandidat Baru'}
            </h3>

            {selectedSessionInfo?.status === 'ARCHIVED' && (
              <div className="mb-4 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-3 rounded-xl font-medium">
                ⚠️ Sesi ini sudah diarsipkan (ARCHIVED). Perubahan kandidat tidak disarankan.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">No. Urut</label>
                  <input
                    type="text"
                    required
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(e.target.value)}
                    placeholder="01"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 text-center font-bold"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Budi Setiadi / Pasangan 1"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Foto Kandidat {editingId && <span className="text-slate-500">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600/10 file:text-blue-400 file:cursor-pointer hover:file:bg-blue-600/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Visi</label>
                <textarea
                  required
                  rows="3"
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Visi utama kandidat..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Misi</label>
                <textarea
                  required
                  rows="4"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Misi (tulis per baris atau paragraf)..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-sans"
                />
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

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
                >
                  {isLoading ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah Kandidat'}
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => {
                      resetForm();
                      resetMessages();
                    }}
                    className="rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Daftar Kandidat */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold text-slate-200">Kandidat Terdaftar</h3>

            {isFetchingCandidates && <p className="text-sm text-slate-500">Memuat data kandidat...</p>}
            {!isFetchingCandidates && candidates.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada kandidat terdaftar pada sesi pemilihan ini.</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-[#1e293b]/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-white/10 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="p-5 flex gap-4">
                    <div className="w-20 h-24 rounded-xl bg-slate-800 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center text-slate-600 text-2xl font-bold">
                      {cand.photo_path ? (
                        <img
                          src={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.photo_path}` : cand.photo_path}
                          alt={cand.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.src = "🗳️" }}
                        />
                      ) : (
                        '🗳️'
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/20 flex items-center justify-center text-xs font-black shrink-0">
                          {cand.candidate_number}
                        </span>
                        <h4 className="font-bold text-slate-200 truncate">{cand.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2"><span className="font-bold text-slate-500">Visi:</span> {cand.vision}</p>
                      <p className="text-xs text-slate-400 line-clamp-2"><span className="font-bold text-slate-500">Misi:</span> {cand.mission}</p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
                    <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">
                      Suara Masuk: {cand.votes_count}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditInit(cand)}
                        className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/10 transition-all cursor-pointer text-sm"
                        title="Edit Kandidat"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                      <button
                        onClick={() => handleDelete(cand.id)}
                        className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/10 transition-all cursor-pointer text-sm"
                        title="Hapus Kandidat"
                      >
                        <ion-icon name="trash-outline"></ion-icon>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-slate-500 text-sm">Pilih atau buat sesi pemilihan terlebih dahulu di menu Sesi Pemilihan.</div>
      )}
    </div>
  );
}
