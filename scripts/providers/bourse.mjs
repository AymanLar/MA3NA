/**
 * Bourse de Casablanca provider.
 *
 * Source of truth for listed instruments, historical prices, trading volume,
 * official index values and the daily market bulletins.
 *
 * Licensing note: the Bourse publishes historical prices free of charge for a
 * maximum depth of three years. We request exactly that window and never
 * attempt to reach older or licensed data.
 */
import { get, getJson } from '../lib/http.mjs';

export const SOURCE = 'Bourse de Casablanca';
export const BASE = 'https://www.casablanca-bourse.com';
export const API = `${BASE}/api/boursenova`;

/** The exchange states this as the maximum free historical depth. */
export const FREE_HISTORY_YEARS = 3;

/** "30/09/2026" -> "2026-09-30" */
function frToIso(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

const numOrNull = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Listed instruments.
 *
 * The instrument roster is embedded in the page as `drupalSettings.boursenova`
 * and the API base is published alongside it, so we read it from the page
 * rather than hardcoding a list that could drift.
 */
export async function fetchInstruments() {
  const pageUrl = `${BASE}/en/market-data/Cours`;
  const html = await get(pageUrl, { minGapMs: 0 });

  const anchor = html.indexOf('"path":{"baseUrl"');
  if (anchor < 0) throw new Error('drupalSettings not found on Cours page');
  const start = html.lastIndexOf('{', anchor);

  let depth = 0;
  let end = -1;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  if (end < 0) throw new Error('could not delimit drupalSettings JSON');

  const settings = JSON.parse(html.slice(start, end));
  const bn = settings?.boursenova;
  if (!bn?.instruments) throw new Error('boursenova.instruments missing');

  const pick = (arr) =>
    (arr ?? [])
      .map((x) => ({
        /** Bourse pads some symbols with trailing spaces; normalise to a ticker */
        ticker: String(x.symbol ?? '').trim().toUpperCase(),
        nameFr: (x.label?.fr ?? '').trim(),
        nameEn: (x.label?.en ?? '').trim(),
        nameAr: (x.label?.ar ?? '').trim(),
      }))
      .filter((x) => x.ticker.length > 0);

  const equities = pick(bn.instruments.actions);
  const rights = pick(bn.instruments.droits);
  const bonds = pick(bn.instruments.obligations);
  const futures = pick(bn.instruments.futures);

  return {
    equities,
    rights,
    bonds,
    futures,
    counts: bn.totalInstruments ?? null,
    aggregateVolume: numOrNull(bn.totalVolume),
    aggregateVolumeDerivatives: numOrNull(bn.totalVolumeTerme),
    sourceUrl: pageUrl,
    apiBaseUrl: bn.apiBaseUrl ?? API,
  };
}

/**
 * Historical OHLCV for one instrument.
 *
 * `isCoursAjuste=true` requests the exchange's adjusted-price series. The
 * exchange returns open/high/low/close, traded volume in shares, turnover,
 * transaction count and capitalisation per session.
 *
 * Daily change is NOT hardcoded: the exchange leaves `variation` and
 * `coursReference` null on this feed, so change is derived from consecutive
 * observed closes and flagged as derived.
 */
export async function fetchHistory(symbol, { from, to, minGapMs = 500 } = {}) {
  const params = new URLSearchParams({
    instrument: symbol,
    market: 'comptant',
    type: 'actions',
    startDate: from,
    endDate: to,
    isCoursAjuste: 'true',
  });
  const url = `${API}/stock-historical?${params.toString()}`;
  const payload = await getJson(url, { minGapMs });

  const items = Array.isArray(payload?.items) ? payload.items : [];
  const observations = items
    .map((r) => ({
      date: frToIso(r.seance) ?? (r.timestamp ? new Date(r.timestamp).toISOString().slice(0, 10) : null),
      /** epoch ms as published, retained for exactness */
      timestamp: numOrNull(r.timestamp),
      open: numOrNull(r.ouverture),
      high: numOrNull(r.plusHaut),
      low: numOrNull(r.plusBas),
      close: numOrNull(r.dernierCours),
      /** shares traded */
      volume: numOrNull(r.titresEchanges),
      /** turnover in MAD */
      turnover: numOrNull(r.volumeEchanges),
      trades: numOrNull(r.nbTransactions),
      marketCap: numOrNull(r.capitalisation),
      /** as published; null on this feed, so we derive change ourselves */
      publishedVariation: numOrNull(r.variation),
      publishedReference: numOrNull(r.coursReference),
    }))
    .filter((o) => o.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  // derive change between consecutive observed sessions
  for (let i = 0; i < observations.length; i++) {
    const prev = i > 0 ? observations[i - 1].close : null;
    const cur = observations[i].close;
    if (prev !== null && cur !== null && prev > 0) {
      observations[i].change = +(cur - prev).toFixed(4);
      observations[i].changePct = +(((cur - prev) / prev) * 100).toFixed(4);
      observations[i].previousClose = prev;
    } else {
      observations[i].change = null;
      observations[i].changePct = null;
      observations[i].previousClose = null;
    }
  }

  return { symbol, observations, url, totalCount: payload?.totalCount ?? observations.length };
}

/**
 * Official index values (MASI and sectoral MASI indices).
 * Includes the exchange's own change_pct and previous_close where published.
 */
export async function fetchIndices({ minGapMs = 500 } = {}) {
  const url = `${API}/indices`;
  const payload = await getJson(url, { minGapMs });
  const list = Array.isArray(payload) ? payload : [];

  const indices = list
    .map((x) => ({
      code: String(x.code ?? '').trim(),
      nameFr: (x.label?.fr ?? '').trim(),
      nameEn: (x.label?.en ?? '').trim(),
      nameAr: (x.label?.ar ?? '').trim(),
      category: (x.type_label?.fr ?? '').trim() || null,
      value: numOrNull(x.value),
      previousClose: numOrNull(x.previous_close),
      /** published by the exchange */
      changePct: numOrNull(x.change_pct),
      changeYtdPct: numOrNull(x.change_ytd),
      high: numOrNull(x.high),
      low: numOrNull(x.low),
    }))
    .filter((x) => x.code);

  return { indices, url };
}

/**
 * Daily market bulletins, in date order, newest first.
 *
 * These are the exchange's own official publications. We record the date and
 * the document URL; we do not parse financial numbers out of the PDFs.
 */
export async function fetchBulletins({ minGapMs = 500 } = {}) {
  const url = `${BASE}/market-data/bulletins-de-la-cote`;
  const html = await get(url, { minGapMs });

  const seen = new Map();
  const re = /href="(\/sites\/default\/files\/bulletins\/(\d{4})-(\d{2})\/fr\/([^"]+)\.pdf)"/g;
  let m;
  while ((m = re.exec(html))) {
    const [, href, year, month, file] = m;
    const date = `${year}-${month}-${file.match(/_(\d{8})/)?.[1]
      ? `${file.match(/_(\d{8})/)[1].slice(0, 4)}-${file.match(/_(\d{8})/)[1].slice(4, 6)}-${file.match(/_(\d{8})/)[1].slice(6, 8)}`
      : `${year}-${month}-01`}`;
    const kind = file.startsWith('BCFR_D')
      ? 'derivatives-bulletin'
      : file.startsWith('BCFR')
        ? 'cash-bulletin'
        : file.startsWith('Instructions_D')
          ? 'derivatives-instruction'
          : 'instruction';
    if (seen.has(href)) continue;
    seen.set(href, {
      date,
      kind,
      fileName: `${file}.pdf`,
      url: `${BASE}${href}`,
      title:
        kind === 'cash-bulletin'
          ? 'Bulletin de la cote — marché comptant'
          : kind === 'derivatives-bulletin'
            ? 'Bulletin de la cote — marché dérivés'
            : kind === 'instruction'
              ? 'Instructions — marché comptant'
              : 'Instructions — marché dérivés',
    });
  }

  const bulletins = Array.from(seen.values()).sort((a, b) => b.date.localeCompare(a.date));
  return { bulletins, url };
}
