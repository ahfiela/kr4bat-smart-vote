import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';
import PasswordInput from '../../components/PasswordInput';

export default function DashboardSettingsAdmin() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  // App Settings (key-value)
  const [settings, setSettings] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [isFetchingSettings, setIsFetchingSettings] = useState(true);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [settingsError, setSettingsError] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const fetchSettings = async () => {
    setIsFetchingSettings(true);
    try {
      const res = await apiClient.get('/admin/settings');
      if (res.data.status === 'success') {
        setSettings(res.data.data);
        setDrafts(Object.fromEntries(res.data.data.map((s) => [s.id, s.value ?? ''])));
      }
    } catch (err) {
      console.error('Gagal memuat settings:', err);
    } finally {
      setIsFetchingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSetting = async (setting) => {
    setSettingsError('');
    setSettingsMessage('');
    setSavingId(setting.id);

    try {
      const res = await apiClient.put(`/admin/settings/${setting.id}`, {
        value: drafts[setting.id] ?? '',
      });

      if (res.data.status === 'success') {
        setSettings((prev) => prev.map((s) => (s.id === setting.id ? res.data.data : s)));
        setSettingsMessage(res.data.message || 'Setting berhasil diperbarui');
      }
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Gagal memperbarui setting');
    } finally {
      setSavingId(null);
    }
  };

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

      {/* App Settings (Key-Value) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Aplikasi — Data Settings</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Daftar seluruh key-value pengaturan aplikasi. Kosongkan value untuk menonaktifkan filter terkait. Untuk filter kelas Masuk Cepat, bisa beberapa kelas sekaligus — pisahkan dengan koma (contoh: <span className="font-mono">XII PPLG 2, XII TJKT 2</span>).
          </p>
        </div>

        {settingsError && (
          <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 p-2.5 rounded-xl">
            ⚠️ {settingsError}
          </div>
        )}
        {settingsMessage && (
          <div className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
            ✓ {settingsMessage}
          </div>
        )}

        {isFetchingSettings ? (
          <p className="text-xs text-slate-400 font-medium">Memuat data settings...</p>
        ) : settings.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Belum ada data settings.</p>
        ) : (
          <div className="space-y-3">
            {settings.map((s) => (
              <div key={s.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-600 break-all">{s.key}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">#{s.id}</span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={drafts[s.id] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    placeholder="(kosong = nonaktif)"
                    className="flex-1 w-full rounded-xl px-4 py-2 text-sm bg-white border border-slate-200 text-slate-800 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveSetting(s)}
                    disabled={savingId === s.id}
                    className="rounded-xl px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white transition-all cursor-pointer shrink-0"
                  >
                    {savingId === s.id ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
