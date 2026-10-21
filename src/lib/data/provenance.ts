/**
 * Provenance primitives, kept free of any filesystem access.
 *
 * Both the server data module and the client data module need these types and
 * the provenance builder, and the client bundle cannot pull in `node:fs`.
 */

/** Trust level of a value or dataset. */
export type DataStatus =
  /** published by the source as-is */
  | 'REAL'
  /** computed by us from REAL observations, method disclosed */
  | 'DERIVED'
  /** present only for loading skeletons; never shown as financial data */
  | 'DEMO'
  /** the source did not provide it */
  | 'UNAVAILABLE';

export type QualityStatus = 'VALID' | 'WARNING' | 'ERROR';

export interface Quality {
  status: QualityStatus;
  issues?: string[];
  rejected?: number;
}

/** Provenance envelope written by the pipeline. */
export interface Snapshot<T> {
  version: number;
  status: QualityStatus;
  quality: Quality;
  source: string;
  sourceUrl: string;
  retrieved_at: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  data: T;
}

export interface Provenance {
  status: DataStatus;
  source: string;
  sourceUrl: string;
  retrievedAt: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  /** how a DERIVED figure was computed */
  method?: string | null;
  /** source record count behind a derived figure */
  observations?: number | null;
  quality?: QualityStatus | null;
  issues?: string[];
}

/** Build provenance from a snapshot envelope. */
export function provenanceOf(
  snap: Snapshot<unknown> | null,
  status: DataStatus,
  extra?: { method?: string; observations?: number },
): Provenance {
  if (!snap) {
    return {
      status: 'UNAVAILABLE',
      source: 'Not retrieved',
      sourceUrl: '',
      retrievedAt: null,
      method: extra?.method ?? null,
      observations: extra?.observations ?? null,
      quality: null,
    };
  }
  return {
    status,
    source: snap.source,
    sourceUrl: snap.sourceUrl,
    retrievedAt: snap.retrieved_at,
    periodStart: snap.period_start,
    periodEnd: snap.period_end,
    method: extra?.method ?? null,
    observations: extra?.observations ?? null,
    quality: snap.quality?.status ?? null,
    issues: snap.quality?.issues ?? [],
  };
}

/** The canonical unavailable provenance. */
export const UNAVAILABLE: Provenance = provenanceOf(null, 'UNAVAILABLE');

/** Human-readable "Data unavailable" copy, kept identical across the app. */
export const UNAVAILABLE_LABEL = 'Data unavailable';