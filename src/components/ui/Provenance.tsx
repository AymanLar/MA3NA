import Link from 'next/link';
import type { DataStatus, Provenance } from '@/lib/data/provenance';
import { cx } from '@/lib/utils';

/**
 * Provenance and availability UI.
 *
 * Rule enforced by these components: a number is never shown without the
 * ability to see where it came from. When the source did not provide a value we
 * render the standard unavailable label instead of a number.
 */

export const STATUS_LABEL: Record<DataStatus, string> = {
  REAL: 'Official source',
  DERIVED: 'Calculated',
  DEMO: 'Placeholder',
  UNAVAILABLE: 'Unavailable',
};

const STATUS_STYLE: Record<DataStatus, string> = {
  REAL: 'border-pos/35 text-pos',
  DERIVED: 'border-accent/40 text-accent',
  DEMO: 'border-line-strong text-ink-mute',
  UNAVAILABLE: 'border-line text-ink-faint',
};

/** Small trust-level badge. */
export function DataStatusPill({ status, className }: { status: DataStatus; className?: string }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.1em]',
        STATUS_STYLE[status],
        className,
      )}
    >
      {status === 'REAL' ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {STATUS_LABEL[status]}
    </span>
  );
}

/**
 * The canonical unavailable treatment.
 *
 * Deliberately says the data is unavailable. It never shows a placeholder
 * number that could be mistaken for a real one.
 */
export function DataUnavailable({
  reason,
  className,
  compact,
}: {
  reason?: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-ink-faint',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
    >
      <span aria-hidden className="inline-block h-px w-3 bg-current" />
      <span>
        <span className="font-medium text-ink-mute">Data unavailable</span>
        {reason ? <span className="text-ink-faint"> — {reason}</span> : null}
      </span>
    </span>
  );
}

/** A figure slot: shows the number with its trust level, or the unavailable label. */
export function Value({
  figure,
  format,
  className,
  showStatus,
}: {
  figure: { value: number | null; status: DataStatus; n?: number | null; method?: string | null };
  format: (v: number) => string;
  className?: string;
  showStatus?: boolean;
}) {
  if (figure.value === null || figure.status === 'UNAVAILABLE') {
    return <DataUnavailable compact className={className} />;
  }
  return (
    <span className={cx('inline-flex items-baseline gap-1.5', className)}>
      <span>{format(figure.value)}</span>
      {showStatus ? <DataStatusPill status={figure.status} /> : null}
    </span>
  );
}

/** Full provenance block: source, retrieval time, period, link. */
export function ProvenanceNote({
  provenance,
  method,
  observations,
  className,
}: {
  provenance: Provenance;
  method?: string | null;
  observations?: number | null;
  className?: string;
}) {
  const p = provenance;
  const retrieved = p.retrievedAt
    ? new Date(p.retrievedAt).toISOString().slice(0, 16).replace('T', ' ')
    : null;

  return (
    <div className={cx('border border-line bg-surface/60 px-3.5 py-3 text-xs leading-relaxed', className)}>
      <dl className="grid gap-x-5 gap-y-1.5 sm:grid-cols-[7rem_1fr]">
        <dt className="text-ink-faint">Source</dt>
        <dd className="text-ink-soft">
          {p.source || 'Not retrieved'}
          {p.sourceUrl ? (
            <>
              {' · '}
              <a
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
              >
                View source
              </a>
            </>
          ) : null}
        </dd>

        <dt className="text-ink-faint">Retrieved</dt>
        <dd className="font-mono text-ink-soft">{retrieved ?? '—'}</dd>

        {p.periodStart || p.periodEnd ? (
          <>
            <dt className="text-ink-faint">Data period</dt>
            <dd className="font-mono text-ink-soft">
              {p.periodStart ?? '—'} → {p.periodEnd ?? '—'}
            </dd>
          </>
        ) : null}

        {method ?? p.method ? (
          <>
            <dt className="text-ink-faint">Method</dt>
            <dd className="text-ink-mute">{method ?? p.method}</dd>
          </>
        ) : null}

        {observations ?? p.observations ? (
          <>
            <dt className="text-ink-faint">Observations</dt>
            <dd className="font-mono text-ink-mute">{observations ?? p.observations}</dd>
          </>
        ) : null}

        {p.quality ? (
          <>
            <dt className="text-ink-faint">Validation</dt>
            <dd className="text-ink-mute">
              {p.quality}
              {p.issues?.length ? (
                <span className="text-ink-faint">
                  {' '}
                  · {p.issues.length} session(s) without a traded price, preserved as gaps
                </span>
              ) : null}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

/** Compact inline provenance for tables and cards. */
export function SourceTag({ provenance }: { provenance: Provenance }) {
  const retrieved = provenance.retrievedAt ? provenance.retrievedAt.slice(0, 10) : null;
  if (provenance.status === 'UNAVAILABLE') return <DataUnavailable compact />;
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] text-ink-faint">
      <span className="text-ink-mute">{provenance.source}</span>
      {retrieved ? <span>· {retrieved}</span> : null}
    </span>
  );
}

/** Empty state used when a source returned nothing at all. */
export function NoData({
  title = 'No data available',
  detail,
  sourceUrl,
  sourceLabel,
}: {
  title?: string;
  detail?: string;
  sourceUrl?: string;
  sourceLabel?: string;
}) {
  return (
    <div className="border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium text-ink-mute">{title}</p>
      {detail ? <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-ink-faint">{detail}</p> : null}
      {sourceUrl ? (
        <Link
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 inline-block font-mono text-2xs uppercase tracking-[0.1em] text-accent"
        >
          {sourceLabel ?? 'View source'} ↗
        </Link>
      ) : null}
    </div>
  );
}
