'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { User, AppSettings } from '@/types';

/* ── Toast ── */
function Toast({ msg, type }: { msg: string; type: 'success' | 'error' }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-in-right ${type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
      {type === 'success'
        ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
        : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
      }
      {msg}
    </div>
  );
}

/* ── Section wrapper ── */
function Section({ title, subtitle, icon, children, badge }: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-scale-in">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-slate-50">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
            {badge}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

/* ── Input ── */
function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-400 transition-all";

const DAY_LABELS: { value: string; label: string; short: string }[] = [
  { value: '1', label: 'Lundi', short: 'Lun' },
  { value: '2', label: 'Mardi', short: 'Mar' },
  { value: '3', label: 'Mercredi', short: 'Mer' },
  { value: '4', label: 'Jeudi', short: 'Jeu' },
  { value: '5', label: 'Vendredi', short: 'Ven' },
  { value: '6', label: 'Samedi', short: 'Sam' },
  { value: '0', label: 'Dimanche', short: 'Dim' },
];

const WORK_DAYS_LABELS: Record<string, string> = {
  '0': 'Dim', '1': 'Lun', '2': 'Mar', '3': 'Mer', '4': 'Jeu', '5': 'Ven', '6': 'Sam',
};

/* ── Day picker ── */
function DayPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (d: string) => {
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {DAY_LABELS.map((d) => {
        const active = value.includes(d.value);
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active
                ? 'bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {d.short}
          </button>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    position: '',
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  /* Admin: own work schedule */
  const [schedule, setSchedule] = useState({
    workStartTime: '',
    workEndTime: '',
    workDays: [] as string[],
  });

  /* Admin: bulk schedule */
  const [bulkSchedule, setBulkSchedule] = useState({
    workStartTime: '08:00',
    workEndTime: '17:00',
    workDays: ['1', '2', '3', '4', '5'],
  });
  const [bulkRole, setBulkRole] = useState<'ALL' | 'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        phone: user.phone ?? '',
        department: user.department ?? '',
        position: user.position ?? '',
      });
      setSchedule({
        workStartTime: user.workStartTime ?? '08:00',
        workEndTime: user.workEndTime ?? '17:00',
        workDays: user.workDays ? user.workDays.split(',') : ['1', '2', '3', '4', '5'],
      });
    }
  }, [user]);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* Admin: geolocation settings */
  const [geoForm, setGeoForm] = useState({
    officeLat: '',
    officeLng: '',
    officeRadiusMeters: '',
  });

  /* ── App settings query (admin only) ── */
  const { data: appSettings } = useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: () => api.get<AppSettings>('/settings').then((r) => r.data),
    enabled: isAdmin,
  });

  useEffect(() => {
    if (appSettings) {
      setGeoForm({
        officeLat: String(appSettings.officeLat),
        officeLng: String(appSettings.officeLng),
        officeRadiusMeters: String(appSettings.officeRadiusMeters),
      });
    }
  }, [appSettings]);

  /* ── Users query (admin only, for bulk) ── */
  const { data: allUsers } = useQuery<User[]>({
    queryKey: ['users-all'],
    queryFn: () => api.get<User[]>('/users?includeInactive=false').then((r) => r.data),
    enabled: isAdmin,
  });

  /* ── Profile mutation ── */
  const profileMut = useMutation({
    mutationFn: () => api.patch('/auth/profile', profile),
    onSuccess: async () => {
      await refreshUser();
      showToast('Profil mis à jour', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(msg, 'error');
    },
  });

  /* ── Password mutation ── */
  const pwMut = useMutation({
    mutationFn: () => api.post('/auth/change-password', {
      currentPassword: pwForm.currentPassword,
      newPassword: pwForm.newPassword,
    }),
    onSuccess: () => {
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Mot de passe modifié avec succès', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(msg, 'error');
    },
  });

  /* ── Admin own schedule mutation ── */
  const scheduleMut = useMutation({
    mutationFn: () =>
      api.patch(`/users/${user!.id}`, {
        workStartTime: schedule.workStartTime,
        workEndTime: schedule.workEndTime,
        workDays: schedule.workDays.sort((a, b) => Number(a) - Number(b)).join(','),
      }),
    onSuccess: async () => {
      await refreshUser();
      showToast('Horaires mis à jour', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(msg, 'error');
    },
  });

  /* ── Geolocation settings mutation ── */
  const geoMut = useMutation({
    mutationFn: () =>
      api.patch('/settings', {
        officeLat: parseFloat(geoForm.officeLat),
        officeLng: parseFloat(geoForm.officeLng),
        officeRadiusMeters: parseInt(geoForm.officeRadiusMeters, 10),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      showToast('Paramètres de géolocalisation mis à jour', 'success');
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erreur';
      showToast(msg, 'error');
    },
  });

  const handleGeoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(geoForm.officeLat);
    const lng = parseFloat(geoForm.officeLng);
    const radius = parseInt(geoForm.officeRadiusMeters, 10);
    if (isNaN(lat) || lat < -90 || lat > 90) { showToast('Latitude invalide (−90 à 90)', 'error'); return; }
    if (isNaN(lng) || lng < -180 || lng > 180) { showToast('Longitude invalide (−180 à 180)', 'error'); return; }
    if (isNaN(radius) || radius < 10 || radius > 5000) { showToast('Rayon invalide (10 à 5000 m)', 'error'); return; }
    geoMut.mutate();
  };

  /* ── Bulk schedule mutation ── */
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  const applyBulkSchedule = async () => {
    if (!allUsers) return;
    const targets = allUsers.filter((u) => {
      if (bulkRole === 'ALL') return true;
      return u.role === bulkRole;
    });
    if (targets.length === 0) {
      showToast('Aucun utilisateur trouvé', 'error');
      return;
    }
    setBulkProgress({ done: 0, total: targets.length });
    let errors = 0;
    for (let i = 0; i < targets.length; i++) {
      try {
        await api.patch(`/users/${targets[i].id}`, {
          workStartTime: bulkSchedule.workStartTime,
          workEndTime: bulkSchedule.workEndTime,
          workDays: bulkSchedule.workDays.sort((a, b) => Number(a) - Number(b)).join(','),
        });
      } catch {
        errors++;
      }
      setBulkProgress({ done: i + 1, total: targets.length });
    }
    setBulkProgress(null);
    setBulkConfirm(false);
    queryClient.invalidateQueries({ queryKey: ['users-all'] });
    if (errors === 0) {
      showToast(`Horaires appliqués à ${targets.length} utilisateur${targets.length > 1 ? 's' : ''}`, 'success');
    } else {
      showToast(`${targets.length - errors}/${targets.length} utilisateurs mis à jour`, 'error');
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileMut.mutate();
  };

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      showToast('Les mots de passe ne correspondent pas', 'error');
      return;
    }
    pwMut.mutate();
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (schedule.workDays.length === 0) {
      showToast('Sélectionnez au moins un jour travaillé', 'error');
      return;
    }
    scheduleMut.mutate();
  };

  /* ── Work schedule display (non-admin) ── */
  const workDays = user?.workDays
    ? user.workDays.split(',').map((d) => WORK_DAYS_LABELS[d] ?? d).join(' · ')
    : '—';

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );

  const AdminBadge = () => (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
      Admin
    </span>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div className="animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">Paramètres</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gérez votre profil et votre sécurité</p>
      </div>

      {/* Avatar / Info rapide */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex items-center gap-5 animate-scale-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-indigo-200">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-base">{user?.firstName} {user?.lastName}</p>
          <p className="text-slate-500 text-sm truncate">{user?.email}</p>
          <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            user?.role === 'ADMIN' ? 'bg-violet-100 text-violet-700' :
            user?.role === 'MANAGER' ? 'bg-blue-100 text-blue-700' :
            'bg-emerald-100 text-emerald-700'
          }`}>
            {user?.role === 'ADMIN' ? 'Administrateur' : user?.role === 'MANAGER' ? 'Manager' : 'Employé'}
          </span>
        </div>
      </div>

      {/* Profile form */}
      <Section
        title="Informations personnelles"
        subtitle="Modifiez vos informations de profil"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        }
      >
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Prénom" id="firstName">
              <input
                id="firstName"
                className={inputCls}
                value={profile.firstName}
                onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                placeholder="Prénom"
              />
            </Field>
            <Field label="Nom" id="lastName">
              <input
                id="lastName"
                className={inputCls}
                value={profile.lastName}
                onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                placeholder="Nom"
              />
            </Field>
          </div>

          <Field label="Téléphone" id="phone">
            <input
              id="phone"
              className={inputCls}
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
              placeholder="+221 77 000 00 00"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Département" id="department">
              <input
                id="department"
                className={inputCls}
                value={profile.department}
                onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))}
                placeholder="ex: Informatique"
              />
            </Field>
            <Field label="Poste" id="position">
              <input
                id="position"
                className={inputCls}
                value={profile.position}
                onChange={(e) => setProfile((p) => ({ ...p, position: e.target.value }))}
                placeholder="ex: Développeur"
              />
            </Field>
          </div>

          <div className="pt-1">
            <button type="submit" disabled={profileMut.isPending} className="btn-primary">
              {profileMut.isPending
                ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
              }
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </Section>

      {/* Password form */}
      <Section
        title="Sécurité"
        subtitle="Modifiez votre mot de passe"
        icon={
          <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        }
      >
        <form onSubmit={handlePwSubmit} className="space-y-4">
          <Field label="Mot de passe actuel" id="currentPassword">
            <div className="relative">
              <input
                id="currentPassword"
                type={showCurrentPw ? 'text' : 'password'}
                className={`${inputCls} pr-10`}
                value={pwForm.currentPassword}
                onChange={(e) => setPwForm((p) => ({ ...p, currentPassword: e.target.value }))}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowCurrentPw((v) => !v)}>
                <EyeIcon open={showCurrentPw} />
              </button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nouveau mot de passe" id="newPassword">
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPw ? 'text' : 'password'}
                  className={`${inputCls} pr-10`}
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowNewPw((v) => !v)}>
                  <EyeIcon open={showNewPw} />
                </button>
              </div>
            </Field>
            <Field label="Confirmer" id="confirmPassword">
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPw ? 'text' : 'password'}
                  className={`${inputCls} pr-10`}
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors" onClick={() => setShowConfirmPw((v) => !v)}>
                  <EyeIcon open={showConfirmPw} />
                </button>
              </div>
            </Field>
          </div>

          {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>
              Les mots de passe ne correspondent pas
            </p>
          )}

          <div className="pt-1">
            <button
              type="submit"
              disabled={pwMut.isPending || !pwForm.currentPassword || !pwForm.newPassword || pwForm.newPassword !== pwForm.confirmPassword}
              className="btn-primary"
            >
              {pwMut.isPending
                ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>
              }
              Changer le mot de passe
            </button>
          </div>
        </form>
      </Section>

      {/* ── Work schedule — ADMIN editable / others read-only ── */}
      {isAdmin ? (
        <Section
          title="Mes horaires de travail"
          subtitle="Modifiez vos horaires personnels"
          badge={<AdminBadge />}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        >
          <form onSubmit={handleScheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Heure d'arrivée" id="workStartTime">
                <input
                  id="workStartTime"
                  type="time"
                  className={inputCls}
                  value={schedule.workStartTime}
                  onChange={(e) => setSchedule((s) => ({ ...s, workStartTime: e.target.value }))}
                />
              </Field>
              <Field label="Heure de départ" id="workEndTime">
                <input
                  id="workEndTime"
                  type="time"
                  className={inputCls}
                  value={schedule.workEndTime}
                  onChange={(e) => setSchedule((s) => ({ ...s, workEndTime: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Jours travaillés" id="workDays">
              <DayPicker value={schedule.workDays} onChange={(v) => setSchedule((s) => ({ ...s, workDays: v }))} />
            </Field>

            <div className="pt-1">
              <button type="submit" disabled={scheduleMut.isPending} className="btn-primary">
                {scheduleMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" /></svg>
                }
                Enregistrer mes horaires
              </button>
            </div>
          </form>
        </Section>
      ) : (
        <Section
          title="Horaires de travail"
          subtitle="Configurés par l'administrateur"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          }
        >
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Arrivée</p>
              <p className="font-bold text-slate-800">{user?.workStartTime ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Départ</p>
              <p className="font-bold text-slate-800">{user?.workEndTime ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-slate-400 mb-1 truncate">Jours</p>
              <p className="font-bold text-slate-800 text-xs">{workDays}</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
            Pour modifier les horaires, contactez un administrateur.
          </p>
        </Section>
      )}

      {/* ── Admin: Geolocation ── */}
      {isAdmin && (
        <Section
          title="Géolocalisation du bureau"
          subtitle="Zone autorisée pour le pointage des employés"
          badge={<AdminBadge />}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
          }
        >
          <form onSubmit={handleGeoSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Latitude" id="officeLat">
                <input
                  id="officeLat"
                  type="number"
                  step="any"
                  className={inputCls}
                  value={geoForm.officeLat}
                  onChange={(e) => setGeoForm((g) => ({ ...g, officeLat: e.target.value }))}
                  placeholder="ex: 14.717007"
                />
              </Field>
              <Field label="Longitude" id="officeLng">
                <input
                  id="officeLng"
                  type="number"
                  step="any"
                  className={inputCls}
                  value={geoForm.officeLng}
                  onChange={(e) => setGeoForm((g) => ({ ...g, officeLng: e.target.value }))}
                  placeholder="ex: -17.464043"
                />
              </Field>
            </div>

            <Field label="Rayon autorisé (mètres)" id="officeRadius">
              <div className="space-y-2">
                <input
                  id="officeRadius"
                  type="number"
                  min={10}
                  max={5000}
                  className={inputCls}
                  value={geoForm.officeRadiusMeters}
                  onChange={(e) => setGeoForm((g) => ({ ...g, officeRadiusMeters: e.target.value }))}
                  placeholder="ex: 200"
                />
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setGeoForm((g) => ({ ...g, officeRadiusMeters: String(r) }))}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        geoForm.officeRadiusMeters === String(r)
                          ? 'bg-indigo-500 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {r}m
                    </button>
                  ))}
                </div>
              </div>
            </Field>

            {/* Current values summary */}
            {appSettings && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-start gap-3">
                <svg className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
                <div className="text-xs text-slate-500 space-y-0.5">
                  <p>Actuel : <span className="font-mono text-slate-700">{appSettings.officeLat}, {appSettings.officeLng}</span> — rayon <span className="font-semibold text-slate-700">{appSettings.officeRadiusMeters}m</span></p>
                  <p className="text-slate-400">Dernière modification : {new Date(appSettings.updatedAt).toLocaleString('fr-FR')}</p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={geoMut.isPending} className="btn-primary">
                {geoMut.isPending
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>
                }
                Enregistrer la zone bureau
              </button>
            </div>
          </form>
        </Section>
      )}

      {/* ── Admin: Bulk schedule ── */}
      {isAdmin && (
        <Section
          title="Horaires par défaut — Appliquer à tous"
          subtitle="Définissez et appliquez des horaires à un groupe d'utilisateurs"
          badge={<AdminBadge />}
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        >
          <div className="space-y-4">
            {/* Target group */}
            <Field label="Appliquer à" id="bulkRole">
              <div className="flex gap-2">
                {([['ALL', 'Tous'], ['EMPLOYEE', 'Employés'], ['MANAGER', 'Managers']] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setBulkRole(val)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                      bulkRole === val
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                    {allUsers && (
                      <span className="ml-1 opacity-70">
                        ({val === 'ALL' ? allUsers.length : allUsers.filter((u) => u.role === val).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Heure d'arrivée" id="bulkStart">
                <input
                  id="bulkStart"
                  type="time"
                  className={inputCls}
                  value={bulkSchedule.workStartTime}
                  onChange={(e) => setBulkSchedule((s) => ({ ...s, workStartTime: e.target.value }))}
                />
              </Field>
              <Field label="Heure de départ" id="bulkEnd">
                <input
                  id="bulkEnd"
                  type="time"
                  className={inputCls}
                  value={bulkSchedule.workEndTime}
                  onChange={(e) => setBulkSchedule((s) => ({ ...s, workEndTime: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Jours travaillés" id="bulkDays">
              <DayPicker value={bulkSchedule.workDays} onChange={(v) => setBulkSchedule((s) => ({ ...s, workDays: v }))} />
            </Field>

            {/* Progress bar */}
            {bulkProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Mise à jour en cours…</span>
                  <span>{bulkProgress.done}/{bulkProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Confirm step */}
            {!bulkConfirm ? (
              <button
                type="button"
                disabled={bulkSchedule.workDays.length === 0 || !!bulkProgress}
                onClick={() => setBulkConfirm(true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                Appliquer à{' '}
                {allUsers
                  ? bulkRole === 'ALL'
                    ? allUsers.length
                    : allUsers.filter((u) => u.role === bulkRole).length
                  : '…'}{' '}
                utilisateur(s)
              </button>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Confirmation requise
                </p>
                <p className="text-xs text-amber-700">
                  Cette action va écraser les horaires existants de{' '}
                  <strong>
                    {allUsers
                      ? bulkRole === 'ALL'
                        ? allUsers.length
                        : allUsers.filter((u) => u.role === bulkRole).length
                      : '…'}{' '}
                    utilisateur(s)
                  </strong>. Cette opération est irréversible.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyBulkSchedule}
                    disabled={!!bulkProgress}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-all disabled:opacity-40"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkConfirm(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" /></svg>
              Les horaires individuels peuvent toujours être modifiés dans la page Utilisateurs.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
