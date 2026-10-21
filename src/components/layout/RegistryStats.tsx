'use client';

import { useEffect, useState } from 'react';
import { getRegistry } from '@/lib/data/client';

/** Honest dataset counts, read from the cached registry. */
export function RegistryStats() {
  const [counts, setCounts] = useState<{ companies: number; sectors: number; indices: number; events: number } | null>(null);

  useEffect(() => {
    let on = true;
    void getRegistry().then((reg) => {
      if (!on) return;
      setCounts({
        companies: reg.counts.company,
        sectors: reg.counts.sector,
        indices: reg.counts.index,
        events: reg.counts.event,
      });
    });
    return () => {
      on = false;
    };
  }, []);

  const cells = counts
    ? [
        { k: 'Listed issuers', v: counts.companies },
        { k: 'AMMC sectors', v: counts.sectors },
        { k: 'Official indices', v: counts.indices },
        { k: 'Official records', v: counts.events },
      ]
    : [];

  return (
    <dl className="mt-14 grid w-full max-w-2xl grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
      {cells.map((s) => (
        <div key={s.k} className="bg-bg px-3 py-5">
          <dt className="label">{s.k}</dt>
          <dd className="num mt-2 text-xl font-medium tabular-nums text-ink">{s.v}</dd>
        </div>
      ))}
    </dl>
  );
}