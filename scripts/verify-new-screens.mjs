/**
 * Isolated compile check for the four screens this agent added.
 *
 * `npm run build` cannot be used to verify this agent's work while another agent
 * is mid-write on LendingView.jsx -- that failure is theirs, and it masks
 * everything else. This builds a temporary entry that imports ONLY the four new
 * screens plus the store, money and ledger modules they actually depend on, so
 * a failure reported here is a failure in this agent's own code.
 *
 * Run: node scripts/verify-new-screens.mjs
 */

import { build } from 'vite';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCREENS = [
  'CustomerHubView',
  'CustomReportsView',
  'FinancialPlanningView',
  'MarketingView',
];

const src = new URL('../src/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const work = mkdtempSync(join(tmpdir(), 'messo-verify-'));
const entry = join(work, 'entry.jsx');

// Importing the store and ledger as well as the screens is deliberate: it makes
// this a real test of the dependency chain the screens rely on (deriveLedger,
// the reducer, formatMoney), not just of the JSX in the four files.
writeFileSync(
  entry,
  `
${SCREENS.map((s) => `import ${s} from ${JSON.stringify(join(src, 'components', s))};`).join('\n')}
import { useStore, useLedger, SEED } from ${JSON.stringify(join(src, 'store'))};
import { formatMoney } from ${JSON.stringify(join(src, 'money'))};
import { deriveLedger, invoiceTotals } from ${JSON.stringify(join(src, 'ledger'))};
export const all = [${SCREENS.join(', ')}, useStore, useLedger, SEED, formatMoney, deriveLedger, invoiceTotals];
`,
  'utf8'
);

try {
  await build({
    configFile: false,
    logLevel: 'silent',
    // Only the React plugin: Tailwind contributes a stylesheet, not JavaScript,
    // so it has no bearing on whether these screens compile.
    plugins: [(await import('@vitejs/plugin-react')).default()],
    build: {
      write: false,
      minify: false,
      lib: { entry, formats: ['es'], fileName: 'verify' },
      rollupOptions: { external: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react'] },
    },
  });
  console.log(`OK — all four screens compiled and bundled with their real dependencies.`);
} catch (err) {
  console.error('FAILED:', err.message);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
