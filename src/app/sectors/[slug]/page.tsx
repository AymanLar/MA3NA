import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSectorSummaries } from '@/lib/data';
import { num } from '@/lib/utils';
import { Breadcrumb, Delta, Metric, Section, SectionHead, Shell, Tag } from '@/components/ui/primitives';
import { DataUnavailable } from '@/components/ui/Provenance';
import {
  SectorEntities,
  SectorEvents,
  SectorNetwork,
  SectorPricePanel,
} from '@/components/sectors/SectorPanels';

export async function generateStaticParams() {
  const sectors = await getSectorSummaries();
  return sectors.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sectors = await getSectorSummaries();
  const s = sectors.find((x) => x.slug === slug);
  if (!s) return { title: 'Sector not found · MA3NA' };
  return {
    title: `${s.name} · MA3NA`,
    description: `${s.tickers.length} listed issuers classified by AMMC under ${s.name}, with published prices and capitalisation.`,
  };
}

export default async function SectorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sectors = await getSectorSummaries();
  const s = sectors.find((x) => x.slug === slug);
  if (!s) notFound();

  const up = (s.changePct.value ?? 0) >= 0;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb
          items={[
            { label: 'MA3NA', href: '/' },
            { label: 'Sectors', href: '/sectors' },
            { label: s.name },
          ]}
        />

        <div className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <Tag tone="sector">AMMC sector</Tag>
                <Tag>
                  {s.tickers.length} {s.tickers.length === 1 ? 'issuer' : 'issuers'}
                </Tag>
              </div>

              <h1 className="font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
                {s.name}
              </h1>
              <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
                Classified by the AMMC issuer register. Members below carry this secteur
                d&apos;activité; figures are as published by Casablanca Bourse for the cached session.
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <span className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
                Session
              </span>
              {s.changePct.value == null ? (
                <span className="num text-lg text-ink-faint">Data unavailable</span>
              ) : (
                <Delta value={s.changePct.value} size="lg" />
              )}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            <Metric
              label="Combined cap"
              value={s.totalMarketCap.value == null ? 'Data unavailable' : `${num(s.totalMarketCap.value / 1e9, 2)}B MAD`}
              hint={up ? undefined : undefined}
            />
            <Metric
              label="Listed members"
              value={String(s.tickers.length)}
              hint="AMMC classified"
            />
            <Metric
              label="Session change"
              value={s.changePct.value == null ? 'Data unavailable' : `${s.changePct.value >= 0 ? '+' : ''}${s.changePct.value.toFixed(2)}%`}
              hint="equal-weighted, derived"
            />
            <Metric
              label="Snapshot"
              value={s.provenance.retrievedAt?.slice(0, 10) ?? '—'}
              hint={s.provenance.source}
            />
          </div>
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Member history"
          title="Published close history"
          description="Pick any listed member to see its real traded history."
        />
        <div className="mt-8">
          <SectorPricePanel id={`sec:${slug}`} />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Issuers"
          title={`${s.tickers.length} listed ${s.tickers.length === 1 ? 'issuer' : 'issuers'} in this sector`}
          description="Close, session change and capitalisation as published by the exchange."
        />
        <div className="mt-8">
          <SectorEntities id={`sec:${slug}`} />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Official records"
          title="Records naming a member of this sector"
          description="AMMC publications and Bourse bulletins whose document file names a member ticker."
        />
        <div className="mt-8">
          <SectorEvents id={`sec:${slug}`} />
        </div>
      </Section>

      <Section tight>
        <SectorNetwork id={`sec:${slug}`} />
      </Section>

      <Section tight className="pb-20">
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/sectors"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            All sectors
          </Link>
          <Link
            href="/companies"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            All issuers
          </Link>
        </div>

        <div className="mt-10 max-w-3xl">
          {s.changePct.n ? (
            <DataUnavailable compact reason={s.changePct.method ?? undefined} />
          ) : null}
        </div>
      </Section>
    </Shell>
  );
}