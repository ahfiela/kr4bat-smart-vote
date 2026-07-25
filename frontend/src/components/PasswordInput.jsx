import React, { useState } from 'react';

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Masukkan kata sandi',
  required = false,
  className = '',
  id,
  name,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center w-full">
      <input
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full pr-11 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
        title={showPassword ? 'Sembunyikan Kata Sandi' : 'Tampilkan Kata Sandi'}
      >
        <ion-icon
          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
          style={{ fontSize: '18px', display: 'block' }}
        ></ion-icon>
      </button>
    </div>
  );
}
