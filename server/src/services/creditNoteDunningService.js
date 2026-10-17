/**
 * Meso Phase 30: GST Credit Notes, Sales Returns & AI Dunning Engine
 * Implements Section 34 CGST Act compliant credit notes (GSTR-1 CDNR matching),
 * inventory restocking, double-entry reversal, and severity-graded overdue payment reminders.
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function issueCreditNote({
  companyId = 'comp_1',
  creditNoteNumber,
  originalInvoiceId,
  reason = 'SALES_RETURN',
  reasonDescription = 'Goods damaged or customer returned items',
  lines = [],
  restockInventory = false,
  creditNoteDate = new Date().toISOString().slice(0, 10),
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const cnNo = creditNoteNumber || `CN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // 1. Fetch Original Invoice
  const invRes = await db.query(
    `SELECT * FROM invoices WHERE id = $1 AND company_id = $2`,
    [originalInvoiceId, companyId]
  );
  if (invRes.rows.length === 0) {
    throw new Error(`Original invoice ${originalInvoiceId} not found`);
  }
  const originalInvoice = invRes.rows[0];

  // 2. Compute Lines Totals
  let taxablePaise = 0n;
  let cgstPaise = 0n;
  let sgstPaise = 0n;
  let igstPaise = 0n;

  for (const line of lines) {
    const qty = Number(line.quantity || 1);
    const unitPrice = BigInt(line.unitPricePaise || 0);
    const lineTaxable = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
    const taxRateBp = BigInt(line.taxRateBp ?? 1800);

    taxablePaise += lineTaxable;

    if (originalInvoice.tax_scheme === 'INTER_STATE') {
      igstPaise += (lineTaxable * taxRateBp) / 10000n;
    } else {
      const halfTax = (lineTaxable * (taxRateBp / 2n)) / 10000n;
      cgstPaise += halfTax;
      sgstPaise += halfTax;
    }
  }

  const totalTaxPaise = cgstPaise + sgstPaise + igstPaise;
  const totalPaise = taxablePaise + totalTaxPaise;

  const jeId = 'je_cn_' + Date.now();

  await db.query('BEGIN');
  let creditNoteId = null;

  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 3. Insert Credit Note
    const cnRes = await db.query(
      `INSERT INTO credit_notes (
        company_id, credit_note_number, original_invoice_id, original_invoice_number,
        customer_id, credit_note_date, reason, reason_description,
        taxable_amount_paise, cgst_paise, sgst_paise, igst_paise, total_paise,
        restock_inventory, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'POSTED')
      RETURNING *`,
      [
        companyId,
        cnNo,
        originalInvoice.id,
        originalInvoice.invoice_number,
        originalInvoice.customer_id,
        creditNoteDate,
        reason,
        reasonDescription,
        taxablePaise.toString(),
        cgstPaise.toString(),
        sgstPaise.toString(),
        igstPaise.toString(),
        totalPaise.toString(),
        restockInventory
      ]
    );
    const creditNote = cnRes.rows[0];
    creditNoteId = creditNote.id;

    // 4. Insert Lines & Restock Inventory if requested
    for (const line of lines) {
      const qty = Number(line.quantity || 1);
      const unitPrice = BigInt(line.unitPricePaise || 0);
      const lineTaxable = (unitPrice * BigInt(Math.round(qty * 100))) / 100n;
      const taxRateBp = BigInt(line.taxRateBp ?? 1800);
      const lineTax = (lineTaxable * taxRateBp) / 10000n;

      await db.query(
        `INSERT INTO credit_note_lines (
          credit_note_id, product_id, description, quantity, unit_price_paise,
          hsn_sac, tax_rate_bp, tax_amount_paise, total_amount_paise
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          creditNoteId,
          line.productId || null,
          line.description || 'Credit Note Adjustment',
          qty,
          unitPrice.toString(),
          line.hsnSac || '998314',
          Number(taxRateBp),
          lineTax.toString(),
          (lineTaxable + lineTax).toString()
        ]
      );

      if (restockInventory && line.productId) {
        await db.query(
          `UPDATE products_and_services 
           SET quantity_on_hand = COALESCE(quantity_on_hand, 0) + $1
           WHERE id = $2 AND company_id = $3`,
          [qty, line.productId, companyId]
        );
      }
    }

    // 5. Knock off / Reduce Original Invoice Balance Due
    const currentDue = BigInt(originalInvoice.balance_due_paise || 0);
    const newDue = currentDue > totalPaise ? currentDue - totalPaise : 0n;
    const newStatus = newDue === 0n ? 'PAID' : originalInvoice.status;

    await db.query(
      `UPDATE invoices 
       SET balance_due_paise = $1, status = $2
       WHERE id = $3`,
      [newDue.toString(), newStatus, originalInvoice.id]
    );

    // 6. Post Balanced Reversing Journal Entry
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'CREDIT_NOTE', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-' + cnNo,
        creditNoteDate,
        `Credit Note ${cnNo} linked to original invoice ${originalInvoice.invoice_number}`,
        creditNoteId
      ]
    );

    // Accounts
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_4100', $1, '4100', 'Sales Returns & Allowances', 'PROFIT_AND_LOSS', 'EXPENSE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1100', $1, '1100', 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2200', $1, '2200', 'Output CGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2210', $1, '2210', 'Output SGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2220', $1, '2220', 'Output IGST Payable', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit Sales Returns
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_4100', $3, 0, 'Sales return deduction from revenue')`,
      ['jel_cn_ret_' + Date.now(), jeId, taxablePaise.toString()]
    );

    // Debit Output Tax (Reversing output tax liability)
    if (cgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2200', $3, 0, 'Reversal of Output CGST')`,
        ['jel_cn_cgst_' + Date.now(), jeId, cgstPaise.toString()]
      );
    }
    if (sgstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2210', $3, 0, 'Reversal of Output SGST')`,
        ['jel_cn_sgst_' + Date.now(), jeId, sgstPaise.toString()]
      );
    }
    if (igstPaise > 0n) {
      await db.query(
        `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
         VALUES ($1, $2, 'acc_2220', $3, 0, 'Reversal of Output IGST')`,
        ['jel_cn_igst_' + Date.now(), jeId, igstPaise.toString()]
      );
    }

    // Credit Accounts Receivable
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_1100', 0, $3, 'Accounts Receivable reduction for Credit Note')`,
      ['jel_cn_ar_' + Date.now(), jeId, totalPaise.toString()]
    );

    await db.query(`UPDATE credit_notes SET journal_entry_id = $1 WHERE id = $2`, [jeId, creditNoteId]);
    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'credit_note',
    entityId: creditNoteId,
    action: 'CREATE',
    afterJson: { creditNoteNumber: cnNo, originalInvoiceNumber: originalInvoice.invoice_number, totalPaise: totalPaise.toString() }
  });

  return {
    success: true,
    creditNoteId,
    creditNoteNumber: cnNo,
    originalInvoiceNumber: originalInvoice.invoice_number,
    taxableAmountPaise: taxablePaise.toString(),
    totalTaxPaise: totalTaxPaise.toString(),
    totalPaise: totalPaise.toString(),
    journalEntryId: jeId
  };
}

export function classifyDunningNotice({ daysOverdue, balanceDuePaise, invoiceNumber, customerName = 'Valued Customer' }) {
  const formattedBalance = `₹${(Number(balanceDuePaise) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  if (daysOverdue <= 15) {
    return {
      noticeLevel: 'GENTLE_REMINDER',
      subject: `Friendly Reminder: Invoice ${invoiceNumber} is Overdue`,
      messageBody: `Dear ${customerName},\n\nWe hope this email finds you well. This is a gentle reminder that invoice ${invoiceNumber} for ${formattedBalance} was due on ${daysOverdue} day(s) ago. Please let us know if you need another copy or have any questions regarding payment.\n\nWarm regards,\nFinance Team`
    };
  } else if (daysOverdue <= 30) {
    return {
      noticeLevel: 'FIRM_REMINDER',
      subject: `Urgent Reminder: Invoice ${invoiceNumber} Overdue (${daysOverdue} Days)`,
      messageBody: `Dear ${customerName},\n\nOur records indicate that invoice ${invoiceNumber} for ${formattedBalance} is now ${daysOverdue} days past due. We kindly request that you settle this outstanding amount immediately to avoid disruption to your services or late interest charges.\n\nSincerely,\nCredit Control Team`
    };
  } else {
    return {
      noticeLevel: 'FINAL_LEGAL_NOTICE',
      subject: `FINAL NOTICE BEFORE LEGAL ACTION: Overdue Invoice ${invoiceNumber}`,
      messageBody: `Dear ${customerName},\n\nDespite repeated reminders, invoice ${invoiceNumber} in the amount of ${formattedBalance} remains unpaid after ${daysOverdue} days. Please be advised that unless payment is received within 7 business days, we will initiate formal recovery proceedings including statutory interest under the Micro, Small and Medium Enterprises Development Act / Indian Contract Act.\n\nFormal Notice,\nLegal & Accounts Department`
    };
  }
}

export async function runDunningWorkflow({ companyId = 'comp_1', asOfDate = new Date().toISOString().slice(0, 10) }) {
  const db = await getDb();

  const invRes = await db.query(
    `SELECT i.*, c.display_name as customer_name
     FROM invoices i
     LEFT JOIN contacts c ON c.id = i.customer_id
     WHERE i.company_id = $1 
       AND i.is_deleted = false 
       AND i.status NOT IN ('PAID', 'VOID', 'VOIDED', 'DRAFT')
       AND i.due_date < $2
       AND i.balance_due_paise > 0`,
    [companyId, asOfDate]
  );

  const overdueInvoices = invRes.rows || [];
  const notices = [];

  for (const inv of overdueInvoices) {
    const dueDate = new Date(inv.due_date);
    const currentDate = new Date(asOfDate);
    const daysOverdue = Math.max(1, Math.floor((currentDate - dueDate) / (1000 * 60 * 60 * 24)));

    const classification = classifyDunningNotice({
      daysOverdue,
      balanceDuePaise: inv.balance_due_paise,
      invoiceNumber: inv.invoice_number,
      customerName: inv.customer_name
    });

    const noticeRes = await db.query(
      `INSERT INTO dunning_notices (
        company_id, invoice_id, customer_id, notice_level, days_overdue,
        balance_due_paise, message_body, sent_channel
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'EMAIL')
      RETURNING *`,
      [
        companyId,
        inv.id,
        inv.customer_id,
        classification.noticeLevel,
        daysOverdue,
        inv.balance_due_paise,
        classification.messageBody
      ]
    );

    notices.push(noticeRes.rows[0]);
  }

  return {
    success: true,
    scannedCount: overdueInvoices.length,
    dispatchedCount: notices.length,
    notices
  };
}
