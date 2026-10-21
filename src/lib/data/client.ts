'use client';

/**
 * Browser data access.
 *
 * The cached snapshots live on disk and are read with `node:fs`, so a client
 * component cannot import them directly. Every read here goes through the
 * `/api/data` route, which is a straight pass-through of the same cached
 * official data. No value is computed, rounded or substituted on the way.
 *
 * Shapes are imported from `./shapes` and calculations from `./metrics`, both
 * of which are filesystem-free.
 */

import { useEffect, useState } from 'react';

import type {
  CompanySummary,
  EventItem,
  IndexQuote,
  InstrumentsData,
  Movers,
  Registry,
  SectorSummary,
  SeriesSnapshot,
} from './shapes';
import type { Snapshot } from './provenance';

export type {
  CompanySummary,
  EventItem,
  Figure,
  IndexQuote,
  InstrumentsData,
  Movers,
  Observation,
  Registry,
  RegistryNode,
  RegistryRelation,
  RelationBasis,
  SectorSummary,
  SeriesSnapshot,
} from './shapes';
export { active, traded, totalReturn, volatility, maxDrawdown, fiftyTwoWeek, averageVolume } from './metrics';
export { provenanceOf, UNAVAILABLE, UNAVAILABLE_LABEL } from './provenance';
export type { NodeType } from './shapes';
export type { DataStatus, Provenance } from './provenance';

export class DataRequestError extends Error {}

async function fetchResource<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/data?${qs}`);
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new DataRequestError(body?.error ?? `request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

/** In-process memoisation, so repeated panels share one request. */
const memo = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit) return hit as Promise<T>;
  const p = load();
  memo.set(key, p);
  return p;
}

export const getRegistry = (): Promise<Registry> =>
  cached('registry', () => fetchResource<Registry>({ resource: 'registry' }));

export const getCompanySummaries = (): Promise<CompanySummary[]> =>
  cached('companies', () => fetchResource<CompanySummary[]>({ resource: 'companies' }));

export const getSectorSummaries = (): Promise<SectorSummary[]> =>
  cached('sectors', () => fetchResource<SectorSummary[]>({ resource: 'sectors' }));

export const getEvents = (): Promise<EventItem[]> =>
  cached('events', () => fetchResource<EventItem[]>({ resource: 'events' }));

export const getMovers = (limit = 6): Promise<Movers> =>
  cached(`movers:${limit}`, () => fetchResource<Movers>({ resource: 'movers' }));

export const getMostTraded = (limit = 8): Promise<CompanySummary[]> =>
  cached(`most-traded:${limit}`, () =>
    fetchResource<CompanySummary[]>({ resource: 'most-traded', limit: String(limit) }),
  );

export const loadIndices = (): Promise<Snapshot<{ indices: IndexQuote[] }> | null> =>
  cached('indices', () =>
    fetchResource<Snapshot<{ indices: IndexQuote[] }> | null>({ resource: 'indices' }),
  );

export const loadInstruments = (): Promise<Snapshot<InstrumentsData> | null> =>
  cached('instruments', () => fetchResource<Snapshot<InstrumentsData> | null>({ resource: 'instruments' }));

export const getCorrelatedPeers = (
  ticker: string,
  limit = 4,
): Promise<Array<{ ticker: string; correlation: number; n: number }>> =>
  cached(`peers:${ticker}:${limit}`, () =>
    fetchResource<Array<{ ticker: string; correlation: number; n: number }>>({
      resource: 'peers',
      ticker,
      limit: String(limit),
    }),
  );

export const getSeries = (ticker: string): Promise<SeriesSnapshot | null> =>
  cached(`series:${ticker}`, () =>
    fetchResource<SeriesSnapshot | { observations: null; provenance: null }>({
      resource: 'series',
      ticker,
    }).then((r) => ('observations' in r && r.observations ? (r as SeriesSnapshot) : null)),
  );

export const getPairCorrelation = (a: string, b: string) =>
  cached(`corr:${a}:${b}`, () =>
    fetchResource<{ value: number | null; n: number; method: string; unavailable?: boolean }>({
      resource: 'correlation',
      a,
      b,
    }),
  );

/* ── client state helper ────────────────────────────────────────────────── */

/**
 * Load an async value once per mount, with the loading and error states the
 * panels need. Nothing is invented while loading.
 */
export function useResource<T>(load: () => Promise<T>, deps: unknown[]): {
  value: T | null;
  error: string | null;
  loading: boolean;
} {
  const [state, setState] = useState<{ value: T | null; error: string | null; loading: boolean }>({
    value: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let on = true;
    void load().then(
      (value) => {
        if (on) setState({ value, error: null, loading: false });
      },
      (err: unknown) => {
        if (on) {
          setState({
            value: null,
            error: err instanceof Error ? err.message : 'failed to read cached data',
            loading: false,
          });
        }
      },
    );
    return () => {
      on = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}