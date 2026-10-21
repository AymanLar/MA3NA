#!/usr/bin/env node
/**
 * MA3NA data pipeline — `npm run fetch-data`.
 *
 * fetch → validate → normalise → cache, with a provenance envelope written for
 * every dataset. The application reads only these cached snapshots, so it works
 * offline and never scrapes anything at page-render time.
 *
 * Design rules enforced here:
 *   - A value is cached only if the source published it.
 *   - Nothing is generated, simulated or filled in.
 *   - A failed source leaves its dataset UNAVAILABLE and never falls back to a
 *     previous *fabricated* value, because none exists in this project.
 *   - Requests are rate limited and identify themselves. Authentication,
 *     paywalls and other access controls are not bypassed.
 */
import { writeSnapshot, report } from './lib/http.mjs';
import { validateSeries, validateTicker, nowIso } from './lib/validate.mjs';
import * as bourse from './providers/bourse.mjs';
import * as ammc from './providers/ammc.mjs';

const r = report();
const START = nowIso();

const iso = (d) => d.toISOString().slice(0, 10);
const FREE_HISTORY_YEARS = bourse.FREE_HISTORY_YEARS;

console.log('MA3NA data pipeline');
console.log('====================');
console.log(`Historical depth requested: ${FREE_HISTORY_YEARS} years (the Bourse's stated free maximum).`);

const failures = [];
const summary = {};

/* ── 1. instruments ─────────────────────────────────────────────────────── */
r.head('Bourse de Casablanca — listed instruments');
let instruments = null;
try {
  instruments = await bourse.fetchInstruments();
  const bad = instruments.equities.filter((e) => !validateTicker(e.ticker));
  r.ok(`${instruments.equities.length} equities, ${instruments.rights.length} rights, ${instruments.bonds.length} bonds, ${instruments.futures.length} futures`);
  if (instruments.aggregateVolume !== null) r.info(`aggregate session turnover: ${instruments.aggregateVolume.toLocaleString('fr-FR')} MAD`);
  if (bad.length) r.warn(`${bad.length} equities failed ticker validation and were excluded`);

  await writeSnapshot(
    'data/bourse/instruments.json',
    {
      equities: instruments.equities.filter((e) => validateTicker(e.ticker)),
      rights: instruments.rights.filter((e) => validateTicker(e.ticker)),
      bonds: instruments.bonds.filter((e) => validateTicker(e.ticker)),
      futures: instruments.futures.filter((e) => validateTicker(e.ticker)),
      officialCounts: instruments.counts,
      aggregateTurnover: instruments.aggregateVolume,
      aggregateTurnoverDerivatives: instruments.aggregateVolumeDerivatives,
    },
    {
      source: bourse.SOURCE,
      sourceUrl: instruments.sourceUrl,
      quality: { status: bad.length ? 'WARNING' : 'VALID', issues: bad.map((b) => `ticker:${b.ticker}`), rejected: bad.length },
    },
  );
  summary.equities = instruments.equities.length;
} catch (err) {
  r.fail(`instruments: ${err.message}`);
  failures.push('instruments');
}

/* ── 2. indices ─────────────────────────────────────────────────────────── */
r.head('Bourse de Casablanca — official index values');
try {
  const { indices, url } = await bourse.fetchIndices();
  const masi = indices.find((i) => i.code === 'MASI');
  r.ok(`${indices.length} official indices cached`);
  if (masi) r.info(`MASI ${masi.value?.toLocaleString('fr-FR')} (${masi.changePct?.toFixed(3)}% per exchange)`);
  else r.warn('MASI not present in the published index list');

  await writeSnapshot('data/bourse/indices.json', { indices }, { source: bourse.SOURCE, sourceUrl: url });
  summary.indices = indices.length;
} catch (err) {
  r.fail(`indices: ${err.message}`);
  failures.push('indices');
}

/* ── 3. AMMC issuers ────────────────────────────────────────────────────── */
r.head('AMMC — issuer register');
let issuers = [];
try {
  const res = await ammc.fetchIssuers({ maxPages: 20 });
  issuers = res.issuers;
  const withSector = issuers.filter((i) => i.sector).length;
  const withDate = issuers.filter((i) => i.listingDate).length;
  r.ok(`${issuers.length} issuers across ${res.pagesRead} pages`);
  r.info(`${withSector} with an official AMMC sector classification`);
  r.info(`${withDate} with an official listing date`);

  await writeSnapshot(
    'data/ammc/issuers.json',
    { issuers },
    { source: `${ammc.SOURCE} — Liste des émetteurs`, sourceUrl: res.url },
  );
  summary.issuers = issuers.length;
} catch (err) {
  r.fail(`issuers: ${err.message}`);
  failures.push('issuers');
}

/* ── 4. AMMC publications (real events) ─────────────────────────────────── */
r.head('AMMC — issuer publications');
try {
  const res = await ammc.fetchPublications({ pages: 6 });
  r.ok(`${res.publications.length} dated issuer publications cached`);
  await writeSnapshot(
    'data/ammc/publications.json',
    { publications: res.publications },
    {
      source: `${ammc.SOURCE} — Publications réalisées par les émetteurs`,
      sourceUrl: res.url,
      notes: 'Titles, dates and document URLs are published by AMMC. Document type is inferred from the published file name.',
    },
  );
  summary.publications = res.publications.length;
} catch (err) {
  r.fail(`publications: ${err.message}`);
  failures.push('publications');
}

/* ── 5. bulletins ───────────────────────────────────────────────────────── */
r.head('Bourse de Casablanca — official market bulletins');
try {
  const { bulletins, url } = await bourse.fetchBulletins();
  r.ok(`${bulletins.length} dated official bulletins`);
  await writeSnapshot('data/bourse/bulletins.json', { bulletins }, { source: `${bourse.SOURCE} — Bulletins de la cote`, sourceUrl: url });
  summary.bulletins = bulletins.length;
} catch (err) {
  r.fail(`bulletins: ${err.message}`);
  failures.push('bulletins');
}

/* ── 6. historical prices ───────────────────────────────────────────────── */
r.head(`Bourse de Casablanca — historical prices (${FREE_HISTORY_YEARS}y)`);
const to = iso(new Date());
const from = iso(new Date(Date.now() - FREE_HISTORY_YEARS * 365.25 * 864e5));

if (!instruments) {
  r.fail('skipped: instrument list unavailable, so no symbols to request');
  failures.push('prices');
} else {
  let ok = 0;
  let rejectedSeries = 0;
  let totalObs = 0;
  const unavailable = [];

  for (const [i, eq] of instruments.equities.entries()) {
    if (!validateTicker(eq.ticker)) continue;
    try {
      const { observations, url } = await bourse.fetchHistory(eq.ticker, { from, to });
      if (!observations.length) {
        unavailable.push(eq.ticker);
        continue;
      }
      const quality = validateSeries(observations);
      totalObs += observations.length;

      if (quality.status === 'ERROR') {
        rejectedSeries++;
        r.warn(`${eq.ticker}: series rejected — ${quality.issues.slice(0, 3).join(', ')}`);
        continue;
      }

      await writeSnapshot(`data/bourse/prices/${eq.ticker}.json`, { observations }, {
        source: `${bourse.SOURCE} — Cours (historical, adjusted)`,
        sourceUrl: url,
        periodStart: observations[0].date,
        periodEnd: observations[observations.length - 1].date,
        quality,
        notes:
          'Open/high/low/close/volume/turnover/trades/market cap as published by the exchange. Daily change is derived from consecutive observed closes because the exchange leaves variation null on this feed.',
      });
      ok++;
      if (quality.status === 'WARNING') r.warn(`${eq.ticker}: ${quality.issues.length} non-fatal issue(s)`);
      if ((i + 1) % 15 === 0) r.info(`progress ${i + 1}/${instruments.equities.length}`);
    } catch (err) {
      unavailable.push(eq.ticker);
      r.warn(`${eq.ticker}: ${err.message}`);
    }
  }

  r.ok(`${ok} series cached, ${totalObs.toLocaleString('fr-FR')} observations total`);
  if (rejectedSeries) r.fail(`${rejectedSeries} series rejected by validation`);
  if (unavailable.length) r.warn(`${unavailable.length} instruments returned no data: ${unavailable.slice(0, 8).join(', ')}${unavailable.length > 8 ? '…' : ''}`);
  summary.priceSeries = ok;
  summary.observations = totalObs;
  summary.priceUnavailable = unavailable;
}

/* ── manifest ───────────────────────────────────────────────────────────── */
const status = failures.length === 0 ? 'CACHED OFFICIAL DATA' : 'PARTIAL DATA';
await writeSnapshot(
  'data/manifest.json',
  {
    started_at: START,
    finished_at: nowIso(),
    pipeline: 'scripts/fetch-data.mjs',
    free_history_years: FREE_HISTORY_YEARS,
    summary,
    failed: failures,
  },
  {
    source: 'MA3NA data pipeline',
    sourceUrl: `${bourse.BASE} · ${ammc.BASE}`,
    notes:
      'Free historical depth is the exchange-stated maximum of three years. Older and real-time data are licensed products and are not present here.',
  },
);

r.head('Summary');
console.log(JSON.stringify(summary, null, 2));
if (failures.length) {
  console.log(`\nDataset status: ${status}`);
  console.log(`Failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`\nDataset status: ${status}`);
}
