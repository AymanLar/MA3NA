import Link from 'next/link';
import { getCompanySummaries, getRegistry, getSectorSummaries } from '@/lib/data';
import { num } from '@/lib/utils';
import { Breadcrumb, Eyebrow, Section, SectionHead, Shell } from '@/components/ui/primitives';
import { DataUnavailable } from '@/components/ui/Provenance';

export const metadata = {
  title: 'Sectors · MA3NA',
  description:
    'Sector composition using the AMMC issuer register classification, with published capitalisation and session breadth.',
};

export default async function SectorsPage() {
  const [sectors, companies, reg] = await Promise.all([
    getSectorSummaries(),
    getCompanySummaries(),
    getRegistry(),
  ]);

  const totalCap = sectors.reduce((s, x) => s + (x.totalMarketCap.value ?? 0), 0);
  const ammcSectorCount = reg.counts.sector;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: 'Sectors' }]} />

        <div className="mt-8 border-b border-line pb-10 sm:mt-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <Eyebrow className="mb-4">Sectors</Eyebrow>
              <h1 className="font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
                How AMMC groups the market
              </h1>
              <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
                The regulator publishes a secteur d&apos;activité for each issuer. Those are the
                groupings below, with the listed companies that carry each classification and their
                published capitalisation.
              </p>
            </div>
            <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
              {reg.sources.issuers.retrievedAt?.slice(0, 10) ?? 'no snapshot'}
            </p>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              { k: 'AMMC sectors', v: String(ammcSectorCount) },
              { k: 'With listed members', v: String(sectors.length) },
              { k: 'Issuers classified', v: String(companies.filter((c) => c.sector).length) },
              { k: 'Combined cap', v: totalCap ? `${num(totalCap / 1e9, 1)}B` : '—' },
            ].map((s) => (
              <div key={s.k} className="bg-bg px-4 py-5">
                <dt className="label">{s.k}</dt>
                <dd className="num mt-2 text-xl font-medium tabular-nums text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section tight>
        <SectionHead
          eyebrow="Composition"
          title="Listed members by classification"
          description="Session change is an equal-weighted mean of member changes, derived here. It is not an exchange-published sector index."
        />

        {sectors.length === 0 ? (
          <div className="mt-10">
            <DataUnavailable reason="No cached issuer matched an AMMC sector classification, so no sector composition can be shown." />
          </div>
        ) : (
          <div className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {sectors.map((s) => (
              <Link
                key={s.slug}
                href={`/sectors/${s.slug}`}
                className="group bg-bg p-6 transition-colors duration-200 hover:bg-ink/[0.025]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-base font-semibold leading-tight tracking-tight text-ink transition-colors duration-200 group-hover:text-accent">
                    {s.name}
                  </h3>
                  <span className="num shrink-0 text-2xs tabular-nums text-ink-faint">
                    {s.tickers.length}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`num text-lg tabular-nums ${
                      s.changePct.value == null
                        ? 'text-ink-faint'
                        : s.changePct.value >= 0
                          ? 'text-pos'
                          : 'text-neg'
                    }`}
                  >
                    {s.changePct.value == null
                      ? 'n/a'
                      : `${s.changePct.value >= 0 ? '+' : ''}${s.changePct.value.toFixed(2)}%`}
                  </span>
                  <span className="num ml-auto text-2xs tabular-nums text-ink-mute">
                    {s.totalMarketCap.value == null
                      ? '—'
                      : `${num(s.totalMarketCap.value / 1e9, 2)}B MAD`}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1">
                  {s.tickers.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="num border border-line px-1.5 py-0.5 text-[0.5625rem] tracking-[0.08em] text-ink-mute"
                    >
                      {t}
                    </span>
                  ))}
                  {s.tickers.length > 6 ? (
                    <span className="num px-1 py-0.5 text-[0.5625rem] text-ink-faint">
                      +{s.tickers.length - 6}
                    </span>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        )}

        {ammcSectorCount > sectors.length ? (
          <p className="mt-8 text-2xs leading-relaxed text-ink-faint">
            AMMC publishes {ammcSectorCount} distinct sectors. {ammcSectorCount - sectors.length}{' '}
            have no listed equity in the cached Bourse snapshot, so they carry no market data and are
            not shown here.
          </p>
        ) : null}
      </Section>

      <Section tight className="pb-20">
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/companies"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            All issuers
          </Link>
          <Link
            href="/market"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            Market snapshot
          </Link>
        </div>
      </Section>
    </Shell>
  );
}