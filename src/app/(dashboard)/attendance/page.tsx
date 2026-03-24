'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Attendance, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from '@/components/ui/Motion';

/* ---------- Error helpers ---------- */
const VALIDATION_MESSAGES: Record<string, string> = {
  'latitude must not be greater than 90':                         'La latitude doit être ≤ 90°',
  'latitude must not be less than -90':                           'La latitude doit être ≥ -90°',
  'latitude must be a number conforming to the specified constraints': 'La latitude doit être un nombre valide',
  'longitude must not be greater than 180':                       'La longitude doit être ≤ 180°',
  'longitude must not be less than -180':                         'La longitude doit être ≥ -180°',
  'longitude must be a number conforming to the specified constraints': 'La longitude doit être un nombre valide',
};

function parseApiError(e: unknown, fallback = 'Une erreur est survenue'): string {
  const data = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (!data?.message) return fallback;
  const { message } = data;
  if (Array.isArray(message)) {
    const mapped = message.map((m) => VALIDATION_MESSAGES[m] ?? m);
    return [...new Set(mapped)].join(' • ');
  }
  return VALIDATION_MESSAGES[message] ?? message;
}

function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({ isFrontend: true, message: "La géolocalisation n'est pas supportée par votre navigateur." });
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

/* ---------- Form state (no userId — handled separately) ---------- */
const EMPTY_FORM = { date: '', checkIn: '', checkOut: '', note: '' };
type FormFields = typeof EMPTY_FORM;
type FieldErrorMap = Partial<Record<keyof FormFields | 'userIds', string>>;

export default function AttendancePage() {
  const qc = useQueryClient();
  const { isManager, user } = useAuth();

  /* UI state */
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showManualModal, setShowManualModal] = useState(false);

  /* Form state */
  const [manualForm, setManualForm] = useState({ ...EMPTY_FORM });
  const [fieldErrors, setFieldErrors] = useState<FieldErrorMap>({});

  /* Multi-user picker state */
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');

  /* Filter state */
  const [filterDate, setFilterDate] = useState('');
  const [filterUserId, setFilterUserId] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');

  /* ── Helpers ── */
  const clearFieldError = (field: keyof FieldErrorMap) =>
    setFieldErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'error' ? 5000 : 3500);
  };

  const closeModal = () => {
    setShowManualModal(false);
    setManualForm({ ...EMPTY_FORM });
    setSelectedUserIds([]);
    setUserSearch('');
    setFieldErrors({});
  };

  const toggleUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    clearFieldError('userIds');
  };

  const validateManualForm = (): boolean => {
    const errs: FieldErrorMap = {};
    if (selectedUserIds.length === 0) errs.userIds = 'Sélectionnez au moins un employé.';
    if (!manualForm.date)   errs.date    = 'La date est requise.';
    if (!manualForm.checkIn) errs.checkIn = "L'heure d'entrée est requise.";
    if (manualForm.checkOut && manualForm.checkIn && manualForm.checkOut <= manualForm.checkIn)
      errs.checkOut = "L'heure de sortie doit être après l'entrée.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Queries ── */
  const { data: allUsers, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users').then((r) => r.data),
    enabled: isManager && showManualModal,
  });

  const filteredUsers = allUsers?.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.department ?? ''}`.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const { data: myAttendance, isLoading: myLoading } = useQuery<Attendance[]>({
    queryKey: ['my-attendance'],
    queryFn: () => api.get('/attendance/my').then((r) => r.data),
    enabled: !isManager,
  });

  const params = new URLSearchParams();
  if (filterDate) { params.set('startDate', filterDate); params.set('endDate', filterDate); }
  if (filterUserId.trim()) params.set('userId', filterUserId.trim());
  if (filterDepartment.trim()) params.set('department', filterDepartment.trim());

  const { data: allAttendance, isLoading: allLoading } = useQuery<Attendance[]>({
    queryKey: ['all-attendance', filterDate, filterUserId, filterDepartment],
    queryFn: () => api.get(`/attendance?${params.toString()}`).then((r) => r.data),
    enabled: isManager,
  });

  const attendance = isManager ? allAttendance : myAttendance;
  const loading = isManager ? allLoading : myLoading;

  /* ── Check-in / Check-out ── */
  const checkInMut = useMutation({
    mutationFn: async () => {
      const pos = await getPosition();
      return api.post('/attendance/check-in', { type: 'MANUAL', latitude: pos.coords.latitude, longitude: pos.coords.longitude });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-attendance'] }); showToast("Pointage d'entrée enregistré !", 'success'); },
    onError: (e: unknown) => {
      if ((e as { isFrontend?: boolean })?.isFrontend) { showToast((e as { message: string }).message, 'error'); return; }
      showToast(parseApiError(e, "Erreur lors du pointage d'entrée"), 'error');
    },
  });

  const checkOutMut = useMutation({
    mutationFn: () => api.post('/attendance/check-out'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-attendance'] }); showToast('Pointage de sortie enregistré !', 'success'); },
    onError: (e: unknown) => { showToast(parseApiError(e, 'Erreur lors du pointage de sortie'), 'error'); },
  });

  /* ── Manual multi-user mutation ── */
  const manualMut = useMutation({
    mutationFn: async () => {
      // Backend expects full ISO datetime strings for checkIn/checkOut.
      // <input type="time"> gives "HH:MM" and <input type="date"> gives "YYYY-MM-DD",
      // so we combine them: "YYYY-MM-DDTHH:MM:00"
      const toISO = (date: string, time: string) => `${date}T${time}:00`;

      const payload = {
        date: manualForm.date,
        checkIn: toISO(manualForm.date, manualForm.checkIn),
        ...(manualForm.checkOut ? { checkOut: toISO(manualForm.date, manualForm.checkOut) } : {}),
        ...(manualForm.note.trim() ? { note: manualForm.note.trim() } : {}),
      };
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) => api.post('/attendance/manual', { userId, ...payload })),
      );
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0 && failed === results.length) throw new Error('Tous les pointages ont échoué.');
      return { total: results.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      qc.invalidateQueries({ queryKey: ['all-attendance'] });
      const ok = total - failed;
      if (failed > 0) {
        showToast(`${ok} pointage(s) enregistré(s), ${failed} en échec.`, 'error');
      } else {
        showToast(`${ok} pointage${ok > 1 ? 's' : ''} enregistré${ok > 1 ? 's' : ''} avec succès !`, 'success');
      }
      closeModal();
    },
    onError: (e: unknown) => {
      showToast((e as Error).message || 'Erreur lors du pointage manuel', 'error');
    },
  });

  /* ── Get selected user objects (for chips display) ── */
  const selectedUsers = allUsers?.filter((u) => selectedUserIds.includes(u.id)) ?? [];

  /* ============================================================ */
  return (
    <div className="max-w-6xl mx-auto">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className={`fixed top-4 right-4 z-50 flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
            initial={{ opacity: 0, x: 40, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.95 }}
            transition={{ duration: 0.25 }}
          >
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pointages</h1>
          <p className="text-slate-500 text-sm mt-0.5">Historique des présences</p>
        </div>
        <div className="flex items-center gap-2">
          {!isManager && (
            <>
              <button onClick={() => checkInMut.mutate()} disabled={checkInMut.isPending} className="btn-primary">
                {checkInMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" /></svg>}
                Entrée
              </button>
              <button onClick={() => checkOutMut.mutate()} disabled={checkOutMut.isPending} className="btn-secondary">
                {checkOutMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-indigo-400 border-t-indigo-600 animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" /></svg>}
                Sortie
              </button>
            </>
          )}
          {isManager && (
            <button
              onClick={() => { setShowManualModal(true); setFieldErrors({}); }}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Pointage manuel
            </button>
          )}
        </div>
      </div>

      {/* Quick actions (employee) */}
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
              {myAttendance?.filter((a) => {
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
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 animate-slide-up animate-delay-100">
          <div className="flex flex-wrap items-center gap-3">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
            </svg>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Date :</label>
              <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="input-field w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">Département :</label>
              <input type="text" placeholder="ex: Informatique" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="input-field w-40" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 font-medium whitespace-nowrap">ID employé :</label>
              <input type="text" placeholder="ID…" value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className="input-field w-36" />
            </div>
            {(filterDate || filterUserId || filterDepartment) && (
              <button onClick={() => { setFilterDate(''); setFilterUserId(''); setFilterDepartment(''); }} className="text-slate-400 hover:text-slate-600 text-xs underline ml-auto">
                Effacer tout
              </button>
            )}
          </div>
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
                  <tr key={a.id} className="table-row-hover animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
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
                    <td className="px-5 py-3.5 text-sm text-slate-600">{new Date(a.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{a.checkIn ? a.checkIn.slice(11, 16) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-600 font-mono">{a.checkOut ? a.checkOut.slice(11, 16) : <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5">
                      <span className="badge bg-slate-100 text-slate-600">{a.type === 'QR_CODE' ? 'QR Code' : 'Manuel'}</span>
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

      {/* ── Manual attendance modal ── */}
      <AnimatePresence>
        {showManualModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeModal}
          >
            <motion.div
              className="modal-content w-full"
              style={{ maxWidth: 560 }}
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">Pointage manuel</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Sélectionnez un ou plusieurs employés</p>
                </div>
                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form
                onSubmit={(e) => { e.preventDefault(); if (validateManualForm()) manualMut.mutate(); }}
                className="flex flex-col gap-4"
              >

                {/* ── User picker ── */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Employés
                    {selectedUserIds.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500 text-white text-xs font-bold">
                        {selectedUserIds.length}
                      </span>
                    )}
                  </label>

                  {/* Selected chips */}
                  <AnimatePresence>
                    {selectedUsers.length > 0 && (
                      <motion.div
                        className="flex flex-wrap gap-1.5 mb-2"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {selectedUsers.map((u) => (
                          <motion.span
                            key={u.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            {u.firstName} {u.lastName}
                            <button
                              type="button"
                              onClick={() => toggleUser(u.id)}
                              className="text-indigo-400 hover:text-indigo-600 ml-0.5"
                              aria-label={`Retirer ${u.firstName}`}
                            >
                              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                              </svg>
                            </button>
                          </motion.span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setSelectedUserIds([])}
                          className="text-xs text-slate-400 hover:text-red-500 px-2 py-1 transition-colors"
                        >
                          Tout effacer
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Search box */}
                  <div className="relative mb-1.5">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Rechercher un employé…"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="input-field pl-9 text-sm"
                    />
                  </div>

                  {/* User list */}
                  <div
                    className={`rounded-xl border overflow-y-auto transition-colors ${
                      fieldErrors.userIds ? 'border-red-300' : 'border-slate-200'
                    }`}
                    style={{ maxHeight: 200 }}
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label="Liste des employés"
                  >
                    {usersLoading ? (
                      <div className="p-4 flex flex-col gap-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <Skeleton className="w-7 h-7 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                          </div>
                        ))}
                      </div>
                    ) : !filteredUsers?.length ? (
                      <div className="p-4 text-center text-slate-400 text-sm">
                        {userSearch ? 'Aucun résultat' : 'Aucun employé trouvé'}
                      </div>
                    ) : (
                      <div>
                        {/* Select all / deselect all */}
                        {filteredUsers && filteredUsers.length > 1 && (
                          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 bg-slate-50">
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = filteredUsers.map((u) => u.id);
                                const allSelected = allIds.every((id) => selectedUserIds.includes(id));
                                if (allSelected) {
                                  setSelectedUserIds((prev) => prev.filter((id) => !allIds.includes(id)));
                                } else {
                                  setSelectedUserIds((prev) => [...new Set([...prev, ...allIds])]);
                                }
                                clearFieldError('userIds');
                              }}
                              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                            >
                              {filteredUsers.every((u) => selectedUserIds.includes(u.id))
                                ? <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                    Désélectionner tout
                                  </>
                                : <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                    </svg>
                                    Tout sélectionner ({filteredUsers.length})
                                  </>
                              }
                            </button>
                          </div>
                        )}
                        {filteredUsers.map((u) => {
                          const checked = selectedUserIds.includes(u.id);
                          return (
                            <button
                              key={u.id}
                              type="button"
                              role="option"
                              aria-selected={checked}
                              onClick={() => toggleUser(u.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-indigo-50 ${
                                checked ? 'bg-indigo-50/60' : ''
                              }`}
                            >
                              {/* Avatar */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                                checked
                                  ? 'bg-indigo-500 text-white'
                                  : 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                              }`}>
                                {checked ? (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                ) : (
                                  <>{u.firstName[0]}{u.lastName[0]}</>
                                )}
                              </div>

                              {/* Name + dept */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate ${checked ? 'text-indigo-700' : 'text-slate-700'}`}>
                                  {u.firstName} {u.lastName}
                                </p>
                                {u.department && (
                                  <p className="text-xs text-slate-400 truncate">{u.department}</p>
                                )}
                              </div>

                              {/* Checkbox indicator */}
                              <div className={`w-4.5 h-4.5 rounded flex items-center justify-center border-1.5 shrink-0 transition-all ${
                                checked
                                  ? 'bg-indigo-500 border-indigo-500'
                                  : 'border-slate-300 bg-white'
                              }`}>
                                {checked && (
                                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <FieldError msg={fieldErrors.userIds} />
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                  <input
                    type="date"
                    className={`input-field ${fieldErrors.date ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                    value={manualForm.date}
                    onChange={(e) => { setManualForm((f) => ({ ...f, date: e.target.value })); clearFieldError('date'); }}
                  />
                  <FieldError msg={fieldErrors.date} />
                </div>

                {/* Check-in / Check-out */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure d'entrée</label>
                    <input
                      type="time"
                      className={`input-field ${fieldErrors.checkIn ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                      value={manualForm.checkIn}
                      onChange={(e) => { setManualForm((f) => ({ ...f, checkIn: e.target.value })); clearFieldError('checkIn'); }}
                    />
                    <FieldError msg={fieldErrors.checkIn} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Heure de sortie</label>
                    <input
                      type="time"
                      className={`input-field ${fieldErrors.checkOut ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]' : ''}`}
                      value={manualForm.checkOut}
                      onChange={(e) => { setManualForm((f) => ({ ...f, checkOut: e.target.value })); clearFieldError('checkOut'); }}
                    />
                    <FieldError msg={fieldErrors.checkOut} />
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Note (optionnel)</label>
                  <textarea
                    rows={2}
                    className="input-field resize-none"
                    placeholder="Raison du pointage manuel…"
                    value={manualForm.note}
                    onChange={(e) => setManualForm((f) => ({ ...f, note: e.target.value }))}
                  />
                </div>

                {/* Summary badge */}
                <AnimatePresence>
                  {selectedUserIds.length > 1 && (
                    <motion.div
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg className="w-4 h-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span>
                        <strong>{selectedUserIds.length} employés</strong> seront pointés simultanément.
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    Annuler
                  </button>
                  <motion.button
                    type="submit"
                    className="btn-primary flex-1 justify-center"
                    disabled={manualMut.isPending}
                    whileHover={!manualMut.isPending ? { scale: 1.02 } : {}}
                    whileTap={!manualMut.isPending ? { scale: 0.97 } : {}}
                    transition={{ duration: 0.15 }}
                  >
                    {manualMut.isPending ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Enregistrement…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        Enregistrer{selectedUserIds.length > 1 ? ` (${selectedUserIds.length})` : ''}
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
