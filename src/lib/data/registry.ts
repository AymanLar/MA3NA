import {
  loadBulletins,
  loadIndices,
  loadInstruments,
  loadIssuers,
  loadPrices,
  loadPublications,
  cachedTickers,
  provenanceOf,
  UNAVAILABLE,
  type Provenance,
} from './snapshot';
import { matchIssuers, type MatchMethod } from './issuer-match';
import { active, correlation } from './metrics';
import type { NodeType, Observation, Registry, RegistryNode, RegistryRelation } from './shapes';

export type {
  IssuerMatch,
  NodeType,
  Observation,
  RelationBasis,
  Registry,
  RegistryNode,
  RegistryRelation,
} from './shapes';

/**
 * The entity registry, built entirely from cached official snapshots.
 *
 * Node types present here are only those a source actually provides:
 *   company — Bourse de Casablanca listed instruments
 *   sector  — AMMC "secteur d'activité"
 *   index   — Bourse official index values (MASI and sectoral MASI)
 *   event   — AMMC issuer publications and Bourse official bulletins
 *
 * There is no commodity or country node, because no official source used here
 * publishes one. Those node types were invented in the previous version and
 * have been removed rather than replaced with plausible values.
 */

let cached: Promise<Registry> | null = null;

/** Load every snapshot once per process. */
export function getRegistry(): Promise<Registry> {
  if (!cached) cached = build();
  return cached;
}

async function build(): Promise<Registry> {
  const [instrumentsSnap, issuersSnap, indicesSnap, publicationsSnap, bulletinsSnap, tickers] =
    await Promise.all([
      loadInstruments(),
      loadIssuers(),
      loadIndices(),
      loadPublications(),
      loadBulletins(),
      cachedTickers(),
    ]);

  const equities = instrumentsSnap?.data.equities ?? [];
  const issuers = issuersSnap?.data.issuers ?? [];
  const indices = indicesSnap?.data.indices ?? [];
  const publications = publicationsSnap?.data.publications ?? [];
  const bulletins = bulletinsSnap?.data.bulletins ?? [];
  const tickerSet = new Set(tickers);

  const matches = matchIssuers(equities, issuers);

  const instProv = provenanceOf(instrumentsSnap, instrumentsSnap ? 'REAL' : 'UNAVAILABLE');
  const issuerProv = provenanceOf(issuersSnap, issuersSnap ? 'REAL' : 'UNAVAILABLE');
  const indexProv = provenanceOf(indicesSnap, indicesSnap ? 'REAL' : 'UNAVAILABLE');
  const pubProv = provenanceOf(publicationsSnap, publicationsSnap ? 'REAL' : 'UNAVAILABLE');
  const bulProv = provenanceOf(bulletinsSnap, bulletinsSnap ? 'REAL' : 'UNAVAILABLE');

  const nodes: RegistryNode[] = [];

  /* ── companies ──────────────────────────────────────────────────────── */
  const missingMarketData: string[] = [];
  for (const e of equities) {
    const m = matches.get(e.ticker);
    const hasPrices = tickerSet.has(e.ticker);
    if (!hasPrices) missingMarketData.push(e.ticker);
    const label = e.nameEn || e.nameFr || e.ticker;
    nodes.push({
      id: `eq:${e.ticker}`,
      type: 'company',
      label,
      sublabel: e.ticker,
      href: `/companies/${e.ticker}`,
      status: hasPrices ? 'REAL' : 'UNAVAILABLE',
      provenance: hasPrices ? instProv : UNAVAILABLE,
      code: e.ticker,
      /** AMMC details ride along but are not part of the node contract */
      ...(m ? { issuer: m.issuer, match: m } : {}),
    } as RegistryNode);
  }

  /* ── sectors (AMMC official classification) ─────────────────────────── */
  const usedSectors = new Set<string>();
  for (const m of matches.values()) {
    if (m.issuer.sector) usedSectors.add(m.issuer.sector);
  }
  const sectorNames = Array.from(usedSectors).sort((a, b) => a.localeCompare(b, 'fr'));
  const slug = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

  for (const name of sectorNames) {
    const id = `sec:${slug(name)}`;
    nodes.push({
      id,
      type: 'sector',
      label: name,
      sublabel: 'AMMC sector',
      href: `/sectors/${slug(name)}`,
      status: 'REAL',
      provenance: issuerProv,
      code: name,
    });
  }

  /* ── official indices ───────────────────────────────────────────────── */
  for (const ix of indices) {
    nodes.push({
      id: `idx:${ix.code}`,
      type: 'index',
      label: (ix.nameFr || ix.nameEn || ix.code).trim(),
      sublabel: ix.code,
      href: `/market?index=${encodeURIComponent(ix.code)}`,
      status: ix.value === null ? 'UNAVAILABLE' : 'REAL',
      provenance: indexProv,
      code: ix.code,
      quote: ix,
    } as RegistryNode);
  }

  /* ── events ─────────────────────────────────────────────────────────── */
  // AMMC issuer publications: real title, real date, real document URLs.
  for (const p of publications) {
    const id = `evt:ammc:${slug(p.title).slice(0, 60)}-${p.date}`;
    nodes.push({
      id,
      type: 'event',
      label: p.title,
      sublabel: p.date,
      href: `/events/${encodeURIComponent(id)}`,
      status: 'REAL',
      provenance: pubProv,
      code: null,
      publication: p,
    } as RegistryNode);
  }
  // Bourse official bulletins, newest first, one node per (date, kind).
  for (const b of bulletins) {
    const id = `evt:bourse:${b.kind}:${b.date}`;
    nodes.push({
      id,
      type: 'event',
      label: `${b.title} — ${b.date}`,
      sublabel: 'Official bulletin',
      href: `/events/${encodeURIComponent(id)}`,
      status: 'REAL',
      provenance: bulProv,
      code: null,
      bulletin: b,
    } as RegistryNode);
  }

  /* ── relations ──────────────────────────────────────────────────────── */
  const relations: RegistryRelation[] = [];

  for (const m of matches.values()) {
    const sector = m.issuer.sector;
    if (!sector) continue;
    const verified = m.confidence === 'HIGH';
    relations.push({
      from: `eq:${m.ticker}`,
      to: `sec:${slug(sector)}`,
      kind: 'classified_in',
      basis: verified ? 'VERIFIED' : 'INFERRED',
      source: 'AMMC — Liste des émetteurs',
      sourceUrl: m.issuer.detailUrl ?? m.issuer.sourceUrl,
      date: m.issuer.listingDate,
      method: `AMMC publishes "${m.issuer.name}" with secteur d'activité "${sector}".${
        verified ? '' : ` Resolved to ticker ${m.ticker} by rule: ${m.method}.`
      }`,
      value: null,
    });
  }

  // Events → companies, only when AMMC's own document file name names the ticker.
  for (const p of publications) {
    const id = `evt:ammc:${slug(p.title).slice(0, 60)}-${p.date}`;
    for (const doc of p.documents) {
      const base = (doc.fileName ?? '').toUpperCase();
      for (const e of equities) {
        const t = e.ticker;
        if (!t || t.length < 3) continue;
        const stem = base.replace(/\.PDF$/, '');
        const idx = stem.indexOf(`_${t}_`) >= 0 || stem.indexOf(`_${t}.`) >= 0;
        const starts = stem.startsWith(`${t}_`);
        if (!idx && !starts) continue;
        relations.push({
          from: id,
          to: `eq:${t}`,
          kind: 'published_by',
          basis: 'INFERRED',
          source: 'AMMC — Publications réalisées par les émetteurs',
          sourceUrl: doc.url,
          date: p.date,
          method: `The document "${doc.fileName}" published in this AMMC notice names ticker ${t} in its file name.`,
          value: null,
        });
      }
    }
  }



  const counts: Record<NodeType, number> = { company: 0, sector: 0, index: 0, event: 0 };
  for (const n of nodes) counts[n.type]++;

  return {
    nodes,
    relations,
    matches: [...matches.values()],
    sources: {
      instruments: instProv,
      issuers: issuerProv,
      indices: indexProv,
      publications: pubProv,
      bulletins: bulProv,
    },
    counts,
    missingMarketData,
  };
}

/* ── price access ───────────────────────────────────────────────────────── */

const priceCache = new Map<string, Promise<{ observations: Observation[]; provenance: Provenance } | null>>();

export async function getSeries(ticker: string) {
  let p = priceCache.get(ticker);
  if (!p) {
    p = loadPrices(ticker).then((snap) =>
      snap
        ? {
            observations: snap.data.observations,
            provenance: provenanceOf(snap, 'REAL', {
              method: 'Open, high, low, close, volume, turnover and market capitalisation as published by the exchange for each session.',
              observations: snap.data.observations.length,
            }),
          }
        : null,
    );
    priceCache.set(ticker, p);
  }
  return p;
}

/** Corporate-action-safe observation set used for every calculation. */
export { active };

/**
 * Peers whose daily returns actually co-move with this stock.
 *
 * This is a DERIVED relationship: it is computed from published closes, and the
 * correlation and session count are shown alongside it.
 */
export async function getCorrelatedPeers(
  ticker: string,
  limit = 4,
): Promise<Array<{ ticker: string; correlation: number; n: number }>> {
  const [mine, all] = await Promise.all([getSeries(ticker), cachedTickers()]);
  if (!mine) return [];
  const others = all.filter((t) => t !== ticker);
  const series = await Promise.all(others.map((t) => getSeries(t)));
  const out: Array<{ ticker: string; correlation: number; n: number }> = [];
  for (let i = 0; i < others.length; i++) {
    const s = series[i];
    if (!s) continue;
    const r = correlation(mine.observations, s.observations);
    if (r.value === null) continue;
    out.push({ ticker: others[i], correlation: r.value, n: r.n });
  }
  out.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  return out.slice(0, limit);
}

export const MATCH_METHODS: Record<MatchMethod, string> = {
  'ammc-parenthesised-ticker': 'Ticker published in the AMMC issuer name',
  'exact-label': 'Issuer name identical to the Bourse instrument label',
  'ticker-in-name': 'Bourse ticker appears in the AMMC issuer name',
  prefix: 'Ticker prefix matches the start of the AMMC issuer name',
};
