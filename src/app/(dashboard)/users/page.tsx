'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { User, Role } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: 'bg-violet-100 text-violet-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  EMPLOYEE: 'bg-slate-100 text-slate-600',
};

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

const EMPTY_FORM = {
  firstName: '', lastName: '', email: '', password: '',
  role: 'EMPLOYEE' as Role, department: '', position: '', phone: '',
  workStartTime: '09:00', workEndTime: '17:00', isActive: true,
};

export default function UsersPage() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<User | null>(null);
  const [search, setSearch] = useState('');

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users?includeInactive=true').then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (data: Omit<typeof EMPTY_FORM, 'isActive'>) => api.post('/users', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); showToast('Utilisateur créé !', 'success'); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof EMPTY_FORM> }) =>
      api.patch(`/users/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); showToast('Modifications enregistrées', 'success'); },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(Array.isArray(msg) ? msg.join(', ') : msg, 'error');
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setConfirmDelete(null); showToast('Utilisateur supprimé', 'success'); },
    onError: () => showToast('Erreur lors de la suppression', 'error'),
  });

  const openCreate = () => { setEditUser(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ ...EMPTY_FORM, firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, department: u.department ?? '', position: u.position ?? '', phone: u.phone ?? '', workStartTime: u.workStartTime ?? '09:00', workEndTime: u.workEndTime ?? '17:00', isActive: u.isActive });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editUser) {
      const { password, ...rest } = form;
      updateMut.mutate({ id: editUser.id, data: password ? form : rest });
    } else {
      const { isActive, ...createData } = form;
      createMut.mutate(createData);
    }
  };

  if (!isAdmin) {
    router.replace('/dashboard');
    return null;
  }

  const filtered = users?.filter(u =>
    `${u.firstName} ${u.lastName} ${u.email} ${u.department}`.toLowerCase().includes(search.toLowerCase()),
  ) ?? [];

  const isPending = createMut.isPending || updateMut.isPending;

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
          <h1 className="text-2xl font-bold text-slate-800">Utilisateurs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{users?.length ?? 0} employé(s) enregistré(s)</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Ajouter un employé
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4 animate-slide-up animate-delay-100">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher par nom, email ou département…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up animate-delay-200">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-28 mb-1.5" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            {search ? 'Aucun résultat pour cette recherche' : 'Aucun utilisateur'}
          </div>
        ) : (
          filtered.map((u, i) => (
            <div
              key={u.id}
              className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm card-hover animate-scale-in"
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br ${u.isActive ? 'from-indigo-400 to-violet-500' : 'from-slate-300 to-slate-400'}`}>
                    {u.firstName[0]}{u.lastName[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{u.firstName} {u.lastName}</p>
                    <p className="text-slate-400 text-xs truncate max-w-[140px]">{u.email}</p>
                  </div>
                </div>
                <span className={`badge ${ROLE_COLORS[u.role]}`}>{u.role}</span>
              </div>

              {(u.department || u.position) && (
                <div className="flex items-center gap-1 text-xs text-slate-500 mb-1">
                  <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                  {[u.position, u.department].filter(Boolean).join(' · ')}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                <span className={`flex items-center gap-1 text-xs ${u.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  {u.isActive ? 'Actif' : 'Inactif'}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(u)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors"
                    title="Modifier"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(u)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Supprimer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-800">
                {editUser ? 'Modifier l\'employé' : 'Nouvel employé'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Prénom</label>
                  <input required className="input-field" value={form.firstName} onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom</label>
                  <input required className="input-field" value={form.lastName} onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                <input type="email" required className="input-field" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Mot de passe {editUser && <span className="font-normal text-slate-400">(laisser vide pour ne pas changer)</span>}
                </label>
                <input type="password" required={!editUser} className="input-field" value={form.password} onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Rôle</label>
                <select className="input-field" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value as Role }))}>
                  <option value="EMPLOYEE">Employé</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Département</label>
                  <input className="input-field" value={form.department} onChange={(e) => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Poste</label>
                  <input className="input-field" value={form.position} onChange={(e) => setForm(f => ({ ...f, position: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Téléphone</label>
                <input type="tel" className="input-field" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Début de travail</label>
                  <input
                    type="time"
                    className="input-field"
                    value={form.workStartTime}
                    onChange={(e) => setForm(f => ({ ...f, workStartTime: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fin de travail</label>
                  <input
                    type="time"
                    className="input-field"
                    value={form.workEndTime}
                    onChange={(e) => setForm(f => ({ ...f, workEndTime: e.target.value }))}
                  />
                </div>
              </div>
              {editUser && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-sm font-semibold text-slate-700">
                    {form.isActive ? 'Compte actif' : 'Compte inactif'}
                  </span>
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">
                  Annuler
                </button>
                <button type="submit" className="btn-primary flex-1 justify-center" disabled={isPending}>
                  {isPending ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : editUser ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Supprimer l'employé ?</h3>
              <p className="text-slate-500 text-sm mt-1">
                {confirmDelete.firstName} {confirmDelete.lastName} sera définitivement supprimé.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1 justify-center">
                Annuler
              </button>
              <button
                onClick={() => deleteMut.mutate(confirmDelete.id)}
                className="btn-danger flex-1 justify-center"
                disabled={deleteMut.isPending}
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
