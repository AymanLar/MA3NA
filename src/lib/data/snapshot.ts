import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Snapshot } from './provenance';

export * from './provenance';
export type { Equity, InstrumentsData, Observation, IndexQuote } from './shapes';
import type { InstrumentsData, Observation, IndexQuote } from './shapes';

/**
 * Reads the cached snapshots produced by `npm run fetch-data`.
 *
 * The application never fetches anything at render time. It only reads local
 * JSON written by the pipeline, each of which carries a provenance envelope
 * recording the source, the source URL and the retrieval time.
 *
 * If a snapshot is missing, the loader returns null. Callers must render an
 * unavailable state. There is deliberately no fallback dataset.
 */

const DATA_DIR = join(process.cwd(), 'data');

/** Missing-file reads are expected, so they resolve to null rather than throw. */
async function readSnapshot<T>(relPath: string): Promise<Snapshot<T> | null> {
  try {
    const raw = await readFile(join(DATA_DIR, relPath), 'utf8');
    return JSON.parse(raw) as Snapshot<T>;
  } catch {
    return null;
  }
}

/* ── shapes ─────────────────────────────────────────────────────────────── */

export interface Bulletin {
  date: string;
  kind: string;
  fileName: string;
  url: string;
  title: string;
}

export interface Issuer {
  name: string;
  sector: string | null;
  listingDate: string | null;
  listingDateRaw: string | null;
  detailUrl: string | null;
  sourceUrl: string;
}

export interface IssuerDocument {
  url: string;
  fileName: string;
  inferredType: string;
}

export interface Publication {
  title: string;
  date: string;
  url: string;
  documents: IssuerDocument[];
}

export interface Manifest {
  started_at: string;
  finished_at: string;
  pipeline: string;
  free_history_years: number;
  summary: Record<string, unknown>;
  failed: string[];
}

/* ── loaders ────────────────────────────────────────────────────────────── */

export const loadManifest = () => readSnapshot<Manifest>('manifest.json');
export const loadInstruments = () => readSnapshot<InstrumentsData>('bourse/instruments.json');
export const loadIndices = () => readSnapshot<{ indices: IndexQuote[] }>('bourse/indices.json');
export const loadBulletins = () => readSnapshot<{ bulletins: Bulletin[] }>('bourse/bulletins.json');
export const loadIssuers = () => readSnapshot<{ issuers: Issuer[] }>('ammc/issuers.json');
export const loadPublications = () => readSnapshot<{ publications: Publication[] }>('ammc/publications.json');

export const loadPrices = (ticker: string) =>
  readSnapshot<{ observations: Observation[] }>(`bourse/prices/${ticker}.json`);

/** Symbols that actually have a cached price series. */
let tickerCache: string[] | null = null;
export async function cachedTickers(): Promise<string[]> {
  if (tickerCache) return tickerCache;
  try {
    const files = await readdir(join(DATA_DIR, 'bourse', 'prices'));
    tickerCache = files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')).sort();
  } catch {
    tickerCache = [];
  }
  return tickerCache;
}

