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
    <div className="space-y-8 animate-fade-in text-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Data Kandidat
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola daftar paslon/kandidat di setiap sesi bilik suara pemilu
          </p>
        </div>

        {/* Dropdown Pilih Sesi */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-600 shrink-0">Pilih Sesi Pemilu:</label>
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl text-sm text-slate-800 font-medium px-4 py-2 focus:outline-none focus:border-blue-500 shadow-xs"
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
          <div className="bg-white border border-slate-200 rounded-3xl p-6 h-fit shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              {editingId ? 'Edit Kandidat' : 'Tambah Kandidat Baru'}
            </h3>

            {selectedSessionInfo?.status === 'ARCHIVED' && (
              <div className="mb-4 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-xl font-medium">
                ⚠️ Sesi ini sudah diarsipkan (ARCHIVED). Perubahan kandidat tidak disarankan.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">No. Urut</label>
                  <input
                    type="text"
                    required
                    value={candidateNumber}
                    onChange={(e) => setCandidateNumber(e.target.value)}
                    placeholder="01"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-bold focus:outline-none focus:border-blue-500 text-center transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Budi Setiadi / Pasangan 1"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Foto Kandidat {editingId && <span className="text-slate-400 font-normal">(Kosongkan jika tidak diganti)</span>}
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 file:cursor-pointer hover:file:bg-blue-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Visi</label>
                <textarea
                  required
                  rows="3"
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="Visi utama kandidat..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 font-sans transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Misi</label>
                <textarea
                  required
                  rows="4"
                  value={mission}
                  onChange={(e) => setMission(e.target.value)}
                  placeholder="Misi (tulis per baris atau paragraf)..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 font-sans transition-all resize-none"
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-2.5 rounded-xl">
                  ⚠️ {errorMessage}
                </div>
              )}
              {successMessage && (
                <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  ✓ {successMessage}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
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
                    className="rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Kolom Kanan: Daftar Kandidat */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Kandidat Terdaftar</h3>
              {candidates.length > 0 && (
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  {candidates.length} Kandidat
                </span>
              )}
            </div>

            {isFetchingCandidates && (
              <p className="text-sm text-slate-400 font-medium">Memuat data kandidat...</p>
            )}
            {!isFetchingCandidates && candidates.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
                <div className="text-2xl">🗳️</div>
                <p className="text-sm text-slate-500 font-medium">Belum ada kandidat terdaftar pada sesi pemilihan ini.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {candidates.map((cand) => (
                <div
                  key={cand.id}
                  className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl overflow-hidden transition-all duration-200 shadow-xs hover:shadow-sm flex flex-col justify-between group"
                >
                  <div className="p-5 flex gap-4">
                    {/* Candidate Photo */}
                    <div className="w-20 h-24 rounded-xl bg-red-600 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
                      {cand.photo_path ? (
                        <img
                          src={import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api/v1', '')}${cand.photo_path}` : cand.photo_path}
                          alt={cand.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <span>{cand.candidate_number}</span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs font-black shrink-0">
                          {cand.candidate_number}
                        </span>
                        <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 truncate transition-colors">{cand.name}</h4>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        <span className="font-bold text-slate-600">Visi:</span> {cand.vision}
                      </p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        <span className="font-bold text-slate-600">Misi:</span> {cand.mission}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] text-blue-600 font-extrabold tracking-wider uppercase">
                      Suara Masuk: {cand.votes_count || 0}
                    </span>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditInit(cand)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all cursor-pointer text-sm"
                        title="Edit Kandidat"
                      >
                        <ion-icon name="create-outline"></ion-icon>
                      </button>
                      <button
                        onClick={() => handleDelete(cand.id)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all cursor-pointer text-sm"
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
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center space-y-3 shadow-xs">
          <div className="text-3xl">🗳️</div>
          <p className="text-sm text-slate-500 font-medium">
            Pilih atau buat sesi pemilihan terlebih dahulu di menu <strong className="text-slate-700">Bilik Suara Aktif</strong>.
          </p>
        </div>
      )}
    </div>
  );
}
