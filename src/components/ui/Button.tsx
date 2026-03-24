'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

/* ── Types ── */

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children?: ReactNode;
}

/* ── Style maps ── */

const VARIANT: Record<ButtonVariant, string> = {
  primary:   'btn-primary',
  secondary: 'btn-secondary',
  danger:    'btn-danger',
  ghost:     'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-transparent rounded-[0.625rem] font-semibold text-sm transition-colors px-3 py-2 inline-flex items-center gap-1.5 cursor-pointer',
};

const SIZE: Record<ButtonSize, string> = {
  sm:  'text-xs px-2.5 py-1.5',
  md:  '',          // default – variant CSS already sets padding
  lg:  'text-base py-3 px-6',
};

function Spinner({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-full border-2 animate-spin shrink-0 ${
        light ? 'border-white/40 border-t-white' : 'border-indigo-300 border-t-indigo-600'
      }`}
    />
  );
}

/* ── Component ── */

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      children,
      disabled,
      className = '',
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const isLight = variant === 'primary' || variant === 'danger';

    const classes = [
      VARIANT[variant],
      SIZE[size] !== '' ? SIZE[size] : '',
      fullWidth ? 'w-full justify-center' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <motion.button
        ref={ref}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.025, y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.97 } : {}}
        transition={{ duration: 0.15 }}
        className={classes}
        {...(rest as HTMLMotionProps<'button'>)}
      >
        {loading ? (
          <Spinner light={isLight} />
        ) : (
          icon && iconPosition === 'left' && icon
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </motion.button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
