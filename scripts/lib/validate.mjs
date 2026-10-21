/**
 * Shared data-quality rules.
 *
 * Used by the fetch pipeline (scripts/) to reject bad records before they are
 * cached, and mirrored in spirit by the runtime loader so a cached record can
 * never be shown as trustworthy if it fails validation later.
 *
 * Nothing here invents or repairs a value. A record either passes, is flagged
 * as WARNING, or is rejected outright as ERROR.
 */

export const STATUS = /** @type {const} */ (['VALID', 'WARNING', 'ERROR']);

/** Fields an OHLCV observation must carry to be considered usable. */
const REQUIRED_OHLCV = ['date', 'open', 'high', 'low', 'close'];

/**
 * @param {any} o raw normalised observation
 * @returns {{ok: boolean, issues: string[]}}
 */
export function validateObservation(o) {
  /** @type {string[]} */
  const issues = [];

  if (!o || typeof o !== 'object') return { ok: false, issues: ['not-an-object'] };

  for (const f of REQUIRED_OHLCV) {
    if (o[f] === null || o[f] === undefined) issues.push(`missing:${f}`);
  }

  // date must be a real calendar date
  if (o.date && !/^\d{4}-\d{2}-\d{2}$/.test(o.date)) issues.push('bad-date-format');
  if (o.date && Number.isNaN(Date.parse(o.date))) issues.push('unparseable-date');

  const nums = ['open', 'high', 'low', 'close', 'volume', 'turnover', 'trades', 'marketCap'];
  for (const f of nums) {
    const v = o[f];
    if (v === null || v === undefined) continue;
    if (typeof v !== 'number' || !Number.isFinite(v)) issues.push(`non-finite:${f}`);
    if (v < 0) issues.push(`negative:${f}`);
  }

  // prices must be strictly positive to be tradable observations
  for (const f of ['open', 'high', 'low', 'close']) {
    if (typeof o[f] === 'number' && o[f] <= 0) issues.push(`non-positive-price:${f}`);
  }

  if ([o.open, o.high, o.low, o.close].every((n) => typeof n === 'number')) {
    if (o.high < o.low) issues.push('high-below-low');
    if (o.high < Math.max(o.open, o.close)) issues.push('high-below-body');
    if (o.low > Math.min(o.open, o.close)) issues.push('low-above-body');
  }

  return { ok: issues.filter((i) => i.startsWith('missing') || i.startsWith('non-positive') || i.startsWith('bad') || i.startsWith('unparseable')).length === 0, issues };
}

/**
 * Validate a whole observation series: per-record checks plus
 * cross-record checks for duplicate sessions and chronological order.
 * @param {any[]} series
 */
export function validateSeries(series) {
  /** @type {string[]} */
  const issues = [];
  const seen = new Set();

  for (const o of series) {
    const r = validateObservation(o);
    for (const i of r.issues) issues.push(`${o?.date ?? '?'}:${i}`);
    if (o?.date) {
      if (seen.has(o.date)) issues.push(`${o.date}:duplicate-session`);
      seen.add(o.date);
    }
  }

  for (let i = 1; i < series.length; i++) {
    if (series[i].date < series[i - 1].date) issues.push(`${series[i].date}:out-of-order`);
  }

  const fatal = issues.filter(
    (i) =>
      /duplicate-session|out-of-order|high-below|low-above|negative:|unparseable|not-an-object/.test(i),
  );

  return {
    status: fatal.length ? 'ERROR' : issues.length ? 'WARNING' : 'VALID',
    issues: Array.from(new Set(issues)).slice(0, 40),
    rejected: fatal.length,
  };
}

/** Tickers must be short, uppercase, alphanumeric. */
export function validateTicker(t) {
  return typeof t === 'string' && /^[A-Z0-9&._-]{1,12}$/.test(t.trim());
}

/** ISO timestamp for snapshot envelopes. */
export function nowIso() {
  return new Date().toISOString();
}
