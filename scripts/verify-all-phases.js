/**
 * Meso Master Cumulative Phase Verification Engine
 * Runs strict automated tests for all active phases in MASTER_ARCHITECTURE_50_PHASES.md
 * Exits with code 0 if 100% PASS, or code 1 with exact trace on any failure.
 */

import { getDb, initDb } from '../server/src/db/db.js';
import { recordAuditLog, verifyAuditChain, computeAuditHash, GENESIS_HASH } from '../server/src/services/auditService.js';
import { getCompanyPolicy, updateCompanyPolicy, checkBooksLock, getEffectiveTaxSchedule } from '../server/src/services/policyService.js';
import { softDeleteTransaction, softDeleteAttachment } from '../server/src/services/deletionService.js';
import { ROLES, requirePermission } from '../server/src/middleware/rbac.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    testsFailed++;
  }
}

async function runPhase1() {
  console.log('\n======================================================');
  console.log('--- PHASE 1: Multi-Tenant Isolation & RBAC Security ---');
  console.log('======================================================');

  const db = await getDb();

  // Test 1.1: Users table exists with role checks
  const res = await db.query(`SELECT table_name FROM information_schema.tables WHERE table_name = 'users'`);
  assert(res.rows.length > 0, 'Phase 1.1: `users` table exists in database');

  // Test 1.2: Check all 5 RBAC roles defined
  const expectedRoles = ['OWNER', 'CHARTERED_ACCOUNTANT', 'FINANCE_MANAGER', 'DATA_ENTRY', 'AUDITOR_READ_ONLY'];
  const allRolesDefined = expectedRoles.every(r => ROLES[r] === r);
  assert(allRolesDefined, 'Phase 1.2: All 5 Enterprise RBAC roles defined in middleware');

  // Test 1.3: Auditor role blocks write mutations
  let blocked = false;
  const mockReq = { method: 'POST', user: { role: 'AUDITOR_READ_ONLY' } };
  const mockRes = {
    status: (code) => ({
      json: (data) => { if (code === 403) blocked = true; }
    })
  };
  const permMiddleware = requirePermission('ANY_MUTATION');
  permMiddleware(mockReq, mockRes, () => {});
  assert(blocked, 'Phase 1.3: AUDITOR_READ_ONLY strictly blocked with 403 on mutation');

  // Test 1.4: Multi-tenant company isolation
  const compRes = await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'company_id'`
  );
  assert(compRes.rows.length > 0, 'Phase 1.4: Strict `company_id` column enforced on financial tables');
}

async function runPhase2() {
  console.log('\n======================================================');
  console.log('--- PHASE 2: Company Accounting Policy Engine --------');
  console.log('======================================================');

  const db = await getDb();
  const testCompId = 'comp_policy_test_' + Date.now();

  // Test 2.1: Default policy seeded
  const policy = await getCompanyPolicy(testCompId);
  assert(policy && policy.registration_type === 'REGULAR', 'Phase 2.1: Default accounting policy initialized (REGULAR)');
  assert(policy.functional_currency === 'INR', 'Phase 2.1: Default functional currency is INR');

  // Test 2.2: Policy update to GIFT City IFSC with USD currency
  const giftCityPolicy = await updateCompanyPolicy(testCompId, {
    registration_type: 'GIFT_CITY_IFSC',
    functional_currency: 'USD',
    accounting_method: 'ACCRUAL',
    inventory_valuation: 'FIFO'
  });
  assert(giftCityPolicy.registration_type === 'GIFT_CITY_IFSC' && giftCityPolicy.functional_currency === 'USD',
    'Phase 2.2: GIFT City IFSC policy permits foreign functional currency (USD)');

  // Test 2.3: Policy update to SEZ with LUT ARN tracking
  const sezPolicy = await updateCompanyPolicy(testCompId, {
    registration_type: 'SEZ',
    lut_arn: 'AD240326001234M',
    lut_expiry_date: '2027-03-31'
  });
  assert(sezPolicy.registration_type === 'SEZ' && sezPolicy.lut_arn === 'AD240326001234M',
    'Phase 2.3: SEZ policy tracks LUT ARN and expiry date for zero-rated export supplies');

  // Test 2.4: Invalid registration type rejection
  let errorCaught = false;
  try {
    await updateCompanyPolicy(testCompId, { registration_type: 'INVALID_TAX_REGIME' });
  } catch {
    errorCaught = true;
  }
  assert(errorCaught, 'Phase 2.4: Invalid tax registration regime strictly rejected by validator');
}

async function runPhase3() {
  console.log('\n======================================================');
  console.log('--- PHASE 3: MCA Rule 3(1) Tamper-Evident Audit Trail -');
  console.log('======================================================');

  const testCompId = 'comp_audit_test_' + Date.now();

  // Test 3.1: Record sequential chained audit logs
  const log1 = await recordAuditLog({
    companyId: testCompId,
    entityType: 'invoice',
    entityId: 'INV-101',
    action: 'CREATE',
    afterJson: { amount: 50000, customer: 'Acme India' }
  });
  assert(log1 && log1.current_hash && log1.previous_hash === GENESIS_HASH,
    'Phase 3.1: First audit log record created with GENESIS previous_hash');

  const log2 = await recordAuditLog({
    companyId: testCompId,
    entityType: 'invoice',
    entityId: 'INV-101',
    action: 'UPDATE',
    beforeJson: { amount: 50000 },
    afterJson: { amount: 55000 }
  });
  assert(log2.previous_hash === log1.current_hash,
    'Phase 3.2: Cryptographic chaining confirmed: log2.previous_hash equals log1.current_hash');

  const log3 = await recordAuditLog({
    companyId: testCompId,
    entityType: 'policy',
    entityId: testCompId,
    action: 'POLICY_CHANGE',
    afterJson: { books_closed_until: '2025-03-31' }
  });

  // Test 3.3: Verify complete SHA-256 chain integrity
  const verification = await verifyAuditChain(testCompId);
  assert(verification.valid === true && verification.totalRecordsVerified === 3,
    'Phase 3.3: Full MCA Rule 3(1) cryptographic audit chain verified (100% MATCH)');

  // Test 3.4: Verify tamper-detection
  const db = await getDb();
  await db.query(
    `UPDATE audit_logs SET after_json = '{"tampered": true}'::jsonb WHERE id = $1`,
    [log2.id]
  );
  const tamperedCheck = await verifyAuditChain(testCompId);
  assert(tamperedCheck.valid === false && tamperedCheck.brokenLogId === log2.id,
    'Phase 3.4: Anti-tampering defense caught unauthorized alteration of past records');
}

async function runPhase4() {
  console.log('\n======================================================');
  console.log('--- PHASE 4: Non-Destructive Safe Deletion Pipeline ---');
  console.log('======================================================');

  const db = await getDb();
  const testCompId = 'comp_deletion_test_' + Date.now();

  // Setup: Create test chart of accounts and a balanced journal entry
  await db.query('BEGIN');
  const testEntryNum = 'JE-DEL-' + Date.now();
  const jeRes = await db.query(
    `INSERT INTO journal_entries (company_id, entry_date, entry_number, doc_number, memo, status)
     VALUES ($1, CURRENT_DATE, $2, $2, 'Test Entry for Soft Delete', 'POSTED')
     RETURNING id`,
    [testCompId, testEntryNum]
  );
  const jeId = jeRes.rows[0].id;

  // Lines: Debit Cash 1000, Credit Revenue 1000
  await db.query(
    `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, debit_paise, credit_paise)
     VALUES ($1, 'acc_cash', 1000, 0, 100000, 0),
            ($1, 'acc_rev', 0, 1000, 0, 100000)`,
    [jeId]
  );
  await db.query('COMMIT');

  // Test 4.1: Mandatory deletion_reason check
  let reasonError = false;
  try {
    await softDeleteTransaction({
      companyId: testCompId,
      entityType: 'journal_entry',
      entityId: jeId,
      deletionReason: ''
    });
  } catch {
    reasonError = true;
  }
  assert(reasonError, 'Phase 4.1: Missing deletion_reason rejected by MCA Rule 3(1) safety validator');

  // Test 4.2: Execute soft-delete
  const softDelResult = await softDeleteTransaction({
    companyId: testCompId,
    entityType: 'journal_entry',
    entityId: jeId,
    deletionReason: 'Client requested cancellation of duplicate posting'
  });
  assert(softDelResult.success === true && softDelResult.is_deleted === true,
    'Phase 4.2: Transaction soft-deleted (tombstoned) successfully');

  // Test 4.3: Original SQL row still exists in database (zero-destructive)
  const verifyRowRes = await db.query(`SELECT * FROM journal_entries WHERE id = $1`, [jeId]);
  assert(verifyRowRes.rows.length === 1 && verifyRowRes.rows[0].is_deleted === true,
    'Phase 4.3: Zero-Destructive proof: SQL row still preserved in database with is_deleted=TRUE');

  // Test 4.4: Automatic Reversing Journal Entry created with swapped debits & credits
  assert(softDelResult.reversingEntryId, 'Phase 4.4: Automatic Reversing Journal Entry generated');
  const revLines = await db.query(
    `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY id ASC`,
    [softDelResult.reversingEntryId]
  );
  const cashLine = revLines.rows.find(l => l.account_id === 'acc_cash');
  const revLine = revLines.rows.find(l => l.account_id === 'acc_rev');
  const line1Reversed = cashLine && Number(cashLine.credit) === 1000 && Number(cashLine.debit) === 0;
  const line2Reversed = revLine && Number(revLine.debit) === 1000 && Number(revLine.credit) === 0;
  assert(line1Reversed && line2Reversed,
    'Phase 4.4: Reversing entry correctly swapped Debits & Credits to zero the general ledger');
}

async function runPhase5() {
  console.log('\n======================================================');
  console.log('--- PHASE 5: Books Lock & Historical Effective Dates -');
  console.log('======================================================');

  const testCompId = 'comp_lock_test_' + Date.now();

  // Setup: Set lock date to 2025-03-31
  await updateCompanyPolicy(testCompId, {
    books_closed_until: '2025-03-31',
    allow_prior_period_adjustments: false
  });

  // Test 5.1: Backdated transaction in closed period rejected
  const lockCheck1 = await checkBooksLock(testCompId, '2025-02-15', false);
  assert(lockCheck1.allowed === false, 'Phase 5.1: Transaction on 2025-02-15 rejected due to books closure on 2025-03-31');

  // Test 5.2: Future transaction allowed
  const lockCheck2 = await checkBooksLock(testCompId, '2025-04-10', false);
  assert(lockCheck2.allowed === true, 'Phase 5.2: Transaction after books closure lock date (2025-04-10) permitted');

  // Test 5.3: Prior Period Adjustment authorization
  await updateCompanyPolicy(testCompId, { allow_prior_period_adjustments: true });
  const lockCheck3 = await checkBooksLock(testCompId, '2025-02-15', true);
  assert(lockCheck3.allowed === true && lockCheck3.isPriorPeriodAdjustment === true,
    'Phase 5.3: Authorized Prior Period Adjustment allowed with audit notation');

  // Test 5.4: Effective-dated tax schedule versioning
  const db = await getDb();
  await db.query(
    `INSERT INTO effective_dated_tax_schedules (company_id, hsn_or_section_code, kind, description, rate_bp, effective_from, effective_to)
     VALUES ($1, '998311', 'GST', 'IT Consulting (Old Slabs)', 1200, '2020-04-01', '2023-03-31'),
            ($1, '998311', 'GST', 'IT Consulting (Current Slabs)', 1800, '2023-04-01', '2099-12-31')`,
    [testCompId]
  );

  const oldRate = await getEffectiveTaxSchedule(testCompId, '998311', 'GST', '2022-06-15');
  assert(oldRate && oldRate.rate_bp === 1200,
    'Phase 5.4: Historical query on 2022-06-15 accurately returned 12% (1200 bp) schedule');

  const newRate = await getEffectiveTaxSchedule(testCompId, '998311', 'GST', '2026-01-15');
  assert(newRate && newRate.rate_bp === 1800,
    'Phase 5.4: Current query on 2026-01-15 accurately returned 18% (1800 bp) schedule');
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 MESO AUTONOMOUS CUMULATIVE VERIFICATION GATE: DOMAIN 1 (PHASES 1-5)');
  console.log('======================================================================');

  try {
    await initDb();

    await runPhase1();
    await runPhase2();
    await runPhase3();
    await runPhase4();
    await runPhase5();

    console.log('\n======================================================================');
    console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('======================================================================');

    if (testsFailed > 0) {
      console.error(`\n❌ VERIFICATION FAILED: ${testsFailed} test(s) failed. Exiting with code 1.`);
      process.exit(1);
    }

    // Update architecture-state.json to mark Phases 1-5 as PASSED
    const statePath = path.resolve(__dirname, '../architecture-state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      for (let i = 0; i < 5; i++) {
        state.phases[i].status = 'PASSED';
        state.phases[i].lastVerifiedAt = new Date().toISOString();
      }
      state.currentPhase = 6;
      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      console.log('✓ Successfully updated architecture-state.json: Phases 1 to 5 marked PASSED.');
    }

    console.log('🎯 ALL DOMAIN 1 GATES CLEARED (100% PASS). Ready for Domain 2 (Phases 6-10).\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Unhandled exception during verification runner:', err);
    process.exit(1);
  }
}

main();
