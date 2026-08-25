import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

// Origin backend untuk asset foto kandidat (VITE_API_URL = {origin}/api/v1)
const BACKEND_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/api\/v1\/?$/, '');
const assetUrl = (path) => (path ? `${BACKEND_ORIGIN}${path}` : null);

const mapCandidate = (c) => ({
  id: c.id,
  candidate_number: c.candidate_number,
  name: c.name,
  wakil_name: c.wakil_name || '',
  vision: c.vision || '',
  mission: c.mission || '',
  experience: c.experience || '',
  wakil_experience: c.wakil_experience || '',
  ketua_photo_path: c.ketua_photo_path || c.photo_path || null,
  wakil_photo_path: c.wakil_photo_path || null,
});

export default function EditSessionModal({ isOpen, onClose, onSuccess, session }) {
  const [step, setStep] = useState(1);

  // Step 1: Session Details
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [allowedRoles, setAllowedRoles] = useState(['SISWA']);
  const [allowedClasses, setAllowedClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);

  // Step 2: Candidates
  const [candidateName, setCandidateName] = useState('');
  const [wakilName, setWakilName] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [experience, setExperience] = useState('');
  const [wakilExperience, setWakilExperience] = useState('');
  const [ketuaPhoto, setKetuaPhoto] = useState(null);
  const [wakilPhoto, setWakilPhoto] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [editingCandidateId, setEditingCandidateId] = useState(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchClasses();
      fetchSessionDetail();
    }
  }, [isOpen, session]);

  // Ambil data sesi terbaru (termasuk seluruh kandidat existing) dari backend
  const fetchSessionDetail = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/admin/sessions/${session.id}`);
      if (res.data.status === 'success') {
        const data = res.data.data;

        setCategoryId(data.category_id?.toString() || '');
        setName(data.name || '');
        setDescription(data.description || '');
        setRoomCode(data.room_code || '');
        setAllowedRoles(data.allowed_roles?.length ? data.allowed_roles : ['SISWA']);
        setAllowedClasses(data.allowed_classes || []);
        setCandidates((data.candidates || []).map(mapCandidate));
      }
    } catch (err) {
      console.error('Gagal memuat detail sesi:', err);
      setErrorMessage('Gagal memuat data sesi. Tutup lalu coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiClient.get('/admin/categories');
      if (res.data.status === 'success') {
        setCategories(res.data.data);
        if (res.data.data.length > 0 && !categoryId) {
          setCategoryId(res.data.data[0].id.toString());
        }
      }
    } catch (err) {
      console.error('Gagal memuat kategori:', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/admin/voters/classes');
      if (res.data.status === 'success') {
        setAvailableClasses(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat daftar kelas:', err);
    }
  };

  const handleRoleToggle = (role) => {
    setAllowedRoles(prev => prev.includes(role)
      ? prev.filter(r => r !== role)
      : [...prev, role]);
  };

  const handleClassToggle = (className) => {
    setAllowedClasses(prev => prev.includes(className)
      ? prev.filter(c => c !== className)
      : [...prev, className]);
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!categoryId) {
      setErrorMessage('Kategori Sesi wajib dipilih!');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Nama Sesi wajib diisi!');
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiClient.put(`/admin/sessions/${session.id}`, {
        category_id: categoryId,
        name,
        description,
        room_code: roomCode.trim().toUpperCase() || null,
        allowed_roles: allowedRoles,
        allowed_classes: allowedClasses,
        year: session.year,
        status: session.status,
      });

      if (res.data.status === 'success') {
        setStep(2);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal memperbarui sesi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) return;

    setErrorMessage('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('name', candidateName);
    if (wakilName) formData.append('wakil_name', wakilName);
    formData.append('vision', vision);
    formData.append('mission', mission);
    if (experience) formData.append('experience', experience);
    if (wakilExperience) formData.append('wakil_experience', wakilExperience);
    if (ketuaPhoto) formData.append('ketua_photo', ketuaPhoto);
    if (wakilPhoto) formData.append('wakil_photo', wakilPhoto);

    const autoNum = (candidates.length + 1).toString();
    formData.append('candidate_number', autoNum);

    try {
      const res = await apiClient.post(`/admin/sessions/${session.id}/candidates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        setCandidates(prev => [...prev, res.data.data]);
        setCandidateName('');
        setWakilName('');
        setVision('');
        setMission('');
        setExperience('');
        setWakilExperience('');
        setKetuaPhoto(null);
        setWakilPhoto(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menambahkan kandidat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCandidate = async (e) => {
    e.preventDefault();
    if (!editingCandidateId || !candidateName.trim()) return;

    const candidate = candidates.find(c => c.id === editingCandidateId);
    if (!candidate) return;

    setErrorMessage('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('candidate_number', candidate.candidate_number);
    formData.append('name', candidateName);
    if (wakilName) formData.append('wakil_name', wakilName);
    formData.append('vision', vision);
    formData.append('mission', mission);
    if (experience) formData.append('experience', experience);
    if (wakilExperience) formData.append('wakil_experience', wakilExperience);
    if (ketuaPhoto) formData.append('ketua_photo', ketuaPhoto);
    if (wakilPhoto) formData.append('wakil_photo', wakilPhoto);

    try {
      const res = await apiClient.post(`/admin/candidates/${editingCandidateId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        setCandidates(prev => prev.map(c =>
          c.id === editingCandidateId ? res.data.data : c
        ));
        setEditingCandidateId(null);
        setCandidateName('');
        setWakilName('');
        setVision('');
        setMission('');
        setExperience('');
        setWakilExperience('');
        setKetuaPhoto(null);
        setWakilPhoto(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal memperbarui kandidat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCandidate = (cand) => {
    setEditingCandidateId(cand.id);
    setCandidateName(cand.name);
    setWakilName(cand.wakil_name || '');
    setVision(cand.vision || '');
    setMission(cand.mission || '');
    setExperience(cand.experience || '');
    setWakilExperience(cand.wakil_experience || '');
  };

  const handleDeleteCandidate = async (candId) => {
    if (!window.confirm('Hapus kandidat ini?')) return;

    setIsLoading(true);
    try {
      const res = await apiClient.delete(`/admin/candidates/${candId}`);
      if (res.data.status === 'success') {
        setCandidates(prev => prev.filter(c => c.id !== candId));
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus kandidat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAndFinish = () => {
    // Edit tidak mengubah status sesi (aktivasi tetap lewat panel monitor)
    onSuccess && onSuccess();
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setCategoryId('');
    setName('');
    setDescription('');
    setRoomCode('');
    setAllowedRoles(['SISWA']);
    setAllowedClasses([]);
    setCandidates([]);
    setCandidateName('');
    setWakilName('');
    setVision('');
    setMission('');
    setExperience('');
    setWakilExperience('');
    setKetuaPhoto(null);
    setWakilPhoto(null);
    setEditingCandidateId(null);
    setErrorMessage('');
    onClose();
  };

  const isEditingCandidate = !!editingCandidateId;
  const editingCand = candidates.find((c) => c.id === editingCandidateId) || null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="bg-white text-slate-900 px-4 sm:px-6 py-4 flex justify-between items-center gap-3 border-b border-slate-200 shadow-xs shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-1 rounded-lg shrink-0">
                TAHAP {step} DARI 2
              </span>
              <h2 className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                {step === 1 ? 'Edit Detail Sesi & Kategori' : 'Kelola Kandidat (Paslon)'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {step === 1 ? 'Edit detail sesi, kategori, hak pilih, dan kelas' : 'Tambah, edit, atau hapus kandidat (minimal 2 paslon)'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer text-sm font-bold shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="bg-slate-50 px-6 py-3 flex items-center gap-2 border-b border-slate-200 shrink-0">
          {[1, 2].map((s) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-bold ${s <= step ? 'text-blue-600' : 'text-slate-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  s < step ? 'bg-blue-600 text-white' :
                  s === step ? 'bg-blue-600 text-white ring-2 ring-blue-200' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {s < step ? '✓' : s}
                </div>
                <span className="hidden sm:block">
                  {s === 1 && 'Detail Sesi'}
                  {s === 2 && 'Kandidat'}
                </span>
              </div>
              {s < 2 && <div className={`flex-1 h-px ${s < step ? 'bg-blue-300' : 'bg-slate-200'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {errorMessage && (
            <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Step 1: Session Details */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Kategori Sesi *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih Kategori Sesi --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama / Judul Room Vote *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Pemilihan Ketua OSIS 2026"
                    className="w-full rounded-xl px-4 py-3 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Deskripsi / Instruksi Pemilihan</label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruksi singkat bagi pemilih..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kode Room Khusus <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Kosongkan untuk kode otomatis"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-mono font-bold focus:outline-none focus:border-blue-500 transition-all tracking-wider"
                />
              </div>

              {/* Filter Hak Pilih Level 1 */}
              <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                    Filter Hak Pilih Level 1 (Cakupan Global)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Centang peran yang diizinkan</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Tentukan kelompok besar yang berhak berpartisipasi.
                </p>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  {[
                    { id: 'SISWA', label: 'Siswa' },
                    { id: 'GURU_STAF', label: 'Guru / Staf' },
                    { id: 'MITRA', label: 'Mitra' },
                  ].map((roleObj) => {
                    const isChecked = allowedRoles.includes(roleObj.id);
                    return (
                      <button
                        type="button"
                        key={roleObj.id}
                        onClick={() => handleRoleToggle(roleObj.id)}
                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          isChecked
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded accent-white"
                        />
                        <span>{roleObj.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filter Kelas (Opsional) */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">
                    Filter Kelas (Opsional - Khusus Siswa)
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Centang kelas yang diizinkan</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Kosongkan = semua kelas diizinkan. Hanya berlaku untuk peran Siswa.
                </p>

                {availableClasses.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {availableClasses.map((cls) => {
                      const isChecked = allowedClasses.includes(cls);
                      return (
                        <button
                          type="button"
                          key={cls}
                          onClick={() => handleClassToggle(cls)}
                          className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded accent-white mr-1.5"
                          />
                          <span>{cls}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !name.trim() || !categoryId}
                  className="w-full rounded-xl py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'Menyimpan...' : 'Lanjut ke Kelola Kandidat →'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Manage Candidates */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-800">{session.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">Kode Room: <span className="font-mono font-bold text-blue-600">{session.room_code}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {candidates.length} Paslon Terinput
                  </span>
                </div>
              </div>

              {/* Add/Edit Candidate Form */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-5">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                    {isEditingCandidate ? 'Edit Paslon' : `Form Paslon Baru #${candidates.length + 1}`}
                  </h4>
                  {isEditingCandidate && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCandidateId(null);
                        setCandidateName('');
                        setWakilName('');
                        setVision('');
                        setMission('');
                        setExperience('');
                        setWakilExperience('');
                        setKetuaPhoto(null);
                        setWakilPhoto(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-700 font-bold underline"
                    >
                      Batal Edit
                    </button>
                  )}
                </div>

                {/* Ketua */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <span>👤</span> Data Calon Ketua {isEditingCandidate ? '(Edit)' : ''}
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Ketua *</label>
                      <input
                        type="text"
                        required={!isEditingCandidate}
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        placeholder="Nama Ketua Paslon"
                        className="w-full rounded-xl px-4 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Pengalaman / Organisasi Ketua</label>
                      <input
                        type="text"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Misal: Ketua OSIS SMP"
                        className="w-full rounded-xl px-4 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Foto Ketua</label>
                    {isEditingCandidate && !ketuaPhoto && editingCand?.ketua_photo_path && (
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={assetUrl(editingCand.ketua_photo_path)}
                          alt="Foto Ketua Saat Ini"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                        />
                        <span className="text-[10px] text-slate-400">Foto saat ini — pilih file baru untuk mengganti</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setKetuaPhoto(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 file:cursor-pointer"
                    />
                  </div>
                </div>

                {/* Wakil Ketua */}
                {candidateName.trim() !== '' && (
                  <div className="bg-white p-4 rounded-2xl border border-blue-200 space-y-3 animate-fade-in">
                    <h5 className="text-xs font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>👥</span> Data Calon Wakil Ketua
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Wakil Ketua</label>
                        <input
                          type="text"
                          value={wakilName}
                          onChange={(e) => setWakilName(e.target.value)}
                          placeholder="Nama Wakil Paslon"
                          className="w-full rounded-xl px-4 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Pengalaman / Organisasi Wakil</label>
                        <input
                          type="text"
                          value={wakilExperience}
                          onChange={(e) => setWakilExperience(e.target.value)}
                          placeholder="Misal: Sekjen MPK"
                          className="w-full rounded-xl px-4 py-2 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Foto Wakil Ketua</label>
                      {isEditingCandidate && !wakilPhoto && editingCand?.wakil_photo_path && (
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={assetUrl(editingCand.wakil_photo_path)}
                            alt="Foto Wakil Saat Ini"
                            className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          />
                          <span className="text-[10px] text-slate-400">Foto saat ini — pilih file baru untuk mengganti</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setWakilPhoto(e.target.files?.[0] || null)}
                        className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 file:cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {/* Visi & Misi */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Visi Paslon *</label>
                    <textarea
                      rows="2"
                      required={!isEditingCandidate}
                      value={vision}
                      onChange={(e) => setVision(e.target.value)}
                      placeholder="Visi bersama pasangan calon..."
                      className="w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Misi Paslon *</label>
                    <textarea
                      rows="2"
                      required={!isEditingCandidate}
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                      placeholder="Misi bersama pasangan calon..."
                      className="w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={isEditingCandidate ? handleUpdateCandidate : handleAddCandidate}
                  disabled={isLoading || !candidateName.trim()}
                  className="w-full rounded-xl py-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>{isLoading ? 'Menyimpan...' : (isEditingCandidate ? 'Simpan Perubahan' : `+ Simpan Paslon Nomor Urut #${candidates.length + 1}`)}</span>
                </button>
              </div>

              {/* Candidates List */}
              {candidates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Paslon Terdaftar:</h4>
                  <div className="space-y-2">
                    {candidates.map((cand) => (
                      <div key={cand.id} className={`bg-white border p-4 rounded-xl flex items-center justify-between gap-3 shadow-xs animate-fade-in ${editingCandidateId === cand.id ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
                        {cand.ketua_photo_path ? (
                          <img
                            src={assetUrl(cand.ketua_photo_path)}
                            alt={`Foto ${cand.name}`}
                            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                            #{cand.candidate_number}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">
                            #{cand.candidate_number} • {cand.name} {cand.wakil_name ? `& ${cand.wakil_name}` : ''}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">Visi: {cand.vision}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditCandidate(cand)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all text-xs cursor-pointer"
                            title="Edit Paslon"
                          >
                            <ion-icon name="create-outline"></ion-icon>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCandidate(cand.id)}
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all text-xs cursor-pointer"
                            title="Hapus Paslon"
                          >
                            <ion-icon name="trash-outline"></ion-icon>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Finish Button */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-xl py-3.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  ← Kembali Edit Detail Sesi
                </button>

                <button
                  type="button"
                  disabled={candidates.length < 2 || isLoading}
                  onClick={handleSaveAndFinish}
                  className="flex-1 rounded-xl py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'Menyimpan & Selesai...' : '✓ Simpan & Selesai'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}