'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import {
  getMovers,
  loadIndices,
  loadInstruments,
  provenanceOf,
  type CompanySummary,
  type IndexQuote,
  type Provenance,
} from '@/lib/data/client';
import { useSparkline } from '@/lib/data/use-series';
import { cx, num } from '@/lib/utils';
import { DataUnavailable } from '@/components/ui/Provenance';

interface Cell {
  label: string;
  sub: string;
  value: string;
  unit?: string;
  change?: number | null;
  changePct?: number | null;
  size?: boolean;
}

export function MarketSnapshot() {
  const [indices, setIndices] = useState<IndexQuote[] | null>(null);
  const [turnover, setTurnover] = useState<number | null>(null);
  const [listed, setListed] = useState<number | null>(null);
  const [prov, setProv] = useState<Provenance | null>(null);

  useEffect(() => {
    let on = true;
    void loadIndices().then((snap) => {
      if (!on || !snap) return;
      setIndices(snap.data.indices);
      setProv(provenanceOf(snap, 'REAL'));
    });
    void loadInstruments().then((snap) => {
      if (!on || !snap) return;
      setTurnover(snap.data.aggregateTurnover);
      const action = (snap.data.officialCounts ?? []).find(
        (c) => c.instrumentType === 'Action',
      );
      setListed(action?.numberOfInstruments ?? null);
    });
    return () => {
      on = false;
    };
  }, []);

  const masi = indices?.find((i) => i.code === 'MASI') ?? null;
  const masi20 = indices?.find((i) => i.code === 'MASI20') ?? null;

  const cells = useMemo<Cell[]>(() => {
    const out: Cell[] = [];
    for (const ix of [masi, masi20]) {
      if (!ix) continue;
      out.push({
        label: ix.code,
        sub: ix.nameEn ?? ix.nameFr,
        value: ix.value == null ? '—' : num(ix.value, 2),
        change:
          ix.value != null && ix.previousClose != null ? ix.value - ix.previousClose : null,
        changePct: ix.changePct,
        size: true,
      });
    }
    out.push({
      label: 'Turnover',
      sub: 'Value traded, published session',
      value: turnover == null ? '—' : num(turnover / 1e6, 1),
      unit: 'M MAD',
    });
    out.push({
      label: 'Listed',
      sub: 'Equities admitted to trading',
      value: listed == null ? '—' : String(listed),
      unit: 'instruments',
    });
    return out;
  }, [masi, masi20, turnover, listed]);

  return (
    <section className="relative">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="label mb-3">Market snapshot</div>
          <h2 className="font-display text-2xl font-semibold tracking-tightest text-ink sm:text-3xl">
            Casablanca indices
          </h2>
        </div>
        {prov?.retrievedAt ? (
          <div className="hidden items-center gap-2 font-mono text-2xs text-ink-faint sm:flex">
            <span className="h-1 w-1 rounded-full bg-ink-faint" />
            Official levels · {prov.retrievedAt.slice(0, 10)}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 divide-line border-b border-line sm:divide-x lg:grid-cols-4">
        {cells.map((c, i) => {
          const up = (c.changePct ?? 0) >= 0;
          return (
            <div
              key={c.label}
              className={cx(
                'px-0 py-6 sm:px-5 lg:px-6',
                i % 2 === 1 && 'border-l border-line sm:border-l-0',
                i < 2 && 'border-b border-line lg:border-b-0',
                i === 2 && 'sm:border-l sm:border-line',
              )}
            >
              <div className="flex items-baseline gap-2">
                <span className="label text-ink-soft">{c.label}</span>
                <span className="ml-auto hidden h-3 w-px bg-line lg:block" />
              </div>
              <div className="mt-3 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <span
                  className={cx(
                    'num font-medium leading-none tracking-tight text-ink',
                    c.size ? 'text-[1.75rem] sm:text-[2rem]' : 'text-2xl',
                  )}
                >
                  {c.value}
                </span>
                {c.unit ? <span className="num text-xs text-ink-mute">{c.unit}</span> : null}
              </div>
              {c.change != null && c.changePct != null ? (
                <div
                  className={cx(
                    'num mt-2 flex items-center gap-1.5 text-xs tabular-nums',
                    up ? 'text-pos' : 'text-neg',
                  )}
                >
                  {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {up ? '+' : ''}
                  {num(c.change)}
                  <span className="opacity-70">
                    ({up ? '+' : ''}
                    {c.changePct.toFixed(2)}%)
                  </span>
                </div>
              ) : (
                <div className="mt-2 h-4" />
              )}
              <p className="mt-2 text-[0.6875rem] text-ink-faint">{c.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <DataUnavailable
          reason="Casablanca Bourse publishes index levels but no free historical series endpoint. MASI and MASI20 are therefore shown as official levels only — no index chart is drawn and no index return or beta is computed from a reconstructed series."
        />
      </div>

      {prov ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-line pt-5">
          <p className="max-w-2xl text-[0.6875rem] leading-relaxed text-ink-faint">
            Source: {prov.source}. Retrieved {prov.retrievedAt?.slice(0, 10)}. Levels are as
            published by the exchange for the latest snapshot session.
          </p>
        </div>
      ) : null}
    </section>
  );
}

/* ── movers ──────────────────────────────────────────────────────────────── */

export function MarketMovers() {
  const [state, setState] = useState<Awaited<ReturnType<typeof getMovers>> | null>(null);

  useEffect(() => {
    let on = true;
    void getMovers(5).then((r) => {
      if (on) setState(r);
    });
    return () => {
      on = false;
    };
  }, []);

  if (!state) {
    return <p className="text-xs text-ink-mute">Loading session movers…</p>;
  }

  if (state.covered === 0) {
    return (
      <DataUnavailable reason="No cached equity published a session change, so no movers can be ranked." />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <MoverColumn title="Gainers" tone="pos" rows={state.gainers} />
      <MoverColumn title="Losers" tone="neg" rows={state.losers} />
    </div>
  );
}

function MoverColumn({
  title,
  tone,
  rows,
}: {
  title: string;
  tone: 'pos' | 'neg';
  rows: CompanySummary[];
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h3>
        <span className={cx('label', tone === 'pos' ? 'text-pos' : 'text-neg')}>
          Latest published session
        </span>
      </div>
      <ul>
        {rows.map((c, i) => (
          <MoverRow key={c.ticker} c={c} rank={i + 1} />
        ))}
      </ul>
    </div>
  );
}

function MoverRow({ c, rank }: { c: CompanySummary; rank: number }) {
  const spark = useSparkline(c.ticker, 40);
  const up = (c.changePct.value ?? 0) >= 0;
  const pct = c.changePct.value;

  return (
    <li className="group border-b border-line">
      <Link
        href={`/companies/${c.ticker}`}
        className="flex items-center gap-4 py-3.5 transition-colors duration-200"
      >
        <span className="num w-4 shrink-0 text-[0.6875rem] tabular-nums text-ink-faint">
          {String(rank).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span className="num text-sm font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-accent">
              {c.ticker}
            </span>
            <span className="truncate text-[0.6875rem] text-ink-mute">{c.nameFr || c.name}</span>
          </span>
        </span>
        {spark.data.length > 2 ? (
          <MoverSpark data={spark.data} up={up} />
        ) : (
          <span className="hidden w-[62px] shrink-0 text-right text-[0.625rem] text-ink-faint sm:block">
            n/a
          </span>
        )}
        <span className="shrink-0 text-right">
          <span className="num block text-xs tabular-nums text-ink-soft">
            {c.close.value == null ? '—' : num(c.close.value)}
          </span>
          <span className={cx('num block text-[0.6875rem] tabular-nums', up ? 'text-pos' : 'text-neg')}>
            {pct == null ? '—' : `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`}
          </span>
        </span>
        <ArrowUpRight
          size={13}
          className="shrink-0 text-ink-faint opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
        />
      </Link>
    </li>
  );
}

function MoverSpark({ data, up }: { data: number[]; up: boolean }) {
  const w = 62;
  const h = 22;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const d = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 2) - 1;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} className="hidden shrink-0 overflow-visible sm:block" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke={up ? 'rgb(var(--c-pos))' : 'rgb(var(--c-neg))'}
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.75}
      />
    </svg>
  );
}