import Link from 'next/link';
import { getCompanySummaries } from '@/lib/data';
import { CompanyTable } from '@/components/companies/CompanyTable';
import { Breadcrumb, Eyebrow, Section, Shell } from '@/components/ui/primitives';

export const metadata = {
  title: 'Listed issuers · MA3NA',
  description:
    'Every equity admitted to trading on Casablanca Bourse, with published close, session change, volume and capitalisation.',
};

export default async function CompaniesPage() {
  const companies = await getCompanySummaries();

  const withClose = companies.filter((c) => c.close.value !== null).length;
  const withSector = companies.filter((c) => c.sector !== null).length;
  const retrieved = companies[0]?.provenance.retrievedAt?.slice(0, 10) ?? null;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: 'Issuers' }]} />

        <div className="mt-8 border-b border-line pb-10 sm:mt-10">
          <Eyebrow className="mb-4">Issuers</Eyebrow>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
            Every listed equity, as published
          </h1>
          <p className="mt-5 max-w-2xl text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
            {companies.length} equities admitted to trading on Casablanca Bourse. Prices, session
            changes, traded volume and capitalisation come straight from the exchange snapshot; sector
            labels come from the AMMC issuer register.
          </p>

          <dl className="mt-10 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
            {[
              { k: 'Listed equities', v: String(companies.length) },
              { k: 'With published close', v: String(withClose) },
              { k: 'With AMMC sector', v: String(withSector) },
              { k: 'Snapshot', v: retrieved ?? '—' },
            ].map((s) => (
              <div key={s.k} className="bg-bg px-4 py-5">
                <dt className="label">{s.k}</dt>
                <dd className="num mt-2 text-xl font-medium tabular-nums text-ink">{s.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section tight className="pb-20">
        <CompanyTable />
      </Section>

      <Section tight className="pb-20">
        <div className="flex flex-wrap gap-2.5">
          <Link
            href="/sectors"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            Sector composition
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