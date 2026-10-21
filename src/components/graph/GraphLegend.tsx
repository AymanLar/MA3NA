'use client';

import { useState } from 'react';
import { Building2, CalendarClock, Layers, LineChart } from 'lucide-react';
import { cx } from '@/lib/utils';

export const TYPE_META = {
  company: { label: 'Companies', one: 'Company', color: 'text-tCompany', dot: 'bg-tCompany', Icon: Building2 },
  sector: { label: 'Sectors', one: 'Sector', color: 'text-tSector', dot: 'bg-tSector', Icon: Layers },
  index: { label: 'Official indices', one: 'Index', color: 'text-tCommodity', dot: 'bg-tCommodity', Icon: LineChart },
  event: { label: 'Records', one: 'Record', color: 'text-tEvent', dot: 'bg-tEvent', Icon: CalendarClock },
} as const;

export type MetaKey = keyof typeof TYPE_META;

const ORDER: MetaKey[] = ['company', 'sector', 'index', 'event'];

export function GraphLegend({
  active,
  onToggle,
  onSolo,
  className,
}: {
  active: Set<string>;
  onToggle: (t: string) => void;
  onSolo: (t: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className={cx('glass pointer-events-auto border border-line', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 font-mono text-2xs uppercase tracking-[0.15em] text-ink-mute transition-colors hover:text-ink"
      >
        <Layers size={11} className="text-accent" />
        Layers
        <span className="num ml-auto tabular-nums text-ink-faint">{active.size}/{ORDER.length}</span>
      </button>
      {open ? (
        <div className="border-t border-line px-2.5 py-2">
          <div className="grid gap-0.5">
            {ORDER.map((k) => {
              const m = TYPE_META[k];
              const on = active.has(k);
              return (
                <div key={k} className="group flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggle(k)}
                    className="flex flex-1 items-center gap-2 py-1 text-left"
                  >
                    <span
                      className={cx(
                        'flex h-3 w-3 shrink-0 items-center justify-center border transition-colors duration-200',
                        on ? 'border-accent/70 bg-accent/25' : 'border-line',
                      )}
                    >
                      {on ? (
                        <svg viewBox="0 0 8 8" className="h-2 w-2" aria-hidden>
                          <path d="M1 4 L3 6 L7 2" fill="none" stroke="rgb(var(--c-accent))" strokeWidth="1.6" />
                        </svg>
                      ) : null}
                    </span>
                    <span className={cx('text-[0.6875rem] transition-colors duration-200', on ? 'text-ink-soft' : 'text-ink-faint')}>
                      {m.label}
                    </span>
                    <span className={cx('ml-1 h-1.5 w-1.5 shrink-0 rounded-full transition-opacity duration-200', m.dot, on ? 'opacity-100' : 'opacity-20')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSolo(k)}
                    title={`Show only ${m.label.toLowerCase()}`}
                    className="px-1 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-ink-faint opacity-0 transition-opacity hover:text-accent group-hover:opacity-100"
                  >
                    only
                  </button>
                </div>
              );
            })}
          </div>
          <p className="mt-2.5 border-t border-line pt-2 text-[0.625rem] leading-relaxed text-ink-faint">
            Click a node to inspect · double-click to focus
          </p>
        </div>
      ) : null}
    </div>
  );
}