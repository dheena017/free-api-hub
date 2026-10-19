import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  showToast: (title: string, message?: string, type?: ToastType) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, title, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 3500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => {
    showToast(title, message, 'success');
  }, [showToast]);

  const error = useCallback((title: string, message?: string) => {
    showToast(title, message, 'error');
  }, [showToast]);

  const info = useCallback((title: string, message?: string) => {
    showToast(title, message, 'info');
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}

      {/* Floating Toasts Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-3.5 rounded-2xl border shadow-2xl flex items-start gap-3 backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 fade-in ${
              toast.type === 'success'
                ? 'bg-surface/95 border-healthy/40 text-text-base'
                : toast.type === 'error'
                ? 'bg-surface/95 border-offline/40 text-text-base'
                : 'bg-surface/95 border-accent/40 text-text-base'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-healthy flex-shrink-0 mt-0.5" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="h-4 w-4 text-offline flex-shrink-0 mt-0.5" />
            ) : (
              <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-text-base">{toast.title}</div>
              {toast.message && (
                <div className="text-[11px] text-text-muted mt-0.5 leading-snug">{toast.message}</div>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-text-muted hover:text-text-base transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (title: string, message?: string) => console.log(title, message),
      success: (title: string, message?: string) => console.log(title, message),
      error: (title: string, message?: string) => console.error(title, message),
      info: (title: string, message?: string) => console.info(title, message)
    };
  }
  return context;
};
