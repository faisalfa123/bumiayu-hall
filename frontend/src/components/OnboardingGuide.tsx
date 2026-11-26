import { useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';

const STEPS = [
  {
    title: 'Selamat Datang di Bumiayu Hall',
    description:
      'Semua aplikasi server Anda disatukan dalam satu portal cepat. Ketuk kartu aplikasi untuk membukanya secara instan tanpa keluar dari PWA.',
  },
  {
    title: 'Sinkronisasi Otomatis Mastermind',
    description:
      'Aplikasi yang aktif di server Anda akan terdeteksi otomatis di latar belakang dan langsung muncul di dashboard.',
  },
  {
    title: 'Performa & Pengaturan',
    description:
      'Pantau kondisi CPU, RAM, Disk, dan jaringan melalui menu Performa, atau sesuaikan tampilan di Pengaturan.',
  },
];

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [stepIdx, setStepIdx] = useState(0);

  if (!open) return null;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;

  const finish = async () => {
    if (!localStorage.getItem('bumiayu_device_token')) {
      try {
        const res = await fetch('/api/device/register', { method: 'POST' });
        const data = await res.json();
        if (data.device_token) {
          localStorage.setItem('bumiayu_device_token', data.device_token);
        }
      } catch {}
    }
    localStorage.setItem('bumiayu_hall_onboarded', 'true');
    setStepIdx(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-5 animate-fade-up"
      onClick={finish}
    >
      <div
        className="w-full max-w-sm bg-[#16181d]/95 border border-white/15 rounded-2xl p-6 shadow-2xl text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sky-400 text-xs font-semibold">
            <Sparkles className="w-4 h-4" />
            <span>Panduan Singkat ({stepIdx + 1}/{STEPS.length})</span>
          </div>
          <button
            onClick={finish}
            className="text-white/50 hover:text-white p-1 transition"
            aria-label="Lewati"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-bold mb-2">{step.title}</h3>
        <p className="text-sm text-white/70 leading-relaxed mb-6">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-white/50 hover:text-white transition"
          >
            Lewati
          </button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                onClick={() => setStepIdx((i) => i - 1)}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                Kembali
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIdx((i) => i + 1))}
              className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 flex items-center gap-1.5 transition active:scale-95"
            >
              {isLast ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Mulai
                </>
              ) : (
                'Lanjut'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
