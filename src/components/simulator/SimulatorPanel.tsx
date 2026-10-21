'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Info, Layers, Scale } from 'lucide-react';
import { getCompanySummaries, type CompanySummary } from '@/lib/data/client';
import { usePairCorrelation } from '@/lib/data/use-series';
import { cx, num } from '@/lib/utils';
import { DataUnavailable } from '@/components/ui/Provenance';
import { Tag } from '@/components/ui/primitives';

type Metric = 'correlation' | 'sector';

export function SimulatorPanel() {
  const [companies, setCompanies] = useState<CompanySummary[] | null>(null);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [mode, setMode] = useState<Metric>('correlation');

  useEffect(() => {
    let on = true;
    void getCompanySummaries().then((r) => {
      if (!on) return;
      setCompanies(r);
      setAnchor(r.find((c) => c.close.value !== null)?.ticker ?? null);
      setSubject(r.find((c) => c.close.value !== null && c.ticker !== anchor)?.ticker ?? null);
    });
    return () => {
      on = false;
    };
  }, [anchor]);

  const sameSector = useMemo(() => {
    if (!companies || !anchor || !subject) return null;
    const a = companies.find((c) => c.ticker === anchor);
    const b = companies.find((c) => c.ticker === subject);
    if (!a || !b || !a.sector) return null;
    return a.sector === b.sector;
  }, [companies, anchor, subject]);

  const corr = usePairCorrelation(anchor, mode === 'correlation' ? subject : null);

  const sectorMembers = useMemo(() => {
    if (!companies || !anchor) return [];
    const a = companies.find((c) => c.ticker === anchor);
    if (!a?.sector) return [];
    return companies.filter((c) => c.sector === a.sector);
  }, [companies, anchor]);

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
      {/* ── controls ── */}
      <div>
        <div className="flex items-center gap-1.5">
          {(
            [
              { key: 'correlation' as const, label: 'Pair correlation' },
              { key: 'sector' as const, label: 'Sector view' },
            ]
          ).map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMode(m.key)}
              className={cx(
                'border px-3 py-1.5 font-mono text-2xs uppercase tracking-[0.12em] transition-colors',
                mode === m.key
                  ? 'border-accent text-accent'
                  : 'border-line text-ink-mute hover:border-line-strong hover:text-ink',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-6">
          <Picker
            label="First instrument"
            value={anchor}
            companies={companies ?? []}
            onChange={setAnchor}
          />
          {mode === 'correlation' ? (
            <Picker
              label="Second instrument"
              value={subject}
              companies={companies ?? []}
              onChange={setSubject}
              exclude={anchor}
            />
          ) : null}
        </div>

        {mode === 'sector' && sameSector ? (
          <div className="mt-8">
            <DataUnavailable
              compact
              reason="A sector has no published index history from the exchange, so no sector-level exposure can be computed. Compare individual instruments instead."
            />
          </div>
        ) : null}
      </div>

      {/* ── output ── */}
      <div>
        {mode === 'correlation' ? (
          <div className="border border-line p-8">
            <div className="flex items-center gap-2">
              <Scale className="h-3.5 w-3.5 text-ink-faint" />
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                Pearson correlation of daily returns
              </h3>
            </div>

            {!anchor || !subject ? (
              <p className="mt-6 text-xs text-ink-mute">Select two instruments.</p>
            ) : corr.unavailable ? (
              <div className="mt-6">
                <DataUnavailable
                  reason={
                    corr.n < 30
                      ? `Only ${corr.n} shared traded sessions are cached, which is too few for a stable correlation. Free history is limited to three years.`
                      : 'One of the two series has no cached price history.'
                  }
                />
              </div>
            ) : (
              <>
                <div className="mt-6 flex items-baseline gap-4">
                  <span
                    className={cx(
                      'num text-5xl font-semibold leading-none tracking-tight',
                      corr.value! >= 0 ? 'text-pos' : 'text-neg',
                    )}
                  >
                    {num(corr.value!)}
                  </span>
                  <div className="min-w-0">
                    <div className="num text-xs text-ink-soft">
                      {anchor} · {subject}
                    </div>
                    <div className="num text-2xs text-ink-faint">{corr.n} shared sessions</div>
                  </div>
                </div>

                <div className="relative mt-8 h-1 w-full bg-ink/[0.08]">
                  <span
                    className="absolute top-1/2 h-3 w-[3px] -translate-y-1/2 bg-accent"
                    style={{ left: `${((corr.value! + 1) / 2) * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-2xs text-ink-faint">
                  <span>-1 inverse</span>
                  <span>0 uncorrelated</span>
                  <span>+1 together</span>
                </div>

                <p className="mt-8 text-2xs leading-relaxed text-ink-faint">{corr.method}</p>
                <p className="mt-3 text-2xs leading-relaxed text-ink-faint">
                  This is a historical measure computed from cached closes. It is not a forecast and
                  carries no expectation about future behaviour.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="border border-line p-8">
            <div className="flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-ink-faint" />
              <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                Sector composition
              </h3>
            </div>

            {sectorMembers.length === 0 ? (
              <div className="mt-6">
                <DataUnavailable reason="AMMC has not published a sector for this instrument." />
              </div>
            ) : (
              <>
                <div className="mt-6 flex flex-wrap gap-2">
                  {sectorMembers.map((m) => (
                    <button
                      key={m.ticker}
                      type="button"
                      onClick={() => setSubject(m.ticker)}
                      className="num border border-line px-2 py-1 text-2xs text-ink-mute transition-colors hover:border-line-strong hover:text-ink"
                    >
                      {m.ticker}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-2xs leading-relaxed text-ink-faint">
                  Listed members of this AMMC classification. Select one to compare it against{' '}
                  {anchor}.
                </p>
              </>
            )}
          </div>
        )}

        <div className="mt-8 flex items-start gap-3 border-l-2 border-line pl-4">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
          <p className="text-2xs leading-relaxed text-ink-faint">
            MA3NA computes only measures it can trace to published data. It does not forecast prices
            or simulate shocks, because no official source provides a basis for doing so honestly.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <Link
            href="/companies"
            className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
          >
            <Building2 className="h-3 w-3" />
            All issuers
          </Link>
          {anchor ? (
            <Link
              href={`/companies/${anchor}`}
              className="inline-flex h-9 items-center gap-2 border border-line px-4 font-mono text-2xs uppercase tracking-[0.12em] text-ink-soft transition-all duration-200 hover:border-line-strong hover:bg-ink/[0.045] hover:text-ink"
            >
              {anchor} detail
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Picker({
  label,
  value,
  companies,
  onChange,
  exclude,
}: {
  label: string;
  value: string | null;
  companies: CompanySummary[];
  onChange: (t: string) => void;
  exclude?: string | null;
}) {
  const [term, setTerm] = useState('');

  const options = useMemo(() => {
    const t = term.trim().toLowerCase();
    return companies
      .filter((c) => c.ticker !== exclude)
      .filter(
        (c) =>
          !t ||
          c.ticker.toLowerCase().includes(t) ||
          c.nameFr.toLowerCase().includes(t) ||
          c.name.toLowerCase().includes(t),
      )
      .slice(0, 60);
  }, [companies, term, exclude]);

  return (
    <div>
      <label className="label">{label}</label>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Filter instruments"
        className="mt-2 h-9 w-full border border-line bg-transparent px-3 text-xs text-ink placeholder:text-ink-faint focus:border-line-strong focus:outline-none"
      />
      <div className="mt-3 max-h-56 overflow-y-auto">
        {options.length === 0 ? (
          <p className="py-4 text-2xs text-ink-faint">No match.</p>
        ) : (
          <ul className="divide-y divide-line/60">
            {options.map((c) => (
              <li key={c.ticker}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.ticker);
                    setTerm('');
                  }}
                  className={cx(
                    'flex w-full items-center gap-3 py-2 text-left transition-colors',
                    value === c.ticker ? 'text-accent' : 'text-ink-mute hover:text-ink',
                  )}
                >
                  <span className="num w-14 shrink-0 text-2xs">{c.ticker}</span>
                  <span className="truncate text-2xs">{c.nameFr || c.name}</span>
                  {c.close.value != null ? (
                    <span className="num ml-auto shrink-0 text-2xs tabular-nums text-ink-faint">
                      {num(c.close.value)}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value ? (
        <div className="mt-3">
          <Tag tone="company">{value}</Tag>
        </div>
      ) : null}
    </div>
  );
}