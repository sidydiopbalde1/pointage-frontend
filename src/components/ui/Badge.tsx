import { type ReactNode } from 'react';

export type BadgeColor =
  | 'indigo' | 'violet' | 'emerald' | 'amber' | 'red' | 'blue' | 'slate' | 'orange';

interface BadgeProps {
  color?: BadgeColor;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

const COLORS: Record<BadgeColor, string> = {
  indigo:  'bg-indigo-50  text-indigo-700  border-indigo-100',
  violet:  'bg-violet-50  text-violet-700  border-violet-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber:   'bg-amber-50   text-amber-700   border-amber-100',
  red:     'bg-red-50     text-red-600     border-red-100',
  blue:    'bg-blue-50    text-blue-700    border-blue-100',
  slate:   'bg-slate-100  text-slate-600   border-slate-200',
  orange:  'bg-orange-50  text-orange-700  border-orange-100',
};

const DOT_COLORS: Record<BadgeColor, string> = {
  indigo:  'bg-indigo-500',
  violet:  'bg-violet-500',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  blue:    'bg-blue-500',
  slate:   'bg-slate-400',
  orange:  'bg-orange-500',
};

export default function Badge({ color = 'slate', children, dot = false, className = '' }: BadgeProps) {
  return (
    <span
      className={`badge border ${COLORS[color]} ${className}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT_COLORS[color]}`} />
      )}
      {children}
    </span>
  );
}
