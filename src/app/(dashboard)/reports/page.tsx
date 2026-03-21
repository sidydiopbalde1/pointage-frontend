'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MonthlyStatEntry } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export default function ReportsPage() {
  const { isManager } = useAuth();
  const router = useRouter();
  const [exportLoading, setExportLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (!isManager) {
    router.replace('/dashboard');
    return null;
  }

  const { data: stats, isLoading } = useQuery<MonthlyStatEntry[]>({
    queryKey: ['monthly-stats', month, year],
    queryFn: () =>
      api.get(`/reports/monthly-stats?month=${month}&year=${year}`).then((r) => r.data),
  });

  /* ---- helpers ---- */
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const res = await api.get(
        `/reports/attendance/export?startDate=${startDate}&endDate=${endDate}`,
        { responseType: 'blob' },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `pointages_${year}_${String(month).padStart(2, '0')}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast('Export téléchargé !', 'success');
    } catch {
      showToast("Erreur lors de l'export", 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const workingDays = (() => {
    let count = 0;
    for (let d = 1; d <= lastDay; d++) {
      const day = new Date(year, month - 1, d).getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  })();

  const getAttendanceRate = (s: MonthlyStatEntry) =>
    workingDays ? Math.round((s.totalDays / workingDays) * 100) : 0;

  const totalPresent = stats?.reduce((a, s) => a + s.present, 0) ?? 0;
  const totalLate    = stats?.reduce((a, s) => a + s.late, 0) ?? 0;
  const totalDays    = stats?.reduce((a, s) => a + s.totalDays, 0) ?? 0;

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
          <h1 className="text-2xl font-bold text-slate-800">Rapports</h1>
          <p className="text-slate-500 text-sm mt-0.5">Statistiques mensuelles et export Excel</p>
        </div>
        <button onClick={handleExport} disabled={exportLoading} className="btn-primary">
          {exportLoading
            ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          }
          Exporter Excel
        </button>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-4 animate-slide-up animate-delay-100">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          <label className="text-sm font-medium text-slate-600">Période :</label>
        </div>
        <select className="input-field w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select className="input-field w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
          <span>{workingDays} jours ouvrés</span>
          <span className="font-semibold text-indigo-600 text-sm">{MONTHS[month - 1]} {year}</span>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Jours présents (à l\'heure)', value: totalPresent, color: 'bg-emerald-50', text: 'text-emerald-700' },
            { label: 'Jours avec retard', value: totalLate, color: 'bg-amber-50', text: 'text-amber-700' },
            { label: 'Total jours travaillés', value: totalDays, color: 'bg-indigo-50', text: 'text-indigo-700' },
          ].map((s, i) => (
            <div key={s.label} className={`rounded-2xl p-5 ${s.color} animate-slide-up`} style={{ animationDelay: `${i * 0.08}s` }}>
              <p className={`text-3xl font-bold ${s.text}`}>{s.value}</p>
              <p className={`text-xs font-medium mt-0.5 ${s.text} opacity-80`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-slide-up animate-delay-200">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Détail par employé</h3>
          <span className="text-xs text-slate-400">{stats?.length ?? 0} employé(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employé</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Département</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">À l'heure</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">En retard</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Taux / mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-5 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-4 py-4"><Skeleton className="h-4 w-8 mx-auto" /></td>
                    <td className="px-5 py-4"><Skeleton className="h-3 w-28 rounded-full" /></td>
                  </tr>
                ))
              ) : !stats?.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">
                    Aucune donnée pour cette période
                  </td>
                </tr>
              ) : (
                stats.map((s, i) => {
                  const rate = getAttendanceRate(s);
                  return (
                    <tr key={s.user.id} className="table-row-hover animate-fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-linear-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                            {s.user.firstName[0]}{s.user.lastName[0]}
                          </div>
                          <span className="text-sm font-medium text-slate-700">
                            {s.user.firstName} {s.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">
                        {s.user.department ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-semibold text-emerald-600">{s.present}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-semibold text-amber-600">{s.late}</span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-semibold text-indigo-600">{s.totalDays}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-700 ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(rate, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-600 w-8 text-right">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export info */}
      <div className="mt-6 bg-slate-800 rounded-2xl p-5 animate-slide-up animate-delay-400">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm mb-1">Export Excel — {MONTHS[month - 1]} {year}</p>
            <p className="text-slate-400 text-xs leading-relaxed">
              Période : {startDate} → {endDate} · Tous les pointages avec heures d'entrée/sortie, statut et département.
            </p>
          </div>
          <button onClick={handleExport} disabled={exportLoading} className="btn-primary shrink-0 text-xs py-2">
            {exportLoading
              ? <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
            }
            Exporter
          </button>
        </div>
      </div>
    </div>
  );
}
