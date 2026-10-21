import Link from 'next/link';
import {
  getCompanySummaries,
  getEvents,
  getSectorSummaries,
  loadIndices,
  loadInstruments,
} from '@/lib/data';
import { num } from '@/lib/utils';
import {
  Breadcrumb,
  Delta,
  Eyebrow,
  Section,
  SectionHead,
  Shell,
  Stat,
  Tag,
} from '@/components/ui/primitives';
import {
  IndexBoard,
  LegendNote,
  MostTraded,
  SectorPerformance,
} from '@/components/market/MarketTables';

export const metadata = {
  title: 'Market snapshot · MA3NA',
  description:
    'Official Casablanca index levels, AMMC sector composition and published turnover across all listed equities.',
};

export default async function MarketPage() {
  const [indicesSnap, instrumentsSnap, companies, sectors, events] = await Promise.all([
    loadIndices(),
    loadInstruments(),
    getCompanySummaries(),
    getSectorSummaries(),
    getEvents(),
  ]);

  const masi = indicesSnap?.data.indices.find((i) => i.code === 'MASI') ?? null;
  const turnover = instrumentsSnap?.data.aggregateTurnover ?? null;
  const officialActionCount =
    (instrumentsSnap?.data.officialCounts ?? []).find((c) => c.instrumentType === 'Action')
      ?.numberOfInstruments ?? companies.length;

  const totalCap = companies.reduce((s, c) => s + (c.marketCap.value ?? 0), 0);
  const withCap = companies.filter((c) => c.marketCap.value !== null).length;
  const advances = companies.filter((c) => (c.changePct.value ?? 0) > 0).length;
  const declines = companies.filter((c) => (c.changePct.value ?? 0) < 0).length;
  const unchanged = companies.filter((c) => c.changePct.value === 0).length;
  const covered = companies.filter((c) => c.changePct.value !== null).length;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: 'Market' }]} />

        <div className="mt-8 flex flex-col gap-6 border-b border-line pb-10 sm:mt-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <Eyebrow className="mb-4">Market</Eyebrow>
            <h1 className="font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
              Casablanca, at a glance
            </h1>
            <p className="mt-5 text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
              Official index levels, session breadth and sector composition in one plate. Every figure
              comes from a cached Casablanca Bourse or AMMC snapshot; where a value is not published it
              is marked unavailable rather than estimated.
            </p>
          </div>
          <p className="font-mono text-2xs uppercase tracking-[0.12em] text-ink-faint">
            Snapshot {instrumentsSnap?.retrieved_at.slice(0, 10) ?? 'unavailable'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-3 lg:grid-cols-5">
          <Cell
            label="MASI"
            value={masi?.value != null ? num(masi.value) : '—'}
            delta={masi?.changePct ?? undefined}
            sub={masi ? `YTD ${masi.changeYtdPct?.toFixed(2) ?? '—'}%` : 'Data unavailable'}
          />
          <Cell
            label="Turnover"
            value={turnover != null ? num(turnover / 1e6, 1) : '—'}
            sub="M MAD, published session"
          />
          <Cell label="Listed equities" value={String(officialActionCount)} sub="exchange count" />
          <Cell
            label="Aggregate cap"
            value={withCap ? num(totalCap / 1e9, 1) : '—'}
            sub="B MAD, published"
          />
          <Cell
            label="Official records"
            value={String(events.length)}
            sub="AMMC filings & bulletins"
          />
        </div>
      </Section>

      <Section tight>
        <IndexBoard />
      </Section>

      <Section tight>
        <SectorPerformance />
      </Section>

      <Section tight>
        <div className="grid gap-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
          <MostTraded />
          <BreadthPanel
            advances={advances}
            declines={declines}
            unchanged={unchanged}
            covered={covered}
            total={companies.length}
          />
        </div>
      </Section>

      <Section>
        <div className="border border-line p-8 sm:p-10">
          <SectionHead
            eyebrow="Continue exploring"
            title="Trace the structure behind the session"
            description="The network links every listed issuer to the sector AMMC classifies it under, and to the official records that name it."
          />
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              Open the network
            </Link>
            <Link
              href="/companies"
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              All issuers
            </Link>
            <Link
              href="/events"
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              Official records
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {sectors.slice(0, 8).map((s) => (
              <Link key={s.slug} href={`/sectors/${s.slug}`}>
                <Tag tone="sector" className="transition-colors duration-200 hover:border-tSector/70">
                  {s.name}
                </Tag>
              </Link>
            ))}
            <Tag tone="commodity">{indicesSnap?.data.indices.length ?? 0} official indices</Tag>
            <Tag tone="country">{sectors.length} AMMC sectors</Tag>
          </div>
        </div>
      </Section>

      <Section tight className="pb-20">
        <LegendNote provenance={instrumentsSnap ? undefined : null} />
      </Section>
    </Shell>
  );
}

function Cell({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub: string;
  delta?: number;
}) {
  return (
    <div className="bg-bg px-0 py-5 sm:px-5 sm:first:pl-0 lg:px-6">
      <div className="label">{label}</div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="num text-xl font-medium tracking-tight text-ink">{value}</span>
        {delta !== undefined ? <Delta value={delta} size="xs" /> : null}
      </div>
      <p className="mt-1 text-2xs text-ink-faint">{sub}</p>
    </div>
  );
}

function BreadthPanel({
  advances,
  declines,
  unchanged,
  covered,
  total,
}: {
  advances: number;
  declines: number;
  unchanged: number;
  covered: number;
  total: number;
}) {
  const sum = advances + declines + unchanged || 1;
  const seg = (n: number) => `${(n / sum) * 100}%`;

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <h3 className="font-display text-lg font-semibold tracking-tight text-ink">Breadth</h3>
        <span className="label">Session</span>
      </div>
      <div className="flex h-2 w-full overflow-hidden bg-ink/[0.06]">
        <div className="h-full bg-pos transition-all duration-700" style={{ width: seg(advances) }} />
        <div className="h-full bg-ink-faint/60" style={{ width: seg(unchanged) }} />
        <div className="h-full bg-neg transition-all duration-700" style={{ width: seg(declines) }} />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <Stat label="Advances" value={advances} />
        <Stat label="Unchanged" value={unchanged} />
        <Stat label="Declines" value={declines} />
      </div>
      <p className="mt-4 text-2xs leading-relaxed text-ink-faint">
        {covered} of {total} cached equities published a session change. Breadth counts only those
        with a real change; equities with no traded session are excluded rather than counted as flat.
      </p>
    </div>
  );
}