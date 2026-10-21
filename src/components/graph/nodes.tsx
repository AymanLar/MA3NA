'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Building2,
  Cpu,
  Gem,
  HardHat,
  Landmark,
  Route,
  ShieldCheck,
  Signal,
  Wheat,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cx } from '@/lib/utils';

export const SECTOR_ICONS: Record<string, LucideIcon> = {
  mining: Gem,
  banking: Landmark,
  telecom: Signal,
  energy: Zap,
  construction: HardHat,
  food: Wheat,
  technology: Cpu,
  realestate: Building2,
  transport: Route,
  insurance: ShieldCheck,
};

export interface EntityNodeData extends Record<string, unknown> {
  type: 'company' | 'sector' | 'index' | 'event';
  label: string;
  sublabel: string;
  selected?: boolean;
  dimmed?: boolean;
  matched?: boolean;
  depth?: number;
  price?: number;
  changePct?: number;
  meta?: string;
  count?: number;
  onOpen?: (id: string) => void;
}

function Anchor() {
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </>
  );
}

const ring = 'transition-all duration-300 ease-swift';

/* ── company ─────────────────────────────────────────────────────────────── */

const CompanyNode = memo(({ data, selected }: NodeProps) => {
  const d = data as EntityNodeData;
  return (
    <div
      className={cx(
        'group w-[172px] border bg-surface px-3 py-2.5 text-left transition-all duration-300 ease-swift',
        ring,
        selected
          ? 'border-tCompany/70 shadow-[0_0_0_1px_rgb(var(--c-company)/0.35),0_14px_40px_-16px_rgb(var(--c-company)/0.5)]'
          : 'border-line hover:border-line-strong',
        d.dimmed && 'opacity-25 saturate-[0.35]',
      )}
    >
      <Anchor />
      <span
        className={cx(
          'absolute inset-y-0 left-0 w-[2px] bg-tCompany transition-opacity duration-300',
          selected ? 'opacity-100' : 'opacity-45',
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="num text-[0.8125rem] font-semibold leading-none tracking-tight text-ink">
          {d.label}
        </span>
        {d.matched ? <span className="mt-px h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_rgb(var(--c-accent)/0.9)]" /> : null}
      </div>
      <div className="mt-1 truncate text-[0.6875rem] leading-tight text-ink-mute">{d.sublabel}</div>
      {typeof d.price === 'number' ? (
        <div className="mt-2 flex items-baseline gap-2 border-t border-line pt-1.5">
          <span className="num text-[0.6875rem] font-medium text-ink-soft">{d.price.toFixed(2)}</span>
          <span
            className={cx(
              'num ml-auto text-[0.6875rem] font-medium tabular-nums',
              (d.changePct ?? 0) >= 0 ? 'text-pos' : 'text-neg',
            )}
          >
            {(d.changePct ?? 0) >= 0 ? '+' : ''}
            {(d.changePct ?? 0).toFixed(2)}%
          </span>
        </div>
      ) : null}
    </div>
  );
});
CompanyNode.displayName = 'CompanyNode';

/* ── sector ──────────────────────────────────────────────────────────────── */

const SectorNode = memo(({ data, selected }: NodeProps) => {
  const d = data as EntityNodeData;
  const Icon = SECTOR_ICONS[d.meta ?? ''] ?? Landmark;
  return (
    <div
      className={cx(
        'w-[160px] border px-3 py-2.5 transition-all duration-300 ease-swift',
        ring,
        selected
          ? 'border-tSector/80 bg-surface shadow-[0_0_0_1px_rgb(var(--c-sector)/0.3),0_14px_40px_-16px_rgb(var(--c-sector)/0.5)]'
          : 'border-tSector/22 bg-surface/70 hover:border-tSector/45',
        d.dimmed && 'opacity-25 saturate-[0.35]',
      )}
    >
      <Anchor />
      <div
        className={cx(
          'pointer-events-none absolute -inset-[3px] border transition-all duration-300',
          selected ? 'border-tSector/15' : 'border-transparent',
        )}
      />
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-tSector/12 text-tSector">
          <Icon className="h-3 w-3" strokeWidth={1.7} />
        </span>
        <span className="num text-[0.6875rem] uppercase tracking-[0.13em] text-tSector">Sector</span>
        <span className="num ml-auto text-[0.6875rem] tabular-nums text-ink-mute">
          {d.count ?? 0}
        </span>
      </div>
      <div className="mt-1.5 font-display text-[0.8125rem] font-semibold leading-tight tracking-tight text-ink">
        {d.label}
      </div>
    </div>
  );
});
SectorNode.displayName = 'SectorNode';

/* ── index (circular) ────────────────────────────────────────────────── */

const IndexNode = memo(({ data, selected }: NodeProps) => {
  const d = data as EntityNodeData;
  const size = selected ? 84 : 76;
  return (
    <div
      className={cx(
        'flex flex-col items-center transition-all duration-300 ease-swift',
        d.dimmed && 'opacity-25 saturate-[0.35]',
      )}
      style={{ width: 116 }}
    >
      <Anchor />
      <div
        className={cx(
          'relative flex items-center justify-center rounded-full border transition-all duration-300 ease-swift',
          selected
            ? 'border-tCommodity bg-surface shadow-[0_0_0_3px_rgb(var(--c-commodity)/0.14),0_0_34px_-6px_rgb(var(--c-commodity)/0.6)]'
            : 'border-tCommodity/40 bg-surface/80 hover:border-tCommodity/80',
        )}
        style={{ width: size, height: size }}
      >
        <span className="num text-[0.8125rem] font-semibold tracking-tight text-tCommodity">
          {d.meta ?? d.label.slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="mt-1.5 w-full text-center text-[0.6875rem] font-medium leading-tight text-ink-soft">
        {d.label}
      </div>
      {typeof d.changePct === 'number' ? (
        <div
          className={cx(
            'num mt-0.5 text-[0.625rem] tabular-nums',
            d.changePct >= 0 ? 'text-pos' : 'text-neg',
          )}
        >
          {d.changePct >= 0 ? '+' : ''}
          {d.changePct.toFixed(2)}%
        </div>
      ) : null}
    </div>
  );
});
IndexNode.displayName = 'IndexNode';

/* ── event (timeline strip) ──────────────────────────────────────────────── */

const EventNode = memo(({ data, selected }: NodeProps) => {
  const d = data as EntityNodeData;
  return (
    <div
      className={cx(
        'group flex w-[150px] gap-0 border-l-2 transition-all duration-300 ease-swift',
        selected
          ? 'border-l-tEvent bg-surface px-2.5 py-2 shadow-[0_0_0_1px_rgb(var(--c-event)/0.25),0_12px_34px_-18px_rgb(var(--c-event)/0.6)]'
          : 'border-l-tEvent/45 bg-surface/60 px-2.5 py-2 hover:border-l-tEvent hover:bg-surface/85',
        d.dimmed && 'opacity-25 saturate-[0.35]',
      )}
    >
      <Anchor />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="num text-[0.625rem] font-medium tabular-nums tracking-[0.1em] text-tEvent">
            {d.meta}
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="mt-1 line-clamp-2 text-[0.6875rem] font-medium leading-snug text-ink-soft">
          {d.label}
        </div>
      </div>
    </div>
  );
});
EventNode.displayName = 'EventNode';

export const NODE_TYPES = {
  company: CompanyNode,
  sector: SectorNode,
  index: IndexNode,
  event: EventNode,
};

export const TYPE_CLASS: Record<string, string> = {
  company: 'text-tCompany',
  sector: 'text-tSector',
  index: 'text-tCommodity',
  event: 'text-tEvent',
};

export const TYPE_BG: Record<string, string> = {
  company: 'bg-tCompany',
  sector: 'bg-tSector',
  index: 'bg-tCommodity',
  event: 'bg-tEvent',
};