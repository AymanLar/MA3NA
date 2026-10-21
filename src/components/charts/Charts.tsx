'use client';

import { useId } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cx, formatDay, formatMonthYear } from '@/lib/utils';

/* ── shared tooltip ──────────────────────────────────────────────────────── */

interface TipEntry {
  name?: string;
  value?: number;
  dataKey?: string | number;
  color?: string;
  payload?: Record<string, unknown>;
}

export function ChartTooltip({
  active,
  payload,
  label,
  fmt,
  suffix = '',
  labelFmt = 'day',
}: {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
  fmt?: (v: number) => string;
  suffix?: string;
  labelFmt?: 'day' | 'month';
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass min-w-[9.5rem] border border-line-strong px-2.5 py-2 shadow-xl">
      <div className="font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-ink-mute">
        {labelFmt === 'month' && label
          ? formatMonthYear(new Date(String(label)))
          : typeof label === 'string'
            ? formatDay(label)
            : label}
      </div>
      <div className="mt-1.5 space-y-1">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[0.6875rem] text-ink-soft">
              <span className="h-1.5 w-1.5 shrink-0" style={{ background: p.color }} />
              {p.name}
            </span>
            <span className="num text-[0.6875rem] font-medium tabular-nums text-ink">
              {fmt ? fmt(p.value ?? 0) : (p.value ?? 0).toFixed(2)}
              {suffix}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const axisTick = {
  fill: 'rgb(var(--c-ink-mute))',
  fontSize: 10,
  fontFamily: 'var(--font-mono)',
};

const gridStroke = 'rgb(var(--c-chart-grid) / var(--chart-grid-alpha))';

/* ── index / generic price chart ─────────────────────────────────────────── */

export function PriceChart({
  data,
  height = 300,
  color = 'rgb(var(--c-accent))',
  name = 'Value',
  showGrid = true,
  xKey = 't',
}: {
  data: Array<Record<string, unknown>>;
  height?: number;
  color?: string;
  name?: string;
  showGrid?: boolean;
  xKey?: string;
}) {
  const id = `g${useId().replace(/:/g, '')}`;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.26} />
              <stop offset="92%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {showGrid ? <CartesianGrid stroke={gridStroke} vertical={false} /> : null}
          <XAxis
            dataKey={xKey}
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            minTickGap={38}
            tickFormatter={(v: string) => (daysBetween(data, v) > 120 ? formatMonthYear(new Date(v)) : formatDay(v))}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={58}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--c-ink) / 0.16)', strokeWidth: 1 }}
            content={<ChartTooltip />}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            activeDot={{ r: 3.5, strokeWidth: 2, stroke: 'rgb(var(--c-bg))', fill: color }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function daysBetween(data: Array<Record<string, unknown>>, v: string) {
  const first = data[0]?.t as string | undefined;
  if (!first) return 0;
  return (new Date(v).getTime() - new Date(first).getTime()) / 86_400_000;
}

/* ── comparison chart (event movement) ───────────────────────────────────── */

export function MovementChart({
  data,
  height = 280,
  annotation,
}: {
  data: Array<{ t: string; company: number; masi: number }>;
  height?: number;
  annotation?: string;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 6, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="t"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            minTickGap={40}
            tickFormatter={(v: string) => formatDay(v)}
          />
          <YAxis
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={48}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `${v.toFixed(0)}`}
          />
          <Tooltip cursor={{ stroke: 'rgb(var(--c-ink) / 0.16)' }} content={<ChartTooltip />} />
          <Line
            type="monotone"
            dataKey="company"
            name="Related company (rebased)"
            stroke="rgb(var(--c-accent))"
            strokeWidth={1.7}
            dot={false}
            activeDot={{ r: 3.5 }}
            animationDuration={700}
          />
          <Line
            type="monotone"
            dataKey="masi"
            name="MASI (rebased)"
            stroke="rgb(var(--c-ink-mute))"
            strokeWidth={1.3}
            strokeDasharray="3 3"
            dot={false}
            activeDot={{ r: 3 }}
            animationDuration={700}
          />
          {annotation ? (
            <ReferenceLine
              x={annotation}
              stroke="rgb(var(--c-event))"
              strokeDasharray="2 3"
              strokeWidth={1}
              label={{
                value: 'event',
                position: 'insideTopRight',
                fill: 'rgb(var(--c-event))',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
              }}
            />
          ) : null}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── volume bars ─────────────────────────────────────────────────────────── */

export function VolumeChart({
  data,
  height = 160,
}: {
  data: Array<{ t: string; value: number }>;
  height?: number;
}) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={gridStroke} vertical={false} />
          <XAxis
            dataKey="t"
            tick={axisTick}
            tickLine={false}
            axisLine={{ stroke: gridStroke }}
            minTickGap={44}
            tickFormatter={(v: string) => formatDay(v)}
          />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} width={46} tickFormatter={formatCompact} />
          <Tooltip cursor={{ fill: 'rgb(var(--c-ink) / 0.05)' }} content={<ChartTooltip suffix="M MAD" />} />
          <Bar dataKey="value" name="Turnover" fill="rgb(var(--c-accent) / 0.45)" animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── horizontal exposure bars (simulator) ────────────────────────────────── */

export function ExposureBar({ value, tone }: { value: number; tone: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'rgb(var(--c-neg))',
    medium: 'rgb(var(--c-accent))',
    low: 'rgb(var(--c-ink-mute))',
  };
  return (
    <div className="h-1 w-full overflow-hidden bg-ink/[0.07]">
      <div
        className="h-full transition-all duration-700 ease-swift"
        style={{ width: `${Math.max(2, Math.min(100, value * 100))}%`, background: colors[tone] }}
      />
    </div>
  );
}

export function ChartFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('w-full', className)}>{children}</div>;
}

function formatCompact(v: number) {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
}