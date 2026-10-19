'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type Toast = { id: number; message: string; kind: 'success' | 'error' };
type Confirm = { message: string; confirmLabel: string; resolve: (ok: boolean) => void };

const ToastContext = createContext<(message: string, kind?: Toast['kind']) => void>(() => {});
const ConfirmContext = createContext<(message: string, confirmLabel?: string) => Promise<boolean>>(
  async () => false,
);

export const useToast = () => useContext(ToastContext);
export const useConfirm = () => useContext(ConfirmContext);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pending, setPending] = useState<Confirm | null>(null);
  const nextId = useRef(0);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'success') => {
    const id = ++nextId.current;
    setToasts((t) => [...t, { id, message, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const confirm = useCallback(
    (message: string, confirmLabel = 'Delete') =>
      new Promise<boolean>((resolve) => setPending({ message, confirmLabel, resolve })),
    [],
  );

  const answer = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  return (
    <ToastContext.Provider value={toast}>
      <ConfirmContext.Provider value={confirm}>
        {children}
        <div aria-live="polite" className="fixed right-4 bottom-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex max-w-sm items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg"
            >
              {t.kind === 'success' ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
              )}
              {t.message}
            </div>
          ))}
        </div>
        {pending && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4"
            role="alertdialog"
            aria-modal="true"
          >
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
              <p className="text-sm text-slate-700">{pending.message}</p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  autoFocus
                  className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium hover:bg-slate-50"
                  onClick={() => answer(false)}
                >
                  Cancel
                </button>
                <button
                  className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-red-700"
                  onClick={() => answer(true)}
                >
                  {pending.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}
