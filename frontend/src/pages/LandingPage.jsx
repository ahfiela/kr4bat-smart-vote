import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import logok4 from '../assets/logoK4.png'

function LandingPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(false)
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const cols = 32
  const rows = 12
  const totalTiles = cols * rows

  const tiles = useMemo(() => {
    return Array.from({ length: totalTiles }).map((_, index) => {
      const c = index % cols
      const scanDelay = c * 0.15
      const glitchPattern = Math.random() * 2.0
      const isHole = Math.random() < 0.20
      return { id: index, delay: scanDelay + glitchPattern, isHole }
    })
  }, [totalTiles, cols])

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

      <div
        className="absolute inset-x-0 top-0 grid gap-1 p-4 pointer-events-none opacity-85"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 75%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 75%)'
        }}
      >
        {tiles.map((tile) =>
          tile.isHole ? (
            <div key={tile.id} className="aspect-square bg-transparent" />
          ) : (
            <div
              key={tile.id}
              className="scan-tile aspect-square rounded-[2px]"
              style={{ animationDelay: `${tile.delay}s` }}
            />
          )
        )}
      </div>

      <div className="absolute inset-0 bg-radial-gradient from-transparent via-blue-800/5 to-blue-900/30 pointer-events-none"></div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center justify-center px-6 text-center">
        {!isLogin && (
          <div className="mb-6 flex h-20 w-20 items-center justify-center animate-fade-in">
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

            <div className="mt-4 inline-block rounded-lg bg-white/15 px-5 py-1.5 text-sm font-semibold tracking-wide border border-white/10 backdrop-blur-md">
              Masa Bakti 2026—2027
            </div>

            <p className="mt-6 w-full text-sm leading-relaxed text-blue-100/90 md:text-base font-medium px-2">
              Gunakan hak suaramu dengan bijak! Pemilihan ini dilakukan secara digital untuk menentukan pemimpin OSIS dan MPK periode selanjutnya.
            </p>

            <button
              onClick={() => setIsLogin(true)}
              className="mt-12 flex w-full items-center justify-center gap-2.5 rounded-xl bg-white py-4 px-6 text-sm font-bold text-blue-700 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <ion-icon name="log-in" style={{ fontSize: '20px' }}></ion-icon>
              <span>Masuk</span>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-md rounded-2xl bg-white p-7 text-left animate-fade-in text-slate-800 border border-slate-100">
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
                  className={`w-full rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 border transition-all font-medium focus:outline-hidden ${
                    errorMessage
                      ? 'border-red-500 bg-red-50/30 focus:border-red-500'
                      : 'border-slate-200/80 bg-slate-50 focus:border-blue-500 focus:bg-white'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 tracking-wide mb-1.5">KATA SANDI</label>
                <input
                  type="password"
                  required
                  placeholder="Masukkan kata sandi disini"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 border transition-all font-medium focus:outline-hidden ${
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
                  className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 flex items-center justify-center ${
                    isLoading
                      ? 'bg-blue-600/50 text-white cursor-not-allowed'
                      : isFormValid
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.99] cursor-pointer'
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
                  className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
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

    @keyframes waveScanner {
      0%, 100% { background-color: transparent; box-shadow: none; }
      25% { background-color: rgba(235, 240, 248, 0.16); box-shadow: 0 0 6px rgba(235, 240, 248, 0.1); }
      50%, 75% { background-color: rgba(255, 255, 255, 0.02); box-shadow: none; }
      88% { background-color: transparent; }
    }
    .scan-tile { animation: waveScanner 5.5s infinite ease-in-out; border: 1px solid rgba(255, 255, 255, 0.02); }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.97); }
      to { opacity: 1; transform: scale(1); }
    }
    .animate-fade-in { animation: fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `}</style>
)

export default LandingPage