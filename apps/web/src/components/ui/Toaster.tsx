import { create } from 'zustand';

type Tone = 'info' | 'success' | 'error';

interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

interface ToastState {
  toasts: Toast[];
  push: (message: string, tone?: Tone) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, tone = 'info') => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, message, tone }] });
    setTimeout(() => get().dismiss(id), tone === 'error' ? 8_000 : 5_000);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  info: (message: string) => useToasts.getState().push(message, 'info'),
  success: (message: string) => useToasts.getState().push(message, 'success'),
  error: (message: string) => useToasts.getState().push(message, 'error'),
};

const TONES: Record<Tone, string> = {
  info: 'border-line',
  success: 'border-success',
  error: 'border-danger',
};

/** Toast messages live in a polite live region, so screen readers announce them. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-md border-l-4 bg-surface px-4 py-3 text-sm text-ink shadow-lg ring-1 ring-line ${TONES[t.tone]}`}
        >
          <p className="flex-1">{t.message}</p>
          <button
            type="button"
            className="text-muted hover:text-ink"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
