'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ArrowRight, CornerDownLeft, Search, X } from 'lucide-react';
import { getRegistry, type RegistryNode } from '@/lib/data/client';
import type { NodeType } from '@/lib/data/shapes';
import { cx } from '@/lib/utils';
import { useSearch } from './SearchProvider';
import { TYPE_META } from '@/components/graph/GraphLegend';
import { ZelligeMotif } from '@/components/ui/Zellige';

type ResultType = NodeType | 'page';

interface Result {
  id: string;
  type: ResultType;
  label: string;
  sublabel: string;
  href: string;
  score: number;
}

const STATIC_PAGES: Array<{ label: string; sublabel: string; href: string; icon: string }> = [
  { label: 'Market snapshot', sublabel: 'Official indices, breadth and turnover', href: '/market', icon: 'M' },
  { label: 'Exposure explorer', sublabel: 'Correlations from published closes', href: '/simulator', icon: 'S' },
  { label: 'All issuers', sublabel: 'Every listed equity', href: '/companies', icon: 'C' },
  { label: 'Sectors', sublabel: 'AMMC classification', href: '/sectors', icon: 'S' },
  { label: 'Official records', sublabel: 'AMMC filings and Bourse bulletins', href: '/events', icon: 'E' },
];

/** Landing set: one entry per type so an empty query is not a wall of 150 rows. */
function featured(nodes: RegistryNode[]): RegistryNode[] {
  const byType = new Map<NodeType, RegistryNode>();
  for (const n of nodes) {
    if (!byType.has(n.type)) byType.set(n.type, n);
  }
  const out: RegistryNode[] = [];
  for (const t of ['sector', 'index', 'company', 'event'] as NodeType[]) {
    const n = byType.get(t);
    if (n) out.push(n);
  }
  return out;
}

function scoreOf(label: string, sublabel: string, q: string, type: NodeType) {
  const l = label.toLowerCase();
  const s = sublabel.toLowerCase();
  if (l === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.includes(q)) return 60;
  if (type === 'company' && l.replace(/\s/g, '').startsWith(q)) return 55;
  if (s.includes(q)) return 30;
  if (type.includes(q)) return 12;
  return 0;
}

export function CommandPalette() {
  const { open } = useSearch();
  // the body only exists while open, so query and cursor start clean each time
  // instead of being reset from an effect on mount
  return open ? <PaletteBody /> : null;
}

function PaletteBody() {
  const { setOpen } = useSearch();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [registry, setRegistry] = useState<RegistryNode[]>([]);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    let on = true;
    void getRegistry().then((reg) => {
      if (on) setRegistry(reg.nodes);
    });
    return () => {
      on = false;
    };
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    const term = q.trim().toLowerCase();
    if (!term) {
      return featured(registry).map((r) => ({
        id: r.id,
        type: r.type,
        label: r.label,
        sublabel: r.sublabel,
        href: r.href,
        score: 1,
      }));
    }
    const scored = registry.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      sublabel: r.sublabel,
      href: r.href,
      score: scoreOf(r.label, r.sublabel, term, r.type),
    }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.label.length - b.label.length)
      .slice(0, 24);

    const pages = STATIC_PAGES.filter(
      (p) => p.label.toLowerCase().includes(term) || p.sublabel.toLowerCase().includes(term),
    ).map<Result>((p, i) => ({
      id: `page-${i}`,
      type: 'page' as const,
      label: p.label,
      sublabel: p.sublabel,
      href: p.href,
      score: 40,
    }));

    return [...pages, ...scored];
  }, [q, registry]);

  // reset the cursor as part of the same change that changed the query
  const onQuery = (value: string) => {
    setQ(value);
    setCursor(0);
  };

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const go = useCallback(
    (r: Result | undefined) => {
      if (!r) return;
      setOpen(false);
      router.push(r.href);
    },
    [router, setOpen],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (results.length ? (c + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (results.length ? (c - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[cursor]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.type] ??= []).push(r);
    return acc;
  }, {});

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-start justify-center px-4 pt-[12vh] sm:pt-[14vh]">
      <button
        aria-label="Close search"
        onClick={() => setOpen(false)}
        className="absolute inset-0 cursor-default bg-bg/80 backdrop-blur-md animate-fade-in"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search MA3NA"
        className="relative w-full max-w-[40rem] animate-rise-in overflow-hidden border border-line-strong bg-surface/95 shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)] backdrop-blur-2xl"
      >
        <ZelligeMotif className="-right-8 -top-8 text-accent" size={150} opacity={0.045} />

        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search size={16} className="shrink-0 text-ink-mute" strokeWidth={1.7} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search companies, sectors, commodities, countries, events…"
            className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink placeholder:text-ink-faint focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {q ? (
            <button
              onClick={() => setQ('')}
              className="shrink-0 text-ink-mute transition-colors hover:text-ink"
              aria-label="Clear"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="hidden shrink-0 border border-line px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-ink-faint sm:block">
              Esc
            </kbd>
          )}
        </div>

        <div ref={listRef} className="max-h-[min(28rem,54vh)] overflow-y-auto overscroll-contain">
          {results.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="font-display text-sm font-medium text-ink">
                No economic connections found.
              </p>
              <p className="mt-2 text-xs text-ink-mute">
                Nothing in the network matches “{q}”. Try a commodity, sector or ticker.
              </p>
            </div>
          ) : (
            <div className="py-1.5">
              {q
                ? null
                : Object.keys(grouped).map((t) => (
                    <div key={t} className="px-4 pb-1 pt-3 first:pt-1.5">
                      <span className="label">{t === 'page' ? 'Navigate' : TYPE_META[t as NodeType].label}</span>
                    </div>
                  ))}
              {results.map((r, i) => (
                <button
                  key={`${r.type}-${r.id}`}
                  data-idx={i}
                  onClick={() => go(r)}
                  onMouseMove={() => setCursor(i)}
                  className={cx(
                    'group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150',
                    cursor === i ? 'bg-ink/[0.055]' : 'hover:bg-ink/[0.03]',
                  )}
                >
                  <span
                    className="flex h-6 w-6 shrink-0 items-center justify-center border font-mono text-[0.5625rem] uppercase tracking-[0.06em]"
                    style={
                      r.type === 'page'
                        ? { borderColor: 'rgb(var(--c-line) / 0.1)', color: 'rgb(var(--c-ink-mute))' }
                        : {
                            borderColor: `rgb(var(--c-${r.type}))`,
                            color: `rgb(var(--c-${r.type}))`,
                            background: `rgb(var(--c-${r.type}) / 0.12)`,
                          }
                    }
                  >
                    {r.type === 'page' ? r.label.slice(0, 1) : TYPE_META[r.type].label.slice(0, 2)}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cx(
                        'block truncate text-sm',
                        r.type === 'company' ? 'num font-semibold tracking-tight' : 'font-medium',
                        cursor === i ? 'text-accent' : 'text-ink',
                      )}
                    >
                      {r.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[0.6875rem] text-ink-mute">
                      {r.sublabel}
                    </span>
                  </span>

                  {r.type !== 'page' ? (
                    <span
                      className={cx(
                        'shrink-0 font-mono text-[0.5625rem] uppercase tracking-[0.14em]',
                        TYPE_META[r.type].color,
                      )}
                    >
                      {r.type}
                    </span>
                  ) : (
                    <ArrowRight size={13} className="shrink-0 text-ink-faint" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 font-mono text-[0.5625rem] uppercase tracking-[0.12em] text-ink-faint">
          <span className="flex items-center gap-1.5">
            <kbd className="border border-line px-1 py-px">↑</kbd>
            <kbd className="border border-line px-1 py-px">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="border border-line px-1 py-px">
              <CornerDownLeft size={8} />
            </kbd>
            open
          </span>
          <span className="ml-auto hidden sm:block">
            {results.length} result{results.length === 1 ? '' : 's'} · cached official data
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function SearchTrigger() {
  const { setOpen } = useSearch();
  return (
    <button
      onClick={() => setOpen(true)}
      className="group flex h-8 items-center gap-2.5 border border-line px-2.5 text-ink-mute transition-all duration-200 hover:border-line-strong hover:text-ink"
    >
      <Search size={13} strokeWidth={1.8} />
      <span className="hidden text-xs sm:block">Search</span>
      <kbd className="hidden border border-line px-1 py-px font-mono text-[0.5625rem] tracking-[0.06em] text-ink-faint lg:block">
        ⌘K
      </kbd>
    </button>
  );
}