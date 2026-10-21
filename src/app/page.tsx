'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Network } from 'lucide-react';
import { Shell } from '@/components/ui/primitives';
import { EconomicGraph } from '@/components/graph/EconomicGraph';
import { MarketMovers, MarketSnapshot } from '@/components/market/MarketPanels';
import { Wordmark } from '@/components/layout/SiteHeader';
import { ZelligeMotif } from '@/components/ui/Zellige';
import { RegistryStats } from '@/components/layout/RegistryStats';

export default function HomePage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      {/* ── hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg mask-fade-b opacity-60" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem]"
          style={{
            background:
              'radial-gradient(ellipse 60% 100% at 50% 0%, rgb(var(--c-accent)/0.07), transparent 65%)',
          }}
        />
        <ZelligeMotif
          className="right-[-3rem] top-[-1rem] text-accent sm:right-6 sm:top-0"
          size={260}
          opacity={0.05}
        />
        <ZelligeMotif
          className="left-[-4rem] top-[8rem] hidden text-accent lg:block"
          size={200}
          opacity={0.035}
        />

        <Shell className="relative pb-10 pt-16 sm:pt-24 lg:pt-28">
          <div className="flex flex-col items-center text-center">
            <Link
              href="/"
              className="group mb-8 inline-flex items-center gap-3"
              aria-label="MA3NA home"
            >
              <span className="relative flex h-8 w-8 items-center justify-center">
                <span className="absolute inset-0 rotate-45 border border-accent/50 transition-colors duration-500 group-hover:border-accent" />
                <span className="absolute inset-[5px] rotate-45 border border-accent/20" />
                <span className="h-1.5 w-1.5 rotate-45 bg-accent" />
              </span>
              <Wordmark className="text-3xl sm:text-4xl" />
            </Link>

            <h1 className="max-w-4xl font-display text-[2.5rem] font-semibold leading-[0.98] tracking-tightest text-ink text-balance sm:text-6xl lg:text-[4.5rem]">
              Mapping Morocco&rsquo;s
              <br className="hidden sm:block" />{' '}
              <span className="text-ink-mute">economic connections.</span>
            </h1>

            <p className="mt-7 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft text-pretty sm:text-base">
              Explore the relationships between Moroccan listed issuers, AMMC sectors, official index
              levels and dated Bourse records.
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#network"
                className="group inline-flex h-10 items-center gap-2 bg-ink px-5 text-xs font-medium tracking-tight text-bg transition-all duration-200 hover:bg-accent"
              >
                <Network size={14} strokeWidth={1.8} />
                Explore the network
                <ArrowDown size={13} className="transition-transform duration-200 group-hover:translate-y-0.5" />
              </a>
              <Link
                href="/simulator"
                className="inline-flex h-10 items-center gap-2 border border-line px-5 text-xs tracking-tight text-ink-soft transition-all duration-200 hover:border-line-strong hover:text-ink"
              >
                Shock simulator
              </Link>
            </div>

            <RegistryStats />
          </div>
        </Shell>
      </section>

      {/* ── the graph ────────────────────────────────────────────────────── */}
      <Shell>
        <section id="network" className="scroll-mt-16 pt-10 sm:pt-14">
          <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="label mb-2.5">Interactive network</div>
              <h2 className="font-display text-xl font-semibold tracking-tightest text-ink sm:text-2xl">
                Every entity type, connected
              </h2>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-ink-mute">
              Drag, zoom and select any node. Filter layers, search the graph, then expand or
              collapse the neighbourhood to isolate an entity.
            </p>
          </div>

          <div
            className={cxReady(ready)}
            style={{ minHeight: 560 }}
          >
            <EconomicGraph height="h-[560px] sm:h-[640px] lg:h-[700px]" />
          </div>
        </section>
      </Shell>

      {/* ── snapshot ─────────────────────────────────────────────────────── */}
      <Shell>
        <section className="pt-16 sm:pt-24">
          <MarketSnapshot />
        </section>
      </Shell>

      {/* ── movers ───────────────────────────────────────────────────────── */}
      <Shell>
        <section className="pt-16 sm:pt-24">
          <div className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="label mb-3">Market movers</div>
              <h2 className="font-display text-2xl font-semibold tracking-tightest text-ink sm:text-3xl">
                Session extremes
              </h2>
            </div>
            <Link
              href="/companies"
              className="group inline-flex items-center gap-1.5 text-xs text-ink-soft transition-colors hover:text-accent"
            >
              All companies
              <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>
          <MarketMovers />
        </section>
      </Shell>

      {/* ── method ───────────────────────────────────────────────────────── */}
      <Shell>
        <section className="pt-16 sm:pt-24">
          <div className="grid gap-10 border-t border-line pt-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <div className="label mb-4">The idea</div>
              <h2 className="font-display text-2xl font-semibold leading-tight tracking-tightest text-ink sm:text-3xl">
                A quote is one number. An economy is a network.
              </h2>
            </div>
            <div className="space-y-6 text-[0.9375rem] leading-relaxed text-ink-soft">
              <p>
                A terminal shows you one quote at a time. MA3NA shows the structure the quote sits
                in: which sector the AMMC register classifies an issuer into, which official index
                levels the exchange publishes, which dated record was filed against it, and which
                other listed issuers its returns actually move with.
              </p>
              <p>
                Every one of those links is traceable. Sector membership comes from the AMMC issuer
                register. Prices, capitalisation and index levels come from Casablanca Bourse. A
                record is attached to an issuer only when the document itself names the ticker, and
                co-movement is computed from published closes with the session count shown beside it.
                Where no source publishes a value, MA3NA says so instead of filling the gap.
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2">
                {[
                  { h: '/sectors/mines', l: 'Mining sector' },
                  { h: '/companies/MNG', l: 'MANAGEM' },
                  { h: '/events', l: 'Dated records' },
                  { h: '/market', l: 'Official index levels' },
                ].map((l) => (
                  <Link
                    key={l.h}
                    href={l.h}
                    className="group inline-flex items-center gap-1.5 border-b border-line pb-0.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent"
                  >
                    {l.l}
                    <ArrowUpRight size={12} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Shell>
    </>
  );
}

function cxReady(ready: boolean) {
  return `transition-opacity duration-700 ease-swift ${ready ? 'opacity-100' : 'opacity-0'}`;
}