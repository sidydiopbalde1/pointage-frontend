'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { QrCode } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export default function QrCodePage() {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const scannerRef = useRef<HTMLDivElement>(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerInstanceRef = useRef<any>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: qrCode, isLoading } = useQuery<QrCode>({
    queryKey: ['my-qr'],
    queryFn: () => api.get('/qr-code/my').then((r) => r.data),
    enabled: !isAdmin,
  });

  const regenMut = useMutation({
    mutationFn: () => api.patch('/qr-code/my/regenerate'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-qr'] }); showToast('QR Code régénéré !', 'success'); },
    onError: () => showToast('Erreur lors de la régénération', 'error'),
  });

  const scanMut = useMutation({
    mutationFn: (token: string) => api.post(`/attendance/scan/${token}`),
    onSuccess: (res) => {
      showToast(res.data?.message ?? 'Pointage enregistré !', 'success');
      setScanResult(res.data?.message ?? 'OK');
      stopScanner();
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(msg, 'error');
      stopScanner();
    },
  });

  const stopScanner = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().catch(() => {});
      scannerInstanceRef.current = null;
    }
    setScannerActive(false);
  };

  const startScanner = async () => {
    setScanResult(null);
    setScannerActive(true);
    // Dynamically import html5-qrcode only on client
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-scanner');
    scannerInstanceRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          // QR codes may encode a full URL like http://host/api/scan/<token>
          // Extract only the token (last path segment)
          let token = decodedText.trim();
          try {
            const url = new URL(token);
            token = url.pathname.split('/').filter(Boolean).pop() ?? token;
          } catch {
            // Not a URL — use as-is
          }
          scanMut.mutate(token);
        },
        () => {},
      );
    } catch {
      showToast('Impossible d\'accéder à la caméra', 'error');
      setScannerActive(false);
    }
  };

  useEffect(() => {
    return () => { stopScanner(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadQr = () => {
    if (!qrCode?.dataUrl) return;
    const a = document.createElement('a');
    a.href = qrCode.dataUrl;
    a.download = `qrcode-${user?.firstName}-${user?.lastName}.png`;
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.type === 'success'
            ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          }
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">Mon QR Code</h1>
        <p className="text-slate-500 text-sm mt-0.5">Utilisez votre QR Code pour pointer votre présence</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR Code display */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center animate-scale-in">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            </svg>
          </div>

          {isLoading ? (
            <div className="w-48 h-48 skeleton mb-4" />
          ) : qrCode?.dataUrl ? (
            <div className="p-3 border-2 border-slate-100 rounded-xl mb-4 animate-scale-in">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode.dataUrl}
                alt="QR Code de pointage"
                className="w-44 h-44"
              />
            </div>
          ) : (
            <div className="w-48 h-48 bg-slate-50 rounded-xl flex items-center justify-center mb-4">
              <p className="text-slate-400 text-sm text-center px-4">QR Code non disponible</p>
            </div>
          )}

          <p className="text-sm font-semibold text-slate-700 mb-0.5">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-xs text-slate-400 mb-4">{user?.department ?? user?.position}</p>

          {qrCode?.updatedAt && (
            <p className="text-xs text-slate-400 mb-4">
              Généré le {new Date(qrCode.updatedAt).toLocaleDateString('fr-FR')}
            </p>
          )}

          <div className="flex gap-2 w-full">
            {qrCode?.dataUrl && (
              <button onClick={downloadQr} className="btn-secondary flex-1 justify-center text-xs py-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Télécharger
              </button>
            )}
            <button
              onClick={() => regenMut.mutate()}
              disabled={regenMut.isPending}
              className="btn-primary flex-1 justify-center text-xs py-2"
            >
              {regenMut.isPending ? (
                <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              Régénérer
            </button>
          </div>
        </div>

        {/* Scanner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col animate-scale-in animate-delay-100">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
            </svg>
          </div>

          <h3 className="font-semibold text-slate-800 mb-1">Scanner un QR Code</h3>
          <p className="text-slate-400 text-xs mb-4">
            Pointez votre caméra sur le QR Code d'un employé pour enregistrer son pointage.
          </p>

          {/* Scanner area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              id="qr-scanner"
              ref={scannerRef}
              className={`w-full rounded-xl overflow-hidden transition-all ${scannerActive ? 'min-h-[240px]' : 'hidden'}`}
            />

            {!scannerActive && !scanResult && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-24 h-24 rounded-2xl border-4 border-dashed border-slate-200 flex items-center justify-center mb-4 animate-float">
                  <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                  </svg>
                </div>
                <p className="text-slate-400 text-sm text-center">
                  Activez la caméra pour scanner
                </p>
              </div>
            )}

            {scanResult && (
              <div className="flex flex-col items-center py-6 animate-scale-in">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-emerald-700 font-semibold text-sm">{scanResult}</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            {!scannerActive ? (
              <button onClick={startScanner} className="btn-primary w-full justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                </svg>
                Activer la caméra
              </button>
            ) : (
              <button onClick={stopScanner} className="btn-danger w-full justify-center">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
                </svg>
                Arrêter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-indigo-50 rounded-2xl p-5 animate-slide-up animate-delay-300">
        <h3 className="font-semibold text-indigo-800 text-sm mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
          </svg>
          Comment utiliser votre QR Code ?
        </h3>
        <ul className="space-y-1.5 text-sm text-indigo-700">
          {[
            'Affichez votre QR Code à la borne de pointage ou à votre responsable.',
            'Votre première scan du jour = entrée, le second = sortie.',
            'Si le QR Code ne fonctionne plus, cliquez sur "Régénérer".',
            'Vous pouvez télécharger votre QR Code pour l\'imprimer.',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-0.5 w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 text-xs flex items-center justify-center shrink-0 font-semibold">
                {i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
