/**
 * Meso Phase 29: Customer Receipts, GST on Advances & Payment Allocation Engine
 * Handles partial invoice knock-offs, customer TDS deductions (acc_1150 TDS Receivable),
 * payment gateway/bank charge deductions (acc_6200), and GST on service advance vouchers.
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function recordCustomerReceipt({
  companyId = 'comp_1',
  customerId,
  receiptNumber,
  paymentDate = new Date().toISOString().slice(0, 10),
  paymentMethod = 'NEFT',
  referenceNo = '',
  amountReceivedPaise,
  customerTdsPaise = 0n,
  bankChargesPaise = 0n,
  depositAccountId = 'acc_1000',
  allocations = [], // [{ invoiceId, amountPaise }]
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const recNo = receiptNumber || `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const receivedPaise = BigInt(amountReceivedPaise);
  const tdsPaise = BigInt(customerTdsPaise);
  const chargesPaise = BigInt(bankChargesPaise);

  // Total gross value settled by customer
  const grossSettledPaise = receivedPaise + tdsPaise + chargesPaise;

  let totalAllocatedPaise = 0n;
  for (const alloc of allocations) {
    totalAllocatedPaise += BigInt(alloc.amountPaise);
  }

  const unallocatedPaise = grossSettledPaise > totalAllocatedPaise ? grossSettledPaise - totalAllocatedPaise : 0n;

  await db.query('BEGIN');
  let paymentId = null;
  let jeId = null;

  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 1. Insert Customer Payment
    const payRes = await db.query(
      `INSERT INTO customer_payments (
        company_id, receipt_number, customer_id, payment_date, payment_method,
        reference_no, total_received_paise, allocated_amount_paise, unallocated_amount_paise,
        customer_tds_deducted_paise, bank_charges_deducted_paise, deposit_account_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'POSTED')
      RETURNING *`,
      [
        companyId,
        recNo,
        customerId,
        paymentDate,
        paymentMethod,
        referenceNo,
        receivedPaise.toString(),
        totalAllocatedPaise.toString(),
        unallocatedPaise.toString(),
        tdsPaise.toString(),
        chargesPaise.toString(),
        depositAccountId
      ]
    );
    const payment = payRes.rows[0];
    paymentId = payment.id;

    // 2. Knock off Invoices & Record Allocations
    for (const alloc of allocations) {
      const allocAmt = BigInt(alloc.amountPaise);

      await db.query(
        `INSERT INTO payment_allocations (payment_id, invoice_id, allocated_paise)
         VALUES ($1, $2, $3)`,
        [paymentId, alloc.invoiceId, allocAmt.toString()]
      );

      // Fetch current invoice balance
      const invRes = await db.query(
        `SELECT balance_due_paise, amount_paid_paise, total_paise FROM invoices WHERE id = $1 AND company_id = $2`,
        [alloc.invoiceId, companyId]
      );

      if (invRes.rows.length > 0) {
        const inv = invRes.rows[0];
        const currentDue = BigInt(inv.balance_due_paise);
        const currentPaid = BigInt(inv.amount_paid_paise || 0);

        const newDue = currentDue > allocAmt ? currentDue - allocAmt : 0n;
        const newPaid = currentPaid + allocAmt;
        const newStatus = newDue === 0n ? 'PAID' : 'PARTIALLY_PAID';

        await db.query(
          `UPDATE invoices 
           SET balance_due_paise = $1, amount_paid_paise = $2, status = $3
           WHERE id = $4`,
          [newDue.toString(), newPaid.toString(), newStatus, alloc.invoiceId]
        );
      }
    }

    // 3. Post Double-Entry General Ledger Journal Entry
    jeId = 'je_rcp_' + Date.now();
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'CUSTOMER_PAYMENT', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-' + recNo,
        paymentDate,
        `Customer payment receipt ${recNo} settled via ${paymentMethod}`,
        paymentId
      ]
    );

    // Ensure chart of accounts
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1000', $1, '1000', 'Bank / Cash Account', 'BALANCE_SHEET', 'BANK') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1100', $1, '1100', 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1150', $1, '1150', 'TDS Receivable (Customer Deductions)', 'BALANCE_SHEET', 'CURRENT_ASSET') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_6200', $1, '6200', 'Bank & Payment Gateway Charges', 'PROFIT_AND_LOSS', 'EXPENSE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2150', $1, '2150', 'Customer Advance Liability', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit Bank/Cash Account
    if (receivedPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, $3, $4, 0, 'Net cash received in bank')`,
        ['jel_bnk_' + Date.now(), jeId, depositAccountId, receivedPaise.toString()]
      );
    }

    // Debit TDS Receivable (Tax deducted by customer)
    if (tdsPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_1150', $3, 0, 'Customer TDS deducted under 194Q/194C')`,
        ['jel_tds_' + Date.now(), jeId, tdsPaise.toString()]
      );
    }

    // Debit Bank/Gateway Charges
    if (chargesPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_6200', $3, 0, 'Bank gateway processing fee deducted')`,
        ['jel_chg_' + Date.now(), jeId, chargesPaise.toString()]
      );
    }

    // Credit Accounts Receivable for allocated invoices
    if (totalAllocatedPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_1100', 0, $3, 'Accounts Receivable knock-off')`,
        ['jel_ar_knock_' + Date.now(), jeId, totalAllocatedPaise.toString()]
      );
    }

    // Credit Customer Advance Liability if unallocated excess cash
    if (unallocatedPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2150', 0, $3, 'Unallocated advance cash received')`,
        ['jel_adv_unalloc_' + Date.now(), jeId, unallocatedPaise.toString()]
      );
    }

    await db.query(
      `UPDATE customer_payments SET journal_entry_id = $1 WHERE id = $2`,
      [jeId, paymentId]
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
    entityType: 'customer_payment',
    entityId: paymentId,
    action: 'CREATE',
    afterJson: { receiptNumber: recNo, amountReceivedPaise: receivedPaise.toString(), tdsPaise: tdsPaise.toString() }
  });

  return {
    success: true,
    paymentId,
    receiptNumber: recNo,
    totalReceivedPaise: receivedPaise.toString(),
    customerTdsPaise: tdsPaise.toString(),
    bankChargesPaise: chargesPaise.toString(),
    totalAllocatedPaise: totalAllocatedPaise.toString(),
    unallocatedPaise: unallocatedPaise.toString(),
    journalEntryId: jeId
  };
}

/**
 * Records an advance payment received for services and creates a statutory GST Receipt Voucher (Phase 29).
 */
export async function recordAdvanceReceiptWithGst({
  companyId = 'comp_1',
  customerId,
  receiptNumber,
  paymentDate = new Date().toISOString().slice(0, 10),
  grossAdvancePaise, // inclusive of 18% GST (e.g. 118,000 paise)
  depositAccountId = 'acc_1000',
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const recNo = receiptNumber || `ADV-RCP-${Date.now()}`;
  const gross = BigInt(grossAdvancePaise);

  // Inclusive 18% GST: Base = Gross * 100 / 118
  const basePaise = (gross * 10000n) / 11800n;
  const totalTaxPaise = gross - basePaise;
  const cgstPaise = totalTaxPaise / 2n;
  const sgstPaise = totalTaxPaise - cgstPaise;

  const jeId = 'je_adv_gst_' + Date.now();

  await db.query('BEGIN');
  let paymentId = null;

  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    const payRes = await db.query(
      `INSERT INTO customer_payments (
        company_id, receipt_number, customer_id, payment_date, payment_method,
        total_received_paise, unallocated_amount_paise, is_advance, gst_on_advance_paise,
        deposit_account_id, status
      ) VALUES ($1, $2, $3, $4, 'NEFT', $5, $5, true, $6, $7, 'POSTED')
      RETURNING *`,
      [
        companyId,
        recNo,
        customerId,
        paymentDate,
        gross.toString(),
        totalTaxPaise.toString(),
        depositAccountId
      ]
    );
    paymentId = payRes.rows[0].id;

    // Post Double-Entry Journal: Debit Bank, Credit Advance Liability, Credit Output GST
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'ADVANCE_RECEIPT_VOUCHER', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-' + recNo,
        paymentDate,
        `GST Receipt Voucher for Service Advance ${recNo}`,
        paymentId
      ]
    );

    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1000', $1, '1000', 'Bank / Cash Account', 'BALANCE_SHEET', 'BANK') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2150', $1, '2150', 'Customer Advance Liability', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2200', $1, '2200', 'Output CGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2210', $1, '2210', 'Output SGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit Bank
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, $3, $4, 0, 'Advance cash received')`,
      ['jel_adv_bnk_' + Date.now(), jeId, depositAccountId, gross.toString()]
    );

    // Credit Advance Liability (net of tax)
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2150', 0, $3, 'Advance liability for services under CGST Sec 13(2)')`,
      ['jel_adv_liab_' + Date.now(), jeId, basePaise.toString()]
    );

    // Credit Output CGST & SGST
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2200', 0, $3, 'Output CGST on service advance')`,
      ['jel_adv_cgst_' + Date.now(), jeId, cgstPaise.toString()]
    );
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2210', 0, $3, 'Output SGST on service advance')`,
      ['jel_adv_sgst_' + Date.now(), jeId, sgstPaise.toString()]
    );

    await db.query(`UPDATE customer_payments SET journal_entry_id = $1 WHERE id = $2`, [jeId, paymentId]);
    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  return {
    success: true,
    paymentId,
    receiptNumber: recNo,
    grossAdvancePaise: gross.toString(),
    baseAdvancePaise: basePaise.toString(),
    totalTaxPaise: totalTaxPaise.toString(),
    cgstPaise: cgstPaise.toString(),
    sgstPaise: sgstPaise.toString(),
    journalEntryId: jeId
  };
}
