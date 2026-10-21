'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EconomicGraph } from '@/components/graph/EconomicGraph';
import {
  getCompanySummaries,
  getEvents,
  getRegistry,
  type CompanySummary,
  type EventItem,
  type RegistryRelation,
} from '@/lib/data/client';
import { useSeries, type RangeKey } from '@/lib/data/use-series';
import { cx, formatDateLong, num } from '@/lib/utils';
import { PriceChart } from '@/components/charts/Charts';
import { RangeTabs } from '@/components/market/MarketTables';
import { DataUnavailable } from '@/components/ui/Provenance';
import { Tag } from '@/components/ui/primitives';

/* ── sector price panel ───────────────────────────────────────────────────── */

/**
 * A sector has no published price series of its own, so this charts the real
 * traded close history of one named member. It is a member chart, labelled as
 * such, not a sector index.
 */
export function SectorPricePanel({ id }: { id: string }) {
  const [range, setRange] = useState<RangeKey>('1A');
  const [members, setMembers] = useState<CompanySummary[] | null>(null);
  const [lead, setLead] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    void (async () => {
      const [reg, companies] = await Promise.all([getRegistry(), getCompanySummaries()]);
      if (!on) return;
      const byTicker = new Map(companies.map((c) => [c.ticker, c]));
      const tickers = reg.relations
        .filter((r) => r.to === id && r.kind === 'classified_in')
        .map((r) => r.from.replace(/^eq:/, ''))
        .filter((t) => byTicker.has(t));
      setMembers(tickers.map((t) => byTicker.get(t)!));
      setLead(tickers[0] ?? null);
    })();
    return () => {
      on = false;
    };
  }, [id]);

  const leadSeries = useSeries(lead, range);

  const chart = useMemo(
    () =>
      leadSeries.observations
        .filter((o) => o.close !== null)
        .map((o) => ({ t: o.date, v: o.close as number })),
    [leadSeries.observations],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xs text-ink-mute">
          {members === null
            ? 'Loading members…'
            : `${members.length} listed members · showing ${lead ?? 'no instrument'}`}
        </p>
        <RangeTabs range={range} onChange={setRange} />
      </div>

      {!members ? null : members.length === 0 ? (
        <DataUnavailable reason="No cached issuer is classified into this sector by AMMC." />
      ) : (
        <>
          <PriceChart
            data={chart}
            height={280}
            xKey="t"
            name={`${lead} close (MAD)`}
            color={
              (leadSeries.metrics?.totalReturn.value ?? 0) >= 0
                ? 'rgb(var(--c-pos))'
                : 'rgb(var(--c-neg))'
            }
          />
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {members.map((m) => (
              <button
                key={m.ticker}
                type="button"
                onClick={() => setLead(m.ticker)}
                className={cx(
                  'num border px-2 py-1 text-2xs transition-colors',
                  m.ticker === lead
                    ? 'border-accent text-accent'
                    : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
                )}
              >
                {m.ticker}
              </button>
            ))}
          </div>
          <DataUnavailable
            className="mt-5"
            compact
            reason="Casablanca Bourse publishes sectoral index levels but no free historical sector series, so this chart is the published close history of one selected member, not a sector index."
          />
        </>
      )}
    </div>
  );
}

/* ── network ──────────────────────────────────────────────────────────────── */

export function SectorNetwork({ id }: { id: string }) {
  return <EconomicGraph rootId={id} depth={2} height="h-[520px]" showPanel={false} />;
}

/* ── member table ─────────────────────────────────────────────────────────── */

export function SectorEntities({ id }: { id: string }) {
  const [members, setMembers] = useState<CompanySummary[] | null>(null);
  const [relations, setRelations] = useState<RegistryRelation[]>([]);

  useEffect(() => {
    let on = true;
    void (async () => {
      const [reg, companies] = await Promise.all([getRegistry(), getCompanySummaries()]);
      if (!on) return;
      const byTicker = new Map(companies.map((c) => [c.ticker, c]));
      const rels = reg.relations.filter((r) => r.to === id && r.kind === 'classified_in');
      setRelations(rels);
      setMembers(
        rels
          .map((r) => byTicker.get(r.from.replace(/^eq:/, '')))
          .filter((c): c is CompanySummary => Boolean(c)),
      );
    })();
    return () => {
      on = false;
    };
  }, [id]);

  if (!members) return <p className="text-xs text-ink-mute">Loading members…</p>;
  if (members.length === 0) {
    return (
      <DataUnavailable reason="No cached issuer is classified into this sector by AMMC." />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem]">
        <thead>
          <tr className="border-b border-line">
            {['Issuer', 'Close', 'Session', 'Cap', 'Basis'].map((h, i) => (
              <th
                key={h}
                className={`py-2.5 font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint ${
                  i === 0 ? 'text-left' : 'text-right'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const rel = relations.find((r) => r.from === `eq:${m.ticker}`);
            const up = (m.changePct.value ?? 0) >= 0;
            return (
              <tr key={m.ticker} className="group border-b border-line last:border-0">
                <td className="py-3 pr-4">
                  <Link href={`/companies/${m.ticker}`} className="flex items-baseline gap-2">
                    <span className="num text-xs font-semibold text-ink group-hover:text-accent">
                      {m.ticker}
                    </span>
                    <span className="truncate text-2xs text-ink-mute">{m.nameFr || m.name}</span>
                  </Link>
                </td>
                <td className="num py-3 text-right text-xs tabular-nums text-ink-soft">
                  {m.close.value == null ? (
                    <span className="text-2xs text-ink-faint">n/a</span>
                  ) : (
                    num(m.close.value)
                  )}
                </td>
                <td
                  className={cx(
                    'num py-3 text-right text-xs tabular-nums',
                    m.changePct.value == null ? 'text-ink-faint' : up ? 'text-pos' : 'text-neg',
                  )}
                >
                  {m.changePct.value == null ? (
                    <span className="text-2xs">n/a</span>
                  ) : (
                    `${up ? '+' : ''}${m.changePct.value.toFixed(2)}%`
                  )}
                </td>
                <td className="num py-3 text-right text-xs tabular-nums text-ink-soft">
                  {m.marketCap.value == null ? '—' : `${num(m.marketCap.value / 1e9, 2)}B`}
                </td>
                <td className="py-3 text-right font-mono text-2xs tracking-[0.1em] text-ink-faint">
                  {rel?.basis ?? '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
        Membership is the AMMC issuer register&apos;s own secteur d&apos;activit&eacute; for each
        issuer. BASIS shows
        how the register entry was tied to this ticker: VERIFIED where the issuer name matches the
        ticker directly, INFERRED where a documented rule resolved it.
      </p>
    </div>
  );
}

/* ── related records ──────────────────────────────────────────────────────── */

export function SectorEvents({ id }: { id: string }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [tickers, setTickers] = useState<string[]>([]);

  useEffect(() => {
    let on = true;
    void (async () => {
      const [reg, all] = await Promise.all([getRegistry(), getEvents()]);
      if (!on) return;
      const members = reg.relations
        .filter((r) => r.to === id && r.kind === 'classified_in')
        .map((r) => r.from.replace(/^eq:/, ''));
      setTickers(members);
      setEvents(all.filter((e) => e.relatedTickers.some((t) => members.includes(t))));
    })();
    return () => {
      on = false;
    };
  }, [id]);

  if (!events) return <p className="text-xs text-ink-mute">Loading records…</p>;
  if (events.length === 0) {
    return (
      <DataUnavailable
        reason="No cached AMMC publication or Bourse bulletin names any ticker in this sector in a document file name, so no record can be attributed to the sector."
      />
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {events.map((e) => (
        <li key={e.id} className="py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link href={`/events/${encodeURIComponent(e.id)}`} className="text-xs text-ink hover:text-accent">
              {e.title}
            </Link>
            <span className="num text-2xs text-ink-faint">{formatDateLong(e.date)}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Tag tone="event">{e.origin}</Tag>
            {e.relatedTickers
              .filter((t) => tickers.includes(t))
              .slice(0, 6)
              .map((t) => (
                <Link key={t} href={`/companies/${t}`} className="num text-2xs text-accent hover:underline">
                  {t}
                </Link>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}