'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, Search, X } from 'lucide-react';
import { getCompanySummaries, type CompanySummary } from '@/lib/data/client';
import { useSparkline } from '@/lib/data/use-series';
import { cx, num } from '@/lib/utils';
import { EmptyState } from '@/components/ui/primitives';
import { DataUnavailable } from '@/components/ui/Provenance';

type SortKey = 'ticker' | 'close' | 'changePct' | 'volume' | 'marketCap';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'marketCap', label: 'Cap' },
  { key: 'close', label: 'Close' },
  { key: 'changePct', label: 'Session' },
  { key: 'volume', label: 'Volume' },
  { key: 'ticker', label: 'Ticker' },
];

function sortValue(c: CompanySummary, key: SortKey): number | string {
  switch (key) {
    case 'ticker':
      return c.ticker;
    case 'close':
      return c.close.value ?? Number.NEGATIVE_INFINITY;
    case 'changePct':
      return c.changePct.value ?? Number.NEGATIVE_INFINITY;
    case 'volume':
      return c.volume.value ?? Number.NEGATIVE_INFINITY;
    case 'marketCap':
      return c.marketCap.value ?? Number.NEGATIVE_INFINITY;
  }
}

export function CompanyTable() {
  const [all, setAll] = useState<CompanySummary[] | null>(null);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('marketCap');
  const [dir, setDir] = useState<1 | -1>(-1);

  useEffect(() => {
    let on = true;
    void getCompanySummaries().then((r) => {
      if (on) setAll(r);
    });
    return () => {
      on = false;
    };
  }, []);

  const sectors = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of all ?? []) {
      if (c.sector) m.set(c.sector, (m.get(c.sector) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [all]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const filtered = (all ?? []).filter((c) => {
      if (sector && c.sector !== sector) return false;
      if (!term) return true;
      return (
        c.ticker.toLowerCase().includes(term) ||
        c.name.toLowerCase().includes(term) ||
        (c.nameFr ?? '').toLowerCase().includes(term)
      );
    });
    const sorted = [...filtered].sort((a, b) => {
      const av = sortValue(a, sort);
      const bv = sortValue(b, sort);
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv);
      return (av as number) - (bv as number);
    });
    return dir === 1 ? sorted.reverse() : sorted;
  }, [all, q, sector, sort, dir]);

  const toggle = (k: SortKey) => {
    if (k === sort) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSort(k);
      setDir(k === 'ticker' ? 1 : -1);
    }
  };

  const active = q.trim() !== '' || sector !== null;

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-line pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search ticker or issuer"
            className="w-full border border-line bg-transparent py-2 pl-9 pr-8 text-xs text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
          />
          {q ? (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggle(s.key)}
              className={cx(
                'flex shrink-0 items-center gap-1 px-2 py-1 font-mono text-2xs uppercase tracking-[0.1em] transition-colors',
                sort === s.key ? 'text-accent' : 'text-ink-faint hover:text-ink-soft',
              )}
            >
              {s.label}
              {sort === s.key ? <ArrowUpDown className="h-2.5 w-2.5" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-line py-3">
        <button
          type="button"
          onClick={() => setSector(null)}
          className={cx(
            'border px-2.5 py-1 text-2xs transition-colors',
            sector === null
              ? 'border-accent text-accent'
              : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
          )}
        >
          All ({all?.length ?? 0})
        </button>
        {sectors.map(([name, n]) => (
          <button
            key={name}
            type="button"
            onClick={() => setSector(sector === name ? null : name)}
            className={cx(
              'border px-2.5 py-1 text-2xs transition-colors',
              sector === name
                ? 'border-accent text-accent'
                : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
            )}
          >
            {name} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>

      {!all ? (
        <p className="py-10 text-center text-xs text-ink-mute">Loading cached issuers…</p>
      ) : rows.length === 0 ? (
        <EmptyState
          title={active ? 'No match' : 'No issuers cached'}
          description={
            active
              ? 'No cached issuer matches that filter.'
              : 'The pipeline has not cached any issuer summaries yet.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem]">
            <thead>
              <tr className="border-b border-line">
                <th className="py-2.5 pr-4 text-left font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Issuer
                </th>
                <th className="py-2.5 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Close
                </th>
                <th className="py-2.5 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Session
                </th>
                <th className="hidden py-2.5 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint sm:table-cell">
                  Volume
                </th>
                <th className="py-2.5 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Cap
                </th>
                <th className="py-2.5 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Range
                </th>
                <th className="py-2.5 pl-4 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  Sector
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <CompanyRow key={c.ticker} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {all && all.length > 0 ? (
        <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
          {rows.length} of {all.length} cached issuers. Close, session change, volume and capitalisation
          are as published by Casablanca Bourse for the latest snapshot session; the range bar shows the
          position of the latest close within the cached 52-week high and low. Issuers with no traded
          session in the snapshot show values as unavailable rather than zero.
        </p>
      ) : null}
    </div>
  );
}

function CompanyRow({ c }: { c: CompanySummary }) {
  const spark = useSparkline(c.ticker, 40);
  const up = (c.changePct.value ?? 0) >= 0;

  const high = c.high52.value;
  const low = c.low52.value;
  const rangePos =
    high == null || low == null || c.close.value == null || high === low
      ? null
      : ((c.close.value - low) / (high - low)) * 100;

  const min = spark.data.length ? Math.min(...spark.data) : 0;
  const max = spark.data.length ? Math.max(...spark.data) : 1;
  const span = max - min || 1;

  return (
    <tr className="group border-b border-line last:border-b-0">
      <td className="py-3.5 pr-4">
        <Link href={`/companies/${c.ticker}`} className="flex items-center gap-3">
          <span className="relative flex h-7 w-7 shrink-0 items-center justify-center border border-line font-mono text-[0.5625rem] uppercase tracking-[0.06em] text-tCompany transition-colors duration-200 group-hover:border-tCompany/50">
            {c.ticker.slice(0, 4)}
          </span>
          <span className="min-w-0">
            <span className="num block text-sm font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-accent">
              {c.ticker}
            </span>
            <span className="block truncate text-2xs text-ink-mute">{c.nameFr || c.name}</span>
          </span>
        </Link>
      </td>
      <td className="num py-3.5 text-right text-sm tabular-nums text-ink-soft">
        {c.close.value == null ? (
          <span className="text-2xs text-ink-faint">n/a</span>
        ) : (
          num(c.close.value)
        )}
      </td>
      <td
        className={cx(
          'num py-3.5 text-right text-sm tabular-nums',
          c.changePct.value == null ? 'text-ink-faint' : up ? 'text-pos' : 'text-neg',
        )}
      >
        {c.changePct.value == null ? (
          <span className="text-2xs">n/a</span>
        ) : (
          <>
            {up ? '+' : ''}
            {c.changePct.value.toFixed(2)}%
          </>
        )}
      </td>
      <td className="num hidden py-3.5 text-right text-sm tabular-nums text-ink-soft sm:table-cell">
        {c.volume.value == null ? (
          <span className="text-2xs text-ink-faint">n/a</span>
        ) : (
          Math.round(c.volume.value).toLocaleString('en-US')
        )}
      </td>
      <td className="num py-3.5 text-right text-sm tabular-nums text-ink-soft">
        {c.marketCap.value == null ? (
          <span className="text-2xs text-ink-faint">n/a</span>
        ) : (
          <>
            {num(c.marketCap.value / 1e9, 2)}
            <span className="ml-1 text-2xs text-ink-faint">B</span>
          </>
        )}
      </td>
      <td className="py-3.5 text-right align-middle">
        <span className="flex items-center justify-end gap-3">
          <span className="hidden w-16 sm:block">
            <span className="relative block h-[3px] bg-ink/[0.08]">
              {rangePos == null ? (
                <span className="absolute inset-0 block" />
              ) : (
                <span
                  className={cx('absolute inset-y-0 w-[3px]', up ? 'bg-pos' : 'bg-neg')}
                  style={{ left: `${Math.max(0, Math.min(100, rangePos))}%` }}
                />
              )}
            </span>
          </span>
          {spark.data.length > 2 ? (
            <svg width={64} height={22} viewBox="0 0 64 22" aria-hidden className="shrink-0">
              <path
                d={spark.data
                  .map((v, i) => {
                    const x = (i / (spark.data.length - 1)) * 64;
                    const y = 22 - ((v - min) / span) * 20 - 1;
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                  })
                  .join(' ')}
                fill="none"
                stroke={up ? 'rgb(var(--c-pos))' : 'rgb(var(--c-neg))'}
                strokeWidth={1.15}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.55}
                className="transition-opacity duration-200 group-hover:opacity-100"
              />
            </svg>
          ) : (
            <span className="w-16 shrink-0 text-right text-[0.5625rem] text-ink-faint">no history</span>
          )}
        </span>
      </td>
      <td className="py-3.5 pl-4 text-right">
        {c.sector ? (
          <span className="font-mono text-2xs uppercase tracking-[0.1em] text-ink-mute">{c.sector}</span>
        ) : (
          <DataUnavailable compact reason="AMMC has not published a sector for this issuer." />
        )}
      </td>
    </tr>
  );
}