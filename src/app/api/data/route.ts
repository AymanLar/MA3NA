import { NextResponse } from 'next/server';
import {
  getCompanySummaries,
  getEvents,
  getMovers,
  getCorrelatedPeers,
  getMostTraded,
  getPairCorrelation,
  getRegistry,
  getSectorSummaries,
  getSeries,
  loadIndices,
  loadInstruments,
  type CompanySummary,
  type EventItem,
  type SectorSummary,
} from '@/lib/data';

/**
 * One JSON surface over the cached snapshots, for client components.
 *
 * The snapshots live on disk and are read with node:fs, so they cannot be
 * bundled into the browser. Server components import the data module directly;
 * client components read it through this route. Every response is a straight
 * pass-through of cached official data with no transformation.
 */

const int = (v: string | null, fallback: number) => {
  const n = v === null ? NaN : Number.parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const serialiseRegistry = (reg: Awaited<ReturnType<typeof getRegistry>>) => reg;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const resource = url.searchParams.get('resource') ?? '';

  try {
    switch (resource) {
      case 'registry': {
        return NextResponse.json(serialiseRegistry(await getRegistry()));
      }
      case 'companies': {
        return NextResponse.json(await getCompanySummaries());
      }
      case 'sectors': {
        return NextResponse.json(await getSectorSummaries());
      }
      case 'events': {
        return NextResponse.json(await getEvents());
      }
      case 'indices': {
        return NextResponse.json(await loadIndices());
      }
      case 'instruments': {
        return NextResponse.json(await loadInstruments());
      }
      case 'movers': {
        return NextResponse.json(await getMovers(int(url.searchParams.get('limit'), 6)));
      }
      case 'most-traded': {
        return NextResponse.json(await getMostTraded(int(url.searchParams.get('limit'), 8)));
      }
      case 'series': {
        const ticker = url.searchParams.get('ticker');
        if (!ticker) {
          return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
        }
        const snap = await getSeries(ticker);
        return NextResponse.json(snap ?? { observations: null, provenance: null });
      }
      case 'peers': {
        const ticker = url.searchParams.get('ticker');
        if (!ticker) {
          return NextResponse.json({ error: 'ticker is required' }, { status: 400 });
        }
        return NextResponse.json(
          await getCorrelatedPeers(ticker, int(url.searchParams.get('limit'), 4)),
        );
      }
      case 'correlation': {
        const a = url.searchParams.get('a');
        const b = url.searchParams.get('b');
        if (!a || !b) {
          return NextResponse.json({ error: 'a and b are required' }, { status: 400 });
        }
        return NextResponse.json(await getPairCorrelation(a, b));
      }
      default:
        return NextResponse.json({ error: `unknown resource "${resource}"` }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'failed to read cached data' },
      { status: 500 },
    );
  }
}

export type { CompanySummary, EventItem, SectorSummary };