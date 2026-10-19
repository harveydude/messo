/**
 * Verification Script for Newly Added Features:
 * 1. Deep-Link Route Resolution & Aliases
 * 2. Instant GSTIN AI Auto-Enrichment & Parser
 * 3. 14-Module Categorized Setup Grid & Asset Integrity
 * 4. Production URL Health & Asset Availability
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseGstinAI, GST_STATE_CODES, PAN_ENTITY_TYPES } from '../src/utils/gstinHelper.js';
import { ROUTES, viewIdForSlug, slugFor, labelFor } from '../src/routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('================================================================================');
console.log('MESSO FEATURE VERIFICATION SUITE');
console.log('================================================================================\n');

// -----------------------------------------------------------------------------
// TEST SUITE 1: GSTIN AI ENGINE & PROGRESSIVE AUTO-ENRICHMENT
// -----------------------------------------------------------------------------
console.log('--- SUITE 1: GSTIN AI Engine & Progressive Parsing ---');

// Test 1.1: Standard Valid GSTIN (Maharashtra, LLP)
// Format: 27 (state) + AAPFU0931F (PAN: 4th char is F = Firm/LLP) + 1 + Z + V
const gstin1 = parseGstinAI('27AAPFU0931F1ZV');
assert(gstin1 !== null, 'Parses standard 15-digit GSTIN');
assert(gstin1.stateCode === '27', 'Accurately extracts state code 27');
assert(gstin1.stateName === 'Maharashtra', 'Accurately resolves state name to Maharashtra');
assert(gstin1.pan === 'AAPFU0931F', 'Accurately extracts 10-digit PAN (AAPFU0931F)');
assert(gstin1.panFourthChar === 'F', 'Accurately identifies PAN 4th char "F"');
assert(gstin1.entityType.includes('LLP') || gstin1.entityType.includes('Partnership'), 'Identifies entity as Partnership/LLP');
assert(gstin1.suggestedTaxType === 'llp', 'Suggests "llp" taxType');
assert(gstin1.isValidFormat === true, 'Validates format regex against official GST rules');
assert(gstin1.isComplete === true, 'Marks isComplete true for 15 chars');
assert(gstin1.filingSchedule.includes('GSTR-1'), 'Recommends GSTR-1 schedule');

// Test 1.2: Karnataka Private Limited Company
// Format: 29 (state) + AABCU9603R (PAN: 4th char is C = Company) + 1 + Z + M
const gstin2 = parseGstinAI('29AABCU9603R1ZM');
assert(gstin2.stateCode === '29' && gstin2.stateName === 'Karnataka', 'Resolves Karnataka (Code 29)');
assert(gstin2.pan === 'AABCU9603R', 'Extracts Company PAN AABCU9603R');
assert(gstin2.panFourthChar === 'C', 'Identifies 4th char "C" (Company)');
assert(gstin2.suggestedTaxType === 'pvt_ltd', 'Suggests "pvt_ltd" for Corporate entities');
assert(gstin2.isValidFormat === true, 'Validates Karnataka Pvt Ltd GSTIN format');

// Test 1.3: Delhi Sole Proprietorship
// Format: 07 (state) + ABCPP1234A (PAN: 4th char is P = Person/Proprietor) + 1 + Z + 5
const gstin3 = parseGstinAI('07ABCPP1234A1Z5');
assert(gstin3.stateCode === '07' && gstin3.stateName === 'Delhi', 'Resolves Delhi (Code 07)');
assert(gstin3.panFourthChar === 'P', 'Identifies 4th char "P" (Individual/Proprietor)');
assert(gstin3.suggestedTaxType === 'sole_proprietor', 'Suggests "sole_proprietor" for Individual entities');
assert(gstin3.filingSchedule.includes('QRMP'), 'Recommends QRMP eligible schedule for proprietors');

// Test 1.4: Progressive partial parsing (Real-time keystroke simulation)
const partial2 = parseGstinAI('27');
assert(partial2.stateName === 'Maharashtra', 'Detects state immediately from first 2 digits');
assert(partial2.pan === null, 'Leaves PAN null for only 2 digits');
assert(partial2.isValidFormat === false, 'Correctly flags partial 2-digit input as not yet valid format');

// 6 characters: State (27) + First 4 letters of PAN (A, A, P, F) -> clean[5] is 'F'
const partial6 = parseGstinAI('27AAPF');
assert(partial6.stateName === 'Maharashtra', 'Retains state on 6 characters');
assert(partial6.panFourthChar === 'F', 'Detects entity type at 6 characters from PAN 4th letter');

// Test 1.5: Edge cases
const emptyGstin = parseGstinAI('');
assert(emptyGstin === null, 'Returns null on empty string');
const lowercaseGstin = parseGstinAI('27aapfu0931f1zv');
assert(lowercaseGstin.pan === 'AAPFU0931F' && lowercaseGstin.isValidFormat, 'Handles lowercase input via uppercase normalizer');

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 2: DEEP-LINK ROUTE RESOLUTION & ALIASES
// -----------------------------------------------------------------------------
console.log('--- SUITE 2: Deep-Link Routing & Route Aliases ---');

const deepLinkRoutesToTest = [
  { path: '/dashboard', expectedId: 'dashboard', desc: 'Direct /dashboard deep-link' },
  { path: '/expenses', expectedId: 'expense_transactions', desc: 'Direct /expenses' },
  { path: '/sales', expectedId: 'sales_transactions', desc: 'Direct /sales' },
  { path: '/sales/invoices', expectedId: 'invoices', desc: 'Alias /sales/invoices' },
  { path: '/invoices', expectedId: 'invoices', desc: 'Direct /invoices' },
  { path: '/gst', expectedId: 'sales_tax', desc: 'Alias /gst to GST Returns' },
  { path: '/gst/returns', expectedId: 'sales_tax', desc: 'Alias /gst/returns to GST Returns' },
  { path: '/gst-returns', expectedId: 'sales_tax', desc: 'Alias /gst-returns to GST Returns' },
  { path: '/tds', expectedId: 'business_tax', desc: 'Alias /tds to TDS & Direct Tax' },
  { path: '/direct-tax', expectedId: 'business_tax', desc: 'Alias /direct-tax to TDS' },
  { path: '/payroll', expectedId: 'payroll', desc: 'Direct /payroll' },
  { path: '/accounting', expectedId: 'bank_transactions', desc: 'Alias /accounting to Bank Transactions' },
  { path: '/bank', expectedId: 'bank_transactions', desc: 'Alias /bank to Bank Transactions' },
  { path: '/banking', expectedId: 'bank_transactions', desc: 'Direct /banking' },
  { path: '/reports', expectedId: 'reports', desc: 'Direct /reports' },
  { path: '/bills', expectedId: 'bills', desc: 'Direct /bills' },
  { path: '/pay-bills', expectedId: 'bills', desc: 'Alias /pay-bills to Bills' },
  { path: '/customers', expectedId: 'customers_list', desc: 'Direct /customers' },
  { path: '/vendors', expectedId: 'vendors', desc: 'Direct /vendors' },
  { path: '/team', expectedId: 'team', desc: 'Direct /team' },
  { path: '/time', expectedId: 'time_entries', desc: 'Direct /time' },
  { path: '/budgets', expectedId: 'budgets', desc: 'Direct /budgets' },
  { path: '/chart-of-accounts', expectedId: 'chart_of_accounts', desc: 'Direct /chart-of-accounts' },
  { path: '/accounts', expectedId: 'chart_of_accounts', desc: 'Alias /accounts to Chart of Accounts' },
];

for (const test of deepLinkRoutesToTest) {
  const resolved = viewIdForSlug(test.path);
  assert(resolved === test.expectedId, `${test.desc}: ${test.path} -> ${resolved}`);
}

// Test root navigation with onboarding status
globalThis.localStorage = {
  getItem: (key) => (key === 'meso_onboarding_completed' ? 'false' : null),
};
assert(viewIdForSlug('/') === 'onboarding', 'Root "/" resolves to "onboarding" when not completed');

globalThis.localStorage.getItem = (key) => (key === 'meso_onboarding_completed' ? 'true' : null);
assert(viewIdForSlug('/') === 'dashboard', 'Root "/" resolves to "dashboard" when completed');

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 3: SETUP MODULE GRID INTEGRITY & ASSET VERIFICATION
// -----------------------------------------------------------------------------
console.log('--- SUITE 3: 14-Module Setup Grid & Asset Integrity ---');

const onboardingFile = fs.readFileSync(path.join(projectRoot, 'src/components/onboarding/OnboardingWizard.jsx'), 'utf8');

assert(onboardingFile.includes('const MODULE_CATEGORIES = ['), 'OnboardingWizard defines MODULE_CATEGORIES');
assert(onboardingFile.includes('const ALL_MODULES = ['), 'OnboardingWizard defines ALL_MODULES');
assert(onboardingFile.includes('All Modules (14)'), 'Category includes All Modules (14)');
assert(onboardingFile.includes('Core Operations (4)'), 'Category includes Core Operations (4)');
assert(onboardingFile.includes('Tax & Compliance (3)'), 'Category includes Tax & Compliance (3)');
assert(onboardingFile.includes('People & Payroll (3)'), 'Category includes People & Payroll (3)');
assert(onboardingFile.includes('CFO & Treasury (4)'), 'Category includes CFO & Treasury (4)');
assert(onboardingFile.includes('MESSO AI Tax'), 'Screen 1 includes AI Tax & Entity Detection header');
assert(onboardingFile.includes('Explore Live Demo ERP'), 'Screen 0 includes Explore Live Demo ERP bypass CTA');
assert(onboardingFile.includes('Exit to Dashboard'), 'Header includes Exit to Dashboard button');

// Verify all 13 module icon image files exist in public/app-icons
const requiredIcons = [
  'accounting.png',
  'sales.png',
  'expenses.png',
  'bills.png',
  'gst.png',
  'tds.png',
  'reports.png',
  'payroll.png',
  'team.png',
  'time.png',
  'customer_hub.png',
  'customers.png',
  'tag_marketing.png',
];

for (const icon of requiredIcons) {
  const iconPath = path.join(projectRoot, 'public/app-icons', icon);
  const exists = fs.existsSync(iconPath);
  const size = exists ? fs.statSync(iconPath).size : 0;
  assert(exists && size > 1000, `Module icon asset exists & non-empty: public/app-icons/${icon} (${Math.round(size/1024)} KB)`);
}

console.log('');

// -----------------------------------------------------------------------------
// TEST SUITE 4: CODE CLEANLINESS & PRODUCTION BUNDLE VERIFICATION
// -----------------------------------------------------------------------------
console.log('--- SUITE 4: Code Cleanliness & Production Bundle Verification ---');

const appFile = fs.readFileSync(path.join(projectRoot, 'src/App.jsx'), 'utf8');
assert(!appFile.includes("if (!isCompleted && viewId === 'dashboard')"), 'Removed aggressive onboarding trapping loop from App.jsx');
assert(appFile.includes("localStorage.setItem('meso_onboarding_completed', 'true')"), 'onExit sets meso_onboarding_completed to true');

const distIndex = path.join(projectRoot, 'dist/index.html');
assert(fs.existsSync(distIndex), 'Production build dist/index.html exists');

console.log('\n================================================================================');
console.log(`VERIFICATION SUMMARY: ${passedTests}/${totalTests} PASSED, ${failedTests} FAILED`);
console.log('================================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
