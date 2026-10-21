const nf = (min: number, max: number) =>
  new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

const f0 = nf(0, 0);
const f2 = nf(2, 2);

export function num(v: number, dp = 2) {
  return nf(dp, dp).format(v);
}

export function compact(v: number) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${f2.format(v / 1e9)}B`;
  if (a >= 1e6) return `${f2.format(v / 1e6)}M`;
  if (a >= 1e3) return `${f2.format(v / 1e3)}K`;
  return f0.format(v);
}

export function money(v: number, currency = 'MAD', dp = 2) {
  return `${nf(dp, dp).format(v)} ${currency}`;
}

export function signed(v: number, dp = 2) {
  return `${v >= 0 ? '+' : ''}${nf(dp, dp).format(v)}`;
}

export function pct(v: number, dp = 2) {
  return `${v >= 0 ? '+' : ''}${nf(dp, dp).format(v)}%`;
}

export function plainPct(v: number, dp = 1) {
  return `${nf(dp, dp).format(v)}%`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateLong(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

export function formatMonthYear(d: Date) {
  return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
}

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}