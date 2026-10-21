import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getEvents } from '@/lib/data';
import { formatDateLong } from '@/lib/utils';
import { Breadcrumb, Section, SectionHead, Shell, Tag } from '@/components/ui/primitives';
import { DataUnavailable } from '@/components/ui/Provenance';
import {
  EventConnections,
  EventDocuments,
  EventGraph,
  EventSiblings,
  EventSource,
} from '@/components/events/EventPanels';

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((e) => ({ slug: encodeURIComponent(e.id) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getEvents();
  const e = events.find((x) => x.id === decodeURIComponent(slug));
  if (!e) return { title: 'Record not found · MA3NA' };
  return {
    title: `${e.title} · MA3NA`,
    description: `${e.origin} record published ${e.date}, with ${e.documents.length} document(s).`,
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const events = await getEvents();
  const event = events.find((x) => x.id === decodeURIComponent(slug));
  if (!event) notFound();

  const isFiling = event.kind === 'issuer-publication';

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb
          items={[
            { label: 'MA3NA', href: '/' },
            { label: 'Official records', href: '/events' },
            { label: event.date.slice(0, 4) || 'record' },
          ]}
        />

        <div className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <Tag tone="event">{event.origin}</Tag>
                <Tag>{isFiling ? 'Issuer publication' : 'Market bulletin'}</Tag>
                <Tag>{formatDateLong(event.date)}</Tag>
              </div>

              <h1 className="font-display text-3xl font-semibold leading-[1.08] tracking-tightest text-ink sm:text-4xl">
                {event.title}
              </h1>
              <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
                Published by {event.origin} on {formatDateLong(event.date)}. {event.provenance.source}
              </p>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-2 border border-accent/40 bg-accent/[0.07] px-4 font-mono text-2xs uppercase tracking-[0.12em] text-accent transition-all duration-200 hover:border-accent/60"
            >
              Open the official page
            </a>
          </div>
        </div>
      </Section>

      <Section tight>
        <SectionHead eyebrow="Documents" title="Files as published" />
        <div className="mt-8">
          <EventDocuments event={event} />
        </div>
        <div className="mt-8">
          <DataUnavailable
            compact
            reason="Document contents are not parsed or summarised here. MA3NA links to the publisher's own file so the text can be read at the source."
          />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Issuer links"
          title="Tickers named in this record"
          description="A ticker is linked only when the publisher's own document file name contains it."
        />
        <div className="mt-8">
          <EventConnections event={event} />
        </div>
      </Section>

      <Section tight>
        <SectionHead eyebrow="Source" title="Provenance" />
        <div className="mt-8 max-w-3xl">
          <EventSource event={event} />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Network"
          title="Where this record sits"
          description="The graph only places a record when it has a verified link to at least one issuer."
        />
        <div className="mt-8">
          <EventGraph id={event.id} />
        </div>
      </Section>

      <Section tight>
        <SectionHead eyebrow="Related" title="Other records naming the same issuers" />
        <div className="mt-8">
          <EventSiblings id={event.id} />
        </div>
      </Section>

      <Section tight className="pb-20">
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/events"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            All records
          </Link>
          {event.relatedTickers.slice(0, 4).map((t) => (
            <Link
              key={t}
              href={`/companies/${t}`}
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              {t}
            </Link>
          ))}
        </div>
      </Section>
    </Shell>
  );
}