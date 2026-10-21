'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Network, X } from 'lucide-react';
import {
  getRegistry,
  getSeries,
  totalReturn,
  volatility,
  maxDrawdown,
  fiftyTwoWeek,
  averageVolume,
  active,
  type RegistryNode,
  type RegistryRelation,
} from '@/lib/data/client';
import { cx, formatDate, num, plainPct, signed } from '@/lib/utils';
import { Sparkline } from '@/components/charts/Sparkline';
import { DataUnavailable, ProvenanceNote } from '@/components/ui/Provenance';
import { TYPE_META } from './GraphLegend';

const RELATION_LABEL: Record<string, string> = {
  classified_in: 'AMMC sector',
  index_of: 'constituent of',
  published_by: 'published by',
  listed_on: 'listed on',
};

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'pos' | 'neg';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[0.3rem]">
      <span className="text-2xs uppercase tracking-[0.12em] text-ink-mute">{label}</span>
      <span
        className={cx(
          'num text-xs tabular-nums',
          tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : 'text-ink',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-3">
      <h4 className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">{title}</h4>
      <div className="mt-1 divide-y divide-line/60">{children}</div>
    </section>
  );
}

export function EntityDetail({
  id,
  onClose,
  onSelect,
  variant = 'inline',
}: {
  id: string;
  onClose: () => void;
  onSelect?: (id: string) => void;
  variant?: 'inline' | 'overlay';
}) {
  const [loaded, setLoaded] = useState<{
    id: string;
    node: RegistryNode | null;
    relations: RegistryRelation[];
    series: NonNullable<Awaited<ReturnType<typeof getSeries>>> | null;
  } | null>(null);

  useEffect(() => {
    let on = true;
    void getRegistry().then((reg) => {
      if (!on) return;
      const n = reg.nodes.find((node) => node.id === id) ?? null;
      const relations = reg.relations.filter((r) => r.from === id || r.to === id);
      const ticker = n?.type === 'company' ? n.code : null;
      if (!ticker) {
        setLoaded({ id, node: n, relations, series: null });
        return;
      }
      void getSeries(ticker).then((s) => {
        if (on) setLoaded({ id, node: n, relations, series: s });
      });
    });
    return () => {
      on = false;
    };
  }, [id]);

  const ready = loaded !== null && loaded.id === id;
  const node = ready ? loaded.node : null;
  const relations = ready ? loaded.relations : [];
  const series = ready ? loaded.series : null;

  const metrics = useMemo(() => {
    if (!series) return null;
    const o = series.observations;
    const traded = active(o);
    return {
      traded,
      totalReturn: totalReturn(traded),
      volatility: volatility(traded),
      maxDrawdown: maxDrawdown(traded),
      range: fiftyTwoWeek(o),
      volume: averageVolume(traded),
      last: traded.length ? traded[traded.length - 1] : null,
      spark: traded.slice(-60).map((x) => x.close).filter((v): v is number => v !== null),
    };
  }, [series]);

  if (!node) {
    return (
      <aside className={cx('glass border border-line p-4', variant === 'overlay' && 'fixed inset-4 z-40')}>
        <p className="text-xs text-ink-mute">
          {ready ? 'Entity not found in the cached registry.' : 'Loading cached registry…'}
        </p>
      </aside>
    );
  }

  const meta = TYPE_META[node.type];

  const links = relations.map((r) => {
    const otherId = r.from === node.id ? r.to : r.from;
    return { rel: r, otherId };
  });

  return (
    <aside
      className={cx(
        'glass flex flex-col border border-line',
        variant === 'inline' ? 'w-[320px] shrink-0' : 'fixed bottom-6 left-6 top-6 z-40 w-[340px]',
      )}
    >
      <header className="flex items-start gap-2 border-b border-line p-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-tCompany/10 text-tCompany">
          <meta.Icon className="h-3.5 w-3.5" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-2xs uppercase tracking-[0.18em] text-ink-faint">{meta.one}</div>
          <h3 className="font-display text-base font-semibold leading-tight tracking-tight text-ink">
            {node.label}
          </h3>
          {node.sublabel ? (
            <p className="mt-0.5 truncate text-xs text-ink-mute">{node.sublabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="shrink-0 p-1 text-ink-mute transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {node.type === 'company' ? (
          series && metrics ? (
            <>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="num text-2xl font-semibold leading-none tracking-tight text-ink">
                    {metrics.last?.close != null ? num(metrics.last.close) : '—'}
                    <span className="ml-1 text-xs font-normal text-ink-mute">MAD</span>
                  </div>
                  <div className="mt-1 text-2xs text-ink-mute">
                    last traded session {metrics.last ? formatDate(metrics.last.date) : '—'}
                  </div>
                </div>
                {metrics.spark.length > 2 ? (
                  <Sparkline
                    data={metrics.spark}
                    width={104}
                    height={34}
                    color={metrics.last && metrics.last.changePct != null && metrics.last.changePct < 0 ? 'rgb(var(--c-neg))' : 'rgb(var(--c-pos))'}
                  />
                ) : null}
              </div>

              <Section title="Performance (cached sessions)">
                <Row
                  label="Total return"
                  value={
                    metrics.totalReturn.unavailable
                      ? 'Data unavailable'
                      : signed(metrics.totalReturn.value ?? 0, 1) + '%'
                  }
                  tone={(metrics.totalReturn.value ?? 0) >= 0 ? 'pos' : 'neg'}
                />
                <Row
                  label="Volatility (ann.)"
                  value={metrics.volatility.unavailable ? 'Data unavailable' : plainPct(metrics.volatility.value ?? 0)}
                />
                <Row
                  label="Max drawdown"
                  value={metrics.maxDrawdown.unavailable ? 'Data unavailable' : plainPct(metrics.maxDrawdown.value ?? 0)}
                  tone="neg"
                />
                <Row
                  label="52-week high"
                  value={metrics.range.unavailable ? 'Data unavailable' : num(metrics.range.value?.high ?? 0)}
                />
                <Row
                  label="52-week low"
                  value={metrics.range.unavailable ? 'Data unavailable' : num(metrics.range.value?.low ?? 0)}
                />
                <Row
                  label="Avg volume (30d)"
                  value={metrics.volume.unavailable ? 'Data unavailable' : Math.round(metrics.volume.value ?? 0).toLocaleString('en-US')}
                />
              </Section>

              <p className="mt-3 text-2xs leading-relaxed text-ink-faint">
                {metrics.totalReturn.method}
              </p>
              <ProvenanceNote
                provenance={series.provenance}
                className="mt-3"
              />
            </>
          ) : (
            <DataUnavailable
              reason="The exchange returned no price history for this instrument, so no price, return or volatility is shown."
            />
          )
        ) : node.type === 'index' ? (
          <>
            <DataUnavailable
              reason="Casablanca Bourse publishes official index levels but exposes no free historical series endpoint. Index history and MASI beta are therefore not computed rather than estimated."
            />
            <Link
              href={node.href}
              className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              Official source <ArrowUpRight className="h-3 w-3" />
            </Link>
          </>
        ) : node.type === 'sector' ? (
          <Section title="Sector">
            <Row label="Classification" value={node.sublabel || '—'} />
            <Row label="Node id" value={node.id} />
          </Section>
        ) : (
          <Section title="Official record">
            <Row label="Type" value={node.sublabel || '—'} />
            <Row label="Node id" value={node.id} />
          </Section>
        )}

        {links.length > 0 ? (
          <Section title={`Relationships (${links.length})`}>
            {links.map(({ rel, otherId }) => (
              <button
                key={`${rel.from}~${rel.to}`}
                type="button"
                onClick={() => onSelect?.(otherId)}
                disabled={!onSelect}
                className="flex w-full items-center justify-between gap-3 py-[0.3rem] text-left transition-colors hover:text-accent disabled:cursor-default"
              >
                <span className="truncate text-xs text-ink">
                  {rel.from === node.id ? rel.kind : RELATION_LABEL[rel.kind] ?? rel.kind}
                  {' → '}
                  <span className="text-ink-mute">{otherId}</span>
                </span>
                <span className="shrink-0 font-mono text-2xs tracking-[0.1em] text-ink-faint">
                  {rel.basis}
                </span>
              </button>
            ))}
          </Section>
        ) : null}

        <div className="mt-4 flex items-center gap-2 border-t border-line pt-3">
          <Link href={node.href} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
            Full page <ArrowUpRight className="h-3 w-3" />
          </Link>
          {onSelect ? (
            <button
              type="button"
              onClick={() => onSelect(node.id)}
              className="ml-auto inline-flex items-center gap-1 text-xs text-ink-mute hover:text-ink"
            >
              <Network className="h-3 w-3" /> Focus
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
