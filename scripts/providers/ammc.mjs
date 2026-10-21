/**
 * AMMC — Autorité Marocaine du Marché des Capitaux.
 *
 * Regulatory source of truth for issuer identity: official name, official
 * "secteur d'activité" classification, and official listing date. Also the
 * source for dated issuer publications, which replace invented events.
 */
import { get } from '../lib/http.mjs';

export const SOURCE = 'AMMC';
export const BASE = 'https://www.ammc.ma';

function stripTags(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&agrave;/g, 'à')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "06/07/2006" -> "2006-07-06" */
function frToIso(d) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(d ?? '').trim());
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * Official issuer list.
 *
 * The listing is a Drupal view: a table plus a `?page=N` pager. We walk the
 * pager and read only the columns the regulator publishes, so nothing about
 * an issuer is guessed.
 */
export async function fetchIssuers({ maxPages = 20, minGapMs = 500 } = {}) {
  const startUrl = `${BASE}/fr/espace-emetteurs/liste-des-emetteurs`;
  const first = await get(startUrl, { minGapMs });

  const maxPage = Math.max(0, ...[...first.matchAll(/\?page=(\d+)/g)].map((m) => Number(m[1])));
  const pages = Math.min(maxPage + 1, maxPages);

  const rows = new Map();

  const parsePage = (html, url) => {
    const table = /<table[\s\S]*?<\/table>/.exec(html);
    if (!table) return;
    for (const tr of table[0].matchAll(/<tr[\s\S]*?<\/tr>/g)) {
      const cells = [...tr[0].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => stripTags(c[1]));
      if (cells.length < 3) continue;
      const [, name, sector, listed] = cells;
      if (!name || !sector) continue;
      if (/d[ée]nominaison/i.test(name)) continue;
      const href = /href="([^"]*liste-des-emetteurs\/\d+)"/.exec(tr[0])?.[1] ?? null;
      const key = name.toUpperCase();
      rows.set(key, {
        name,
        /** AMMC's own sector classification, verbatim */
        sector: sector || null,
        listingDate: frToIso(listed),
        listingDateRaw: listed || null,
        detailUrl: href ? `${BASE}${href}` : null,
        sourceUrl: url,
      });
    }
  };

  parsePage(first, startUrl);
  for (let p = 1; p < pages; p++) {
    const url = `${startUrl}?page=${p}`;
    try {
      parsePage(await get(url, { minGapMs }), url);
    } catch {
      break;
    }
  }

  const issuers = Array.from(rows.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  return { issuers, url: startUrl, pagesRead: pages };
}

/**
 * Dated issuer publications.
 *
 * AMMC publishes a recurring notice listing the documents issuers have filed,
 * each linking to the actual document on ammc.ma. We take the real title, the
 * real publication date and the real document URLs.
 *
 * Document type is derived from the published file name, which is recorded as
 * an inferred attribute with its method, never as a regulator statement.
 */
export async function fetchPublications({ pages = 6, minGapMs = 500 } = {}) {
  const indexUrl = `${BASE}/fr/actualites`;
  let html;
  try {
    html = await get(indexUrl, { minGapMs });
  } catch {
    return { publications: [], url: indexUrl };
  }

  const links = Array.from(
    new Set(
      [...html.matchAll(/href="(\/fr\/actualites\/[a-z0-9-]+)"/g)]
        .map((m) => m[1])
        .filter((h) => !/\/(evenements|communique-presse)$/.test(h)),
    ),
  ).slice(0, pages * 12);

  const out = [];
  for (const href of links) {
    const url = `${BASE}${href}`;
    let page;
    try {
      page = await get(url, { minGapMs });
    } catch {
      continue;
    }

    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(page);
    const title = h1 ? stripTags(h1[1]) : null;

    // the notice states the date it covers, then its own publication date
    const dateText = /en date du (\d{1,2}\/\d{1,2}\/\d{4})/.exec(stripTags(page));
    const timeEl = /<time[^>]*datetime="(\d{4}-\d{2}-\d{2})/.exec(page);
    const date = dateText ? frToIso(dateText[1]) : (timeEl?.[1] ?? null);

    const docs = Array.from(
      new Set([...page.matchAll(/href="(https?:\/\/www\.ammc\.ma\/sites\/default\/files\/[^"]+\.pdf)"/g)].map((m) => m[1])),
    );

    if (!title || !date) continue;

    out.push({
      title,
      date,
      url,
      documents: docs.map((d) => ({
        url: d,
        fileName: d.split('/').pop(),
        /** inferred from the published file name; method recorded alongside */
        inferredType: /_S\d_\d\d\.|_S\d_\d\d(?:\.|$)/.test(d)
          ? 'financial-report-semester'
          : /_AN\d|_ANNUAL|rapport-annuel/i.test(d)
            ? 'financial-report-annual'
            : /^CP_/i.test(d.split('/').pop() ?? '')
              ? 'press-release'
              : 'issuer-document',
      })),
    });
  }

  return { publications: out, url: indexUrl };
}
