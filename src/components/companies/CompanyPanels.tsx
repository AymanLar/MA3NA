'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EconomicGraph } from '@/components/graph/EconomicGraph';
import {
  getEvents,
  getRegistry,
  type EventItem,
  type RegistryRelation,
} from '@/lib/data/client';
import { useSeries, type RangeKey } from '@/lib/data/use-series';
import { cx, formatDateLong } from '@/lib/utils';
import { PriceChart, VolumeChart } from '@/components/charts/Charts';
import { RangeTabs } from '@/components/market/MarketTables';
import { DataUnavailable } from '@/components/ui/Provenance';
import { Tag } from '@/components/ui/primitives';

/* ── price panel ──────────────────────────────────────────────────────────── */

export function CompanyPricePanel({ id }: { id: string }) {
  const [range, setRange] = useState<RangeKey>('1A');
  const s = useSeries(id, range);

  const chart = useMemo(() => {
    const price = s.observations
      .filter((o) => o.close !== null)
      .map((o) => ({ t: o.date, v: o.close as number }));
    const volume = s.observations
      .filter((o) => o.volume !== null)
      .map((o) => ({ t: o.date, value: o.volume as number }));
    return { price, volume };
  }, [s.observations]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-2xs text-ink-mute">
          {s.loading
            ? 'Loading cached history…'
            : `${chart.price.length} traded sessions · ${s.rangeLabel}`}
        </p>
        <RangeTabs range={range} onChange={setRange} />
      </div>

      {s.loading ? null : s.unavailable ? (
        <DataUnavailable
          reason={
            s.reason ??
            'No traded sessions are cached for this instrument in the selected window.'
          }
        />
      ) : (
        <>
          <PriceChart
            data={chart.price}
            height={300}
            xKey="t"
            name="Close (MAD)"
            color={
              (s.metrics?.totalReturn.value ?? 0) >= 0
                ? 'rgb(var(--c-pos))'
                : 'rgb(var(--c-neg))'
            }
          />
          {chart.volume.length > 1 ? (
            <div className="mt-6">
              <p className="mb-2 font-mono text-2xs uppercase tracking-[0.15em] text-ink-faint">
                Traded volume, published sessions
              </p>
              <VolumeChart data={chart.volume} height={140} />
            </div>
          ) : null}
          <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
            Sessions with no trade are excluded rather than filled. {s.metrics?.totalReturn.method ?? ''}
          </p>
        </>
      )}
    </div>
  );
}

/* ── relations ────────────────────────────────────────────────────────────── */

export function CompanyRelations({ id }: { id: string }) {
  const [relations, setRelations] = useState<RegistryRelation[] | null>(null);

  useEffect(() => {
    let on = true;
    void getRegistry().then((reg) => {
      if (!on) return;
      setRelations(reg.relations.filter((r) => r.from === id || r.to === id));
    });
    return () => {
      on = false;
    };
  }, [id]);

  if (!relations) return <p className="text-xs text-ink-mute">Loading relations…</p>;
  if (relations.length === 0) {
    return (
      <DataUnavailable
        reason="No official source links this instrument to a sector or to a named issuer publication in the cached snapshot."
      />
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {relations.map((r) => {
        const otherId = r.from === id ? r.to : r.from;
        return (
          <li key={`${r.from}~${r.to}`} className="py-3">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                href={otherId.startsWith('sec:') ? `/sectors/${otherId.slice(4)}` : '/companies'}
                className="text-xs text-ink hover:text-accent"
              >
                {r.from === id ? r.kind : `${r.kind} →`} {otherId}
              </Link>
              <span className="shrink-0 font-mono text-2xs tracking-[0.1em] text-ink-faint">
                {r.basis}
              </span>
            </div>
            <p className="mt-1 text-2xs leading-relaxed text-ink-faint">{r.method}</p>
          </li>
        );
      })}
    </ul>
  );
}

/* ── neighbourhood graph ──────────────────────────────────────────────────── */

export function CompanyNeighbourhood({ id }: { id: string }) {
  return (
    <EconomicGraph
      rootId={`eq:${id}`}
      depth={2}
      height="h-[520px]"
      showPanel={false}
    />
  );
}

/* ── company filings ──────────────────────────────────────────────────────── */

export function CompanyFilings({ id }: { id: string }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);

  useEffect(() => {
    let on = true;
    void getEvents().then((r) => {
      if (on) setEvents(r.filter((e) => e.relatedTickers.includes(id)));
    });
    return () => {
      on = false;
    };
  }, [id]);

  if (!events) return <p className="text-xs text-ink-mute">Loading filings…</p>;
  if (events.length === 0) {
    return (
      <DataUnavailable
        reason="No cached AMMC publication names this ticker in a document file name, so no filing is linked to it."
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
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Tag tone="event">{e.origin}</Tag>
            {e.documents.slice(0, 3).map((d) => (
              <a
                key={d.url}
                href={d.url}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-2xs text-accent hover:underline"
              >
                {d.fileName || 'document'}
              </a>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── peers ────────────────────────────────────────────────────────────────── */

export function CompanyPeers({ id, peers }: { id: string; peers: string[] }) {
  if (peers.length === 0) {
    return (
      <DataUnavailable reason="No other cached equity shared enough trading sessions to rank a peer set." />
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {peers.map((t) => (
        <Link
          key={t}
          href={`/companies/${t}`}
          className={cx(
            'num border px-2.5 py-1 text-2xs transition-colors',
            t === id
              ? 'border-tCompany text-tCompany'
              : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
          )}
        >
          {t}
        </Link>
      ))}
    </div>
  );
}