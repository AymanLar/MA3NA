'use client';

import { useEffect, useState } from 'react';
import {
  getPairCorrelation,
  getSeries,
  totalReturn,
  volatility,
  maxDrawdown,
  fiftyTwoWeek,
  averageVolume,
  active,
  type Observation,
  type Provenance,
} from './client';

/** Range selectors expressed in trading sessions, applied to the cached history. */
export const RANGES = {
  '1M': 22,
  '3M': 66,
  '6M': 128,
  '1A': 252,
  '3A': null,
} as const;

export type RangeKey = keyof typeof RANGES;

export const RANGE_LABEL: Record<RangeKey, string> = {
  '1M': '1 month',
  '3M': '3 months',
  '6M': '6 months',
  '1A': '1 year',
  '3A': '3 years (full cached history)',
};

export interface SeriesResult {
  /** closing values in date order, nulls removed */
  data: number[];
  observations: Observation[];
  /** the last session that actually traded */
  last: Observation | null;
  provenance: Provenance | null;
  unavailable: boolean;
  reason: string | null;
  loading: boolean;
  rangeLabel: string;
  metrics: {
    totalReturn: ReturnType<typeof totalReturn>;
    volatility: ReturnType<typeof volatility>;
    maxDrawdown: ReturnType<typeof maxDrawdown>;
    range: ReturnType<typeof fiftyTwoWeek>;
    volume: ReturnType<typeof averageVolume>;
  } | null;
}

/**
 * Read one cached official price series for charting.
 * Sessions with no trade are gaps, never interpolated.
 */
const IDLE: Omit<SeriesResult, 'rangeLabel'> = {
  data: [],
  observations: [],
  last: null,
  provenance: null,
  unavailable: true,
  reason: null,
  loading: false,
  metrics: null,
};

export function useSeries(ticker: string | null | undefined, range: RangeKey = '3A'): SeriesResult {
  const [loaded, setLoaded] = useState<{ key: string; state: Omit<SeriesResult, 'rangeLabel'> } | null>(
    null,
  );

  useEffect(() => {
    if (!ticker) return;
    let on = true;
    void getSeries(ticker).then((snap) => {
      if (!on) return;
      if (!snap) {
        setLoaded({
          key: `${ticker}:${range}`,
          state: {
            ...IDLE,
            reason: `No cached price history for ${ticker}.`,
          },
        });
        return;
      }
      const obs = snap.observations;
      const traded = active(obs);
      const n = RANGES[range];
      const windowed = n ? traded.slice(-n) : traded;
      setLoaded({
        key: `${ticker}:${range}`,
        state: {
        observations: windowed,
        data: windowed.map((o) => o.close).filter((v): v is number => v !== null),
        last: traded.length ? traded[traded.length - 1] : null,
        provenance: snap.provenance,
        unavailable: traded.length < 2,
        reason:
          traded.length < 2
            ? `Fewer than two traded sessions cached for ${ticker}.`
            : null,
        loading: false,
        metrics: {
          totalReturn: totalReturn(windowed),
          volatility: volatility(windowed),
          maxDrawdown: maxDrawdown(windowed),
          range: fiftyTwoWeek(obs),
          volume: averageVolume(windowed),
        },
        },
      });
    });
    return () => {
      on = false;
    };
  }, [ticker, range]);

  if (!ticker) {
    return { ...IDLE, reason: 'No instrument selected.', rangeLabel: RANGE_LABEL[range] };
  }
  const key = `${ticker}:${range}`;
  if (!loaded || loaded.key !== key) {
    return { ...IDLE, loading: true, rangeLabel: RANGE_LABEL[range] };
  }
  return { ...loaded.state, rangeLabel: RANGE_LABEL[range] };
}

/** Sparkline values for a ticker, for table cells. */
export function useSparkline(ticker: string | null | undefined, points = 40) {
  const [data, setData] = useState<number[]>([]);
  const [provenance, setProvenance] = useState<Provenance | null>(null);

  useEffect(() => {
    if (!ticker) return;
    let on = true;
    void getSeries(ticker).then((snap) => {
      if (!on) return;
      if (!snap) {
        setData([]);
        return;
      }
      setProvenance(snap.provenance);
      setData(
        active(snap.observations)
          .slice(-points)
          .map((o) => o.close)
          .filter((v): v is number => v !== null),
      );
    });
    return () => {
      on = false;
    };
  }, [ticker, points]);

  return { data, provenance };
}

export interface PairCorrelation {
  value: number | null;
  n: number;
  method: string;
  unavailable: boolean;
}

/** Correlation between two cached series, computed on shared sessions. */
export function usePairCorrelation(a: string | null, b: string | null): PairCorrelation {
  const [loaded, setLoaded] = useState<{ key: string; value: PairCorrelation } | null>(null);

  useEffect(() => {
    if (!a || !b) return;
    let on = true;
    void getPairCorrelation(a, b).then((r) => {
      if (on) setLoaded({ key: `${a}:${b}`, value: { ...r, unavailable: r.unavailable ?? false } });
    });
    return () => {
      on = false;
    };
  }, [a, b]);

  if (!a || !b) {
    return { value: null, n: 0, method: 'Select two instruments.', unavailable: true };
  }
  const key = `${a}:${b}`;
  if (!loaded || loaded.key !== key) {
    return {
      value: null,
      n: 0,
      method: 'Computing correlation from cached closes…',
      unavailable: true,
    };
  }
  return loaded.value;
}
