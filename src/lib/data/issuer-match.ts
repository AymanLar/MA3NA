import type { Equity, Issuer } from './snapshot';

/**
 * Issuer ↔ ticker resolution.
 *
 * The Bourse publishes a short ticker per instrument. AMMC publishes issuer
 * names, sometimes with the ticker in parentheses. Nothing states the mapping
 * explicitly on either side, so every match is produced by a rule, and each
 * rule carries its own confidence so the UI can label it honestly.
 *
 * We never guess silently: an issuer that cannot be matched simply has no
 * market data attached, and its page reports that.
 */

export type MatchMethod = 'ammc-parenthesised-ticker' | 'exact-label' | 'ticker-in-name' | 'prefix';
export type MatchConfidence = 'HIGH' | 'MEDIUM';

export interface IssuerMatch {
  ticker: string;
  issuer: Issuer;
  method: MatchMethod;
  confidence: MatchConfidence;
}

export const MATCH_METHOD_LABEL: Record<MatchMethod, string> = {
  'ammc-parenthesised-ticker': 'Ticker published in the AMMC issuer name',
  'exact-label': 'Issuer name identical to the Bourse instrument label',
  'ticker-in-name': 'Bourse ticker appears in the AMMC issuer name',
  prefix: 'Ticker prefix matches the start of the AMMC issuer name',
};

const norm = (s: string | null | undefined) => (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const parenthesised = (s: string) => [...s.matchAll(/\(([A-Z0-9&._-]{1,12})/g)].map((m) => m[1]);

/**
 * Resolve each listed equity to at most one AMMC issuer.
 *
 * Rules are applied in descending confidence; the first rule that produces a
 * single candidate wins. Ambiguous candidates are discarded rather than
 * resolved arbitrarily.
 */
export function matchIssuers(equities: Equity[], issuers: Issuer[]): Map<string, IssuerMatch> {
  const out = new Map<string, IssuerMatch>();
  const tickerSet = new Set(equities.map((e) => e.ticker));

  for (const eq of equities) {
    const t = eq.ticker;
    const nt = norm(t);
    const labelNorm = new Set([norm(eq.nameEn), norm(eq.nameFr)].filter(Boolean));

    // 1. ticker published by AMMC inside the issuer name
    const viaParen = issuers.filter((i) => parenthesised(i.name).some((p) => tickerSet.has(p)));
    if (viaParen.length === 1) {
      out.set(t, { ticker: t, issuer: viaParen[0], method: 'ammc-parenthesised-ticker', confidence: 'HIGH' });
      continue;
    }

    // 2. identical name
    const viaExact = issuers.filter((i) => labelNorm.has(norm(i.name)));
    if (viaExact.length === 1) {
      out.set(t, { ticker: t, issuer: viaExact[0], method: 'exact-label', confidence: 'HIGH' });
      continue;
    }

    // 3. ticker (>=3 chars) occurs in the issuer name
    if (nt.length >= 3) {
      const viaContains = issuers.filter((i) => norm(i.name).includes(nt));
      if (viaContains.length === 1) {
        out.set(t, { ticker: t, issuer: viaContains[0], method: 'ticker-in-name', confidence: 'MEDIUM' });
        continue;
      }
    }

    // 4. shared 4-character prefix, only when unambiguous
    if (nt.length >= 4) {
      const p = nt.slice(0, 4);
      const viaPrefix = issuers.filter((i) => norm(i.name).startsWith(p));
      if (viaPrefix.length === 1) {
        out.set(t, { ticker: t, issuer: viaPrefix[0], method: 'prefix', confidence: 'MEDIUM' });
      }
    }
  }

  return out;
}
