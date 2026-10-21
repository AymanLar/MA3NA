import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getCompanySummaries, getCorrelatedPeers } from '@/lib/data';
import { num } from '@/lib/utils';
import {
  Breadcrumb,
  Delta,
  Metric,
  Section,
  SectionHead,
  Shell,
  Tag,
} from '@/components/ui/primitives';
import { DataUnavailable } from '@/components/ui/Provenance';
import {
  CompanyFilings,
  CompanyNeighbourhood,
  CompanyPeers,
  CompanyPricePanel,
  CompanyRelations,
} from '@/components/companies/CompanyPanels';

export async function generateStaticParams() {
  const companies = await getCompanySummaries();
  return companies.map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const companies = await getCompanySummaries();
  const c = companies.find((x) => x.ticker === ticker);
  if (!c) return { title: 'Issuer not found · MA3NA' };
  return {
    title: `${c.ticker} · ${c.nameFr || c.name} · MA3NA`,
    description: `${c.nameFr || c.name} — published Casablanca Bourse price history and AMMC classification in MA3NA.`,
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const companies = await getCompanySummaries();
  const c = companies.find((x) => x.ticker === ticker);
  if (!c) notFound();

  const peers = await getCorrelatedPeers(ticker, 6);
  const up = (c.changePct.value ?? 0) >= 0;

  const high = c.high52.value;
  const low = c.low52.value;
  const rangePos =
    high == null || low == null || c.close.value == null || high === low
      ? null
      : ((c.close.value - low) / (high - low)) * 100;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb
          items={[
            { label: 'MA3NA', href: '/' },
            { label: 'Issuers', href: '/companies' },
            { label: c.ticker },
          ]}
        />

        <div className="mt-8 border-b border-line pb-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <Tag tone="company">{c.ticker}</Tag>
                {c.sector && c.sectorSlug ? (
                  <Link href={`/sectors/${c.sectorSlug}`}>
                    <Tag tone="sector" className="transition-colors duration-200 hover:border-tSector/70">
                      {c.sector}
                    </Tag>
                  </Link>
                ) : null}
                {c.listingDate ? <Tag>Listed {c.listingDate}</Tag> : null}
              </div>

              <h1 className="font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
                {c.nameFr || c.name}
              </h1>
              <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
                {c.name !== c.nameFr ? `Listed as ${c.name}. ` : ''}
                {c.matchMethod ?? ''}
              </p>
            </div>

            <div className="shrink-0 text-right font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
              <div>{c.provenance.retrievedAt?.slice(0, 10) ?? 'no snapshot'}</div>
              <div className="mt-1 text-pos">{c.matchConfidence ?? 'UNCLASSIFIED'}</div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            <Metric
              label="Last close"
              value={c.close.value == null ? 'Data unavailable' : `${num(c.close.value)} MAD`}
              hint={c.windowEnd ?? undefined}
            />
            <Metric
              label="Session"
              value={c.changePct.value == null ? 'Data unavailable' : <Delta value={c.changePct.value} />}
              hint={c.change.value == null ? undefined : `${num(c.change.value)} MAD`}
            />
            <Metric
              label="Market cap"
              value={c.marketCap.value == null ? 'Data unavailable' : `${num(c.marketCap.value / 1e9, 2)}B MAD`}
              hint="exchange published"
            />
            <Metric
              label="Volume"
              value={
                c.volume.value == null ? 'Data unavailable' : Math.round(c.volume.value).toLocaleString('en-US')
              }
              hint="latest session"
            />
            <Metric
              label="3-year return"
              value={c.return3y.value == null ? 'Data unavailable' : `${c.return3y.value >= 0 ? '+' : ''}${c.return3y.value.toFixed(1)}%`}
              hint={`${c.sessions} sessions`}
            />
          </div>

          <div className="mt-8">
            <div className="mb-2 flex items-baseline justify-between font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
              <span>52-week band</span>
              <span className="tabular-nums">
                {low == null || high == null
                  ? 'Data unavailable'
                  : `${num(low)} — ${num(high)} MAD`}
              </span>
            </div>
            <div className="relative h-1 w-full bg-ink/[0.07]">
              {rangePos == null ? null : (
                <span
                  className={`absolute inset-y-0 w-[3px] ${up ? 'bg-pos' : 'bg-neg'}`}
                  style={{ left: `${Math.max(0, Math.min(100, rangePos))}%` }}
                />
              )}
            </div>
          </div>
        </div>
      </Section>

      <Section tight>
        <CompanyPricePanel id={ticker} />
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Structure"
          title="What this issuer is connected to"
          description="Relationships are labelled by basis. VERIFIED means the AMMC register states it directly; INFERRED means it was resolved by a documented matching rule."
        />
        <div className="mt-10">
          <CompanyRelations id={ticker} />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Correlated exposure"
          title="Instruments that moved with it"
          description="Ranked by Pearson correlation of daily returns across shared cached sessions."
        />
        <div className="mt-10">
          <CompanyPeers id={ticker} peers={peers.map((p) => p.ticker)} />
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Issuer filings"
          title="Official AMMC records naming this ticker"
        />
        <div className="mt-10">
          <CompanyFilings id={ticker} />
        </div>
      </Section>

      <Section tight>
        <CompanyNeighbourhood id={ticker} />
      </Section>

      <Section tight className="pb-20">
        <div className="flex flex-wrap gap-2.5">
          {c.sector && c.sectorSlug ? (
            <Link
              href={`/sectors/${c.sectorSlug}`}
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              {c.sector}
            </Link>
          ) : null}
          <Link
            href="/companies"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            All issuers
          </Link>
        </div>

        <div className="mt-10 max-w-3xl">
          {c.nonTradingSessions > 0 ? (
            <DataUnavailable
              compact
              reason={`${c.nonTradingSessions} sessions in the cached window had no trade and are excluded from every figure on this page rather than carried forward.`}
            />
          ) : null}
          <p className="mt-4 text-xs leading-relaxed text-ink-faint">
            Source: {c.provenance.source}. Free historical depth is the exchange-stated three-year
            maximum; older and real-time data are licensed products and are not present.
          </p>
        </div>
      </Section>
    </Shell>
  );
}