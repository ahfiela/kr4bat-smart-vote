import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import apiClient from '../../api/client';
import PasswordInput from '../../components/PasswordInput';

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

  // Import Massal
  const [importFile, setImportFile] = useState(null);
  const [importRole, setImportRole] = useState('SISWA');

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
      const [schoolClassRes, voterClassRes] = await Promise.all([
        apiClient.get('/admin/school-classes'),
        apiClient.get('/admin/voters/classes'),
      ]);

      const masterClasses = schoolClassRes.data.status === 'success' ? schoolClassRes.data.data.map(c => c.name) : [];
      const voterClasses = voterClassRes.data.status === 'success' ? voterClassRes.data.data : [];

      const combined = Array.from(new Set([...masterClasses, ...voterClasses])).sort();
      setClasses(combined);
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

  const parseImportFile = async (file) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) throw new Error('File tidak memiliki sheet yang bisa dibaca.');

    // raw:false agar nilai teks (mis. NISN dengan nol di depan) tetap utuh
    const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

    const headerIdx = grid.findIndex((row) =>
      row.some((cell) => String(cell).trim().toLowerCase() === 'nisn')
    );
    if (headerIdx === -1) {
      throw new Error('Kolom "NISN" tidak ditemukan di file. Pastikan baris header berisi kolom NISN.');
    }

    const header = grid[headerIdx].map((cell) => String(cell).trim().toLowerCase());
    const idCol = header.indexOf('nisn');
    const nameCol = header.findIndex((h) => h.includes('nama'));
    const classCol = header.findIndex((h) => h.includes('kelas'));

    if (nameCol === -1) {
      throw new Error('Kolom "Nama Lengkap" tidak ditemukan di file. Pastikan baris header berisi kolom Nama.');
    }

    const rowsMap = new Map();
    for (let i = headerIdx + 1; i < grid.length; i++) {
      const row = grid[i];
      const idValue = String(row[idCol] ?? '').trim();
      const nameValue = String(row[nameCol] ?? '').trim();

      if (!idValue || !nameValue || idValue.toLowerCase() === 'nisn') continue;

      rowsMap.set(idValue, {
        identifier: idValue,
        name: nameValue,
        class: classCol !== -1 ? String(row[classCol] ?? '').trim() || null : null,
      });
    }

    return [...rowsMap.values()];
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importFile) return;

    resetMessages();
    setIsLoading(true);

    try {
      const rows = await parseImportFile(importFile);
      if (rows.length === 0) {
        throw new Error('Tidak ada baris data valid ditemukan di file.');
      }

      const res = await apiClient.post('/admin/voters/import', {
        role: importRole,
        rows,
      });

      if (res.data.status === 'success') {
        setSuccessMessage(res.data.message);
        setImportFile(null);
        const fileInput = document.getElementById('csv-upload');
        if (fileInput) fileInput.value = '';
        fetchVoters();
        fetchClasses();
      }
    } catch (err) {
      const message = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || err.message
        || 'Gagal mengimpor file';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const downloadCSVTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,"
      + "NO;NISN;Nama Lengkap;Kelas Terakhir\n"
      + "1;0067891234;Ahmad Fauzi;10 PPLG 1\n"
      + "2;0067891235;Budi Santoso;10 PPLG 2";

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "template_pemilih.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper render kolom kedua kondisional berdasarkan peran
  const renderConditionalSecondColumn = () => {
    if (role === 'SISWA') {
      return (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Pilihan Kelas</label>
          {classes.length > 0 ? (
            <select
              value={voterClass}
              onChange={(e) => setVoterClass(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
            >
              <option value="">Pilih Kelas</option>
              {classes.map((cls) => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={voterClass}
              onChange={(e) => setVoterClass(e.target.value)}
              placeholder="Misal: 10 PPLG 1"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
            />
          )}
        </div>
      );
    }

    if (role === 'GURU_STAF') {
      return (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Posisi / Jabatan</label>
          <select
            value={voterClass}
            onChange={(e) => setVoterClass(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="">Pilih Posisi/Jabatan</option>
            <option value="Guru">Guru</option>
            <option value="Tata Usaha">Tata Usaha</option>
            <option value="Kepala Sekolah">Kepala Sekolah</option>
          </select>
        </div>
      );
    }

    if (role === 'MITRA') {
      return (
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">Bidang Operasional</label>
          <select
            value={voterClass}
            onChange={(e) => setVoterClass(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
          >
            <option value="">Pilih Bidang Operasional</option>
            <option value="Kebersihan">Kebersihan</option>
            <option value="Keamanan">Keamanan</option>
          </select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-800">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Daftar Pemilih Terdaftar
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Atur database pemilih (NISN/NIP) yang berhak memberikan suara</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kolom Kiri: Form Add/Edit & Import CSV */}
        <div className="space-y-8">
          {/* Form CRUD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-slate-900 mb-4">
              {editingId ? 'Edit Pemilih' : 'Tambah Pemilih Manual'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">NISN / NIP / ID Pengguna</label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="2223101"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mamat Rudiyanto"
                  className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Peran Utama</label>
                  <select
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setVoterClass(''); // reset pilihan kolom kedua saat peran berubah
                    }}
                    className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="SISWA">Siswa</option>
                    <option value="GURU_STAF">Guru / Staf</option>
                    <option value="MITRA">Mitra</option>
                  </select>
                </div>

                {renderConditionalSecondColumn()}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password {editingId ? <span className="text-slate-400">(Isi jika diganti)</span> : <span className="text-slate-400">(Bawaan = ID Pengguna)</span>}
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 Karakter"
                  className="rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
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
                  {isLoading ? 'Menyimpan...' : editingId ? 'Simpan' : 'Tambah Pemilih'}
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

          {/* Import Massal Excel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Import Massal Excel</h3>
              <button
                type="button"
                onClick={downloadCSVTemplate}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-all cursor-pointer"
              >
                Template CSV
              </button>
            </div>

            <p className="text-[11px] text-slate-500 mb-4 leading-relaxed font-medium">
              Unggah file <b>Excel (.xlsx/.xls)</b> atau CSV berisi kolom: <b>NO, NISN, Nama Lengkap, Kelas Terakhir</b>. Sistem otomatis membaca kolom <b>NISN</b> sebagai ID Pengguna &amp; <b>Nama Lengkap</b> sebagai Nama. Password bawaan = NISN.
            </p>

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Role Pemilih (untuk semua baris)</label>
                <select
                  value={importRole}
                  onChange={(e) => setImportRole(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 font-medium focus:outline-none focus:border-blue-500"
                >
                  <option value="SISWA">Siswa</option>
                  <option value="GURU_STAF">Guru / Staf</option>
                </select>
              </div>

              <div>
                <input
                  id="csv-upload"
                  type="file"
                  required
                  accept=".xlsx,.xls,.csv,.txt"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-600 file:cursor-pointer hover:file:bg-blue-100"
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

              <button
                type="submit"
                disabled={isLoading || !importFile}
                className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white transition-all cursor-pointer"
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
                  className="w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Filters */}
              <div className="flex gap-2 w-full md:w-auto">
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium px-3 py-2 focus:outline-none shadow-xs"
                >
                  <option value="">Semua Peran</option>
                  <option value="SISWA">SISWA</option>
                  <option value="GURU_STAF">GURU/STAF</option>
                  <option value="MITRA">MITRA</option>
                </select>

                <select
                  value={classFilter}
                  onChange={(e) => { setClassFilter(e.target.value); setPage(1); }}
                  className="bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium px-3 py-2 focus:outline-none max-w-44 shadow-xs"
                >
                  <option value="">Semua Kelas</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
                      <th className="px-5 py-4">ID Pengguna</th>
                      <th className="px-5 py-4">Nama Lengkap</th>
                      <th className="px-5 py-4">Peran</th>
                      <th className="px-5 py-4">Kelas</th>
                      <th className="px-5 py-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                    {isFetchingVoters ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400">Memuat data pemilih...</td>
                      </tr>
                    ) : voters.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-5 py-8 text-center text-slate-400">Pemilih tidak ditemukan.</td>
                      </tr>
                    ) : (
                      voters.map((v) => (
                        <tr key={v.id} className="hover:bg-slate-50/80 transition-all">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-600">{v.identifier}</td>
                          <td className="px-5 py-3.5 font-bold text-slate-900">{v.name}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              v.role === 'SISWA' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                              v.role === 'GURU_STAF' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {v.role}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-slate-500 font-medium">{v.class || '—'}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditInit(v)}
                                className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 transition-all text-xs cursor-pointer"
                                title="Edit Pemilih"
                              >
                                <ion-icon name="create-outline"></ion-icon>
                              </button>
                              <button
                                onClick={() => handleDelete(v.id)}
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-all text-xs cursor-pointer"
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
              <span className="text-xs text-slate-500 font-medium">
                Total: <span className="font-extrabold text-slate-800">{totalVoters}</span> pemilih
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer shadow-xs"
                >
                  Sebelumnya
                </button>
                <span className="text-xs text-slate-600 flex items-center px-2 font-bold">
                  Halaman {page} dari {lastPage}
                </span>
                <button
                  disabled={page >= lastPage}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 cursor-pointer shadow-xs"
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
