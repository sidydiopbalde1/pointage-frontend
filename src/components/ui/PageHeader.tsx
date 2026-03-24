import { type ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Extra content below title/actions row (e.g. tabs, filters) */
  bottom?: ReactNode;
  className?: string;
}

export default function PageHeader({ title, subtitle, actions, bottom, className = '' }: PageHeaderProps) {
  return (
    <motion.div
      className={`mb-6 ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
      {bottom && <div className="mt-3">{bottom}</div>}
    </motion.div>
  );
}
