'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Leave, LeaveType, LeaveStatus, LeaveStats } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const STATUS_COLORS: Record<LeaveStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
const STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  CANCELLED: 'Annulé',
};
const TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL: 'Congé annuel',
  SICK: 'Maladie',
  MATERNITY: 'Maternité',
  UNPAID: 'Sans solde',
  OTHER: 'Autre',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function LeavesPage() {
  const { isManager } = useAuth();
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ leave: Leave; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [form, setForm] = useState({ type: 'ANNUAL' as LeaveType, startDate: '', endDate: '', reason: '' });
  const [filterStatus, setFilterStatus] = useState<string>('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: myLeaves, isLoading: myLoading } = useQuery<Leave[]>({
    queryKey: ['my-leaves'],
    queryFn: () => api.get('/leaves/my').then((r) => r.data),
    enabled: !isManager,
  });

  const { data: myStats } = useQuery<LeaveStats>({
    queryKey: ['my-leave-stats'],
    queryFn: () => api.get('/leaves/my/stats').then((r) => r.data),
    enabled: !isManager,
  });

  const params = new URLSearchParams();
  if (filterStatus) params.set('status', filterStatus);

  const { data: allLeaves, isLoading: allLoading } = useQuery<Leave[]>({
    queryKey: ['all-leaves', filterStatus],
    queryFn: () => api.get(`/leaves?${params.toString()}`).then((r) => r.data),
    enabled: isManager,
  });

  const createMut = useMutation({
    mutationFn: (data: typeof form) => api.post('/leaves', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leaves'] }); setShowCreate(false); setForm({ type: 'ANNUAL', startDate: '', endDate: '', reason: '' }); showToast('Demande envoyée !', 'success'); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    },
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => api.patch(`/leaves/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leaves'] }); showToast('Demande annulée', 'success'); },
    onError: () => showToast('Erreur lors de l\'annulation', 'error'),
  });

  const reviewMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/leaves/${id}/review`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['all-leaves'] });
      setReviewModal(null);
      showToast('Décision enregistrée', 'success');
    },
    onError: () => showToast('Erreur', 'error'),
  });

  const leaves = isManager ? allLeaves : myLeaves;
  const loading = isManager ? allLoading : myLoading;

  const getDuration = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86_400_000;
    return Math.ceil(diff) + 1;
  };

  return (
    <div className="max-w-6xl mx-auto">
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
          <h1 className="text-2xl font-bold text-slate-800">Congés</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isManager ? 'Gérez les demandes de l\'équipe' : 'Vos demandes de congé'}
          </p>
        </div>
        {!isManager && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nouvelle demande
          </button>
        )}
      </div>

      {/* Stats (employee) */}
      {!isManager && myStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total', value: myStats.total, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Approuvés', value: myStats.approved, color: 'bg-emerald-50 text-emerald-600' },
            { label: 'En attente', value: myStats.pending, color: 'bg-amber-50 text-amber-600' },
            { label: 'Refusés', value: myStats.rejected, color: 'bg-red-50 text-red-500' },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`rounded-2xl p-4 ${s.color} animate-slide-up`}
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter (manager) */}
      {isManager && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 flex flex-wrap items-center gap-3 animate-slide-up animate-delay-100">
          <span className="text-sm font-medium text-slate-600">Filtrer par statut :</span>
          {(['', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterStatus === s ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {s === '' ? 'Tous' : STATUS_LABELS[s as LeaveStatus]}
            </button>
          ))}
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slide-up animate-delay-200">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <div className="flex justify-between mb-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48 mb-2" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))
        ) : !leaves?.length ? (
          <div className="col-span-full py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Aucune demande de congé</p>
          </div>
        ) : (
          leaves.map((leave, i) => (
            <div
              key={leave.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm card-hover animate-scale-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  {isManager && (
                    <p className="font-semibold text-slate-800 text-sm mb-0.5">
                      {leave.user?.firstName} {leave.user?.lastName}
                    </p>
                  )}
                  <span className="badge bg-indigo-50 text-indigo-700 text-xs">
                    {TYPE_LABELS[leave.type]}
                  </span>
                </div>
                <span className={`badge ${STATUS_COLORS[leave.status]}`}>
                  {STATUS_LABELS[leave.status]}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>
                  {new Date(leave.startDate).toLocaleDateString('fr-FR')} → {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-indigo-600 font-medium">{getDuration(leave.startDate, leave.endDate)}j</span>
              </div>

              <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2.5 line-clamp-2 mb-3">
                {leave.reason}
              </p>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isManager && leave.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setReviewModal({ leave, action: 'APPROVED' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      Approuver
                    </button>
                    <button
                      onClick={() => setReviewModal({ leave, action: 'REJECTED' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                      Refuser
                    </button>
                  </>
                )}
                {!isManager && leave.status === 'PENDING' && (
                  <button
                    onClick={() => cancelMut.mutate(leave.id)}
                    disabled={cancelMut.isPending}
                    className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Annuler
                  </button>
                )}
                {leave.reviewedAt && (
                  <span className="text-xs text-slate-400 ml-auto">
                    Examiné le {new Date(leave.reviewedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create leave modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">Nouvelle demande de congé</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(form); }} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Type de congé</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value as LeaveType }))}>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date de début</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    className="input-field"
                    value={form.startDate}
                    onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value, endDate: '' }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Date de fin</label>
                  <input
                    type="date"
                    required
                    min={form.startDate || new Date().toISOString().slice(0, 10)}
                    className="input-field"
                    value={form.endDate}
                    onChange={(e) => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              {form.startDate && form.endDate && new Date(form.endDate) >= new Date(form.startDate) && (
                <div className="flex items-center gap-2 text-sm text-indigo-600 bg-indigo-50 rounded-lg px-3 py-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                  </svg>
                  Durée : {getDuration(form.startDate, form.endDate)} jour(s)
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Motif</label>
                <textarea
                  required
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Expliquez la raison de votre demande…"
                  value={form.reason}
                  onChange={(e) => setForm(f => ({ ...f, reason: e.target.value }))}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={createMut.isPending}>
                  {createMut.isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : 'Envoyer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review confirmation modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => setReviewModal(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${reviewModal.action === 'APPROVED' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {reviewModal.action === 'APPROVED' ? (
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
                {reviewModal.action === 'APPROVED' ? 'Approuver la demande ?' : 'Refuser la demande ?'}
              </h3>
              <p className="text-slate-500 text-sm mt-1">
                {reviewModal.leave.user?.firstName} {reviewModal.leave.user?.lastName} · {TYPE_LABELS[reviewModal.leave.type]}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setReviewModal(null)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={() => reviewMut.mutate({ id: reviewModal.leave.id, status: reviewModal.action })}
                disabled={reviewMut.isPending}
                className={`flex-1 justify-center ${reviewModal.action === 'APPROVED' ? 'btn-primary' : 'btn-danger'} flex items-center gap-1.5`}
              >
                {reviewMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : reviewModal.action === 'APPROVED' ? 'Approuver' : 'Refuser'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
