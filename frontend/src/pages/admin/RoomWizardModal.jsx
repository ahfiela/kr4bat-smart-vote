import React, { useState } from 'react';
import apiClient from '../../api/client';

export default function RoomWizardModal({ isOpen, onClose, onSuccess }) {
  // Step State: 1 = Identity & Scope Level 1, 2 = Candidate Input, 3 = Room Activation
  const [step, setStep] = useState(1);

  // Step 1 Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [allowedRoles, setAllowedRoles] = useState(['SISWA']); // default Siswa checked

  // Created Room Data
  const [createdSession, setCreatedSession] = useState(null);

  // Step 2 Form (Candidate)
  const [candidateName, setCandidateName] = useState('');
  const [vision, setVision] = useState('');
  const [mission, setMission] = useState('');
  const [experience, setExperience] = useState('');
  const [photo, setPhoto] = useState(null);
  const [addedCandidates, setAddedCandidates] = useState([]);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleRoleToggle = (role) => {
    if (allowedRoles.includes(role)) {
      if (allowedRoles.length > 1) {
        setAllowedRoles(allowedRoles.filter((r) => r !== role));
      }
    } else {
      setAllowedRoles([...allowedRoles, role]);
    }
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    const generatedCode = roomCode.trim()
      ? roomCode.trim().toUpperCase()
      : 'ROOM-' + Math.floor(1000 + Math.random() * 9000);

    try {
      const res = await apiClient.post('/admin/sessions', {
        name,
        description,
        room_code: generatedCode,
        allowed_roles: allowedRoles,
        year: new Date().getFullYear().toString(),
        status: 'DRAFT',
      });

      if (res.data.status === 'success') {
        setCreatedSession(res.data.data);
        setStep(2);
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})[0]?.[0] ||
        'Gagal membuat room'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!createdSession) return;
    setErrorMessage('');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('name', candidateName);
    formData.append('vision', vision);
    formData.append('mission', mission);
    if (experience) formData.append('experience', experience);
    if (photo) formData.append('photo', photo);

    // Auto candidate number
    const autoNum = (addedCandidates.length + 1).toString();
    formData.append('candidate_number', autoNum);

    try {
      const res = await apiClient.post(`/admin/sessions/${createdSession.id}/candidates`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        setAddedCandidates([...addedCandidates, res.data.data]);
        setCandidateName('');
        setVision('');
        setMission('');
        setExperience('');
        setPhoto(null);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menambahkan kandidat');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateSession = async () => {
    if (!createdSession || addedCandidates.length < 2) return;
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await apiClient.patch(`/admin/sessions/${createdSession.id}/status`, {
        status: 'ACTIVE',
      });

      if (res.data.status === 'success') {
        onSuccess && onSuccess(res.data.data);
        handleClose();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengaktifkan room sesi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setName('');
    setDescription('');
    setRoomCode('');
    setAllowedRoles(['SISWA']);
    setCreatedSession(null);
    setCandidateName('');
    setVision('');
    setMission('');
    setExperience('');
    setPhoto(null);
    setAddedCandidates([]);
    setErrorMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* Action Bar - Clean White Header */}
        <div className="bg-white text-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-200 shadow-xs shrink-0">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="bg-blue-600 text-white font-black text-[10px] px-2.5 py-1 rounded-lg">
                TAHAP {step} DARI 3
              </span>
              <h2 className="font-extrabold text-slate-900 text-base tracking-tight">
                {step === 1 && 'Detail Identitas & Scope Hak Pilih (Level 1)'}
                {step === 2 && 'Input Data Kandidat Terintegrasi'}
                {step === 3 && 'Aktivasi Room Sesi Pemilihan'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Alur linier pembuatan room vote baru berurutan
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Progress Steps Indicator */}
        <div className="bg-slate-50 px-6 py-3 flex items-center gap-2 border-b border-slate-200 shrink-0">
          {[1, 2, 3].map((s) => (
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
                  {s === 1 && 'Identitas'}
                  {s === 2 && 'Kandidat'}
                  {s === 3 && 'Aktivasi'}
                </span>
              </div>
              {s < 3 && <div className={`flex-1 h-px ${s < step ? 'bg-blue-300' : 'bg-slate-200'}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {errorMessage && (
            <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Step 1: Identitas & Level 1 Scope */}
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama / Judul Room Vote *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Pilih Ketua Ekskul / Pemilihan Ketua OSIS"
                  className="w-full rounded-xl px-4 py-3 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Deskripsi / Instruksi Pemilihan</label>
                <textarea
                  rows="2"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Instruksi singkat bagi pemilih yang masuk ke bilik ini..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Kode Room Khusus <span className="text-slate-400 font-normal">(Opsional)</span></label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="Kosongkan untuk kode otomatis (e.g. ROOM-8921)"
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
                  Tentukan kelompok besar yang berhak berpartisipasi. Jika hanya centang Siswa, maka akses Guru dan Mitra otomatis terkunci dari awal.
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
                          onChange={() => {}} // handled by button click
                          className="rounded accent-white"
                        />
                        <span>{roleObj.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !name.trim()}
                  className="w-full rounded-xl py-3.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'Membuat Room...' : 'Lanjut ke Tahap 2: Input Data Kandidat →'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Input Data Kandidat */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-extrabold text-blue-800">{createdSession?.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">Kode Room: <span className="font-mono font-bold text-blue-600">{createdSession?.room_code}</span></p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    {addedCandidates.length} Kandidat Terinput
                  </span>
                </div>
              </div>

              <form onSubmit={handleAddCandidate} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2.5">
                  <h4 className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
                    Form Input Kandidat (Nomor Urut Otomatis: #{addedCandidates.length + 1})
                  </h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap Kandidat *</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Nama Lengkap Kandidat"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Visi *</label>
                    <textarea
                      rows="2"
                      required
                      value={vision}
                      onChange={(e) => setVision(e.target.value)}
                      placeholder="Visi kandidat..."
                      className="w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Misi *</label>
                    <textarea
                      rows="2"
                      required
                      value={mission}
                      onChange={(e) => setMission(e.target.value)}
                      placeholder="Misi kandidat..."
                      className="w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pengalaman Organisasi / Proker</label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Misal: Ketua OSIS SMP, Sekretaris Ekskul Paskibra..."
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto Kandidat <span className="text-slate-400 font-normal">(Opsional)</span></label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 file:cursor-pointer hover:file:bg-blue-100"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !candidateName.trim()}
                  className="w-full rounded-xl py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <span>+ Tambahkan Kandidat Nomor #{addedCandidates.length + 1}</span>
                </button>
              </form>

              {/* Added Candidates List */}
              {addedCandidates.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Kandidat Terdaftar:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {addedCandidates.map((cand) => (
                      <div key={cand.id} className="bg-white border border-slate-200 p-3 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                          #{cand.candidate_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{cand.name}</p>
                          {cand.experience && <p className="text-[10px] text-slate-400 truncate">{cand.experience}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={addedCandidates.length < 2}
                  onClick={() => setStep(3)}
                  className="w-full rounded-xl py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>Lanjut ke Tahap 3: Aktivasi Room ({addedCandidates.length}/2 Minimal) →</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Room Session Activation */}
          {step === 3 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl font-black shadow-md shadow-emerald-500/20">
                ✓
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Siap Mengaktifkan Room Sesi!</h3>
                <p className="text-xs text-slate-500 font-medium max-w-md mx-auto mt-1">
                  Minimal 2 kandidat telah diinput. Klik tombol di bawah untuk mengubah status room bawaan (Draft) menuju status Siap Pakai (ACTIVE).
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl text-left max-w-md mx-auto space-y-2 shadow-xs">
                <p className="text-xs text-slate-500 font-medium">Judul Room: <span className="font-extrabold text-slate-900">{createdSession?.name}</span></p>
                <p className="text-xs text-slate-500 font-medium">Kode Room: <span className="font-mono font-extrabold text-blue-600">{createdSession?.room_code}</span></p>
                <p className="text-xs text-slate-500 font-medium">Cakupan Hak Pilih (Level 1): <span className="font-extrabold text-slate-900">{allowedRoles.join(', ')}</span></p>
                <p className="text-xs text-slate-500 font-medium">Total Kandidat: <span className="font-extrabold text-emerald-600">{addedCandidates.length} Personil</span></p>
              </div>

              <div className="flex gap-3 max-w-md mx-auto pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  ← Kembali Tambah Kandidat
                </button>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleActivateSession}
                  className="flex-1 rounded-xl py-3.5 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <span>{isLoading ? 'Mengaktifkan...' : '🚀 Aktifkan Room Sesi'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in { animation: fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
}
