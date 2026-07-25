import React, { useState } from 'react';
import apiClient from '../../api/client';
import PasswordInput from '../../components/PasswordInput';

export default function DashboardSettingsAdmin() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (password && password !== passwordConfirmation) {
      setErrorMessage('Konfirmasi password tidak cocok!');
      return;
    }

    setIsLoading(true);

    const payload = {};
    if (name.trim()) payload.name = name;
    if (username.trim()) payload.username = username;
    if (password) {
      payload.password = password;
      payload.password_confirmation = passwordConfirmation;
    }

    try {
      const res = await apiClient.put('/admin/profile', payload);
      if (res.data.status === 'success') {
        setSuccessMessage('Profil admin berhasil diperbarui!');
        setPassword('');
        setPasswordConfirmation('');
      }
    } catch (err) {
      const message = err.response?.data?.message
        || Object.values(err.response?.data?.errors || {})[0]?.[0]
        || 'Gagal memperbarui profil';
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-xl text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
          Pengaturan Keamanan Admin
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Perbarui identitas admin atau ubah password default demi menjaga keamanan bilik suara
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
        <form onSubmit={handleUpdate} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Nama Lengkap Administrator</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ganti Nama Administrator (opsional)"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Username Admin</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ganti Username Admin (opsional)"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <hr className="border-slate-200 my-2" />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Password Baru</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru jika ingin diganti"
              className="rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Konfirmasi Password Baru</label>
            <PasswordInput
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Ketik ulang password baru Anda"
              className="rounded-xl px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
            />
          </div>

          {errorMessage && (
            <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-3 rounded-xl">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
              ✓ {successMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-3 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shadow-xs"
          >
            {isLoading ? 'Memperbarui...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </div>
  );
}
