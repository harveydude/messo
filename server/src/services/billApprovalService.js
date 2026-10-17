/**
 * Meso Phase 33: Vendor Bills, Recurring Expenses & Multi-Tier Approvals
 * Multi-tier approval routing based on statutory amount thresholds before posting to Accounts Payable.
 * Tier 1: <= Rs. 50,000 (Manager)
 * Tier 2: Rs. 50,001 - Rs. 5,00,000 (Controller)
 * Tier 3: > Rs. 5,00,000 (CFO / Owner)
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export const APPROVAL_TIERS = {
  TIER_1: 'TIER_1', // <= Rs. 50,000 (5,000,000 paise)
  TIER_2: 'TIER_2', // Rs. 50,001 to Rs. 5,00,000 (50,000,000 paise)
  TIER_3: 'TIER_3'  // > Rs. 5,00,000
};

export function determineApprovalTier(amountPaise) {
  const amt = BigInt(amountPaise || 0);
  if (amt <= 5000000n) {
    return APPROVAL_TIERS.TIER_1;
  } else if (amt <= 50000000n) {
    return APPROVAL_TIERS.TIER_2;
  } else {
    return APPROVAL_TIERS.TIER_3;
  }
}

export function canUserApproveTier(role, tier) {
  const normalized = (role || '').toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'OWNER') return true;

  if (tier === APPROVAL_TIERS.TIER_1) {
    return ['MANAGER', 'FINANCE_MANAGER', 'CONTROLLER', 'FINANCE_CONTROLLER', 'CFO', 'OWNER', 'ADMIN'].includes(normalized);
  }
  if (tier === APPROVAL_TIERS.TIER_2) {
    return ['CONTROLLER', 'FINANCE_CONTROLLER', 'CFO', 'OWNER', 'ADMIN'].includes(normalized);
  }
  if (tier === APPROVAL_TIERS.TIER_3) {
    return ['CFO', 'OWNER', 'ADMIN'].includes(normalized);
  }
  return false;
}

export async function submitBillForApproval({
  billId,
  companyId = 'comp_1',
  user = { id: 'usr_1', role: 'ACCOUNTANT' }
}) {
  const db = await getDb();

  const billRes = await db.query(
    `SELECT * FROM bills WHERE id = $1 AND company_id = $2`,
    [billId, companyId]
  );
  if (billRes.rows.length === 0) throw new Error(`Bill ${billId} not found`);
  const bill = billRes.rows[0];

  const tier = determineApprovalTier(bill.amount_paise);

  await db.query(
    `UPDATE bills 
     SET approval_tier = $1, approval_status = 'PENDING_APPROVAL' 
     WHERE id = $2`,
    [tier, billId]
  );

  await db.query(
    `INSERT INTO bill_approval_audit (
      bill_id, company_id, action, user_id, user_role, tier, comments
    ) VALUES ($1, $2, 'SUBMIT', $3, $4, $5, 'Submitted for multi-tier approval')`,
    [billId, companyId, user.id, user.role, tier]
  );

  return {
    success: true,
    billId,
    tier,
    status: 'PENDING_APPROVAL'
  };
}

export async function approveBill({
  billId,
  companyId = 'comp_1',
  comments = 'Approved for payment',
  user = { id: 'usr_1', role: 'FINANCE_CONTROLLER' }
}) {
  const db = await getDb();

  const billRes = await db.query(
    `SELECT * FROM bills WHERE id = $1 AND company_id = $2`,
    [billId, companyId]
  );
  if (billRes.rows.length === 0) throw new Error(`Bill ${billId} not found`);
  const bill = billRes.rows[0];

  const tier = bill.approval_tier || determineApprovalTier(bill.amount_paise);

  // Check authorization
  if (!canUserApproveTier(user.role, tier)) {
    throw new Error(`User with role ${user.role} is not authorized to approve ${tier} bills (requires higher authority)`);
  }

  const totalPaise = BigInt(bill.amount_paise || 0);
  const subtotalPaise = BigInt(bill.subtotal_paise || totalPaise);
  const taxPaise = BigInt(bill.tax_paise || (totalPaise - subtotalPaise));
  const cgstPaise = BigInt(bill.cgst_paise || (taxPaise / 2n));
  const sgstPaise = BigInt(bill.sgst_paise || (taxPaise - cgstPaise));

  const jeId = 'je_bill_appr_' + Date.now();

  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // Update bill
    await db.query(
      `UPDATE bills 
       SET approval_status = 'APPROVED', approved_by = $1, approved_at = NOW() 
       WHERE id = $2`,
      [user.id, billId]
    );

    // Record audit
    await db.query(
      `INSERT INTO bill_approval_audit (
        bill_id, company_id, action, user_id, user_role, tier, comments
      ) VALUES ($1, $2, 'APPROVE', $3, $4, $5, $6)`,
      [billId, companyId, user.id, user.role, tier, comments]
    );

    // Post Double-Entry Journal Entry:
    // Debit Expense (acc_5000), Debit ITC CGST (acc_1300), Debit ITC SGST (acc_1310), Credit Accounts Payable (acc_2000)
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'VENDOR_BILL', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-BILL-' + bill.bill_number,
        bill.bill_date,
        `Approved Vendor Bill ${bill.bill_number} posted to Accounts Payable`,
        billId
      ]
    );

    // Ensure accounts exist
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_5000', $1, '5000', 'Cost of Goods Sold / Purchases', 'PROFIT_AND_LOSS', 'COGS') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1300', $1, '1300', 'Input CGST (ITC)', 'BALANCE_SHEET', 'CURRENT_ASSET') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1310', $1, '1310', 'Input SGST (ITC)', 'BALANCE_SHEET', 'CURRENT_ASSET') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2000', $1, '2000', 'Accounts Payable', 'BALANCE_SHEET', 'ACCOUNTS_PAYABLE') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit Expense (subtotal)
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_5000', $3, 0, 'Purchase expense / inventory cost')`,
      ['jel_b_exp_' + Date.now(), jeId, subtotalPaise.toString()]
    );

    // Debit ITC CGST
    if (cgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_1300', $3, 0, 'Eligible Input CGST Credit')`,
        ['jel_b_cgst_' + Date.now(), jeId, cgstPaise.toString()]
      );
    }

    // Debit ITC SGST
    if (sgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_1310', $3, 0, 'Eligible Input SGST Credit')`,
        ['jel_b_sgst_' + Date.now(), jeId, sgstPaise.toString()]
      );
    }

    // Credit Accounts Payable
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2000', 0, $3, 'Accounts Payable liability to vendor')`,
      ['jel_b_ap_' + Date.now(), jeId, totalPaise.toString()]
    );

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'bill',
    entityId: billId,
    action: 'APPROVE',
    afterJson: { billNumber: bill.bill_number, tier, approvedBy: user.id, totalPaise: totalPaise.toString() }
  });

  return {
    success: true,
    billId,
    tier,
    approvalStatus: 'APPROVED',
    journalEntryId: jeId
  };
}

export async function rejectBill({
  billId,
  companyId = 'comp_1',
  reason = 'Incorrect rate or quantity',
  user = { id: 'usr_1', role: 'FINANCE_CONTROLLER' }
}) {
  const db = await getDb();

  const billRes = await db.query(`SELECT * FROM bills WHERE id = $1 AND company_id = $2`, [billId, companyId]);
  if (billRes.rows.length === 0) throw new Error(`Bill ${billId} not found`);
  const bill = billRes.rows[0];

  const tier = bill.approval_tier || determineApprovalTier(bill.amount_paise);

  await db.query(
    `UPDATE bills SET approval_status = 'REJECTED' WHERE id = $1`,
    [billId]
  );

  await db.query(
    `INSERT INTO bill_approval_audit (
      bill_id, company_id, action, user_id, user_role, tier, comments
    ) VALUES ($1, $2, 'REJECT', $3, $4, $5, $6)`,
    [billId, companyId, user.id, user.role, tier, reason]
  );

  return {
    success: true,
    billId,
    approvalStatus: 'REJECTED'
  };
}

export async function createRecurringBillTemplate({
  companyId = 'comp_1',
  vendorId,
  templateName,
  frequency = 'MONTHLY',
  amountPaise,
  categoryAccountId = 'acc_5000',
  nextRunDate = new Date().toISOString().slice(0, 10),
  user = { id: 'usr_1', role: 'ACCOUNTANT' }
}) {
  const db = await getDb();
  const name = templateName || `Recurring Bill - ${frequency}`;

  const res = await db.query(
    `INSERT INTO recurring_bill_templates (
      company_id, vendor_id, template_name, frequency, amount_paise,
      category_account_id, next_run_date, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
    RETURNING *`,
    [companyId, vendorId, name, frequency, amountPaise.toString(), categoryAccountId, nextRunDate]
  );

  return res.rows[0];
}

export async function processRecurringBillTemplates({ companyId = 'comp_1', asOfDate = new Date().toISOString().slice(0, 10) }) {
  const db = await getDb();

  const templatesRes = await db.query(
    `SELECT * FROM recurring_bill_templates 
     WHERE company_id = $1 AND is_active = true AND next_run_date <= $2`,
    [companyId, asOfDate]
  );

  const templates = templatesRes.rows || [];
  const generatedBills = [];

  for (const tpl of templates) {
    const billId = 'bill_rec_' + Date.now() + '_' + Math.floor(Math.random() * 100);
    const billNumber = `REC-${Date.now().toString().slice(-4)}`;
    const amt = BigInt(tpl.amount_paise);
    const subtotal = (amt * 10000n) / 11800n;
    const tax = amt - subtotal;
    const cgst = tax / 2n;
    const sgst = tax - cgst;

    const bRes = await db.query(
      `INSERT INTO bills (
        id, company_id, bill_number, vendor_id, bill_date, due_date,
        status, amount_paise, open_balance_paise, subtotal_paise, tax_paise,
        cgst_paise, sgst_paise, is_recurring, recurring_rule_id, notes
      ) VALUES ($1, $2, $3, $4, $5, $5::date + 30, 'UNPAID', $6, $6, $7, $8, $9, $10, true, $11, 'Generated from Recurring Template')
      RETURNING *`,
      [
        billId,
        companyId,
        billNumber,
        tpl.vendor_id,
        asOfDate,
        amt.toString(),
        subtotal.toString(),
        tax.toString(),
        cgst.toString(),
        sgst.toString(),
        tpl.id
      ]
    );

    // Advance next_run_date
    const nextDate = new Date(tpl.next_run_date);
    if (tpl.frequency === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + 1);
    else if (tpl.frequency === 'QUARTERLY') nextDate.setMonth(nextDate.getMonth() + 3);
    else if (tpl.frequency === 'ANNUALLY') nextDate.setFullYear(nextDate.getFullYear() + 1);

    await db.query(
      `UPDATE recurring_bill_templates SET next_run_date = $1 WHERE id = $2`,
      [nextDate.toISOString().slice(0, 10), tpl.id]
    );

    generatedBills.push(bRes.rows[0]);
  }

  return {
    success: true,
    processedCount: generatedBills.length,
    bills: generatedBills
  };
}
