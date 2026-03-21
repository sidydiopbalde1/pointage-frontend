'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Attendance } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

/* ---------- Error helpers ---------- */
const VALIDATION_MESSAGES: Record<string, string> = {
  'latitude must not be greater than 90':                         'La latitude doit être ≤ 90°',
  'latitude must not be less than -90':                           'La latitude doit être ≥ -90°',
  'latitude must be a number conforming to the specified constraints': 'La latitude doit être un nombre valide',
  'longitude must not be greater than 180':                       'La longitude doit être ≤ 180°',
  'longitude must not be less than -180':                         'La longitude doit être ≥ -180°',
  'longitude must be a number conforming to the specified constraints': 'La longitude doit être un nombre valide',
};
// add for deploy
function parseApiError(e: unknown, fallback = 'Une erreur est survenue'): string {
  const data = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (!data?.message) return fallback;
  const { message } = data;
  if (Array.isArray(message)) {
    const mapped = message.map((m) => VALIDATION_MESSAGES[m] ?? m);
    // Deduplicate (e.g. lat/lon can produce 2 similar msgs)
    return [...new Set(mapped)].join(' • ');
  }
  return VALIDATION_MESSAGES[message] ?? message;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ isFrontend: true, message: 'La géolocalisation n\'est pas supportée par votre navigateur.' });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const msgs: Record<number, string> = {
        1: 'Accès à la localisation refusé. Veuillez autoriser la géolocalisation dans votre navigateur.',
        2: 'Position GPS indisponible.',
        3: 'Délai de géolocalisation dépassé. Réessayez.',
      };
      reject({ isFrontend: true, message: msgs[err.code] ?? 'Erreur GPS.' });
    }, { timeout: 10000, maximumAge: 30000 });
  });
}

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-700',
  LATE: 'bg-amber-100 text-amber-700',
  HALF_DAY: 'bg-blue-100 text-blue-700',
};
const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent',
  LATE: 'En retard',
  HALF_DAY: 'Mi-temps',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/* ---------- Backend validation message → field name ---------- */
const BACKEND_FIELD_MAP: Record<string, keyof typeof EMPTY_FORM> = {
  'userId should not be empty':    'userId',
  'userId must be a string':       'userId',
  'date should not be empty':      'date',
  'date must be a string':         'date',
  'checkIn should not be empty':   'checkIn',
  'checkIn must be a string':      'checkIn',
};

const EMPTY_FORM = { userId: '', date: '', checkIn: '', checkOut: '', note: '' };

export default function AttendancePage() {
  const qc = useQueryClient();
  const { isManager, user } = useAuth();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});
  const [filterDate, setFilterDate] = useState('');

  const clearFieldError = (field: keyof typeof EMPTY_FORM) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const validateManualForm = (): boolean => {
    const errs: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
    if (!manualForm.userId.trim()) errs.userId = "L'ID employé est requis.";
    if (!manualForm.date)          errs.date    = 'La date est requise.';
    if (!manualForm.checkIn)       errs.checkIn = "L'heure d'entrée est requise.";
    if (manualForm.checkOut && manualForm.checkIn && manualForm.checkOut <= manualForm.checkIn)
      errs.checkOut = "L'heure de sortie doit être après l'entrée.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    // Longer display for error messages (they tend to be more verbose)
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3500);
  };

  /* ---------- Check-in / Check-out ---------- */
  const checkInMut = useMutation({
    mutationFn: async () => {
      let latitude: number;
      let longitude: number;
      try {
        const pos = await getPosition();
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch (gpsErr) {
        throw gpsErr;
      }
      return api.post('/attendance/check-in', { type: 'MANUAL', latitude, longitude });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      showToast('Pointage d\'entrée enregistré !', 'success');
    },
    onError: (e: unknown) => {
      if ((e as { isFrontend?: boolean })?.isFrontend) {
        showToast((e as { message: string }).message, 'error');
        return;
      }
      showToast(parseApiError(e, 'Erreur lors du pointage d\'entrée'), 'error');
    },
  });

  const checkOutMut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
      showToast('Pointage de sortie enregistré !', 'success');
    },
    onError: (e: unknown) => {
      showToast(parseApiError(e, 'Erreur lors du pointage de sortie'), 'error');
    },
  });

  const manualMut = useMutation({
    mutationFn: (data: typeof manualForm) => api.post('/attendance/manual', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-attendance'] });
      setShowManualModal(false);
      setManualForm({ ...EMPTY_FORM });
      setFieldErrors({});
      showToast('Pointage manuel enregistré', 'success');
    },
    onError: (e: unknown) => {
      const raw = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      // Try to map backend validation errors to specific fields
      if (Array.isArray(raw)) {
        const mapped: Partial<Record<keyof typeof EMPTY_FORM, string>> = {};
        const unmapped: string[] = [];
        raw.forEach((msg) => {
          const field = BACKEND_FIELD_MAP[msg];
          if (field) mapped[field] = VALIDATION_MESSAGES[msg] ?? msg;
          else unmapped.push(VALIDATION_MESSAGES[msg] ?? msg);
        });
        if (Object.keys(mapped).length) setFieldErrors((prev) => ({ ...prev, ...mapped }));
        if (unmapped.length) showToast([...new Set(unmapped)].join(' • '), 'error');
      } else {
        showToast(parseApiError(e, 'Erreur lors du pointage manuel'), 'error');
      }
    },
  });

  /* ---------- Data ---------- */
  const { data: myAttendance, isLoading: myLoading } = useQuery<Attendance[]>({
    queryKey: ['my-attendance'],
    queryFn: () => api.get('/attendance/my').then((r) => r.data),
    enabled: !isManager,
  });

  const params = new URLSearchParams();
  if (filterDate) params.set('date', filterDate);

  const { data: allAttendance, isLoading: allLoading } = useQuery<Attendance[]>({
    queryKey: ['all-attendance', filterDate],
    queryFn: () => api.get(`/attendance?${params.toString()}`).then((r) => r.data),
    enabled: isManager,
  });

  const attendance = isManager ? allAttendance : myAttendance;
  const loading = isManager ? allLoading : myLoading;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right max-w-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
          <span className="shrink-0 mt-0.5">
            {toast.type === 'success' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            )}
          </span>
          <span className="leading-snug">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pointages</h1>
          <p className="text-slate-500 text-sm mt-0.5">Historique des présences</p>
        </div>
        <div className="flex items-center gap-2">
          {!isManager && (
            <>
              <button
                onClick={() => checkInMut.mutate()}
                disabled={checkInMut.isPending}
                className="btn-primary"
              >
                {checkInMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                  </svg>
                )}
                Entrée
              </button>
              <button
                onClick={() => checkOutMut.mutate()}
                disabled={checkOutMut.isPending}
                className="btn-secondary"
              >
                {checkOutMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-indigo-600 animate-spin" /> : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
                  </svg>
                )}
                Sortie
              </button>
            </>
          )}
          {isManager && (
            <button onClick={() => { setShowManualModal(true); setFieldErrors({}); }} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Pointage manuel
            </button>
          )}
        </div>
      </div>

      {/* Quick actions for employee */}
      {!isManager && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-5 text-white animate-slide-up animate-delay-100">
            <p className="text-indigo-100 text-xs font-medium mb-1">Pointage du jour</p>
            <p className="text-2xl font-bold">{new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
            <p className="text-indigo-100 text-xs mt-1">{new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm animate-slide-up animate-delay-200">
            <p className="text-slate-500 text-xs font-medium mb-1">Jours présents ce mois</p>
            <p className="text-2xl font-bold text-slate-800">
              {myAttendance?.filter(a => {
                const d = new Date(a.date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length ?? '—'}
            </p>
          </div>
        </div>
      )}

      {/* Filter (manager) */}
      {isManager && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex items-center gap-3 animate-slide-up animate-delay-100">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
          </svg>
          <label className="text-sm text-slate-600 font-medium">Date :</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="input-field w-auto"
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-600 text-xs underline">
              Effacer
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-slide-up animate-delay-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {isManager && <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employé</th>}
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrée</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sortie</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {isManager && <td className="px-5 py-4"><Skeleton className="h-4 w-28" /></td>}
                    <td className="px-5 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  </tr>
                ))
              ) : !attendance?.length ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="px-5 py-12 text-center text-slate-400 text-sm">
                    Aucun pointage trouvé
                  </td>
                </tr>
              ) : (
                attendance.map((a, i) => (
                  <tr
                    key={a.id}
                    className="table-row-hover animate-fade-in"
                    style={{ animationDelay: `${i * 0.03}s` }}
                  >
                    {isManager && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {a.user?.firstName?.[0]}{a.user?.lastName?.[0]}
                          </div>
                          <span className="text-sm text-slate-700">{a.user?.firstName} {a.user?.lastName}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-sm text-slate-600">
                      {new Date(a.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">
                      {a.checkIn ? a.checkIn.slice(11, 16) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">
                      {a.checkOut ? a.checkOut.slice(11, 16) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge bg-slate-100 text-slate-600">
                        {a.type === 'QR_CODE' ? 'QR Code' : 'Manuel'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${STATUS_COLORS[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                        {STATUS_LABELS[a.status] ?? a.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual modal */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => { setShowManualModal(false); setFieldErrors({}); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Pointage manuel</h2>
              <button onClick={() => { setShowManualModal(false); setFieldErrors({}); }} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); if (validateManualForm()) manualMut.mutate(manualForm); }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">ID Employé</label>
                <input
                  className={`input-field ${fieldErrors.userId ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                  placeholder="ID de l'employé"
                  value={manualForm.userId}
                  onChange={(e) => { setManualForm(f => ({ ...f, userId: e.target.value })); clearFieldError('userId'); }}
                />
                {fieldErrors.userId && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>{fieldErrors.userId}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  className={`input-field ${fieldErrors.date ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                  value={manualForm.date}
                  onChange={(e) => { setManualForm(f => ({ ...f, date: e.target.value })); clearFieldError('date'); }}
                />
                {fieldErrors.date && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>{fieldErrors.date}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure d'entrée</label>
                  <input
                    type="time"
                    className={`input-field ${fieldErrors.checkIn ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                    value={manualForm.checkIn}
                    onChange={(e) => { setManualForm(f => ({ ...f, checkIn: e.target.value })); clearFieldError('checkIn'); }}
                  />
                  {fieldErrors.checkIn && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>{fieldErrors.checkIn}</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure de sortie</label>
                  <input
                    type="time"
                    className={`input-field ${fieldErrors.checkOut ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                    value={manualForm.checkOut}
                    onChange={(e) => { setManualForm(f => ({ ...f, checkOut: e.target.value })); clearFieldError('checkOut'); }}
                  />
                  {fieldErrors.checkOut && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>{fieldErrors.checkOut}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note (optionnel)</label>
                <textarea
                  rows={2}
                  className="input-field resize-none"
                  placeholder="Raison du pointage manuel…"
                  value={manualForm.note}
                  onChange={(e) => setManualForm(f => ({ ...f, note: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowManualModal(false); setFieldErrors({}); }} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={manualMut.isPending}>
                  {manualMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
