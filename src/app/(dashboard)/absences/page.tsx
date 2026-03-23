'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Absence } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function AbsencesPage() {
  const { user, isManager } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [justifyTarget, setJustifyTarget] = useState<Absence | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{ absence: Absence; justified: boolean } | null>(null);
  const [filterJustified, setFilterJustified] = useState<string>('');
  const [justification, setJustification] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ── Employee: mes absences ── */
  const { data: myAbsences, isLoading: myLoading } = useQuery<Absence[]>({
    queryKey: ['my-absences'],
    queryFn: () => api.get('/absences/my').then((r) => r.data),
    enabled: !isManager,
  });

  /* ── Admin/Manager: toutes les absences ── */
  const params = new URLSearchParams();
  if (filterJustified !== '') params.set('justified', filterJustified);

  const { data: allAbsences, isLoading: allLoading } = useQuery<Absence[]>({
    queryKey: ['all-absences', filterJustified],
    queryFn: () => api.get(`/absences?${params.toString()}`).then((r) => r.data),
    enabled: isManager,
  });

  /* ── Justifier une absence (avec fichier) ── */
  const justifyMut = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('date', justifyTarget!.date.slice(0, 10));
      fd.append('justification', justification);
      if (file) fd.append('document', file);
      return api.post('/absences/justify', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-absences'] });
      setJustifyTarget(null);
      setJustification('');
      setFile(null);
      showToast('Justification envoyée', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    },
  });

  /* ── Admin/Manager: valider ou refuser une justification ── */
  const reviewMut = useMutation({
    mutationFn: ({ id, justified }: { id: string; justified: boolean }) =>
      api.patch(`/absences/${id}/review`, { justified }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-absences'] });
      setReviewTarget(null);
      showToast('Décision enregistrée', 'success');
    },
    onError: () => showToast('Erreur', 'error'),
  });

  const absences = isManager ? allAbsences : myAbsences;
  const loading = isManager ? allLoading : myLoading;

  return (
    <div className="max-w-5xl mx-auto">
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
          <h1 className="text-2xl font-bold text-slate-800">Absences</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isManager ? 'Gérez les absences et justificatifs de l\'équipe' : 'Vos absences et justificatifs'}
          </p>
        </div>
        {!isManager && myAbsences && myAbsences.filter(a => !a.justification).length > 0 && (
          <span className="badge bg-red-100 text-red-600 text-sm">
            {myAbsences.filter(a => !a.justification).length} à justifier
          </span>
        )}
      </div>

      {/* Filters (Admin/Manager) */}
      {isManager && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3 animate-slide-up animate-delay-100">
          <span className="text-sm font-medium text-slate-600">Filtrer :</span>
          {[
            { value: '', label: 'Tous' },
            { value: 'false', label: 'Non justifiées' },
            { value: 'true', label: 'Justifiées' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterJustified(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterJustified === f.value ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up animate-delay-200">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))
        ) : !absences?.length ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Aucune absence enregistrée</p>
          </div>
        ) : (
          absences.map((absence, i) => (
            <div
              key={absence.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm card-hover animate-scale-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  {isManager && (
                    <p className="font-semibold text-slate-800 text-sm mb-0.5">
                      {absence.user?.firstName} {absence.user?.lastName}
                      {absence.user?.department && (
                        <span className="ml-1.5 text-xs font-normal text-slate-400">· {absence.user.department}</span>
                      )}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">
                    {new Date(absence.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                  </p>
                </div>
                <span className={`badge ${absence.justified ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                  {absence.justified ? 'Justifiée' : 'Non justifiée'}
                </span>
              </div>

              {absence.justification && (
                <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 mb-3 line-clamp-2">
                  {absence.justification}
                </p>
              )}

              {absence.documentPath && (
                <a
                  href={absence.documentPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium mb-3"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Voir le justificatif
                </a>
              )}

              {/* Action employé : justifier */}
              {!isManager && !absence.justified && (
                <button
                  onClick={() => setJustifyTarget(absence)}
                  className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold hover:bg-indigo-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                  </svg>
                  Justifier
                </button>
              )}

              {/* Actions admin/manager */}
              {isManager && absence.justification && !absence.reviewedAt && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReviewTarget({ absence, justified: true })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Valider
                  </button>
                  <button
                    onClick={() => setReviewTarget({ absence, justified: false })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                    Refuser
                  </button>
                </div>
              )}

              {absence.reviewedAt && (
                <p className="text-xs text-slate-400">
                  Examiné le {new Date(absence.reviewedAt).toLocaleDateString('fr-FR')}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Justify modal */}
      {justifyTarget && (
        <div className="modal-overlay" onClick={() => setJustifyTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Justifier une absence</h2>
                <p className="text-sm text-indigo-600 font-medium mt-0.5">
                  {new Date(justifyTarget.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </p>
              </div>
              <button onClick={() => setJustifyTarget(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); justifyMut.mutate(); }}
              className="flex flex-col gap-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motif</label>
                <textarea
                  required
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Expliquez la raison de votre absence…"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Justificatif <span className="font-normal text-slate-400">(PDF, JPG, PNG — 5 Mo max)</span>
                </label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50/40 transition-all text-sm text-slate-500"
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                  {file ? (
                    <span className="text-indigo-600 font-medium truncate">{file.name}</span>
                  ) : (
                    'Choisir un fichier'
                  )}
                </button>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setJustifyTarget(null)} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={justifyMut.isPending}>
                  {justifyMut.isPending
                    ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    : 'Envoyer'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review confirm modal */}
      {reviewTarget && (
        <div className="modal-overlay" onClick={() => setReviewTarget(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${reviewTarget.justified ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {reviewTarget.justified ? (
                  <svg className="w-7 h-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-800">
                {reviewTarget.justified ? 'Valider le justificatif ?' : 'Refuser le justificatif ?'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {reviewTarget.absence.user?.firstName} {reviewTarget.absence.user?.lastName} ·{' '}
                {new Date(reviewTarget.absence.date).toLocaleDateString('fr-FR', { timeZone: 'UTC' })}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewTarget(null)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={() => reviewMut.mutate({ id: reviewTarget.absence.id, justified: reviewTarget.justified })}
                disabled={reviewMut.isPending}
                className={`flex-1 justify-center flex items-center gap-1.5 ${reviewTarget.justified ? 'btn-primary' : 'btn-danger'}`}
              >
                {reviewMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : reviewTarget.justified ? 'Valider' : 'Refuser'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
