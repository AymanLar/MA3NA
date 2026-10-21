/**
 * Polite HTTP + snapshot writing.
 *
 * Every outbound request identifies itself, is rate limited, and is retried
 * with backoff. We do not attempt to bypass authentication, paywalls, CAPTCHAs
 * or rate limits: if a source refuses us, the record stays UNAVAILABLE.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { nowIso } from './validate.mjs';

const UA =
  'MA3NA-prototype/1.0 (educational data visualisation; contact: local developer; respects robots.txt)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let lastCall = 0;

/** Minimum gap between requests to any single host. */
async function throttle(minGapMs) {
  const wait = lastCall + minGapMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

/**
 * GET a URL as text with retry/backoff. Throws on persistent failure.
 * @param {string} url
 * @param {{minGapMs?: number, retries?: number, timeoutMs?: number}} [opts]
 */
export async function get(url, opts = {}) {
  const { minGapMs = 400, retries = 3, timeoutMs = 45_000 } = opts;
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(minGapMs);
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        signal: ctl.signal,
        redirect: 'follow',
        headers: { 'User-Agent': UA, Accept: '*/*', 'Accept-Language': 'fr,en;q=0.8' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (attempt < retries) await sleep(700 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`GET failed ${url}: ${lastErr?.message ?? 'unknown'}`);
}

/** GET and parse JSON. */
export async function getJson(url, opts) {
  const text = await get(url, opts);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`invalid JSON from ${url}`);
  }
}

/**
 * Write a snapshot with a provenance envelope.
 *
 * Every cached dataset records where it came from and exactly when, so the UI
 * can never present a number without the ability to trace it.
 *
 * @param {string} relPath path relative to repo root, e.g. data/bourse/indices.json
 * @param {any} data
 * @param {{source: string, sourceUrl: string, retrievedAt?: string, periodStart?: string|null, periodEnd?: string|null, quality?: any, notes?: string}} meta
 */
export async function writeSnapshot(relPath, data, meta) {
  const abs = resolve(process.cwd(), relPath);
  await mkdir(dirname(abs), { recursive: true });

  const envelope = {
    /** schema version so consumers can detect drift */
    version: 1,
    status: meta.quality?.status === 'ERROR' ? 'ERROR' : 'VALID',
    quality: meta.quality ?? { status: 'VALID', issues: [], rejected: 0 },
    source: meta.source,
    sourceUrl: meta.sourceUrl,
    retrieved_at: meta.retrievedAt ?? nowIso(),
    period_start: meta.periodStart ?? null,
    period_end: meta.periodEnd ?? null,
    notes: meta.notes ?? null,
    data,
  };

  await writeFile(abs, JSON.stringify(envelope, null, 0), 'utf8');
  return envelope;
}

/** Console reporter for the fetch run. */
export function report() {
  const pad = (s, n) => String(s).padEnd(n);
  return {
    ok: (m) => console.log(`  ${pad('OK', 10)} ${m}`),
    warn: (m) => console.log(`  ${pad('WARN', 10)} ${m}`),
    fail: (m) => console.log(`  ${pad('FAIL', 10)} ${m}`),
    info: (m) => console.log(`  ${pad('', 10)} ${m}`),
    head: (m) => console.log(`\n${m}\n${'-'.repeat(m.length)}`),
  };
}
