import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Check, X } from 'lucide-react';

interface Step {
  targetId: string;
  title: string;
  description: string;
  position: 'top' | 'bottom';
}

const STEPS: Step[] = [
  {
    targetId: 'tile-grid-area',
    title: '1. Tap Kotak Aplikasi (Metro Tiles)',
    description:
      'Setiap kotak membuka aplikasi langsung di tab yang sama lewat Reverse Proxy (/p/nama-app/) agar PWA iPhone tidak keluar ke Safari.',
    position: 'top',
  },
  {
    targetId: 'system-status-bar',
    title: '2. Info Port & Tailscale Otomatis',
    description:
      'Di sini tampil port aktif (otomatis 1001+ jika bentrok) serta IP LAN / Tailscale yang sedang Anda gunakan.',
    position: 'bottom',
  },
  {
    targetId: 'settings-btn',
    title: '3. Pengaturan, Preset & Mastermind',
    description:
      'Klik di sini untuk menambah app dengan preset klik-klik, edit YAML manual, atau menyalin prompt Mastermind. Anda juga bisa mengulang panduan ini kapan saja.',
    position: 'bottom',
  },
];

interface OnboardingGuideProps {
  open: boolean;
  onClose: () => void;
}

export function OnboardingGuide({ open, onClose }: OnboardingGuideProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open) return;
    setStepIdx(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const step = STEPS[stepIdx];
    const el = document.getElementById(step.targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [open, stepIdx]);

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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      {rect && (
        <div
          className="fixed border-2 border-sky-400 rounded-md pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
          }}
        />
      )}

      <div className="relative z-10 w-full max-w-md bg-[#16181d] border border-white/15 rounded-xl p-5 shadow-2xl text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sky-400 font-semibold text-sm">
            {step.position === 'bottom' ? (
              <ArrowUp className="w-5 h-5 animate-arrow" />
            ) : (
              <ArrowDown className="w-5 h-5 animate-arrow" />
            )}
            <span>Panduan Perangkat Baru ({stepIdx + 1}/{STEPS.length})</span>
          </div>
          <button
            onClick={finish}
            className="text-white/50 hover:text-white p-1"
            aria-label="Tutup panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3 className="text-lg font-bold mb-1.5">{step.title}</h3>
        <p className="text-sm text-white/75 leading-relaxed mb-5">{step.description}</p>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs text-white/50 hover:text-white underline"
          >
            Lewati
          </button>
          <div className="flex gap-2">
            {stepIdx > 0 && (
              <button
                onClick={() => setStepIdx((i) => i - 1)}
                className="px-3 py-1.5 text-xs rounded bg-white/10 hover:bg-white/20"
              >
                Kembali
              </button>
            )}
            <button
              onClick={() => (isLast ? finish() : setStepIdx((i) => i + 1))}
              className="px-4 py-1.5 text-xs font-semibold rounded bg-sky-600 hover:bg-sky-500 flex items-center gap-1.5"
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
