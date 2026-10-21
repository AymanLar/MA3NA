'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSectorSummaries, type SectorSummary } from '@/lib/data/client';

function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function SectorPicker({ value, onChange }: { value: string | null; onChange: (slug: string | null) => void }) {
  const [sectors, setSectors] = useState<SectorSummary[] | null>(null);

  useEffect(() => {
    let on = true;
    void getSectorSummaries().then((r) => {
      if (on) setSectors(r);
    });
    return () => {
      on = false;
    };
  }, []);

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`rounded-full border px-3 py-1 text-2xs transition-colors ${
          value === null ? 'border-tSector text-tSector' : 'border-line text-ink-mute hover:border-line-strong'
        }`}
      >
        All
      </button>
      {(sectors ?? []).map((s) => (
        <button
          key={s.slug}
          type="button"
          onClick={() => onChange(s.slug)}
          className={`rounded-full border px-3 py-1 text-2xs transition-colors ${
            value === s.slug ? 'border-tSector text-tSector' : 'border-line text-ink-mute hover:border-line-strong'
          }`}
        >
          {s.name}
          <span className="ml-1 opacity-60">{s.tickers.length}</span>
        </button>
      ))}
      {!sectors ? <span className="text-2xs text-ink-faint">Loading…</span> : null}
    </div>
  );
}

/** Compact sector chips for filtering a company table. */
export function SectorFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (slug: string | null) => void;
}) {
  const [sectors, setSectors] = useState<SectorSummary[] | null>(null);

  useEffect(() => {
    let on = true;
    void getSectorSummaries().then((r) => {
      if (on) setSectors(r);
    });
    return () => {
      on = false;
    };
  }, []);

  const grouped = useMemo(() => sectors ?? [], [sectors]);

  return (
    <div className="flex flex-wrap gap-1.5">
      <FilterChip active={value === null} onClick={() => onChange(null)}>
        All sectors
      </FilterChip>
      {grouped.map((s) => (
        <FilterChip key={s.slug} active={value === s.slug} onClick={() => onChange(s.slug)}>
          {s.name}
        </FilterChip>
      ))}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-2.5 py-1 text-2xs transition-colors ${
        active ? 'border-accent text-accent' : 'border-line text-ink-mute hover:border-line-strong hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

export { slugify };