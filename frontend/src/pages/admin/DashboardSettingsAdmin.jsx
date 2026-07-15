import React, { useState } from 'react';
import apiClient from '../../api/client';

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
    <div className="space-y-8 animate-fade-in max-w-xl">
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-2xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Pengaturan Keamanan Admin
        </h1>
        <p className="text-xs text-slate-400">Perbarui identitas admin atau ubah password default demi menjaga keamanan bilik suara</p>
      </div>

      <div className="bg-[#1e293b]/40 backdrop-blur-md border border-white/5 rounded-2xl p-6">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Nama Lengkap Administrator</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ganti Nama Administrator (opsional)"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Username Admin</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ganti Username Admin (opsional)"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <hr className="border-white/5 my-4" />

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Password Baru</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru jika ingin diganti"
              className="w-full rounded-xl px-4 py-2.5 text-sm bg-slate-800/60 border border-white/5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1.5">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Ketik ulang password baru Anda"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white transition-all cursor-pointer"
          >
            {isLoading ? 'Memperbarui...' : 'Simpan Pengaturan'}
          </button>
        </form>
      </div>
    </div>
  );
}
