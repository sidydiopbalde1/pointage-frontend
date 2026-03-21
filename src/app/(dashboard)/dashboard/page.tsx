'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { TodayStats, Attendance, Leave } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/hooks/useSocket';
import { useState } from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  delay?: string;
}

function StatCard({ label, value, icon, color, delay = '' }: StatCardProps) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 card-hover animate-slide-up ${delay}`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-slate-800 animate-count-up">{value}</p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
    </div>
  );
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export default function DashboardPage() {
  const { isManager } = useAuth();
  const [liveStats, setLiveStats] = useState<TodayStats | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<TodayStats>({
    queryKey: ['today-stats'],
    queryFn: () => api.get('/attendance/stats/today').then((r) => r.data),
    enabled: isManager,
  });

  const { data: recentAttendance, isLoading: attendanceLoading } = useQuery<Attendance[]>({
    queryKey: ['recent-attendance'],
    queryFn: () => api.get('/attendance?limit=6').then((r) => r.data),
    enabled: isManager,
  });

  const { data: pendingLeaves, isLoading: leavesLoading } = useQuery<Leave[]>({
    queryKey: ['pending-leaves'],
    queryFn: () => api.get('/leaves?status=PENDING&limit=5').then((r) => r.data),
    enabled: isManager,
  });

  // Real-time updates
  useSocket('stats:update', (data: TodayStats) => setLiveStats(data));

  const displayStats = liveStats ?? stats;

  const statusColor: Record<string, string> = {
    PRESENT: 'bg-emerald-100 text-emerald-700',
    LATE: 'bg-amber-100 text-amber-700',
    HALF_DAY: 'bg-blue-100 text-blue-700',
  };

  const leaveColor: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-500',
  };

  const leaveTypeLabel: Record<string, string> = {
    ANNUAL: 'Annuel',
    SICK: 'Maladie',
    MATERNITY: 'Maternité',
    UNPAID: 'Sans solde',
    OTHER: 'Autre',
  };

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4 animate-float">
          <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Bienvenue !</h2>
        <p className="text-slate-400 text-sm">Utilisez le menu pour pointer ou gérer vos congés.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 animate-slide-up">
        <h1 className="text-2xl font-bold text-slate-800">Tableau de bord</h1>
        <p className="text-slate-500 text-sm mt-0.5">Vue d'ensemble en temps réel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <Skeleton className="w-11 h-11 mb-4" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Total employés"
              value={displayStats?.total ?? 0}
              color="bg-indigo-50 text-indigo-600"
              delay="animate-delay-100"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
            />
            <StatCard
              label="Présents aujourd'hui"
              value={displayStats?.present ?? 0}
              color="bg-emerald-50 text-emerald-600"
              delay="animate-delay-200"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
            <StatCard
              label="En retard"
              value={displayStats?.late ?? 0}
              color="bg-amber-50 text-amber-600"
              delay="animate-delay-300"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              }
            />
            <StatCard
              label="Absents"
              value={displayStats?.absent ?? 0}
              color="bg-red-50 text-red-500"
              delay="animate-delay-400"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
          </>
        )}
      </div>

      {/* Progress bar */}
      {!statsLoading && displayStats && displayStats.total > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 animate-slide-up animate-delay-300">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-slate-700 text-sm">Taux de présence</h3>
            <span className="text-indigo-600 font-bold text-sm">
              {Math.round(((displayStats.present + displayStats.late) / displayStats.total) * 100)}%
            </span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
              style={{ width: `${((displayStats.present + displayStats.late) / displayStats.total) * 100}%` }}
            />
          </div>
          <div className="flex gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />Présents: {displayStats.present}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />En retard: {displayStats.late}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500" />Absents: {displayStats.absent}
            </span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent attendance */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-slide-up animate-delay-200">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Pointages récents</h3>
            <span className="badge bg-indigo-50 text-indigo-600">Aujourd'hui</span>
          </div>
          <div className="divide-y divide-slate-50">
            {attendanceLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : recentAttendance?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun pointage aujourd'hui</div>
            ) : (
              recentAttendance?.map((a, i) => (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 p-4 table-row-hover animate-slide-up`}
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {a.user?.firstName?.[0]}{a.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {a.user?.firstName} {a.user?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {a.checkIn ? `Entrée: ${a.checkIn.slice(11, 16)}` : ''}
                      {a.checkOut ? ` · Sortie: ${a.checkOut.slice(11, 16)}` : ''}
                    </p>
                  </div>
                  <span className={`badge ${statusColor[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {a.status === 'PRESENT' ? 'Présent' : a.status === 'LATE' ? 'Retard' : 'Mi-temps'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending leaves */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 animate-slide-up animate-delay-300">
          <div className="flex items-center justify-between p-5 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">Congés en attente</h3>
            {(pendingLeaves?.length ?? 0) > 0 && (
              <span className="badge bg-amber-100 text-amber-700">{pendingLeaves?.length}</span>
            )}
          </div>
          <div className="divide-y divide-slate-50">
            {leavesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-3.5 w-32 mb-1.5" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))
            ) : pendingLeaves?.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">Aucun congé en attente</div>
            ) : (
              pendingLeaves?.map((leave, i) => (
                <div
                  key={leave.id}
                  className="flex items-center gap-3 p-4 table-row-hover animate-slide-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                    {leave.user?.firstName?.[0]}{leave.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      {leave.user?.firstName} {leave.user?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {leaveTypeLabel[leave.type]} · {leave.startDate.slice(0, 10)} → {leave.endDate.slice(0, 10)}
                    </p>
                  </div>
                  <span className={`badge ${leaveColor[leave.status]}`}>
                    {leave.status === 'PENDING' ? 'En attente' : leave.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
