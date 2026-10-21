'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { EconomicGraph } from '@/components/graph/EconomicGraph';
import { getEvents, getRegistry, type EventItem } from '@/lib/data/client';
import { formatDateLong } from '@/lib/utils';
import { DataUnavailable } from '@/components/ui/Provenance';
import { Tag } from '@/components/ui/primitives';

/* ── documents ────────────────────────────────────────────────────────────── */

export function EventDocuments({ event }: { event: EventItem }) {
  return (
    <ul className="divide-y divide-line/60">
      {event.documents.map((d) => (
        <li key={d.url} className="py-3">
          <a
            href={d.url}
            target="_blank"
            rel="noreferrer"
            className="break-all font-mono text-xs text-accent hover:underline"
          >
            {d.fileName || d.url}
          </a>
          <div className="mt-1.5">
            <Tag>{d.type}</Tag>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── linked issuers ───────────────────────────────────────────────────────── */

export function EventConnections({ event }: { event: EventItem }) {
  if (event.relatedTickers.length === 0) {
    return (
      <DataUnavailable
        reason="No document in this record names a listed ticker in its file name, so no issuer can be linked to it without guessing."
      />
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {event.relatedTickers.map((t) => (
          <Link
            key={t}
            href={`/companies/${t}`}
            className="num border border-line px-2.5 py-1 text-2xs text-ink-mute transition-colors hover:border-line-strong hover:text-ink"
          >
            {t}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
        Linked because the record&apos;s own document file names the ticker. This is a filing-level
        association, not a statement that the document concerns that issuer&apos;s business.
      </p>
    </div>
  );
}

/* ── source ───────────────────────────────────────────────────────────────── */

export function EventSource({ event }: { event: EventItem }) {
  return (
    <div>
      <dl className="space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-[0.12em] text-ink-mute">Publisher</dt>
          <dd className="text-xs text-ink">{event.origin}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-[0.12em] text-ink-mute">Type</dt>
          <dd className="text-xs text-ink">
            {event.kind === 'issuer-publication' ? 'Issuer publication' : 'Market bulletin'}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-[0.12em] text-ink-mute">Published</dt>
          <dd className="num text-xs text-ink">{formatDateLong(event.date)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-2xs uppercase tracking-[0.12em] text-ink-mute">Retrieved</dt>
          <dd className="num text-xs text-ink">
            {event.provenance.retrievedAt?.slice(0, 10) ?? '—'}
          </dd>
        </div>
      </dl>
      {event.sourceUrl ? (
        <a
          href={event.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block break-all font-mono text-2xs text-accent hover:underline"
        >
          {event.sourceUrl}
        </a>
      ) : null}
      <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
        {event.provenance.source}
      </p>
    </div>
  );
}

/* ── network ──────────────────────────────────────────────────────────────── */

export function EventGraph({ id }: { id: string }) {
  const [related, setRelated] = useState<string[] | null>(null);

  useEffect(() => {
    let on = true;
    void getEvents().then((r) => {
      if (!on) return;
      const e = r.find((x) => x.id === id);
      setRelated(e?.relatedTickers ?? []);
    });
    return () => {
      on = false;
    };
  }, [id]);

  if (related === null) return <p className="text-xs text-ink-mute">Loading…</p>;
  if (related.length === 0) {
    return (
      <DataUnavailable
        reason="This record has no issuer links in the cached data, so it cannot be placed in the network without inventing an association."
      />
    );
  }

  return (
    <EconomicGraph rootId={id} depth={2} height="h-[520px]" showPanel={false} />
  );
}

/* ── other records by the same issuer ─────────────────────────────────────── */

export function EventSiblings({ id }: { id: string }) {
  const [siblings, setSiblings] = useState<EventItem[] | null>(null);

  useEffect(() => {
    let on = true;
    void (async () => {
      const [all, reg] = await Promise.all([getEvents(), getRegistry()]);
      if (!on) return;
      const me = reg.nodes.find((n) => n.id === id);
      if (!me) {
        setSiblings([]);
        return;
      }
      const mine = all.find((x) => x.id === id)?.relatedTickers ?? [];
      setSiblings(
        all.filter(
          (x) => x.id !== id && x.relatedTickers.some((t) => mine.includes(t)),
        ),
      );
    })();
    return () => {
      on = false;
    };
  }, [id]);

  if (!siblings) return <p className="text-xs text-ink-mute">Loading…</p>;
  if (siblings.length === 0) {
    return (
      <DataUnavailable reason="No other cached record names a ticker linked to this one." />
    );
  }

  return (
    <ul className="divide-y divide-line/60">
      {siblings.slice(0, 8).map((e) => (
        <li key={e.id} className="py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Link
              href={`/events/${encodeURIComponent(e.id)}`}
              className="text-xs text-ink hover:text-accent"
            >
              {e.title}
            </Link>
            <span className="num text-2xs text-ink-faint">{formatDateLong(e.date)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}