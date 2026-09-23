import React from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4">
      {toasts.map(toast => {
        let bg = 'bg-slate-900 text-white';
        let icon = <Info size={18} className="text-sky-400 flex-shrink-0" />;

        if (toast.tipo === 'success') {
          bg = 'bg-emerald-800 text-white shadow-emerald-950/20';
          icon = <CheckCircle2 size={18} className="text-emerald-300 flex-shrink-0" />;
        } else if (toast.tipo === 'error') {
          bg = 'bg-rose-800 text-white shadow-rose-950/20';
          icon = <AlertCircle size={18} className="text-rose-300 flex-shrink-0" />;
        } else if (toast.tipo === 'warning') {
          bg = 'bg-amber-800 text-white shadow-amber-950/20';
          icon = <AlertTriangle size={18} className="text-amber-300 flex-shrink-0" />;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl shadow-lg border border-white/10 text-sm animate-in fade-in slide-in-from-bottom-3 duration-200 ${bg}`}
          >
            {icon}
            <div className="flex-1 font-medium leading-snug break-words">
              {toast.mensaje}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};

