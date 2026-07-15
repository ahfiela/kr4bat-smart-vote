import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

export default function DashboardVoters() {
  const [voters, setVoters] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Filters and Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalVoters, setTotalVoters] = useState(0);

  // Form Fields
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('SISWA');
  const [voterClass, setVoterClass] = useState('');
  const [password, setPassword] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState(null);

  // CSV Import File
  const [importFile, setImportFile] = useState(null);

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingVoters, setIsFetchingVoters] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchVoters = async () => {
    setIsFetchingVoters(true);
    try {
      const res = await apiClient.get('/admin/voters', {
        params: {
          search,
          role: roleFilter,
          class: classFilter,
          page,
        },
      });
      if (res.data.status === 'success') {
        setVoters(res.data.data.data);
        setLastPage(res.data.data.last_page);
        setTotalVoters(res.data.data.total);
      }
    } catch (err) {
      console.error('Gagal memuat pemilih:', err);
    } finally {
      setIsFetchingVoters(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get('/admin/voters/classes');
      if (res.data.status === 'success') {
        setClasses(res.data.data);
      }
    } catch (err) {
      console.error('Gagal memuat daftar kelas:', err);
    }
  };

  useEffect(() => {
    fetchVoters();
  }, [search, roleFilter, classFilter, page]);

  useEffect(() => {
    fetchClasses();
  }, []);

  const resetForm = () => {
    setIdentifier('');
    setName('');
    setRole('SISWA');
    setVoterClass('');
    setPassword('');
    setEditingId(null);
  };

  const resetMessages = () => {
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setIsLoading(true);

    const payload = {
      identifier,
      name,
      role,
      class: voterClass || null,
      password: password || null,
    };

    try {
      let res;
      if (editingId) {
        res = await apiClient.put(`/admin/voters/${editingId}`, payload);
      } else {
        res = await apiClient.post('/admin/voters', payload);
      }

      if (res.data.status === 'success') {
        setSuccessMessage(editingId ? 'Data pemilih berhasil diperbarui!' : 'Pemilih berhasil ditambahkan!');
        resetForm();
        fetchVoters();
        fetchClasses();
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

  const handleEditInit = (voter) => {
    setEditingId(voter.id);
    setIdentifier(voter.identifier);
    setName(voter.name);
    setRole(voter.role);
    setVoterClass(voter.class || '');
    setPassword('');
    resetMessages();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus pemilih ini dari database? Pemilih tidak akan bisa login lagi.')) return;
    resetMessages();
    try {
      const res = await apiClient.delete(`/admin/voters/${id}`);
      if (res.data.status === 'success') {
        setSuccessMessage('Pemilih berhasil dihapus!');
        fetchVoters();
        fetchClasses();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal menghapus pemilih');
    }
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    resetMessages();
    setIsLoading(true);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const res = await apiClient.post('/admin/voters/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.status === 'success') {
        setSuccessMessage(res.data.message);
        setImportFile(null);
        // Reset file input
        const fileInput = document.getElementById('csv-upload');
        if (fileInput) fileInput.value = '';
        fetchVoters();
        fetchClasses();
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Gagal mengimpor file CSV');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "identifier;name;role;class;password\n"
      + "2223101;Ahmad Fauzi;SISWA;10 PPLG 1;optionalPassword\n"
      + "2223102;Budi Santoso;SISWA;10 PPLG 2;\n"
      + "19920811;Dian Pratiwi S.Kom;GURU_STAF;GURU;123456";
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_pemilih.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Daftar Pemilih Terdaftar
          </h1>
          <p className="text-xs text-slate-400">Atur database pemilih (NISN/NIP) yang berhak memberikan suara</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Add/Edit & Import CSV */}
        <div className="space-y-8">
          {/* Form CRUD */}
          <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-slate-200 mb-4">
              {editingId ? 'Edit Pemilih' : 'Tambah Pemilih Manual'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">NISN / NIP / ID Pengguna</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="2223101"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mamat Rudiyanto"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Peran</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-850 border border-white/5 text-slate-200 focus:outline-none"
                  >
                    <option value="SISWA">SISWA</option>
                    <option value="GURU_STAF">GURU/STAF</option>
                    <option value="MITRA">MITRA</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Kelas</label>
                  <input
                    type="text"
                    value={voterClass}
                    onChange={(e) => setVoterClass(e.target.value)}
                    placeholder="10 PPLG 1"
                    className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">
                  Password {editingId ? <span className="text-slate-500">(Isi jika diganti)</span> : <span className="text-slate-500">(Bawaan = ID Pengguna)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 Karakter"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
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
                  {isLoading ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah Pemilih'}
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

          {/* Import CSV */}
          <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-200">Import Massal Excel (CSV)</h3>
              <button
                type="button"
                onClick={downloadCSVTemplate}
                className="text-[10px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1.5 rounded-lg border border-blue-500/10 transition-all cursor-pointer"
              >
                Template CSV
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              Unggah file CSV dengan pemisah titik-koma (;) atau koma (,) yang berisi kolom: <b>identifier, name, role, class, password</b>. Kolom password opsional, jika kosong default disamakan dengan ID Pengguna.
            </p>

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <input
                  id="csv-upload"
                  type="file"
                  required
                  accept=".csv,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600/10 file:text-blue-400 file:cursor-pointer hover:file:bg-blue-600/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !importFile}
                className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
              >
                {isLoading ? 'Mengimpor...' : 'Mulai Import'}
              </button>
            </form>
          </div>
        </div>

        {/* Kolom Kanan: Tabel Pemilih */}
        <div className="lg:col-span-2 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="w-full md:w-72">
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="w-full rounded-xl px-4 py-2 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="bg-slate-800 border border-white/10 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none"
                >
                  <option value="">Semua Peran</option>
                  <option value="SISWA">SISWA</option>
                  <option value="GURU_STAF">GURU/STAF</option>
                  <option value="MITRA">MITRA</option>
                </select>

                <select
                  value={classFilter}
                  onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
                  className="bg-slate-800 border border-white/10 rounded-xl text-xs text-slate-300 px-3 py-2 focus:outline-none max-w-44"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-[#1e293b]/20 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02] text-xs font-bold text-slate-400">
                      <th className="px-5 py-4">ID Pengguna</th>
                      <th className="px-5 py-4">Nama Lengkap</th>
                      <th className="px-5 py-4">Peran</th>
                      <th className="px-5 py-4">Kelas</th>
                      <th className="px-5 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                    {isFetchingVoters ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-500">Memuat data pemilih...</td>
                      </tr>
                    ) : voters.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-500">Pemilih tidak ditemukan.</td>
                      </tr>
                    ) : (
                      voters.map((v) => (
                        <tr key={v.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-400">{v.identifier}</td>
                          <td className="px-5 py-3.5 font-semibold text-slate-200">{v.name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              v.role === 'SISWA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                              v.role === 'GURU_STAF' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 
                              'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}>
                              {v.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400">{v.class || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditInit(v)}
                                className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/10 transition-all text-xs cursor-pointer"
                                title="Edit Pemilih"
                              >
                                <ion-icon name="create-outline"></ion-icon>
                              </button>
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/10 transition-all text-xs cursor-pointer"
                                title="Hapus Pemilih"
                              >
                                <ion-icon name="trash-outline"></ion-icon>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Pagination */}
          {!isFetchingVoters && lastPage > 1 && (
            <div className="flex justify-between items-center mt-4">
              <span className="text-xs text-slate-500">
                Total: <span className="font-bold text-slate-400">{totalVoters}</span> pemilih
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="text-xs text-slate-400 flex items-center px-1 font-bold">
                  Halaman {page} dari {lastPage}
                </span>
                <button
                  disabled={page >= lastPage}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
