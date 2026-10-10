/**
 * Money formatting.
 *
 * Messo is India-first: the ledger is in rupees and figures are grouped the way
 * an Indian accountant reads them -- 1,00,000 and 1,00,00,000, not 100,000 and
 * 10,000,000. The sign sits before the symbol, so a debit reads "-₹1,200" rather
 * than "₹-1,200".
 *
 * Kept in its own module for two reasons. First, the project had eleven
 * hand-rolled `toFixed(2)` formats across seven files with no shared helper, so
 * the same figure rendered three different ways on one screen. Second, a file
 * that exports both functions and components disables React fast refresh.
 *
 * `amount` must be a NUMBER. Anything unparseable returns null rather than
 * falling back to zero: "no invoices raised yet" and "zero rupees outstanding"
 * are different statements, and for a new company only the first is true.
 *
 * NOTE FOR THE BACKEND PASS: when real data arrives, money should be carried as
 * integer paise, never a float, and converted here for display only.
 */

const PAISE = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const WHOLE = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** ₹1,23,456.78 — with Indian digit grouping, and the sign leading. */
export function formatMoney(amount, { paise = true, symbol = '₹' } = {}) {
  const n = toNumber(amount);
  if (n === null) return null;
  const body = (paise ? PAISE : WHOLE).format(Math.abs(n));
  return `${n < 0 ? '-' : ''}${symbol}${body}`;
}

/** ₹1.25 L / ₹3.40 Cr — for headline figures that would otherwise run long. */
export function formatMoneyShort(amount, { symbol = '₹' } = {}) {
  const n = toNumber(amount);
  if (n === null) return null;

  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const trim = (v, places) => v.toFixed(places).replace(/\.00$/, '');

  if (abs >= 1e7) return `${sign}${symbol}${trim(abs / 1e7, 2)} Cr`;
  if (abs >= 1e5) return `${sign}${symbol}${trim(abs / 1e5, 2)} L`;
  return `${sign}${symbol}${PAISE.format(abs)}`;
}

/**
 * Parse anything into a number, or null.
 *
 * Handles the string amounts the sample data uses ("$1,861.55" as a bare
 * "1861.55"), rejects NaN and Infinity, and refuses to invent a zero from an
 * absent value.
 */
export function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null;

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}
