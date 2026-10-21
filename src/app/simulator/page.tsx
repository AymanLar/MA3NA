import { getCompanySummaries } from '@/lib/data';
import { Breadcrumb, Eyebrow, Section, Shell } from '@/components/ui/primitives';
import { SimulatorPanel } from '@/components/simulator/SimulatorPanel';

export const metadata = {
  title: 'Exposure explorer · MA3NA',
  description:
    'Correlation between any two listed equities, computed from cached Casablanca Bourse closes. A historical measure, not a forecast.',
};

export default async function SimulatorPage() {
  const companies = await getCompanySummaries();
  const withHistory = companies.filter((c) => c.close.value !== null).length;

  return (
    <Shell>
      <Section className="pt-10 sm:pt-14">
        <Breadcrumb items={[{ label: 'MA3NA', href: '/' }, { label: 'Exposure explorer' }]} />

        <div className="mt-8 border-b border-line pb-10 sm:mt-10">
          <Eyebrow className="mb-4">Exposure explorer</Eyebrow>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.02] tracking-tightest text-ink sm:text-5xl">
            How closely two instruments actually moved
          </h1>
          <p className="mt-5 max-w-2xl text-[0.975rem] leading-relaxed text-ink-soft text-pretty">
            Pick any two of the {withHistory} listed equities with cached price history and MA3NA
            computes the Pearson correlation of their daily returns across shared sessions.
          </p>
        </div>

        <div className="mt-8 border-l-2 border-accent/50 bg-accent/[0.04] px-6 py-5">
          <p className="text-sm font-medium leading-relaxed text-ink">
            A historical measure is not a forecast.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ink-mute">
            Correlation describes how two series moved together in the past. It carries no expectation
            about future behaviour, does not describe causation, and must not support an investment
            decision. MA3NA does not model price shocks, because no official source provides a
            defensible basis for doing so.
          </p>
        </div>
      </Section>

      <Section tight className="pb-20">
        <div className="pt-10">
          <SimulatorPanel />
        </div>
      </Section>
    </Shell>
  );
}