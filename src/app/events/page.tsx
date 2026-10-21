import { getEvents } from '@/lib/data';
import { Breadcrumb, Eyebrow, Section, Shell } from '@/components/ui/primitives';
import { EventTimeline } from '@/components/events/EventTimeline';

export const metadata = {
  title: 'Official records · MA3NA',
  description:
    'AMMC issuer publications and Casablanca Bourse bulletins, as cached, with the documents and tickers each record names.',
};

export default async function EventsPage() {
  const events = await getEvents();

  const years = [...new Set(events.map((e) => e.date.slice(0, 4)).filter(Boolean))].sort();
  const ammc = events.filter((e) => e.kind === 'issuer-publication').length;
  const bulletins = events.length - ammc;
  const documents = events.reduce((s, e) => s + e.documents.length, 0);
  const withTickers = events.filter((e) => e.relatedTickers.length > 0).length;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: 'Official records' }]} />

        <div className="mt-8 border-b border-line pb-10 sm:mt-10">
          <Eyebrow className="mb-4">Official records</Eyebrow>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
            What regulators and the exchange actually published
          </h1>
          <p className="mt-5 max-w-2xl text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
            {events.length} records from the AMMC and Casablanca Bourse, cached with their document
            links. Nothing here is written or interpreted: titles, dates and file names come straight
            from the publishers.
          </p>
        </div>

        <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            { k: 'Records', v: String(events.length) },
            { k: 'AMMC filings', v: String(ammc) },
            { k: 'Bourse bulletins', v: String(bulletins) },
            { k: 'Documents', v: String(documents) },
          ].map((s) => (
            <div key={s.k} className="bg-bg px-4 py-5">
              <dt className="label">{s.k}</dt>
              <dd className="num mt-2 text-xl font-medium tabular-nums text-ink">{s.v}</dd>
            </div>
          ))}
        </dl>

        {years.length > 0 && withTickers < events.length ? (
          <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-faint">
            {withTickers} of {events.length} records name a listed ticker in a document file name and
            can be linked to an issuer. The remaining {events.length - withTickers} are market-level
            bulletins with no issuer attribution, so they are listed here but not placed in the
            network.
          </p>
        ) : null}
      </Section>

      <Section tight className="pb-20">
        <EventTimeline />
      </Section>
    </Shell>
  );
}