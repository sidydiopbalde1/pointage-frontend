/* Shared skeleton components — replaces the local Skeleton defined in every page */

interface SkeletonProps {
  className?: string;
}

/* ── Base skeleton block ── */
export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

/* ── Pre-built skeletons for common shapes ── */

export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md', shape = 'circle' }: { size?: 'sm' | 'md' | 'lg'; shape?: 'circle' | 'rounded' }) {
  const sizes = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' };
  const shapes = { circle: 'rounded-full', rounded: 'rounded-xl' };
  return <Skeleton className={`${sizes[size]} ${shapes[shape]} shrink-0`} />;
}

export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 ${className}`}>
      <div className="flex items-center gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton className="h-4 w-28 mb-1.5" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <Skeleton className={`h-4 ${i === 0 ? 'w-28' : i === cols - 1 ? 'w-16 rounded-full' : 'w-20'}`} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonStatCard({ className = '' }: SkeletonProps) {
  return (
    <div className={`bg-white rounded-2xl p-5 border border-slate-100 ${className}`}>
      <Skeleton className="w-11 h-11 rounded-xl mb-4" />
      <Skeleton className="h-8 w-16 mb-1.5" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
