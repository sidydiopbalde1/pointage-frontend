'use client';

import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from 'react';

/* ── Shared error + label ── */

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FieldWrapper({ label, error, hint, required, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 mt-0.5">
          <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

/* ── Input ── */

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  onTrailingClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leadingIcon, trailingIcon, onTrailingClick, className = '', required, ...rest }, ref) => {
    const hasError = Boolean(error);
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          {leadingIcon && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            required={required}
            className={[
              'input-field',
              leadingIcon  ? 'pl-9'  : '',
              trailingIcon ? 'pr-9'  : '',
              hasError
                ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                : '',
              className,
            ].filter(Boolean).join(' ')}
            {...rest}
          />
          {trailingIcon && (
            <button
              type="button"
              onClick={onTrailingClick}
              tabIndex={onTrailingClick ? 0 : -1}
              className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 ${onTrailingClick ? 'hover:text-slate-600 transition-colors' : 'pointer-events-none'}`}
            >
              {trailingIcon}
            </button>
          )}
        </div>
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

/* ── Textarea ── */

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className = '', required, ...rest }, ref) => {
    const hasError = Boolean(error);
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <textarea
          ref={ref}
          required={required}
          className={[
            'input-field resize-none',
            hasError
              ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
              : '',
            className,
          ].filter(Boolean).join(' ')}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

/* ── Select ── */

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, placeholder, options, className = '', required, ...rest }, ref) => {
    const hasError = Boolean(error);
    return (
      <FieldWrapper label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          <select
            ref={ref}
            required={required}
            className={[
              'input-field appearance-none pr-8 cursor-pointer',
              hasError
                ? 'border-red-400 focus:border-red-400 focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]'
                : '',
              className,
            ].filter(Boolean).join(' ')}
            {...rest}
          >
            {placeholder && (
              <option value="" disabled>{placeholder}</option>
            )}
            {options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {/* Chevron */}
          <svg
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';
