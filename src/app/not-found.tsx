import Link from 'next/link';
import { Compass, Search } from 'lucide-react';
import { getCompanySummaries, getEvents, getSectorSummaries } from '@/lib/data';
import { Breadcrumb, EmptyState, Shell } from '@/components/ui/primitives';

export const metadata = {
  title: 'Not found · MA3NA',
  description: 'That page is not part of the cached MA3NA dataset.',
};

export default async function NotFound() {
  const [companies, sectors, events] = await Promise.all([
    getCompanySummaries(),
    getSectorSummaries(),
    getEvents(),
  ]);
  return (
    <Shell>
      <div className="flex min-h-[62vh] flex-col justify-center py-20">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: '404' }]} />

        <div className="mt-10 max-w-2xl">
          <div className="label mb-4 flex items-center gap-2.5">
            <span className="h-px w-5 bg-accent/70" />
            404
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.04] tracking-tightest text-ink sm:text-5xl">
            Nothing in the network sits here
          </h1>
          <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
            The address you followed does not match any listed issuer, AMMC sector or dated record
            in the cached dataset. Press <span className="num text-ink">⌘K</span> to search everything, or start
            from one of these.
          </p>
        </div>

        <EmptyState
          className="mt-10"
          icon={<Search size={16} />}
          title="Try a route from the dataset"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              {sectors.slice(0, 4).map((s) => (
                <Link
                  key={s.slug}
                  href={`/sectors/${s.slug}`}
                  className="inline-flex h-8 items-center border border-line px-3 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
                >
                  {s.name}
                </Link>
              ))}
            </div>
          }
        />

        <div className="mt-10 flex flex-wrap gap-2.5">
          <Link
            href="/"
            className="inline-flex h-9 items-center gap-2 border border-accent/40 bg-accent/[0.07] px-4 font-mono text-2xs uppercase tracking-[0.12em] text-accent transition-all duration-200 hover:border-accent/60"
          >
            <Compass size={12} />
            Back to explore
          </Link>
          <Link
            href="/companies"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            {companies.length} issuers
          </Link>
          <Link
            href="/events"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            {events.length} official records
          </Link>
        </div>
      </div>
    </Shell>
  );
}