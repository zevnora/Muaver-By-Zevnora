import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  message?: string;
  isDeleting: boolean;
  errorMessage?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  message,
  isDeleting,
  errorMessage,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-montserrat">
      <div 
        className="w-full max-w-md bg-[#081438] border-2 border-rose-500/40 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-dialog-title" className="font-heading text-lg font-bold text-white">
                {title}
              </h3>
              <span className="text-[10px] uppercase tracking-wider text-rose-300 font-semibold">
                Permanent Action
              </span>
            </div>
          </div>

          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 text-xs text-white/70 leading-relaxed">
          <p>
            Are you sure you want to permanently delete{' '}
            <strong className="text-white font-semibold font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
              {itemName}
            </strong>
            ?
          </p>
          <p className="text-[11px] text-white/50">
            {message || 'This action cannot be undone. Associated data and storage assets will be purged.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:bg-white/5 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-950/50 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
