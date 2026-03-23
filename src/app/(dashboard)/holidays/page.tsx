'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { PublicHoliday } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function HolidaysPage() {
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editHoliday, setEditHoliday] = useState<PublicHoliday | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PublicHoliday | null>(null);
  const [form, setForm] = useState({ date: '', name: '' });

  if (user && user.role !== 'ADMIN') {
    router.replace('/dashboard');
    return null;
  }

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: holidays, isLoading } = useQuery<PublicHoliday[]>({
    queryKey: ['holidays', year],
    queryFn: () => api.get(`/holidays?year=${year}`).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: { date: string; name: string }) => api.post('/holidays', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      setShowCreate(false);
      setForm({ date: '', name: '' });
      showToast('Jour férié ajouté', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch(`/holidays/${id}`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      setEditHoliday(null);
      showToast('Jour férié mis à jour', 'success');
    },
    onError: () => showToast('Erreur lors de la mise à jour', 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/holidays/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      setDeleteTarget(null);
      showToast('Jour férié supprimé', 'success');
    },
    onError: () => showToast('Erreur lors de la suppression', 'error'),
  });

  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
  ];

  // Grouper par mois
  const byMonth: Record<number, PublicHoliday[]> = {};
  holidays?.forEach((h) => {
    const m = new Date(h.date).getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  });

  return (
    <div className="max-w-4xl mx-auto">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jours fériés</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gérez les jours non ouvrables</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter
        </button>
      </div>

      {/* Year selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex items-center gap-3 animate-slide-up animate-delay-100">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="font-bold text-slate-800 text-lg w-14 text-center">{year}</span>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
        <span className="ml-2 text-sm text-slate-500">
          {holidays?.length ?? 0} jour{(holidays?.length ?? 0) > 1 ? 's' : ''} férié{(holidays?.length ?? 0) > 1 ? 's' : ''}
        </span>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-5 w-40" />
            </div>
          ))}
        </div>
      ) : !holidays?.length ? (
        <div className="py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">Aucun jour férié pour {year}</p>
          <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-600 text-sm font-medium hover:underline">
            Ajouter le premier
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 animate-slide-up animate-delay-200">
          {Object.entries(byMonth)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([monthIdx, items]) => (
              <div key={monthIdx}>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
                  {months[Number(monthIdx)]}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items.map((h, i) => (
                    <div
                      key={h.id}
                      className="bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm flex items-center gap-4 card-hover animate-scale-in"
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 flex flex-col items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-bold text-base leading-none">
                          {new Date(h.date).getUTCDate()}
                        </span>
                        <span className="text-indigo-400 text-xs">
                          {months[new Date(h.date).getUTCMonth()].slice(0, 3)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{h.name}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(h.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setEditHoliday(h)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(h)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Ajouter un jour férié</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  className="input-field"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Ex : Fête de l'indépendance"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={createMut.isPending}>
                  {createMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Ajouter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editHoliday && (
        <div className="modal-overlay" onClick={() => setEditHoliday(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Modifier le jour férié</h2>
              <button onClick={() => setEditHoliday(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateMut.mutate({ id: editHoliday.id, name: editHoliday.name });
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date</label>
                <input
                  type="date"
                  disabled
                  className="input-field opacity-60"
                  value={editHoliday.date.slice(0, 10)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={editHoliday.name}
                  onChange={(e) => setEditHoliday((h) => h ? { ...h, name: e.target.value } : h)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditHoliday(null)} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={updateMut.isPending}>
                  {updateMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Supprimer ce jour férié ?</h3>
              <p className="text-slate-500 text-sm mt-1">{deleteTarget.name}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={() => deleteMut.mutate(deleteTarget.id)}
                disabled={deleteMut.isPending}
                className="btn-danger flex-1 justify-center flex items-center gap-1.5"
              >
                {deleteMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
