import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export default function DashboardCategory() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchCategories = async () => {
    setIsFetching(true);
    try {
      const res = await apiClient.get('/admin/categories');
      if (res.data.status === 'success') {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil data kategori:', err);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchCategories();
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
      const res = await apiClient.post('/admin/categories', { name });
      if (res.data.status === 'success') {
        setSuccessMessage('Kategori berhasil ditambahkan!');
        setName('');
        fetchCategories();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal menambahkan kategori';
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
      const res = await apiClient.put(`/admin/categories/${editingId}`, { name: editingName });
      if (res.data.status === 'success') {
        setSuccessMessage('Kategori berhasil diperbarui!');
        setEditingId(null);
        setEditingName('');
        fetchCategories();
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Gagal memperbarui kategori';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus kategori ini? Semua sesi terkait akan ikut terhapus!')) return;
    resetMessages();
    try {
      const res = await apiClient.delete(`/admin/categories/${id}`);
      if (res.data.status === 'success') {
        setSuccessMessage('Kategori berhasil dihapus!');
        fetchCategories();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus kategori');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Kategori Pemilihan
          </h1>
          <p className="text-xs text-slate-400">Atur kategori yang digunakan untuk sesi bilik suara pemilu digital</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Add/Edit */}
        <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6 h-fit">
          <h3 className="text-lg font-bold text-slate-200 mb-4">
            {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h3>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1.5">Nama Kategori</label>
              <input
                type="text"
                required
                value={editingId ? editingName : name}
                onChange={(e) => editingId ? setEditingName(e.target.value) : setName(e.target.value)}
                placeholder="Contoh: Ketua OSIS, Ketua MPK, Ketua Pramuka"
                className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {errorMessage && (
              <div className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/15 p-2.5 rounded-lg flex items-center gap-1.5">
                <span>⚠️</span> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/15 p-2.5 rounded-lg flex items-center gap-1.5">
                <span>✓</span> {successMessage}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
              >
                {isLoading ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Tambah Kategori'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setEditingName('');
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

        {/* Kolom Kanan: Daftar Kategori */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-bold text-slate-200">Daftar Kategori Terdaftar</h3>

          {isFetching && <p className="text-sm text-slate-500">Memuat data kategori...</p>}
          {!isFetching && categories.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada kategori pemilihan yang ditambahkan.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-[#1e293b]/20 border border-white/5 rounded-2xl p-5 flex items-center justify-between backdrop-blur-sm hover:border-white/10 transition-all duration-300"
              >
                <div>
                  <h4 className="font-bold text-slate-200">{category.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">ID: {category.id} • Dibuat pada {new Date(category.created_at).toLocaleDateString('id-ID')}</p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                      resetMessages();
                    }}
                    className="p-2 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/10 transition-all cursor-pointer"
                    title="Edit Kategori"
                  >
                    <ion-icon name="create-outline"></ion-icon>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/10 transition-all cursor-pointer"
                    title="Hapus Kategori"
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
