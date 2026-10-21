import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cx, pct } from '@/lib/utils';

/* ── page scaffolding ────────────────────────────────────────────────────── */

export function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto w-full max-w-shell px-5 sm:px-7 lg:px-10', className)}>{children}</div>;
}

export function Section({
  children,
  className,
  id,
  tight,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tight?: boolean;
}) {
  return (
    <section id={id} className={cx('relative', tight ? 'py-10 sm:py-12' : 'py-16 sm:py-20 lg:py-24', className)}>
      {children}
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('label flex items-center gap-2.5', className)}>
      <span className="h-px w-5 bg-accent/70" />
      {children}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow className="mb-4">{eyebrow}</Eyebrow> : null}
        <h2 className="font-display text-3xl font-semibold leading-[1.08] tracking-tightest text-ink sm:text-[2.6rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-4 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <div className={cx('rule', className)} />;
}

/* ── data display ────────────────────────────────────────────────────────── */

export function Delta({
  value,
  suffix = '%',
  size = 'sm',
  className,
  showSign = true,
}: {
  value: number;
  suffix?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showSign?: boolean;
}) {
  const sizes = {
    xs: 'text-[0.6875rem]',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg',
  };
  return (
    <span
      className={cx(
        'num font-medium tabular-nums',
        sizes[size],
        value > 0 ? 'text-pos' : value < 0 ? 'text-neg' : 'text-ink-mute',
        className,
      )}
    >
      {showSign && value > 0 ? '+' : ''}
      {pct(value).replace('+', '')}
      {suffix}
    </span>
  );
}

export function Stat({
  label,
  value,
  sub,
  delta,
  className,
  align = 'left',
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: number;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={cx(align === 'right' && 'text-right', className)}>
      <div className="label">{label}</div>
      <div className="mt-2 flex items-baseline gap-2.5">
        <span className="num text-xl font-medium tracking-tight text-ink sm:text-[1.375rem]">{value}</span>
        {delta !== undefined ? <Delta value={delta} /> : null}
      </div>
      {sub ? <div className="mt-1.5 text-xs text-ink-mute">{sub}</div> : null}
    </div>
  );
}

export function Metric({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cx('group', className)}>
      <div className="label">{label}</div>
      <div className="num mt-2 text-[1.0625rem] font-medium text-ink">{value}</div>
      {hint ? <div className="mt-1 text-[0.6875rem] text-ink-faint">{hint}</div> : null}
    </div>
  );
}

export function Tag({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'pos' | 'neg' | 'company' | 'sector' | 'commodity' | 'country' | 'event';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-line text-ink-soft',
    accent: 'border-accent/35 text-accent',
    pos: 'border-pos/35 text-pos',
    neg: 'border-neg/35 text-neg',
    company: 'border-tCompany/35 text-tCompany',
    sector: 'border-tSector/35 text-tSector',
    commodity: 'border-tCommodity/35 text-tCommodity',
    country: 'border-tCountry/35 text-tCountry',
    event: 'border-tEvent/35 text-tEvent',
  };
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-[3px] font-mono text-2xs uppercase tracking-[0.1em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SourceBadge({ className, label = 'Official data' }: { className?: string; label?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 border border-accent/30 bg-accent/[0.07] px-2 py-1 font-mono text-2xs uppercase tracking-[0.14em] text-accent',
        className,
      )}
    >
      <span className="h-1 w-1 rounded-full bg-accent" />
      {label}
    </span>
  );
}

/* ── interaction ─────────────────────────────────────────────────────────── */

export function TextLink({
  href,
  children,
  className,
  external,
}: {
  href: string;
  children: ReactNode;
  className?: string;
  external?: boolean;
}) {
  const base =
    'group/link inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors duration-200 hover:text-accent';
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cx(base, className)}>
        {children}
        <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
      </a>
    );
  }
  return (
    <Link href={href} className={cx(base, className)}>
      {children}
      <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
    </Link>
  );
}

export function GhostButton({
  children,
  onClick,
  className,
  title,
  active,
  as = 'button',
  href,
  type = 'button',
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
  active?: boolean;
  as?: 'button' | 'a';
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  const cls = cx(
    'inline-flex h-8 items-center gap-2 border px-2.5 font-mono text-2xs uppercase tracking-[0.12em] transition-all duration-200',
    active
      ? 'border-accent/50 bg-accent/10 text-accent'
      : 'border-line text-ink-mute hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink',
    disabled && 'pointer-events-none opacity-40',
    className,
  );
  if (as === 'a') {
    return (
      <a href={href} className={cls} title={title}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} onClick={onClick} className={cls} title={title} disabled={disabled} aria-pressed={active}>
      {children}
    </button>
  );
}

/* ── states ──────────────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} />;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center border border-dashed border-line px-6 py-14 text-center',
        className,
      )}
    >
      <div className="relative mb-5 flex h-11 w-11 items-center justify-center">
        <span className="absolute inset-0 rotate-45 border border-line" />
        {icon ? <span className="relative text-ink-faint">{icon}</span> : null}
      </div>
      <p className="font-display text-base font-medium text-ink">{title}</p>
      {description ? <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-mute">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-2xs uppercase tracking-[0.14em] text-ink-mute">
      {items.map((it, i) => (
        <span key={it.label} className="flex items-center gap-2">
          {i > 0 ? <span className="text-ink-faint">/</span> : null}
          {it.href ? (
            <Link href={it.href} className="transition-colors hover:text-accent">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink-soft">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}