import { cx } from '@/lib/utils';

/** Eight-pointed zellige star, used as a whisper-quiet background motif. */
export function ZelligeMotif({
  className,
  opacity = 0.05,
  size = 120,
}: {
  className?: string;
  opacity?: number;
  size?: number;
}) {
  return (
    <svg
      aria-hidden
      className={cx('pointer-events-none absolute', className)}
      style={{ opacity }}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round">
        <path d="M50 4 L62 22 L82 18 L78 38 L96 50 L78 62 L82 82 L62 78 L50 96 L38 78 L18 82 L22 62 L4 50 L22 38 L18 18 L38 22 Z" />
        <path d="M50 22 L58 33 L71 31 L69 44 L78 50 L69 56 L71 69 L58 67 L50 78 L42 67 L29 69 L31 56 L22 50 L31 44 L29 31 L42 33 Z" />
        <rect x="36" y="36" width="28" height="28" transform="rotate(45 50 50)" />
      </g>
    </svg>
  );
}

/** Repeating interlaced band — used along section edges. */
export function ZelligeBand({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cx('pointer-events-none h-3 w-full text-accent', className)}
      viewBox="0 0 240 12"
      preserveAspectRatio="none"
      fill="none"
    >
      <g stroke="currentColor" strokeWidth="0.9" opacity="0.7">
        <path d="M0 12 L12 0 L24 12 L36 0 L48 12 L60 0 L72 12 L84 0 L96 12 L108 0 L120 12 L132 0 L144 12 L156 0 L168 12 L180 0 L192 12 L204 0 L216 12 L228 0 L240 12" />
      </g>
    </svg>
  );
}

export function CompassRose({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      className={cx('pointer-events-none text-accent', className)}
      viewBox="0 0 64 64"
      fill="none"
    >
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 4" />
      <path d="M32 8 L36 28 L32 32 L28 28 Z" fill="currentColor" opacity="0.9" />
      <path d="M32 56 L28 36 L32 32 L36 36 Z" fill="currentColor" opacity="0.35" />
      <path d="M8 32 L28 28 L32 32 L28 36 Z" fill="currentColor" opacity="0.3" />
      <path d="M56 32 L36 36 L32 32 L36 28 Z" fill="currentColor" opacity="0.3" />
    </svg>
  );
}