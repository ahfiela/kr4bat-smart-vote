import React, { useRef, useState } from 'react';

export default function WinnerAnnouncementBoard({ session }) {
  const cardRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!session || !session.candidates || session.candidates.length === 0) {
    return null;
  }

  // Calculate winner (candidate with maximum votes_count)
  const candidates = [...session.candidates];
  const sorted = candidates.sort((a, b) => (b.votes_count || 0) - (a.votes_count || 0));
  const winner = sorted[0];
  const totalVotes = candidates.reduce((sum, c) => sum + (c.votes_count || 0), 0);
  const winnerPercent = totalVotes > 0 ? Math.round(((winner.votes_count || 0) / totalVotes) * 100) : 0;

  // Custom function to capture card DOM and download as PNG image
  const handleDownloadBanner = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);

    try {
      // Dynamic import of html2canvas or inline canvas generator
      let html2canvas;
      try {
        const mod = await import('html2canvas');
        html2canvas = mod.default || mod;
      } catch (err) {
        // Fallback CDN if not bundled
        if (!window.html2canvas) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        html2canvas = window.html2canvas;
      }

      if (html2canvas) {
        const canvas = await html2canvas(cardRef.current, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
        });
        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `Pengumuman_Pemenang_${session.name.replace(/\s+/g, '_')}.png`;
        link.click();
      }
    } catch (err) {
      console.error('Gagal mengunduh banner pengumuman:', err);
      alert('Gagal mengekspor gambar banner. Pastikan browser mendukung ekspor canvas.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Banner Component Container to capture */}
      <div
        ref={cardRef}
        className="bg-linear-to-br from-blue-900 via-blue-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-blue-700/50"
      >
        {/* Decorative Background Elements */}
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Top Header */}
        <div className="text-center space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-sm">
            <span>🏆</span> OFFICIAL ANNOUNCEMENT <span>🏆</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-md">
            PENGUMUMAN PASLON TERPILIH
          </h2>

          <p className="text-xs sm:text-sm text-blue-200 font-medium">
            {session.name} • Periode {session.year}
          </p>
        </div>

        {/* Winner Highlight Box */}
        <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 relative z-10 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            
            {/* Paslon Number Badge */}
            <div className="w-16 h-16 rounded-2xl bg-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shrink-0">
              #{winner.candidate_number}
            </div>

            {/* Winner Names & Details */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-400/30">
                PASANGAN CALON TERPILIH
              </span>

              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug">
                {winner.name} {winner.wakil_name ? `& ${winner.wakil_name}` : ''}
              </h3>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-blue-100 font-medium">
                {winner.wakil_name && <span>👤 Ketua: <strong>{winner.name}</strong></span>}
                {winner.wakil_name && <span>👥 Wakil: <strong>{winner.wakil_name}</strong></span>}
              </div>
            </div>

            {/* Total Votes Stat Pill */}
            <div className="bg-amber-400 text-slate-950 px-5 py-3 rounded-2xl text-center shrink-0 shadow-md">
              <div className="text-2xl font-black">{winner.votes_count || 0}</div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider">Suara ({winnerPercent}%)</div>
            </div>
          </div>

          {/* Visi preview */}
          {winner.vision && (
            <div className="bg-black/20 p-4 rounded-2xl border border-white/10 text-xs text-blue-100 italic font-medium leading-relaxed">
              "<span className="font-bold text-amber-300">Visi Paslon:</span> {winner.vision}"
            </div>
          )}
        </div>

        {/* Footer info inside banner */}
        <div className="mt-6 flex justify-between items-center text-[10px] text-blue-200/80 font-medium relative z-10 border-t border-white/10 pt-4">
          <span>VoteSmartK4 • SMKN 4 BOGOR</span>
          <span>Total Suara Masuk: {totalVotes} Suara</span>
        </div>
      </div>

      {/* Export Action Button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={isExporting}
          onClick={handleDownloadBanner}
          className="rounded-2xl px-5 py-3 text-xs font-black bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 transition-all cursor-pointer shadow-md flex items-center gap-2"
        >
          <ion-icon name="download-outline" style={{ fontSize: '18px' }}></ion-icon>
          <span>{isExporting ? 'Mengompres Gambar Banner...' : 'Download Banner Pengumuman (PNG)'}</span>
        </button>
      </div>
    </div>
  );
}
