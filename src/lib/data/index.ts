/**
 * Public data facade.
 *
 * Everything the application renders comes through this module, so there is a
 * single place where provenance and availability are decided. Values are read
 * from cached official snapshots; nothing is generated.
 */
export * from './snapshot';
export * from './registry';
export * from './metrics';
export { MATCH_METHOD_LABEL, matchIssuers } from './issuer-match';

import { getRegistry, getSeries, active } from './registry';
import { correlation, totalReturn, volatility, maxDrawdown, fiftyTwoWeek, averageVolume } from './metrics';
import type { DataStatus, Observation, Provenance } from './snapshot';

/** A single number plus how we got it. Used everywhere a figure is shown. */
export interface Figure {
  value: number | null;
  status: DataStatus;
  /** observations behind the figure, when derived */
  n?: number | null;
  method?: string | null;
}

const figure = (value: number | null, status: DataStatus, n?: number | null, method?: string | null): Figure => ({
  value,
  status: value === null ? 'UNAVAILABLE' : status,
  n: n ?? null,
  method: method ?? null,
});

export interface CompanySummary {
  ticker: string;
  name: string;
  nameFr: string;
  sector: string | null;
  sectorSlug: string | null;
  listingDate: string | null;
  /** latest traded close */
  close: Figure;
  previousClose: Figure;
  change: Figure;
  changePct: Figure;
  /** exchange-published capitalisation on the latest session */
  marketCap: Figure;
  /** exchange-published traded volume, latest session */
  volume: Figure;
  turnover: Figure;
  trades: Figure;
  /** derived from the series */
  return3y: Figure;
  volatility: Figure;
  drawdown: Figure;
  high52: Figure;
  low52: Figure;
  avgVolume: Figure;
  windowStart: string | null;
  windowEnd: string | null;
  sessions: number;
  nonTradingSessions: number;
  provenance: Provenance;
  /** series record-level validation as stored by the pipeline */
  quality: Provenance['quality'];
  matchMethod: string | null;
  matchConfidence: 'HIGH' | 'MEDIUM' | null;
}

export const sectorSlug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Build the company table from real observations.
 * Companies with no cached series are still listed, with unavailable figures.
 */
export async function getCompanySummaries(): Promise<CompanySummary[]> {
  const reg = await getRegistry();
  const companies = reg.nodes.filter((n) => n.type === 'company');
  const series = await Promise.all(companies.map((n) => getSeries(n.code!)));

  return companies.map((node, i) => {
    const s = series[i];
    const meta = node as unknown as {
      issuer?: { name: string; sector: string | null; listingDate: string | null };
      match?: { method: string; confidence: 'HIGH' | 'MEDIUM' };
      nameFr?: string;
    };
    const obs: Observation[] = s?.observations ?? [];
    const live = active(obs);
    const last = live.length ? live[live.length - 1] : null;
    const prov = s?.provenance ?? {
      status: 'UNAVAILABLE' as DataStatus,
      source: 'Bourse de Casablanca',
      sourceUrl: 'https://www.casablanca-bourse.com/en/market-data/Cours',
      retrievedAt: null,
    };

    const r3 = totalReturn(obs);
    const vol = volatility(obs);
    const dd = maxDrawdown(obs);
    const w52 = fiftyTwoWeek(obs);
    const av = averageVolume(obs);

    return {
      ticker: node.code!,
      name: node.label,
      nameFr: meta.nameFr ?? node.label,
      sector: meta.issuer?.sector ?? null,
      sectorSlug: meta.issuer?.sector ? sectorSlug(meta.issuer.sector) : null,
      listingDate: meta.issuer?.listingDate ?? null,
      close: figure(last?.close ?? null, 'REAL', last ? 1 : 0),
      previousClose: figure(last?.previousClose ?? null, 'REAL', last ? 1 : 0),
      change: figure(last?.change ?? null, 'DERIVED', last ? 1 : 0, 'Current close minus the previous traded session close.'),
      changePct: figure(
        last?.changePct ?? null,
        'DERIVED',
        last ? 1 : 0,
        'Percentage change from the previous traded session close. The exchange leaves its variation field null on the historical feed, so this is derived from consecutive published closes.',
      ),
      marketCap: figure(last?.marketCap ?? null, 'REAL'),
      volume: figure(last?.volume ?? null, 'REAL'),
      turnover: figure(last?.turnover ?? null, 'REAL'),
      trades: figure(last?.trades ?? null, 'REAL'),
      return3y: figure(r3.value, 'DERIVED', r3.n, r3.method),
      volatility: figure(vol.value, 'DERIVED', vol.n, vol.method),
      drawdown: figure(dd.value, 'DERIVED', dd.n, dd.method),
      high52: figure(w52.value?.high ?? null, 'DERIVED', w52.n, w52.method),
      low52: figure(w52.value?.low ?? null, 'DERIVED', w52.n, w52.method),
      avgVolume: figure(av.value, 'DERIVED', av.n, av.method),
      windowStart: obs.length ? obs[0].date : null,
      windowEnd: obs.length ? obs[obs.length - 1].date : null,
      sessions: obs.length,
      nonTradingSessions: obs.length - live.length,
      provenance: prov,
      quality: prov.quality,
      matchMethod: meta.match?.method ?? null,
      matchConfidence: meta.match?.confidence ?? null,
    };
  });
}

export interface SectorSummary {
  slug: string;
  name: string;
  tickers: string[];
  /** equal-weighted mean of member session changes, derived */
  changePct: Figure;
  /** sum of published capitalisation across members */
  totalMarketCap: Figure;
  provenance: Provenance;
}

export async function getSectorSummaries(): Promise<SectorSummary[]> {
  const [reg, companies] = await Promise.all([getRegistry(), getCompanySummaries()]);
  const byTicker = new Map(companies.map((c) => [c.ticker, c]));

  return reg.nodes
    .filter((n) => n.type === 'sector')
    .map((n) => {
      const tickers = reg.relations
        .filter((r) => r.to === n.id && r.kind === 'classified_in')
        .map((r) => r.from.replace(/^eq:/, ''))
        .filter((t) => byTicker.has(t));
      const members = tickers.map((t) => byTicker.get(t)!);
      const changes = members.map((m) => m.changePct.value).filter((v): v is number => v !== null);
      const caps = members.map((m) => m.marketCap.value).filter((v): v is number => v !== null);
      const cnt = changes.length;
      return {
        slug: n.code!.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: n.label,
        tickers,
        changePct: figure(
          cnt > 0 ? changes.reduce((a, b) => a + b, 0) / cnt : null,
          'DERIVED',
          cnt,
          `Equal-weighted mean of the latest published session change across ${cnt} listed members. Not an exchange-published sector index.`,
        ),
        totalMarketCap: figure(
          caps.length ? caps.reduce((a, b) => a + b, 0) : null,
          'DERIVED',
          caps.length,
          `Sum of exchange-published capitalisation across ${caps.length} members.`,
        ),
        provenance: n.provenance,
      };
    })
    .filter((s) => s.tickers.length > 0)
    .sort((a, b) => b.tickers.length - a.tickers.length);
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  kind: 'issuer-publication' | 'market-bulletin';
  origin: string;
  sourceUrl: string;
  documents: Array<{ url: string; fileName: string; type: string }>;
  relatedTickers: string[];
  provenance: Provenance;
}

export async function getEvents(): Promise<EventItem[]> {
  const reg = await getRegistry();
  return reg.nodes
    .filter((n) => n.type === 'event')
    .map((n) => {
      const raw = n as unknown as {
        publication?: { title: string; date: string; url: string; documents: Array<{ url: string; fileName: string; inferredType: string }> };
        bulletin?: { title: string; date: string; url: string; fileName: string; kind: string };
      };
      const isPub = Boolean(raw.publication);
      const related = reg.relations.filter((r) => r.from === n.id).map((r) => r.to.replace(/^eq:/, ''));
      return {
        id: n.id,
        title: raw.publication?.title ?? raw.bulletin?.title ?? n.label,
        date: raw.publication?.date ?? raw.bulletin?.date ?? '',
        kind: isPub ? ('issuer-publication' as const) : ('market-bulletin' as const),
        origin: isPub ? 'AMMC' : 'Bourse de Casablanca',
        sourceUrl: raw.publication?.url ?? raw.bulletin?.url ?? '',
        documents: isPub
          ? raw.publication!.documents.map((d) => ({ url: d.url, fileName: d.fileName, type: d.inferredType }))
          : [{ url: raw.bulletin!.url, fileName: raw.bulletin!.fileName, type: 'official-bulletin' }],
        relatedTickers: Array.from(new Set(related)),
        provenance: n.provenance,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Top movers by the latest published session change. */
export async function getMovers(limit = 6) {
  const companies = await getCompanySummaries();
  const withChange = companies.filter((c) => c.changePct.value !== null);
  const key = (c: CompanySummary) => c.changePct.value!;
  return {
    gainers: [...withChange].sort((a, b) => key(b) - key(a)).slice(0, limit),
    losers: [...withChange].sort((a, b) => key(a) - key(b)).slice(0, limit),
    covered: withChange.length,
    total: companies.length,
  };
}

/** Most-traded by published turnover on the latest session. */
export async function getMostTraded(limit = 8) {
  const companies = await getCompanySummaries();
  return companies
    .filter((c) => c.turnover.value !== null)
    .sort((a, b) => (b.turnover.value ?? 0) - (a.turnover.value ?? 0))
    .slice(0, limit);
}

/** Correlation between a stock and another stock, from real closes. */
export async function getPairCorrelation(a: string, b: string) {
  const [x, y] = await Promise.all([getSeries(a), getSeries(b)]);
  if (!x || !y) return { value: null, n: 0, method: 'Both series are required.', unavailable: true };
  return correlation(x.observations, y.observations);
}
