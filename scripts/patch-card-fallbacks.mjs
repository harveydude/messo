/**
 * One-off patcher.
 *
 * Replaces the invented fallback figures inside the dashboard cards with honest
 * "no data" statements. Run once, then delete -- kept only because the finding
 * it addresses ("plausible fiction") is the one this whole change is about.
 *
 *   node scripts/patch-card-fallbacks.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('../src/components/', import.meta.url);

const patches = [
  {
    file: 'ProfitLossCard.jsx',
    from: /const data = pnlData \|\| \{[\s\S]*?\n  \};/,
    to: `/**
   * A missing figure is stated as missing. The previous fallback offered net
   * profit of $1,393 and a trend of "Up 673% from prior month" -- a comparison
   * against a period this app holds no data for at all.
   */
  const data = pnlData || {
    period: 'This period',
    title: 'PROFIT & LOSS',
    subtitle: 'Nothing recorded for this period yet',
    amount: '\\u20b90.00',
    marginBadge: '\\u2014',
    trendText: 'No earlier period to compare',
    trendDirection: 'up',
    income: { amount: '\\u20b90.00', label: 'Income', bookedPercent: 100, unreviewedPercent: 0, reviewText: 'Nothing to review' },
    expenses: { amount: '\\u20b90.00', label: 'Expenses', bookedPercent: 100, unreviewedPercent: 0, reviewText: 'Nothing to review' },
    footerLink: 'Add a transaction'
  };`,
  },
  {
    file: 'BankCard.jsx',
    from: /bankData\?\? \{[\s\S]*?\n  \}/,
    to: `bankData ?? {
    asOf: 'As of today',
    todaysBalance: '\\u20b90.00',
    accounts: [],
  }`,
  },
  {
    file: 'CashFlowCard.jsx',
    from: /cashflowData\?\.amount \|\| "[^"]*"/,
    to: `cashflowData?.amount || '\\u20b90.00'`,
  },
  {
    file: 'AccountsPayableCard.jsx',
    from: /apData\?\.updated \|\| "[^"]*"/,
    to: `apData?.updated || 'All categorised'`,
  },
  {
    file: 'AccountsPayableCard.jsx',
    from: /apData\?\.total \|\| "[^"]*"/,
    to: `apData?.total || '\\u20b90.00'`,
  },
  {
    file: 'FunnelCard.jsx',
    from: /funnelData\?\.period \|\| "[^"]*"/,
    to: `funnelData?.period || 'This period'`,
  },
];

let changed = 0;
for (const { file, from, to } of patches) {
  const path = new URL(file, ROOT);
  const src = readFileSync(path, 'utf8');
  if (!from.test(src)) {
    console.log(`  skip  ${file}  (pattern not present)`);
    continue;
  }
  writeFileSync(path, src.replace(from, to));
  changed++;
  console.log(`  ok    ${file}`);
}
console.log(`\n${changed} file(s) patched.`);