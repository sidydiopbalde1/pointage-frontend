'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  /** Tailwind bg+text color pair, e.g. "bg-indigo-50 text-indigo-600" */
  color: string;
  trend?: {
    value: number;   // percentage
    positive?: boolean;
  };
  className?: string;
}

export default function StatCard({ label, value, icon, color, trend, className = '' }: StatCardProps) {
  return (
    <motion.div
      className={`bg-white rounded-2xl p-5 shadow-sm border border-slate-100 ${className}`}
      whileHover={{
        y: -3,
        boxShadow: '0 12px 32px -8px rgba(79,70,229,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)',
      }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {icon}
        </motion.div>
        {trend !== undefined && (
          <span
            className={`text-xs font-semibold flex items-center gap-0.5 ${
              trend.positive !== false && trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend.value >= 0 ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
              </svg>
            )}
            {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <motion.p
        className="text-3xl font-bold text-slate-800"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        {value}
      </motion.p>
      <p className="text-slate-500 text-sm mt-1">{label}</p>
    </motion.div>
  );
}
