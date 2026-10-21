'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getEvents, type EventItem } from '@/lib/data/client';
import { formatDateLong } from '@/lib/utils';
import { EmptyState, GhostButton } from '@/components/ui/primitives';

const KINDS = [
  { key: 'issuer-publication', label: 'Issuer publications' },
  { key: 'market-bulletin', label: 'Market bulletins' },
] as const;

type KindKey = (typeof KINDS)[number]['key'];

export function EventTimeline() {
  const [all, setAll] = useState<EventItem[] | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [cats, setCats] = useState<Set<KindKey>>(new Set());
  const [q, setQ] = useState('');

  useEffect(() => {
    let on = true;
    void getEvents().then((r) => {
      if (on) setAll(r);
    });
    return () => {
      on = false;
    };
  }, []);

  const years = useMemo(() => {
    const set = new Set<string>();
    for (const e of all ?? []) if (e.date) set.add(e.date.slice(0, 4));
    return [...set].sort().reverse();
  }, [all]);

  const events = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (all ?? [])
      .filter((e) => (year ? e.date.startsWith(year) : true))
      .filter((e) => (cats.size === 0 ? true : cats.has(e.kind)))
      .filter((e) => (term ? e.title.toLowerCase().includes(term) : true))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [all, year, cats, q]);

  const grouped = useMemo(() => {
    const out: Array<[string, EventItem[]]> = [];
    for (const e of events) {
      const y = e.date.slice(0, 4) || 'undated';
      const last = out[out.length - 1];
      if (last && last[0] === y) last[1].push(e);
      else out.push([y, [e]]);
    }
    return out;
  }, [events]);

  const toggleCat = (c: KindKey) =>
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  const reset = () => {
    setYear(null);
    setCats(new Set());
    setQ('');
  };

  const active = year !== null || cats.size > 0 || q.trim() !== '';

  return (
    <div>
      <div className="flex flex-col gap-5 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <GhostButton active={year === null} onClick={() => setYear(null)}>
            All years
          </GhostButton>
          {years.map((y) => (
            <GhostButton key={y} active={year === y} onClick={() => setYear(y)}>
              {y}
            </GhostButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {KINDS.map((c) => (
            <GhostButton key={c.key} active={cats.has(c.key)} onClick={() => toggleCat(c.key)}>
              {c.label}
            </GhostButton>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search the record title…"
            aria-label="Search records"
            className="h-8 w-full max-w-xs border border-line bg-transparent px-3 text-xs text-ink placeholder:text-ink-faint focus:border-accent/50 focus:outline-none"
          />
          <div className="flex items-baseline gap-5">
            <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
              {events.length} of {all?.length ?? 0} records
            </p>
            {active ? (
              <button
                type="button"
                onClick={reset}
                className="font-mono text-2xs uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {all === null ? (
        <p className="mt-10 text-xs text-ink-mute">Loading official records…</p>
      ) : events.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="No record matches those filters"
          description="Widen the year or type selection, or clear the search to see the full record."
          action={<GhostButton onClick={reset}>Clear filters</GhostButton>}
        />
      ) : (
        <div className="mt-10">
          {grouped.map(([y, list]) => (
            <section key={y} className="mb-12 last:mb-0">
              <div className="flex items-baseline gap-4">
                <h2 className="num font-display text-2xl font-semibold tracking-tight text-ink">
                  {y}
                </h2>
                <span className="h-px flex-1 bg-line" />
                <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                  {list.length} {list.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <ol className="relative mt-6 border-l border-line pl-6 sm:pl-8">
                {list.map((e) => (
                  <li key={e.id} className="relative pb-7 last:pb-0">
                    <span className="absolute -left-[calc(1.5rem+2.5px)] top-1.5 h-2 w-2 rotate-45 border border-tEvent bg-tEvent/30 sm:-left-[calc(2rem+2.5px)]" />
                    <Link href={`/events/${encodeURIComponent(e.id)}`} className="group block">
                      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1.5">
                        <span className="num text-2xs tabular-nums text-ink-faint">
                          {formatDateLong(e.date)}
                        </span>
                        <span className="font-mono text-2xs uppercase tracking-[0.12em] text-tEvent">
                          {e.kind === 'issuer-publication' ? 'AMMC filing' : 'Bourse bulletin'}
                        </span>
                        <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                          {e.origin}
                        </span>
                      </div>

                      <h3 className="mt-2 font-display text-lg font-medium leading-snug tracking-tight text-ink transition-colors duration-200 group-hover:text-accent">
                        {e.title}
                      </h3>

                      <p className="mt-2 text-2xs text-ink-faint">
                        {e.documents.length} {e.documents.length === 1 ? 'document' : 'documents'}
                        {e.relatedTickers.length > 0
                          ? ` · names ${e.relatedTickers.slice(0, 4).join(', ')}`
                          : ' · no listed ticker named in file names'}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}