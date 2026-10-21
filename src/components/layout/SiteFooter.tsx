import Link from 'next/link';
import { CompassRose, ZelligeBand } from '@/components/ui/Zellige';
import {
  getCompanySummaries,
  getEvents,
  getSectorSummaries,
  loadIndices,
} from '@/lib/data';

export async function SiteFooter() {
  const [companies, sectors, events, indices] = await Promise.all([
    getCompanySummaries(),
    getSectorSummaries(),
    getEvents(),
    loadIndices(),
  ]);

  return (
    <footer className="mx-auto mt-24 w-full max-w-shell border-t border-line px-5 sm:px-7 lg:px-10">
      <div className="py-14">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <CompassRose className="h-5 w-5 text-accent" />
              <span className="font-display text-base font-semibold tracking-tight text-ink">MA3NA</span>
            </div>
            <p className="mt-4 max-w-xs text-[0.8125rem] leading-relaxed text-ink-mute">
              An exploration of Moroccan market structure, built on published data from Casablanca
              Bourse and the AMMC.
            </p>
          </div>

          <div>
            <h3 className="label">Explore</h3>
            <ul className="mt-4 space-y-2">
              {[
                ['Network', '/'],
                ['Market', '/market'],
                ['Issuers', '/companies'],
                ['Sectors', '/sectors'],
                ['Official records', '/events'],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[0.8125rem] text-ink-mute transition-colors duration-200 hover:text-ink"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label">Data sources</h3>
            <ul className="mt-4 space-y-2">
              {[
                ['Casablanca Bourse', 'https://www.casablanca-bourse.com/en/market-data/Cours'],
                ['AMMC issuer register', 'https://www.ammc.ma/fr/espace-emetteurs/liste-des-emetteurs'],
                ['AMMC publications', 'https://www.ammc.ma/fr/actualites'],
                ['Bourse bulletins', 'https://www.casablanca-bourse.com/market-data/bulletins-de-la-cote'],
              ].map(([label, href]) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[0.8125rem] text-ink-mute transition-colors duration-200 hover:text-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label">Cached dataset</h3>
            <dl className="mt-4 space-y-2">
              {[
                ['Listed issuers', companies.length],
                ['AMMC sectors', sectors.length],
                ['Official indices', indices?.data.indices.length ?? 0],
                ['Official records', events.length],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex items-baseline justify-between gap-3">
                  <dt className="text-[0.8125rem] text-ink-mute">{k}</dt>
                  <dd className="num text-[0.8125rem] tabular-nums text-ink-soft">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-2xl text-[0.6875rem] leading-relaxed text-ink-faint">
            <span className="text-accent">Cached official data.</span> Every figure comes from a
            stored snapshot of Casablanca Bourse or AMMC publications. Nothing on this site is
            simulated or generated. Where a value is not published it is shown as unavailable.
            Free historical depth is the exchange-stated three-year maximum; older and real-time data
            are licensed products.
          </p>
        </div>
      </div>

      <ZelligeBand />
    </footer>
  );
}