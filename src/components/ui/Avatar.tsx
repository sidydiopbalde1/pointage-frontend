import { type ReactNode } from 'react';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type AvatarShape = 'circle' | 'rounded';

interface AvatarProps {
  firstName?: string;
  lastName?: string;
  src?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  gradient?: string;  // custom Tailwind gradient, e.g. "from-emerald-400 to-teal-500"
  className?: string;
  statusDot?: 'online' | 'offline' | 'away';
}

const SIZES: Record<AvatarSize, { wrapper: string; text: string; dot: string }> = {
  xs: { wrapper: 'w-6 h-6',    text: 'text-[10px]', dot: 'w-1.5 h-1.5 -bottom-px -right-px' },
  sm: { wrapper: 'w-8 h-8',    text: 'text-xs',     dot: 'w-2 h-2 bottom-0 right-0' },
  md: { wrapper: 'w-10 h-10',  text: 'text-sm',     dot: 'w-2.5 h-2.5 bottom-0 right-0' },
  lg: { wrapper: 'w-12 h-12',  text: 'text-base',   dot: 'w-3 h-3 bottom-0 right-0' },
  xl: { wrapper: 'w-16 h-16',  text: 'text-xl',     dot: 'w-3.5 h-3.5 bottom-0.5 right-0.5' },
};

const SHAPES: Record<AvatarShape, string> = {
  circle:  'rounded-full',
  rounded: 'rounded-xl',
};

const DOT_COLORS = {
  online:  'bg-emerald-400',
  offline: 'bg-slate-300',
  away:    'bg-amber-400',
};

function initials(firstName?: string, lastName?: string): string {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export default function Avatar({
  firstName,
  lastName,
  src,
  size = 'md',
  shape = 'circle',
  gradient = 'from-indigo-400 to-violet-500',
  className = '',
  statusDot,
}: AvatarProps) {
  const s = SIZES[size];
  const sh = SHAPES[shape];
  const label = initials(firstName, lastName);

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={label}
          className={`${s.wrapper} ${sh} object-cover`}
        />
      ) : (
        <div
          className={`${s.wrapper} ${sh} bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold ${s.text} select-none`}
          aria-label={label || 'Avatar'}
        >
          {label || (
            <svg className="w-1/2 h-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          )}
        </div>
      )}
      {statusDot && (
        <span
          className={`absolute ${s.dot} ${DOT_COLORS[statusDot]} rounded-full border-2 border-white`}
        />
      )}
    </div>
  );
}

/* ── Avatar group ── */

interface AvatarGroupProps {
  users: Array<{ firstName?: string; lastName?: string; src?: string }>;
  max?: number;
  size?: AvatarSize;
}

export function AvatarGroup({ users, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const rest = users.length - max;

  return (
    <div className="flex -space-x-2">
      {visible.map((u, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">
          <Avatar firstName={u.firstName} lastName={u.lastName} src={u.src} size={size} />
        </div>
      ))}
      {rest > 0 && (
        <div
          className={`${SIZES[size].wrapper} rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-semibold ${SIZES[size].text} ring-2 ring-white`}
        >
          +{rest}
        </div>
      )}
    </div>
  );
}
