'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Types ── */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

/* ── useToast hook ── */

let _id = 0;

export function useToast(duration = 3500) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const show = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++_id;
    setToast({ id, msg, type });
    const delay = type === 'error' ? 5000 : duration;
    setTimeout(() => setToast((prev) => (prev?.id === id ? null : prev)), delay);
  }, [duration]);

  const hide = useCallback(() => setToast(null), []);

  return { toast, show, hide };
}

/* ── Icons ── */

function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
  if (type === 'error') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
  if (type === 'warning') return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-500 text-white',
  error:   'bg-red-500 text-white',
  warning: 'bg-amber-500 text-white',
  info:    'bg-indigo-500 text-white',
};

/* ── Toast component ── */

interface ToastProps {
  toast: ToastItem | null;
  onClose?: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className={`fixed top-4 right-4 z-[60] flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${COLORS[toast.type]}`}
          initial={{ opacity: 0, x: 48, scale: 0.95 }}
          animate={{ opacity: 1, x: 0,  scale: 1 }}
          exit={{ opacity: 0,    x: 48, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          role="alert"
          aria-live="polite"
        >
          <span className="shrink-0 mt-0.5">
            <ToastIcon type={toast.type} />
          </span>
          <span className="leading-snug flex-1">{toast.msg}</span>
          {onClose && (
            <button
              onClick={onClose}
              className="shrink-0 opacity-70 hover:opacity-100 transition-opacity -mr-1"
              aria-label="Fermer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
