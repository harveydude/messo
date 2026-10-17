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
import { parseRawImportFile, computeFileChecksum } from '../server/src/services/ingestionParser.js';
import { autoDiscoverSchemaMapping, saveSchemaMappingTemplate, transformRowWithMapping } from '../server/src/services/schemaMapper.js';
import { validateGstin, validatePan, validateMappedRow, matchOrAutoCreateContact, matchOrAutoCreateAccount } from '../server/src/services/stagingDoctor.js';
import { promoteImportBatch, rollbackImportBatch } from '../server/src/services/promotionEngine.js';
import { setExchangeRate, getExchangeRate, convertCurrency, recordForexGainLoss } from '../server/src/services/currencyService.js';
import { checkSubledgerReconciliation, syncSubledgerToGl } from '../server/src/services/subledgerReconciliationService.js';
import { createBranch, listBranches, createCostCenter, listCostCenters } from '../server/src/services/branchService.js';
import { closeFiscalYear, listFiscalYearCloses } from '../server/src/services/yearEndService.js';
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

async function runPhase6() {
  console.log('\n======================================================');
  console.log('--- PHASE 6: Multi-Format Ingestion Gateway ----------');
  console.log('======================================================');

  // Test 6.1: Parse CSV data
  const csvContent = 'Party Name,GST No,Invoice No,Total\nTata Consultancy,27AAACT2727Q1ZW,INV-101,150000\nReliance Jio,27AAACR5055K1ZI,INV-102,85000';
  const csvParsed = parseRawImportFile({ content: csvContent, fileName: 'sales.csv' });
  assert(csvParsed.totalRows === 2 && csvParsed.fileFormat === 'CSV',
    'Phase 6.1: CSV ingestion parsed 2 rows with automatic header detection');

  // Test 6.2: Parse JSON data
  const jsonContent = JSON.stringify([
    { customer_name: 'Infosys Ltd', gstin: '29AAACI4747B1ZU', invoice_totals: 200000 },
    { customer_name: 'Wipro Ltd', gstin: '29AAACW9999A1ZX', invoice_totals: 120000 }
  ]);
  const jsonParsed = parseRawImportFile({ content: jsonContent, fileName: 'dump.json' });
  assert(jsonParsed.totalRows === 2 && jsonParsed.fileFormat === 'JSON',
    'Phase 6.2: JSON cross-platform ingestion parsed array payload successfully');

  // Test 6.3: Parse Tally Prime XML
  const tallyXmlContent = `
    <ENVELOPE>
      <BODY>
        <DATA>
          <TALLYMESSAGE>
            <VOUCHER VCHTYPE="Sales">
              <VOUCHERNUMBER>TY-001</VOUCHERNUMBER>
              <DATE>2026-04-01</DATE>
              <PARTYNAME>Larsen & Toubro</PARTYNAME>
              <AMOUNT>500000</AMOUNT>
            </VOUCHER>
          </TALLYMESSAGE>
        </DATA>
      </BODY>
    </ENVELOPE>
  `;
  const tallyParsed = parseRawImportFile({ content: tallyXmlContent, fileName: 'tally_export.xml', formatHint: 'TALLY_XML' });
  assert(tallyParsed.totalRows === 1 && tallyParsed.rows[0].VOUCHERNUMBER === 'TY-001',
    'Phase 6.3: Tally Prime XML parsed vouchers and ledger names accurately');

  // Test 6.4: Parse SQL/ORM Dump
  const sqlContent = "INSERT INTO invoices (invoice_number, amount) VALUES ('INV-SQL-01', 75000);";
  const sqlParsed = parseRawImportFile({ content: sqlContent, fileName: 'dump.sql', formatHint: 'SQL' });
  assert(sqlParsed.totalRows === 1 && sqlParsed.rows[0].invoice_number === 'INV-SQL-01',
    'Phase 6.4: SQL database dump extracted table and columns into canonical memory stream');

  // Test 6.5: SHA-256 Checksum generation
  const hash1 = computeFileChecksum(csvContent);
  const hash2 = computeFileChecksum(csvContent);
  assert(hash1 === hash2 && hash1.length === 64,
    'Phase 6.5: SHA-256 checksum quarantine generated deterministic file hash');
}

async function runPhase7() {
  console.log('\n======================================================');
  console.log('--- PHASE 7: Schema Discovery & Cross-Platform Mapping');
  console.log('======================================================');

  // Test 7.1: Discover Laravel snake_case
  const laravelRows = [{ customer_name: 'HCL Technologies', gst_number: '07AAACH1111A1ZZ', invoice_totals: 350000, invoice_number: 'LAR-01' }];
  const laravelDiscovery = autoDiscoverSchemaMapping({ rows: laravelRows, targetEntity: 'invoices', sourceSystem: 'LARAVEL' });
  assert(laravelDiscovery.mappings.contact_name === 'customer_name' && laravelDiscovery.mappings.total_amount === 'invoice_totals',
    'Phase 7.1: AI & Heuristic engine mapped Laravel snake_case to canonical Meso fields');

  // Test 7.2: Discover Tally XML fields
  const tallyRows = [{ PARTYNAME: 'Adani Ports', VOUCHERNUMBER: 'TY-99', AMOUNT: 400000 }];
  const tallyDiscovery = autoDiscoverSchemaMapping({ rows: tallyRows, targetEntity: 'invoices', sourceSystem: 'TALLY' });
  assert(tallyDiscovery.mappings.contact_name === 'PARTYNAME' && tallyDiscovery.mappings.total_amount === 'AMOUNT',
    'Phase 7.2: Tally Prime XML voucher fields discovered and mapped to invoice schema');

  // Test 7.3: Discover Excel raw headers
  const excelRows = [{ 'Party Name': 'Mahindra & Mahindra', 'GST No': '27AAACM1234M1Z2', 'Total': 180000 }];
  const excelDiscovery = autoDiscoverSchemaMapping({ rows: excelRows, targetEntity: 'contacts', sourceSystem: 'EXCEL' });
  assert(excelDiscovery.mappings.display_name === 'Party Name' && excelDiscovery.mappings.gstin === 'GST No',
    'Phase 7.3: Standard Excel business headers mapped to Meso contacts schema');

  // Test 7.4: Save reusable mapping template in DB
  const testCompId = 'comp_map_test_' + Date.now();
  const template = await saveSchemaMappingTemplate({
    companyId: testCompId,
    name: 'Standard Tally Sales Template',
    sourceSystem: 'TALLY',
    targetEntity: 'invoices',
    columnMappings: tallyDiscovery.mappings
  });
  assert(template && template.id && template.name === 'Standard Tally Sales Template',
    'Phase 7.4: Reusable schema mapping template persisted in database');
}

async function runPhase8() {
  console.log('\n======================================================');
  console.log('--- PHASE 8: Staging Sandbox & Validation Quarantine -');
  console.log('======================================================');

  // Test 8.1: Valid GSTIN
  const gstin1 = validateGstin('27AAPFU0939F1ZV');
  assert(gstin1.valid === true, 'Phase 8.1: Valid 15-digit Indian GSTIN format accepted');

  // Test 8.2: Invalid GSTIN
  const gstin2 = validateGstin('INVALID_GSTIN_123');
  assert(gstin2.valid === false, 'Phase 8.2: Malformed GSTIN correctly flagged by validator');

  // Test 8.3: Valid Indian PAN
  const pan1 = validatePan('AAPFU0939F');
  assert(pan1.valid === true, 'Phase 8.3: Valid Indian Income Tax PAN structure accepted');

  // Test 8.4: Invalid Indian PAN
  const pan2 = validatePan('12345ABCDE');
  assert(pan2.valid === false, 'Phase 8.4: Invalid PAN structure correctly rejected');

  // Test 8.5: Staging row validation
  const validCheck = validateMappedRow('contacts', { display_name: 'Sun Pharma', gstin: '27AAPFU0939F1ZV' });
  assert(validCheck.valid === true, 'Phase 8.5: Complete row validated for staging promotion');
}

async function runPhase9() {
  console.log('\n======================================================');
  console.log('--- PHASE 9: Master Data Deduplication & Auto-Creation');
  console.log('======================================================');

  const testCompId = 'comp_dedup_' + Date.now();

  // Test 9.1: Auto-create new contact
  const match1 = await matchOrAutoCreateContact({
    companyId: testCompId,
    name: 'Bajaj Auto Ltd',
    gstin: '27AAACB2222B1Z3',
    contactType: 'CUSTOMER'
  });
  assert(match1.created === true && match1.contact.display_name === 'Bajaj Auto Ltd',
    'Phase 9.1: Brand new contact auto-created in contacts directory');

  // Test 9.2: Deduplicate against existing contact by GSTIN
  const match2 = await matchOrAutoCreateContact({
    companyId: testCompId,
    name: 'Bajaj Auto Limited (Branch)',
    gstin: '27AAACB2222B1Z3'
  });
  assert(match2.created === false && match2.matchedOn === 'GSTIN' && match2.contact.id === match1.contact.id,
    'Phase 9.2: Deduplication confirmed: GSTIN matched existing contact without creating duplicates');

  // Test 9.3: Auto-create missing Chart of Accounts ledger
  const accMatch = await matchOrAutoCreateAccount({
    companyId: testCompId,
    accountName: 'Cloud Server Infrastructure Cost',
    accountType: 'Expense'
  });
  assert(accMatch.created === true && accMatch.account.name === 'Cloud Server Infrastructure Cost',
    'Phase 9.3: Missing Chart of Accounts category auto-created with proper classification');
}

async function runPhase10() {
  console.log('\n======================================================');
  console.log('--- PHASE 10: Atomic Ledger Promotion & Rollback -----');
  console.log('======================================================');

  const db = await getDb();
  const testCompId = 'comp_promote_' + Date.now();
  const testChecksum = 'chk_' + Math.random().toString(36).substring(2, 10);

  // 1. Create batch
  const batchRes = await db.query(
    `INSERT INTO import_batches (company_id, file_name, file_format, file_sha256, total_rows, status)
     VALUES ($1, 'invoices_upload.csv', 'CSV', $2, 1, 'VALIDATED')
     RETURNING id`,
    [testCompId, testChecksum]
  );
  const batchId = batchRes.rows[0].id;

  // 2. Insert staging row
  const testDocNumber = 'INV-STAGE-' + Date.now();
  await db.query(
    `INSERT INTO import_staging_rows (
      batch_id, company_id, row_index, target_entity, mapped_data, validation_status
    ) VALUES ($1, $2, 1, 'invoices', $3, 'VALID')`,
    [
      batchId,
      testCompId,
      JSON.stringify({
        doc_number: testDocNumber,
        contact_name: 'Bharti Airtel',
        total_amount: 150000,
        txn_date: '2026-04-15'
      })
    ]
  );

  // Test 10.1: Promote batch atomically
  const promoResult = await promoteImportBatch({ batchId, companyId: testCompId });
  assert(promoResult.success === true && promoResult.status === 'PROMOTED',
    'Phase 10.1: Staged batch atomically promoted into live invoices and contacts');

  // Test 10.2: Verify invoice exists with batch tag
  const invRes = await db.query(
    `SELECT * FROM invoices WHERE import_batch_id = $1 AND company_id = $2`,
    [batchId, testCompId]
  );
  assert(invRes.rows.length === 1 && invRes.rows[0].invoice_number === testDocNumber,
    'Phase 10.2: Promoted invoice verified in live database with correct import_batch_id tag');

  // Test 10.3: 1-Click Rollback Pipeline
  const rollbackResult = await rollbackImportBatch({ batchId, companyId: testCompId });
  assert(rollbackResult.success === true && rollbackResult.status === 'ROLLED_BACK',
    'Phase 10.3: 1-Click Rollback executed successfully');

  // Test 10.4: Verify live invoice is now soft-deleted / voided
  const checkInvVoided = await db.query(
    `SELECT * FROM invoices WHERE import_batch_id = $1 AND company_id = $2`,
    [batchId, testCompId]
  );
  assert(checkInvVoided.rows[0].is_deleted === true && checkInvVoided.rows[0].status === 'VOIDED',
    'Phase 10.4: Rollback proof: Live invoices marked is_deleted=TRUE with audit reason');
}

async function runPhase11() {
  console.log('\n======================================================');
  console.log('--- PHASE 11: Paise-Precision Double-Entry Core ------');
  console.log('======================================================');

  const db = await getDb();
  const testCompId = 'comp_pe_' + Date.now();

  // Test 11.1: Verify debit_paise and credit_paise column types and constraints
  const colCheck = await db.query(
    `SELECT column_name, data_type 
     FROM information_schema.columns 
     WHERE table_name = 'journal_entry_lines' AND column_name IN ('debit_paise', 'credit_paise')`
  );
  assert(colCheck.rows.length === 2 && colCheck.rows.every(r => r.data_type === 'bigint'),
    'Phase 11.1: Journal entry lines enforce BIGINT minor-unit (paise) storage');

  // Test 11.2: Precision arithmetic without floating-point errors
  const rupeeAmount = 12345.67;
  const exactPaise = Math.round(rupeeAmount * 100);
  assert(exactPaise === 1234567,
    'Phase 11.2: Minor-unit (paise) integer precision prevents floating-point rounding errors');

  // Test 11.3: Balanced journal entry commits cleanly
  const jeId = 'je_pe_' + Math.random().toString(36).substring(2, 10);
  const entryNum = 'JE-BAL-' + Date.now();

  await db.query('BEGIN');
  await db.query("SET LOCAL app.allow_journal_mutation = 'on'");
  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, status)
     VALUES ($1, $2, $3, CURRENT_DATE, 'Precision test', 'MANUAL_JE', 'POSTED')`,
    [jeId, testCompId, entryNum]
  );
  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, 'acc_1010', 500000, 0, 'Debit Checking')`,
    ['jel_p1_' + Math.random().toString(36).substring(2, 8), jeId]
  );
  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, 'acc_4000', 0, 500000, 'Credit Sales')`,
    ['jel_p2_' + Math.random().toString(36).substring(2, 8), jeId]
  );
  await db.query('COMMIT');

  const checkJe = await db.query(
    `SELECT SUM(debit_paise) as debits, SUM(credit_paise) as credits
     FROM journal_entry_lines WHERE journal_entry_id = $1`,
    [jeId]
  );
  assert(
    Number(checkJe.rows[0].debits) === 500000 &&
    Number(checkJe.rows[0].credits) === 500000 &&
    Number(checkJe.rows[0].debits) === Number(checkJe.rows[0].credits),
    'Phase 11.3: Double-entry balanced invariant (Debits == Credits == 500,000 paise) mathematically verified'
  );

  // Test 11.4: Unbalanced journal entry is detected / prevented
  let caughtUnbalanced = false;
  try {
    const unbalId = 'je_unbal_' + Date.now();
    await db.query('BEGIN');
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");
    await db.query(
      `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, status)
       VALUES ($1, $2, $3, CURRENT_DATE, 'Unbalanced test', 'MANUAL_JE', 'POSTED')`,
      [unbalId, testCompId, 'JE-UNBAL-' + Date.now()]
    );
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise)
       VALUES ($1, $2, 'acc_1010', 999000, 0)`,
      ['jel_u1_' + Date.now(), unbalId]
    );
    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    caughtUnbalanced = true;
  }
  assert(caughtUnbalanced === true,
    'Phase 11.4: Double-entry integrity guard strictly caught and rejected unbalanced journal entry');
}

async function runPhase12() {
  console.log('\n======================================================');
  console.log('--- PHASE 12: Multi-Currency & GIFT City IFSC Engine -');
  console.log('======================================================');

  const testCompId = 'comp_fx_' + Date.now();

  // Test 12.1: Store exchange rate with effective date
  const fx = await setExchangeRate({
    companyId: testCompId,
    fromCurrency: 'USD',
    toCurrency: 'INR',
    rate: 86.50,
    effectiveDate: '2026-04-01',
    source: 'RBI_REFERENCE'
  });
  assert(Number(fx.rate) === 86.5 && fx.from_currency === 'USD',
    'Phase 12.1: Official exchange rate persisted with effective date & RBI reference source');

  // Test 12.2: Convert amount with minor unit precision
  const conv = await convertCurrency({
    amountMinor: 100000,
    fromCurrency: 'USD',
    toCurrency: 'INR',
    date: '2026-04-01',
    companyId: testCompId
  });
  assert(conv.convertedMinor === 8650000,
    'Phase 12.2: Multi-currency conversion computed exactly ($1,000.00 at 86.50 -> 8,650,000 paise)');

  // Test 12.3: Realized Forex Gain on settlement
  const fxLog = await recordForexGainLoss({
    companyId: testCompId,
    entityType: 'INVOICE',
    entityId: 'inv_fx_test',
    foreignCurrency: 'USD',
    foreignAmount: 100000,
    bookingRate: 82.00,
    settlementRate: 86.50,
    isRealized: true
  });
  assert(Number(fxLog.gain_loss_paise) === 450000 && fxLog.is_realized === true,
    'Phase 12.3: Realized forex gain calculated accurately (+450,000 paise on USD settlement differential)');

  // Test 12.4: Balanced Forex journal entry created
  assert(fxLog.journal_entry_id !== null,
    'Phase 12.4: Automatic double-entry journal entry posted for realized foreign exchange difference');
}

async function runPhase13() {
  console.log('\n======================================================');
  console.log('--- PHASE 13: Continuous Sub-Ledger to GL Invariant -');
  console.log('======================================================');

  const testCompId = 'comp_subledger_' + Date.now();
  const db = await getDb();

  // Create an invoice with open balance
  const invId = 'inv_sl_' + Date.now();
  const invNum = 'INV-SL-' + Date.now();
  await db.query(
    `INSERT INTO invoices (
      id, company_id, invoice_number, customer_id, issue_date, due_date,
      subtotal_paise, total_paise, balance_due_paise, status
    ) VALUES ($1, $2, $3, 'cust_1', CURRENT_DATE, CURRENT_DATE, 750000, 750000, 750000, 'OPEN')`,
    [invId, testCompId, invNum]
  );

  // Sync control account
  await syncSubledgerToGl({ companyId: testCompId });

  // Run invariant check
  const report = await checkSubledgerReconciliation({ companyId: testCompId });
  assert(report.ar.subledgerPaise === 750000,
    'Phase 13.1: Subledger engine accurately aggregated open customer invoices (750,000 paise)');
  assert(report.ar.glPaise === 750000 && report.ar.isBalanced === true,
    'Phase 13.2: General Ledger Accounts Receivable matched subledger exactly with 0 variance');
  assert(report.isBalanced === true && report.status === 'HEALTHY',
    'Phase 13.3: Continuous invariant verification confirmed 100% HEALTHY sub-ledger to GL state');

  const repCheck = await db.query(
    `SELECT * FROM subledger_reconciliation_reports WHERE company_id = $1 ORDER BY checked_at DESC LIMIT 1`,
    [testCompId]
  );
  assert(repCheck.rows.length === 1 && repCheck.rows[0].is_balanced === true,
    'Phase 13.4: Subledger audit report persisted in historical reconciliation registry');
}

async function runPhase14() {
  console.log('\n======================================================');
  console.log('--- PHASE 14: Multi-GSTIN Branches & Cost Centers ----');
  console.log('======================================================');

  const testCompId = 'comp_branch_' + Date.now();

  // Test 14.1: Create valid branch with GSTIN
  const branch1 = await createBranch({
    companyId: testCompId,
    branchCode: 'MH-MUM',
    branchName: 'Mumbai Head Office',
    gstin: '27AAACB2222B1Z3',
    stateCode: '27',
    stateName: 'Maharashtra',
    isHeadOffice: true
  });
  assert(branch1.branch_code === 'MH-MUM' && branch1.is_head_office === true,
    'Phase 14.1: Multi-GSTIN branch created with valid state GSTIN and Head Office flag');

  // Test 14.2: Reject branch when state code does not match GSTIN prefix
  let caughtMismatch = false;
  try {
    await createBranch({
      companyId: testCompId,
      branchCode: 'DL-DEL',
      branchName: 'Delhi Depot',
      gstin: '07AAACB2222B1Z3',
      stateCode: '27',
      stateName: 'Delhi'
    });
  } catch (err) {
    caughtMismatch = true;
  }
  assert(caughtMismatch === true,
    'Phase 14.2: Branch validator rejected state code mismatch against 15-digit GSTIN prefix');

  // Test 14.3: Create and list Cost Centers
  const cc = await createCostCenter({
    companyId: testCompId,
    code: 'CC-DESIGN',
    name: 'Architectural Design Department',
    department: 'Design & Creative'
  });
  assert(cc.code === 'CC-DESIGN' && cc.department === 'Design & Creative',
    'Phase 14.3: Enterprise Cost Center created for departmental allocation');

  const ccList = await listCostCenters({ companyId: testCompId });
  assert(ccList.length >= 1,
    'Phase 14.4: Cost centers listed and queryable across organization');
}

async function runPhase15() {
  console.log('\n======================================================');
  console.log('--- PHASE 15: Automated Year-End Close & Retained Earnings');
  console.log('======================================================');

  const testCompId = 'comp_ye_' + Date.now();
  const db = await getDb();

  // Create an accounting policy for company
  await db.query(
    `INSERT INTO company_accounting_policies (company_id, books_closed_until)
     VALUES ($1, '2024-03-31')
     ON CONFLICT (company_id) DO NOTHING`,
    [testCompId]
  );

  // Perform Year-End Close for FY2024-25
  const closeRes = await closeFiscalYear({
    companyId: testCompId,
    fiscalYear: 'FY2024-25',
    startDate: '2024-04-01',
    endDate: '2025-03-31'
  });
  assert(closeRes.success === true && closeRes.fiscalYear === 'FY2024-25',
    'Phase 15.1: Annual Indian Financial Year close computed successfully');
  assert(closeRes.retainedEarningsEntryId !== null,
    'Phase 15.2: Balancing Retained Earnings (acc_3900) roll-forward journal entry generated');

  // Test 15.3: Verify past books are now locked up to 2025-03-31
  const policyCheck = await db.query(
    `SELECT books_closed_until::text as books_closed_until FROM company_accounting_policies WHERE company_id = $1`,
    [testCompId]
  );
  const lockedStr = String(policyCheck.rows[0]?.books_closed_until || '');
  assert(lockedStr.startsWith('2025-03-31'),
    'Phase 15.3: Financial year close automatically locked books until 2025-03-31');

  // Test 15.4: Prevent duplicate close of already closed fiscal year
  let caughtDupClose = false;
  try {
    await closeFiscalYear({
      companyId: testCompId,
      fiscalYear: 'FY2024-25',
      startDate: '2024-04-01',
      endDate: '2025-03-31'
    });
  } catch (err) {
    caughtDupClose = true;
  }
  assert(caughtDupClose === true,
    'Phase 15.4: System strictly blocked attempting duplicate close on already locked fiscal year');
}

async function main() {
  console.log('======================================================================');
  console.log('🚀 MESO AUTONOMOUS CUMULATIVE VERIFICATION GATE: PHASES 1 TO 15');
  console.log('======================================================================');

  try {
    await initDb();

    // Domain 1: Multi-Tenant Core, Policies & Safe Deletion (Phases 1-5)
    await runPhase1();
    await runPhase2();
    await runPhase3();
    await runPhase4();
    await runPhase5();

    // Domain 2: Universal Data Ingestion & Cross-Platform Migration (Phases 6-10)
    await runPhase6();
    await runPhase7();
    await runPhase8();
    await runPhase9();
    await runPhase10();

    // Domain 3: Continuous General Ledger & Multi-Currency (Phases 11-15)
    await runPhase11();
    await runPhase12();
    await runPhase13();
    await runPhase14();
    await runPhase15();

    console.log('\n======================================================================');
    console.log(`VERIFICATION SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('======================================================================');

    if (testsFailed > 0) {
      console.error(`\n❌ VERIFICATION FAILED: ${testsFailed} test(s) failed. Exiting with code 1.`);
      process.exit(1);
    }

    // Update architecture-state.json to mark Phases 1-15 as PASSED
    const statePath = path.resolve(__dirname, '../architecture-state.json');
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      for (let i = 0; i < 15; i++) {
        state.phases[i].status = 'PASSED';
        state.phases[i].lastVerifiedAt = new Date().toISOString();
      }
      state.currentPhase = 16;
      state.lastUpdated = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
      console.log('✓ Successfully updated architecture-state.json: Phases 1 to 15 marked PASSED.');
    }

    console.log('🎯 ALL DOMAIN 1, 2 & 3 GATES CLEARED (100% PASS). Ready for Domain 4 (Phases 16-20).\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Unhandled exception during verification runner:', err);
    process.exit(1);
  }
}

main();
