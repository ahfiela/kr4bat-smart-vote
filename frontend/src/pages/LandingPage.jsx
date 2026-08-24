import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'
import logok4 from '../assets/logoK4.png'

function LandingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const isFormValid = userId.trim() !== '' && password.trim() !== ''

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    try {
      const role = await login(userId, password)

      if (role === 'ADMIN') {
        navigate('/admin/sessions')
      } else {
        navigate('/voter/dashboard')
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Gagal terhubung ke server backend.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#2b6cb0] font-sans text-white antialiased selection:bg-white selection:text-blue-700">
      {styleTag}

      <div className="absolute inset-0 bg-radial-gradient from-transparent via-blue-800/5 to-blue-900/30 pointer-events-none"></div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        {!isLogin && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center">
            <img
              src={logok4}
              alt="Logo SMKN 4 Bogor"
              className="h-full w-full object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.25)]"
              onError={(e) => { e.target.src = "🗳️" }}
            />
          </div>
        )}

        {!isLogin ? (
          <div className="w-full flex flex-col items-center">
            <h1 className="w-full text-3xl font-extrabold tracking-wider uppercase leading-tight md:text-4xl drop-shadow-md text-center">
              Pemilihan Ketua OSIS <br /> Dan Ketua MPK
            </h1>

            <div className="mt-4 inline-block rounded-lg bg-white/15 px-5 py-1.5 text-sm font-semibold tracking-wide border border-white/10">
              Masa Bakti 2026—2027
            </div>

            <p className="mt-6 w-full text-sm leading-relaxed text-blue-100/90 md:text-base font-medium px-2">
              Gunakan hak suaramu dengan bijak! Pemilihan ini dilakukan secara digital untuk menentukan pemimpin OSIS dan MPK periode selanjutnya.
            </p>

            <button
              onClick={() => setIsLogin(true)}
              className="mt-12 flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-4 px-6 text-sm font-bold text-blue-700 cursor-pointer"
            >
              <ion-icon name="log-in" style={{ fontSize: '20px' }}></ion-icon>
              <span>Masuk</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-2xl bg-white p-7 text-left text-slate-800 border border-slate-100">
            <div className="flex flex-col items-center justify-center text-center mb-6">
              <img src={logok4} alt="Mini Logo" className="h-10 w-10 object-contain mb-2" />
              <h2 className="text-xl font-bold tracking-tight text-slate-800">Selamat Datang</h2>
              <p className="text-xs text-slate-400 mt-0.5">Silahkan Masukkan NISN/NIP/ID</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">ID PENGGUNA</label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan NISN/NIP/ID disini"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 border font-medium focus:outline-hidden ${
                    errorMessage
                      ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                      : 'border-slate-200/80 bg-slate-50 focus:border-blue-500 focus:bg-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">KATA SANDI</label>
                <PasswordInput
                  required
                  placeholder="Masukkan kata sandi disini"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 border font-medium focus:outline-hidden ${
                    errorMessage
                      ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                      : 'border-slate-200/80 bg-slate-50 focus:border-blue-500 focus:bg-white'
                  }`}
                />
              </div>

              {errorMessage && (
                <div className="text-xs text-red-600 font-bold flex items-center gap-1 mt-2">
                  <span className="text-sm">⚠️</span> {errorMessage}
                </div>
              )}

              <div className="text-center py-1">
                <p className="text-xs text-slate-500 font-medium">
                  Lupa NISN/NIP/ID? <a href="#admin" className="text-blue-600 hover:underline">Hubungi admin</a>
                </p>
              </div>

              <div className="pt-2 space-y-2.5">
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className={`w-full rounded-xl py-3 text-sm font-bold flex items-center justify-center ${
                    isLoading
                      ? 'bg-blue-600/50 text-white cursor-not-allowed'
                      : isFormValid
                        ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                        : 'bg-blue-100 text-blue-400/80 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? 'Memproses Keamanan...' : 'Masuk'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false)
                    setUserId('')
                    setPassword('')
                    setErrorMessage('')
                  }}
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-bold flex items-center justify-center gap-1 cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            </form>
          </div>
        )}

        <footer className="mt-20 text-xs tracking-wider text-blue-200/60 font-medium">
          © VoteSmartK4 SMKN 4 Bogor.
        </footer>
      </div>
    </div>
  )
}

const styleTag = (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    @import url('https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.css');

    .font-sans { font-family: 'Inter', sans-serif !important; }
  `}</style>
)

export default LandingPage