'use client';

import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6',
};

export default function Card({ children, hover = false, padding = 'md', className = '', onClick }: CardProps) {
  const base = `bg-white rounded-2xl border border-slate-100 shadow-sm ${PADDING[padding]} ${className}`;

  if (!hover) {
    return (
      <div className={base} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={base}
      onClick={onClick}
      whileHover={{
        y: -3,
        boxShadow: '0 12px 32px -8px rgba(79,70,229,0.18), 0 2px 8px -2px rgba(15,23,42,0.08)',
      }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

/* ── Card sub-components ── */

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between px-5 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={`font-semibold text-slate-800 text-sm ${className}`}>{children}</h3>
  );
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 border-t border-slate-100 flex items-center gap-3 ${className}`}>
      {children}
    </div>
  );
}
