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
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Manajemen Kelas &amp; Lis Hak Pilih
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Atur kategori &amp; daftar lis kelas yang memiliki hak suara (Default Awal: Kelas, Guru, Staf, Mitra)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Add/Edit */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 h-fit shadow-xs">
          <h3 className="text-base font-extrabold text-slate-900 mb-4">
            {editingId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
          </h3>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Kategori</label>
              <input
                type="text"
                required
                value={editingId ? editingName : name}
                onChange={(e) => editingId ? setEditingName(e.target.value) : setName(e.target.value)}
                placeholder="Contoh: Ketua OSIS, Ketua MPK, Ketua Pramuka"
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
                disabled={isLoading}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
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
                  className="rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Kolom Kanan: Daftar Kategori */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-base font-extrabold text-slate-900">Daftar Kategori Terdaftar</h3>

          {isFetching && <p className="text-sm text-slate-400 font-medium">Memuat data kategori...</p>}
          {!isFetching && categories.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-2 shadow-xs">
              <div className="text-2xl">📂</div>
              <p className="text-sm text-slate-500 font-medium">Belum ada kategori pemilihan yang ditambahkan.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-2xl p-5 flex items-center justify-between transition-all duration-200 shadow-xs hover:shadow-sm group"
              >
                <div>
                  <h4 className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{category.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    ID: {category.id} • Dibuat pada {new Date(category.created_at).toLocaleDateString('id-ID')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setEditingName(category.name);
                      resetMessages();
                    }}
                    className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all cursor-pointer"
                    title="Edit Kategori"
                  >
                    <ion-icon name="create-outline"></ion-icon>
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all cursor-pointer"
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
