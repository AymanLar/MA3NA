import type { Observation } from './snapshot';

/**
 * Metrics calculated from real observations.
 *
 * Every function here is a transparent calculation over sessions the exchange
 * actually published. Each returns the observation count it used so the UI can
 * state it, and returns null rather than a guess when there is not enough data.
 *
 * No function fabricates, interpolates or smooths a value.
 */

export interface CalcResult<T> {
  value: T | null;
  /** number of observations the figure is based on */
  n: number;
  /** plain-language statement of the method, shown in the UI */
  method: string;
  /** true when the source did not provide enough data */
  unavailable?: boolean;
}

const pct = (a: number, b: number) => (b === 0 ? null : ((a / b) - 1) * 100);

/** Sessions with a real traded close, oldest first. */
export function traded(o: Observation[]): Observation[] {
  return o.filter((x) => x.close !== null);
}

/**
 * Sessions that carry an actual trade.
 *
 * The exchange publishes a row for suspended sessions where open/high/low and
 * volume are null and the close is carried forward. Those are not observations
 * of trading, so they are excluded from calculations and reported separately as
 * non-trading sessions.
 */
export function active(o: Observation[]): Observation[] {
  return o.filter((x) => x.close !== null && (x.volume !== null || x.open !== null));
}

/** Total return across a window, in percent. */
export function totalReturn(obs: Observation[]): CalcResult<number> {
  const a = active(obs);
  const base = `Total return from first to last traded close across ${a.length} sessions.`;
  if (a.length < 2) return { value: null, n: a.length, method: base, unavailable: true };
  const first = a[0];
  const last = a[a.length - 1];
  const value = pct(last.close!, first.close!);
  return { value, n: a.length, method: base };
}

/** Simple returns between consecutive traded sessions. */
export function simpleReturns(obs: Observation[]): number[] {
  const a = active(obs);
  const out: number[] = [];
  for (let i = 1; i < a.length; i++) {
    const r = pct(a[i].close!, a[i - 1].close!);
    if (r !== null && Number.isFinite(r)) out.push(r);
  }
  return out;
}

/** Standard deviation of daily returns, annualised, in percent. */
export function volatility(obs: Observation[], tradingDays = 252): CalcResult<number> {
  const rets = simpleReturns(obs);
  const base = `Annualised standard deviation of daily returns over ${rets.length} return observations (${tradingDays} sessions per year). Sample standard deviation, no risk-free adjustment.`;
  if (rets.length < 20) return { value: null, n: rets.length, method: base, unavailable: true };
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (rets.length - 1);
  return { value: Math.sqrt(variance) * Math.sqrt(tradingDays), n: rets.length, method: base };
}

/** Largest peak-to-trough decline over the window, in percent (negative). */
export function maxDrawdown(obs: Observation[]): CalcResult<number> {
  const a = active(obs);
  const base = `Largest peak-to-trough decline of traded closes over ${a.length} sessions.`;
  if (a.length < 2) return { value: null, n: a.length, method: base, unavailable: true };
  let peak = a[0].close!;
  let worst = 0;
  for (const x of a) {
    const c = x.close!;
    if (c > peak) peak = c;
    const dd = pct(c, peak);
    if (dd !== null && dd < worst) worst = dd;
  }
  return { value: worst, n: a.length, method: base };
}

/**
 * 52-week high/low of traded closes.
 * Derived from observations, never hardcoded.
 */
export function fiftyTwoWeek(obs: Observation[]): CalcResult<{ high: number; low: number; n: number; from: string; to: string }> {
  const cutoff = obs.length ? Date.parse(obs[obs.length - 1].date) - 365 * 864e5 : 0;
  const inWindow = obs.filter((x) => x.close !== null && Date.parse(x.date) >= cutoff);
  const a = inWindow.length ? inWindow : traded(obs);
  const base = `Highest and lowest traded close in the 12 months to ${a.length ? a[a.length - 1].date : 'n/a'}, from ${a.length} sessions.`;
  if (a.length < 20) return { value: null, n: a.length, method: base, unavailable: true };
  const closes = a.map((x) => x.close!);
  return {
    value: { high: Math.max(...closes), low: Math.min(...closes), n: a.length, from: a[0].date, to: a[a.length - 1].date },
    n: a.length,
    method: base,
  };
}

/**
 * Pearson correlation of daily returns between two series, aligned on shared
 * session dates only.
 */
export function correlation(a: Observation[], b: Observation[]): CalcResult<number> {
  const map = new Map(b.filter((x) => x.close !== null).map((x) => [x.date, x.close!]));
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i < a.length; i++) {
    const prev = a[i - 1].close;
    const cur = a[i].close;
    const other = map.get(a[i].date);
    if (prev === null || prev === undefined || cur === null || cur === undefined || other === undefined) continue;
    const r1 = pct(cur, prev);
    const prevOther = map.get(a[i - 1].date);
    if (r1 === null || prevOther === undefined) continue;
    const r2 = pct(other, prevOther);
    if (r2 === null || !Number.isFinite(r2)) continue;
    pairs.push([r1, r2]);
  }
  const base = `Pearson correlation of daily returns on ${pairs.length} shared trading sessions.`;
  if (pairs.length < 30) return { value: null, n: pairs.length, method: base, unavailable: true };
  const n = pairs.length;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    vx += (x - mx) ** 2;
    vy += (y - my) ** 2;
  }
  if (vx === 0 || vy === 0) return { value: null, n, method: base, unavailable: true };
  return { value: cov / Math.sqrt(vx * vy), n, method: base };
}

/**
 * Beta against a benchmark series, from daily returns on shared sessions.
 * The benchmark is an official index observed as a level; its returns are
 * computed from consecutive published values.
 */
export function beta(stock: Observation[], benchmark: Array<{ date: string; value: number }>): CalcResult<number> {
  const bmap = new Map(benchmark.map((x) => [x.date, x.value]));
  const pairs: Array<[number, number]> = [];
  for (let i = 1; i < stock.length; i++) {
    const prev = stock[i - 1].close;
    const cur = stock[i].close;
    const b1 = bmap.get(stock[i].date);
    const b0 = bmap.get(stock[i - 1].date);
    if (prev === null || prev === undefined || cur === null || cur === undefined || b1 === undefined || b0 === undefined) continue;
    const rs = pct(cur, prev);
    const rb = pct(b1, b0);
    if (rs === null || rb === null) continue;
    pairs.push([rs, rb]);
  }
  const base = `Sensitivity of daily stock returns to benchmark returns over ${pairs.length} shared sessions, from ordinary least squares.`;
  if (pairs.length < 30) return { value: null, n: pairs.length, method: base, unavailable: true };
  const n = pairs.length;
  const my = pairs.reduce((s, p) => s + p[1], 0) / n;
  const mx = pairs.reduce((s, p) => s + p[0], 0) / n;
  let cov = 0;
  let vy = 0;
  for (const [x, y] of pairs) {
    cov += (x - mx) * (y - my);
    vy += (y - my) ** 2;
  }
  if (vy === 0) return { value: null, n, method: base, unavailable: true };
  return { value: cov / vy, n, method: base };
}

/** Mean traded volume per session over a window, in shares. */
export function averageVolume(obs: Observation[], sessions = 30): CalcResult<number> {
  const a = active(obs).filter((x) => x.volume !== null).slice(-sessions);
  const base = `Mean traded volume per session over the last ${a.length} sessions that carried a trade.`;
  if (a.length < 5) return { value: null, n: a.length, method: base, unavailable: true };
  return { value: a.reduce((s, x) => s + (x.volume ?? 0), 0) / a.length, n: a.length, method: base };
}
