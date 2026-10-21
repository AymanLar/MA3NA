'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import {
  getMostTraded,
  getSectorSummaries,
  loadIndices,
  provenanceOf,
  type CompanySummary,
  type IndexQuote,
  type SectorSummary,
  type Provenance,
} from '@/lib/data/client';
import { useSparkline, RANGES, RANGE_LABEL, type RangeKey } from '@/lib/data/use-series';
import { cx, num, plainPct } from '@/lib/utils';
import { Sparkline } from '@/components/charts/Sparkline';
import { DataUnavailable, ProvenanceNote } from '@/components/ui/Provenance';

/* ── range tabs ───────────────────────────────────────────────────────────── */

export function RangeTabs({
  range,
  onChange,
}: {
  range: RangeKey;
  onChange: (r: RangeKey) => void;
}) {
  return (
    <div className="flex items-center gap-1 border border-line p-1">
      {(Object.keys(RANGES) as RangeKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cx(
            'num px-2 py-1 text-2xs tracking-[0.12em] transition-colors',
            range === k ? 'bg-accent/15 text-accent' : 'text-ink-mute hover:text-ink',
          )}
        >
          {k}
        </button>
      ))}
    </div>
  );
}

/* ── official index levels ────────────────────────────────────────────────── */

function IndexRow({ ix }: { ix: IndexQuote }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <div className="num text-2xs uppercase tracking-[0.12em] text-ink-mute">{ix.code}</div>
        <div className="truncate text-xs text-ink">{ix.nameEn ?? ix.nameFr}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="num text-xs tabular-nums text-ink">{ix.value === null ? '—' : num(ix.value, 4)}</div>
        <div
          className={cx(
            'num text-2xs tabular-nums',
            (ix.changePct ?? 0) >= 0 ? 'text-pos' : 'text-neg',
          )}
        >
          {(ix.changePct ?? 0) >= 0 ? '+' : ''}
          {(ix.changePct ?? 0).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

export function IndexBoard() {
  const [indices, setIndices] = useState<IndexQuote[] | null>(null);
  const [prov, setProv] = useState<Provenance | null>(null);

  useEffect(() => {
    let on = true;
    void loadIndices().then((snap) => {
      if (!on || !snap) return;
      setIndices(snap.data.indices);
      setProv(provenanceOf(snap, 'REAL'));
    });
    return () => {
      on = false;
    };
  }, []);

  const groups = useMemo(() => {
    const map = new Map<string, IndexQuote[]>();
    for (const ix of indices ?? []) {
      const k = ix.category ?? 'Other';
      (map.get(k) ?? map.set(k, []).get(k)!).push(ix);
    }
    return [...map.entries()].map(([k, v]) => [k, v.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))] as const);
  }, [indices]);

  if (!indices) {
    return (
      <div className="border border-line p-6">
        <p className="text-xs text-ink-mute">Loading cached index levels…</p>
      </div>
    );
  }

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
          Official index levels
        </h3>
        <span className="label">{indices.length} indices · exchange published</span>
      </div>

      <div className="grid gap-x-8 gap-y-6 p-6 md:grid-cols-2">
        {groups.map(([category, list]) => (
          <div key={category}>
            <h4 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">
              {category}
            </h4>
            <div className="mt-1 divide-y divide-line/60">
              {list.map((ix) => (
                <IndexRow key={ix.code} ix={ix} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line px-6 py-4">
        <DataUnavailable
          compact
          reason="Casablanca Bourse publishes index levels but no free historical series endpoint, so these indices are shown as levels only — no index chart and no MASI beta are computed."
        />
        {prov ? <ProvenanceNote provenance={prov} className="mt-3" /> : null}
      </div>
    </div>
  );
}

/* ── sector performance ───────────────────────────────────────────────────── */

function SectorRow({
  s,
  range,
}: {
  s: SectorSummary;
  range: RangeKey;
}) {
  const spark = useSparkline(s.tickers[0] ?? null, 48);
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-2 pr-3">
        <Link href={`/sectors/${s.slug}`} className="text-xs text-ink hover:text-accent">
          {s.name}
        </Link>
        <div className="text-2xs text-ink-faint">{s.tickers.length} listed</div>
      </td>
      <td className="num py-2 pr-3 text-right text-xs tabular-nums text-ink-soft">
        {s.changePct.value === null ? (
          <span className="text-ink-faint">Data unavailable</span>
        ) : (
          <span className={s.changePct.value >= 0 ? 'text-pos' : 'text-neg'}>
            {(s.changePct.value >= 0 ? '+' : '') + s.changePct.value.toFixed(2)}%
          </span>
        )}
      </td>
      <td className="num hidden py-2 pr-3 text-right text-xs tabular-nums text-ink-soft sm:table-cell">
        {s.totalMarketCap.value === null ? '—' : num(s.totalMarketCap.value / 1e9, 1) + 'bn'}
      </td>
      <td className="hidden py-2 text-right md:table-cell">
        {spark.data.length > 2 ? (
          <span className="inline-flex">
            <Sparkline
              data={spark.data}
              width={92}
              height={24}
              color={s.changePct.value !== null && s.changePct.value < 0 ? 'rgb(var(--c-neg))' : 'rgb(var(--c-pos))'}
            />
          </span>
        ) : (
          <span className="text-2xs text-ink-faint">{RANGE_LABEL[range]}</span>
        )}
      </td>
    </tr>
  );
}

export function SectorPerformance({ range = '3A' }: { range?: RangeKey }) {
  const [rows, setRows] = useState<SectorSummary[] | null>(null);

  useEffect(() => {
    let on = true;
    void getSectorSummaries().then((r) => {
      if (on) setRows(r);
    });
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">
          Sector composition
        </h3>
        <span className="label">AMMC classification</span>
      </div>

      {!rows ? (
        <p className="p-6 text-xs text-ink-mute">Loading sectors…</p>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <DataUnavailable reason="No listed company matched an AMMC sector classification in the cached snapshot." />
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="p-6 pb-2 text-left font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint">
                Sector
              </th>
              <th className="p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint">
                Session
              </th>
              <th className="hidden p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint sm:table-cell">
                Capitalisation
              </th>
              <th className="hidden p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint md:table-cell">
                Trend
              </th>
            </tr>
          </thead>
          <tbody className="px-6">
            {rows.map((s) => (
              <SectorRow key={s.slug} s={s} range={range} />
            ))}
          </tbody>
        </table>
      )}

      <div className="border-t border-line px-6 py-4">
        <p className="text-2xs leading-relaxed text-ink-faint">
          Sector change is an equal-weighted mean of member session changes, derived here. It is not
          an exchange-published sector index. Trend sparklines show the first listed member only,
          over {RANGE_LABEL[range].toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

/* ── most traded ──────────────────────────────────────────────────────────── */

function MostTradedRow({ c, range }: { c: CompanySummary; range: RangeKey }) {
  const spark = useSparkline(c.ticker, 40);
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="py-2 pr-3">
        <div className="flex items-baseline gap-2">
          <span className="num text-xs font-semibold text-ink">{c.ticker}</span>
          <Link href={`/companies/${c.ticker}`} className="truncate text-xs text-ink-mute hover:text-accent">
            {c.nameFr || c.name}
          </Link>
        </div>
      </td>
      <td className="num py-2 pr-3 text-right text-xs tabular-nums text-ink-soft">
        {c.close.value === null ? (
          <span className="text-ink-faint">Data unavailable</span>
        ) : (
          num(c.close.value)
        )}
      </td>
      <td className="num hidden py-2 pr-3 text-right text-xs tabular-nums sm:table-cell">
        <span className={c.changePct.value !== null && c.changePct.value < 0 ? 'text-neg' : 'text-pos'}>
          {c.changePct.value === null ? '—' : (c.changePct.value >= 0 ? '+' : '') + c.changePct.value.toFixed(2) + '%'}
        </span>
      </td>
      <td className="num hidden py-2 pr-3 text-right text-xs tabular-nums text-ink-mute md:table-cell">
        {c.turnover.value === null ? '—' : Math.round(c.turnover.value).toLocaleString('en-US')}
      </td>
      <td className="hidden py-2 text-right md:table-cell">
        {spark.data.length > 2 ? (
          <span className="inline-flex">
            <Sparkline
              data={spark.data}
              width={88}
              height={24}
              color={c.changePct.value !== null && c.changePct.value < 0 ? 'rgb(var(--c-neg))' : 'rgb(var(--c-pos))'}
            />
          </span>
        ) : (
          <span className="text-2xs text-ink-faint">{RANGE_LABEL[range]}</span>
        )}
      </td>
    </tr>
  );
}

export function MostTraded({ range = '1M' }: { range?: RangeKey }) {
  const [rows, setRows] = useState<CompanySummary[] | null>(null);

  useEffect(() => {
    let on = true;
    void getMostTraded(10).then((r) => {
      if (on) setRows(r);
    });
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="border border-line">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Most traded</h3>
        <span className="label">by published turnover</span>
      </div>
      {!rows ? (
        <p className="p-6 text-xs text-ink-mute">Loading most traded…</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-line">
              <th className="p-6 pb-2 text-left font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint">Instrument</th>
              <th className="p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint">Close</th>
              <th className="hidden p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint sm:table-cell">Session</th>
              <th className="hidden p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint md:table-cell">Turnover</th>
              <th className="hidden p-6 pb-2 text-right font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint md:table-cell">Trend</th>
            </tr>
          </thead>
          <tbody className="px-6">
            {rows.map((c) => (
              <MostTradedRow key={c.ticker} c={c} range={range} />
            ))}
          </tbody>
        </table>
      )}
      <div className="border-t border-line px-6 py-4">
        <p className="text-2xs leading-relaxed text-ink-faint">
          Turnover is the value traded in the latest published session. Trend shows {RANGE_LABEL[range].toLowerCase()}.
        </p>
      </div>
    </div>
  );
}

/* ── provenance note ──────────────────────────────────────────────────────── */

export function LegendNote({ provenance }: { provenance?: Provenance | null }) {
  return (
    <div className="border border-line p-6">
      <h3 className="font-display text-base font-semibold tracking-tight text-ink">About these numbers</h3>
      <p className="mt-2 text-xs leading-relaxed text-ink-mute">
        Every figure on this page comes from a cached snapshot of Casablanca Bourse and AMMC
        publications. Nothing is simulated. Where a value is not published it is shown as{' '}
        <span className="text-ink-faint">Data unavailable</span> rather than estimated.
      </p>
      {provenance ? <ProvenanceNote provenance={provenance} className="mt-3" /> : null}
      <a
        href="https://www.casablanca-bourse.com/en/market-data/Cours"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
      >
        Exchange source <ArrowUpRight className="h-3 w-3" />
      </a>
    </div>
  );
}

export { plainPct };