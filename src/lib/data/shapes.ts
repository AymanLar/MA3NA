import type { Provenance } from './provenance';

/**
 * Shared data shapes, with no filesystem access.
 *
 * These describe cached official data and are imported by both the server data
 * module and the browser data module, so nothing here may touch `node:fs`.
 */

export type DataStatus = Provenance['status'];

/** How a relationship is justified. */
export type RelationBasis = 'VERIFIED' | 'DERIVED' | 'INFERRED';

export type NodeType = 'company' | 'sector' | 'index' | 'event';

export interface RegistryNode {
  id: string;
  type: NodeType;
  label: string;
  sublabel: string;
  href: string;
  /** status of the underlying values, if any */
  status: DataStatus;
  provenance: Provenance;
  /** ticker, official index code, or null */
  code: string | null;
  /** type-specific detail the detail panels read */
  issuer?: {
    name: string;
    sector: string | null;
    listingDate: string | null;
  };
  nameFr?: string;
  match?: { method: string; confidence: 'HIGH' | 'MEDIUM' };
  publication?: {
    title: string;
    date: string;
    url: string;
    documents: Array<{ url: string; fileName: string; inferredType: string }>;
  };
  bulletin?: { title: string; date: string; url: string; fileName: string; kind: string };
}

export interface RegistryRelation {
  from: string;
  to: string;
  kind: string;
  basis: RelationBasis;
  /** provenance of the relationship itself */
  source: string;
  sourceUrl: string;
  /** date the relationship was established, ISO */
  date: string | null;
  /** how it was produced */
  method: string;
  /** disclosed strength, when the calculation yields one */
  value: number | null;
}

export interface IssuerMatch {
  ticker: string;
  method: string;
  confidence: 'HIGH' | 'MEDIUM';
}

export interface Registry {
  nodes: RegistryNode[];
  relations: RegistryRelation[];
  matches: IssuerMatch[];
  sources: {
    instruments: Provenance;
    issuers: Provenance;
    indices: Provenance;
    publications: Provenance;
    bulletins: Provenance;
  };
  counts: Record<NodeType, number>;
  missingMarketData: string[];
}

/** A single number plus how we got it. Used everywhere a figure is shown. */
export interface Figure {
  value: number | null;
  status: DataStatus;
  /** observations behind the figure, when derived */
  n?: number | null;
  method?: string | null;
}

export interface CompanySummary {
  ticker: string;
  name: string;
  nameFr: string;
  sector: string | null;
  sectorSlug: string | null;
  listingDate: string | null;
  close: Figure;
  previousClose: Figure;
  change: Figure;
  changePct: Figure;
  marketCap: Figure;
  volume: Figure;
  turnover: Figure;
  trades: Figure;
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
  quality: Provenance['quality'];
  matchMethod: string | null;
  matchConfidence: 'HIGH' | 'MEDIUM' | null;
}

export interface SectorSummary {
  slug: string;
  name: string;
  tickers: string[];
  changePct: Figure;
  totalMarketCap: Figure;
  provenance: Provenance;
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

export interface Movers {
  gainers: CompanySummary[];
  losers: CompanySummary[];
  covered: number;
  total: number;
}

/** One traded session as published by the exchange. */
export interface Observation {
  date: string;
  timestamp: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  turnover: number | null;
  trades: number | null;
  marketCap: number | null;
  publishedVariation: number | null;
  publishedReference: number | null;
  change: number | null;
  changePct: number | null;
  previousClose: number | null;
}

export interface IndexQuote {
  code: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  category: string | null;
  value: number | null;
  previousClose: number | null;
  changePct: number | null;
  changeYtdPct: number | null;
  high: number | null;
  low: number | null;
}

export interface Equity {
  ticker: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
}

export interface InstrumentsData {
  equities: Equity[];
  rights: Equity[];
  bonds: Equity[];
  futures: Equity[];
  officialCounts: Array<{ instrumentType: string; numberOfInstruments: number }> | null;
  aggregateTurnover: number | null;
  aggregateTurnoverDerivatives: number | null;
}

export interface SeriesSnapshot {
  observations: Observation[];
  provenance: Provenance;
}