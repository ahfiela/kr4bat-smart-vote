import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export default function DashboardSchoolClasses() {
  const [classes, setClasses] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchClasses = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get('/admin/school-classes');
      if (res.data.status === 'success') {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data kelas:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.post('/admin/school-classes', { name: name.trim() });
      if (res.data.status === 'success') {
        setSuccessMessage('Data kelas berhasil ditambahkan!');
        setName('');
        fetchClasses();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal menambahkan data kelas';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    try {
      const res = await apiClient.put(`/admin/school-classes/${editingId}`, { name: editingName.trim() });
      if (res.data.status === 'success') {
        setSuccessMessage('Data kelas berhasil diperbarui!');
        setEditingId(null);
        setEditingName('');
        fetchClasses();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal memperbarui data kelas';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data kelas ini dari master data?')) return;
    resetMessages();
    try {
      const res = await apiClient.delete(`/admin/school-classes/${id}`);
      if (res.data.status === 'success') {
        setSuccessMessage('Data kelas berhasil dihapus!');
        fetchClasses();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus data kelas');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Data Kelas
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Kelola master data daftar kelas siswa (Contoh: "10 PPLG 1", "10 PPLG 2", "11 ANIMASI 1")
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Add/Edit */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 h-fit shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            {editingId ? 'Edit Nama Kelas' : 'Tambah Kelas Baru'}
          </h3>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kelas *</label>
              <input
                type="text"
                required
                value={editingId ? editingName : name}
                onChange={(e) => editingId ? setEditingName(e.target.value) : setName(e.target.value)}
                placeholder="Contoh: 10 PPLG 1 / 11 TFLM 2"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            {errorMessage && (
              <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-2.5 rounded-xl flex items-center gap-1.5">
                <span>⚠️</span> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-1.5">
                <span>✓</span> {successMessage}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading || !(editingId ? editingName.trim() : name.trim())}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
              >
                {isLoading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kelas'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingName('');
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

        {/* Daftar Kelas */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900">Daftar Kelas Terdaftar</h3>
            {classes.length > 0 && (
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                Total: {classes.length} Kelas
              </span>
            )}
          </div>

          {isFetching && <p className="text-sm text-slate-400 font-medium">Memuat data kelas...</p>}
          {!isFetching && classes.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <div className="text-2xl">🏫</div>
              <p className="text-sm text-slate-500 font-medium">Belum ada data kelas yang ditambahkan di master data.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl p-4 flex items-center justify-between transition-all duration-200 shadow-xs hover:shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black text-xs shrink-0">
                    🏫
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">{cls.name}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Master Class ID: #{cls.id}</p>
                  </div>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      setEditingId(cls.id);
                      setEditingName(cls.name);
                      resetMessages();
                    }}
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all cursor-pointer text-xs"
                    title="Edit Kelas"
                  >
                    <ion-icon name="create-outline"></ion-icon>
                  </button>
                  <button
                    onClick={() => handleDelete(cls.id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all cursor-pointer text-xs"
                    title="Hapus Kelas"
                  >
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
