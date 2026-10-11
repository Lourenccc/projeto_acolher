'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastApi {
  success(title: string, description?: string): void;
  error(title: string, description?: string): void;
  info(title: string, description?: string): void;
}

const ToastContext = createContext<ToastApi | null>(null);

const toneStyles: Record<ToastTone, { Icon: typeof Info; icon: string }> = {
  success: { Icon: CheckCircle2, icon: 'text-emerald-600' },
  error: { Icon: AlertCircle, icon: 'text-red-600' },
  info: { Icon: Info, icon: 'text-sky-600' },
};

let counter = 0;

/** Notificações de sucesso/erro anunciadas por leitores de tela (aria-live). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, description?: string) => {
      counter += 1;
      const id = counter;
      setItems((list) => [...list.slice(-3), { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 5000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-live="polite"
        aria-label="Notificações"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end sm:p-6"
      >
        {items.map((t) => {
          const { Icon, icon } = toneStyles[t.tone];
          return (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white p-4 shadow-lg',
                t.tone === 'error' ? 'border-red-200' : 'border-slate-200',
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', icon)} aria-hidden="true" />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-slate-900">{t.title}</p>
                {t.description && <p className="mt-0.5 text-slate-600">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dispensar notificação"
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>.');
  return ctx;
}
