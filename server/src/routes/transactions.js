import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { getDb } from '../db/db.js';
import { postJournalEntry, logAudit, toInr } from '../services/ledgerService.js';
import { calculateGST } from '../services/gstService.js';
import { randomUUID } from 'crypto';
import executor from '../services/workflowExecutor.js';

const router = express.Router();

/**
 * Unified 29-Workflow Accounting Transaction Processor
 */
export async function processTransaction(payload, defaultType = null) {
  const db = await getDb();
  const txnType = (payload.txnType || defaultType || 'EXPENSE').toUpperCase();
  const txnId = `txn_${randomUUID()}`;
  const docNumber = payload.docNumber || payload.invoiceNumber || payload.billNumber || payload.refNo || `${txnType.slice(0, 3)}-${Date.now().toString().slice(-4)}`;
  const txnDate = payload.txnDate || payload.date || payload.issueDate || payload.paymentDate || payload.expense_date || new Date().toISOString().split('T')[0];
  const dueDate = payload.dueDate || (['INVOICE', 'BILL'].includes(txnType) ? new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0] : null);
  const contactId = payload.contactId || payload.customerId || payload.customer_id || payload.vendorId || payload.vendor_id || null;
  const memo = payload.memo || payload.notes || payload.description || '';
  const currency = payload.currency || 'INR';

  // Extract / Calculate amounts in paise (or cents)
  let subtotalPaise = 0n;
  let taxPaise = 0n;
  let discountPaise = BigInt(Math.round(Number(payload.discountPaise || payload.discountAmount || 0) * 100));
  let totalPaise = 0n;

  const lines = payload.lines || payload.items || [];
  for (const l of lines) {
    const qty = Number(l.qty || l.quantity || 1);
    const rate = Number(l.rate || l.price || l.amount || 0);
    const lineAmtPaise = BigInt(Math.round(qty * rate * 100));
    subtotalPaise += lineAmtPaise;
  }

  if (payload.amount_minor != null) {
    totalPaise = BigInt(Math.round(Number(payload.amount_minor)));
    if (subtotalPaise === 0n) {
      subtotalPaise = totalPaise;
    }
  } else if (payload.totalAmount || payload.amount || payload.total) {
    totalPaise = BigInt(Math.round(Number(payload.totalAmount || payload.amount || payload.total) * 100));
    if (subtotalPaise === 0n) {
      subtotalPaise = totalPaise;
    } else if (totalPaise > subtotalPaise - discountPaise) {
      taxPaise = totalPaise - (subtotalPaise - discountPaise);
    }
  } else {
    const gstRate = payload.isTaxable !== false ? 18 : 0;
    const gst = calculateGST({ taxablePaise: Number(subtotalPaise), ratePct: gstRate });
    taxPaise = BigInt(gst.totalTaxPaise);
    totalPaise = subtotalPaise + taxPaise - discountPaise;
  }

  const subtotalNumeric = Number(subtotalPaise) / 100;
  const taxNumeric = Number(taxPaise) / 100;
  const totalNumeric = Number(totalPaise) / 100;

  let isPosting = true;
  let glLines = [];

  // ==========================================================================
  // DISPATCH ACCORDING TO THE 29 +CREATE WORKFLOW SPECIFICATIONS
  // ==========================================================================
  switch (txnType) {
    // ------------------------------------------------------------------------
    // COLUMN 1: CUSTOMERS (11 Workflows)
    // ------------------------------------------------------------------------
    case 'INVOICE': {
      isPosting = true;
      // DEBIT AR, CREDIT Income, CREDIT Tax Payable
      glLines = [
        { accountId: 'acc_1100', debitPaise: Number(totalPaise), creditPaise: 0, description: `Invoice #${docNumber} A/R` },
        { accountId: payload.incomeAccountId || 'acc_4000', debitPaise: 0, creditPaise: Number(subtotalPaise - discountPaise), description: `Sales Revenue` },
      ];
      if (taxPaise > 0n) {
        glLines.push({ accountId: 'acc_2100', debitPaise: 0, creditPaise: Number(taxPaise), description: `GST Output 18%` });
      }

      // Check if any inventory items need stock decrement & COGS debit
      for (const it of lines) {
        if (it.productServiceId || it.id) {
          const prodId = it.productServiceId || it.id;
          const qty = Number(it.qty || 1);
          await db.query(
            `UPDATE products_and_services SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2 AND type = 'INVENTORY'`,
            [qty, prodId]
          );
          await db.query(
            `UPDATE products_services SET qty_on_hand = qty_on_hand - $1 WHERE id = $2 AND item_type = 'INVENTORY'`,
            [qty, prodId]
          );
        }
      }

      // Sync into dedicated invoices table for backwards compatibility
      await db.query(
        `INSERT INTO invoices (id, invoice_number, customer_id, issue_date, due_date, status, subtotal_paise, tax_paise, discount_paise, total_paise, balance_due_paise, notes)
         VALUES ($1, $2, $3, $4, $5, 'SENT', $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [txnId, docNumber, contactId || 'cust_1', txnDate, dueDate, Number(subtotalPaise), Number(taxPaise), Number(discountPaise), Number(totalPaise), Number(totalPaise), memo]
      );
      break;
    }

    case 'RECEIVE_PAYMENT': {
      isPosting = true;
      const depositAccId = payload.depositToAccountId || 'acc_1010';
      glLines = [
        { accountId: depositAccId, debitPaise: Number(totalPaise), creditPaise: 0, description: `Payment Received from Customer` },
        { accountId: 'acc_1100', debitPaise: 0, creditPaise: Number(totalPaise), description: `Apply Payment to A/R` },
      ];

      // Update linked invoices
      if (payload.linkedTxnId || payload.invoiceId) {
        const invId = payload.linkedTxnId || payload.invoiceId;
        await db.query(
          `UPDATE invoices SET amount_paid_paise = amount_paid_paise + $1, balance_due_paise = GREATEST(0, balance_due_paise - $1), status = CASE WHEN balance_due_paise <= $1 THEN 'PAID' ELSE 'PARTIALLY_PAID' END, version = version + 1 WHERE id = $2`,
          [Number(totalPaise), invId]
        );
      }
      break;
    }

    case 'STATEMENT': {
      isPosting = false;
      break;
    }

    case 'ESTIMATE': {
      isPosting = false;
      break;
    }

    case 'SALES_ORDER': {
      isPosting = false;
      for (const it of lines) {
        const prodId = it.productServiceId || it.id;
        if (prodId) {
          const qty = Number(it.qty || 1);
          await db.query(`UPDATE products_services SET qty_committed = qty_committed + $1 WHERE id = $2`, [qty, prodId]);
        }
      }
      break;
    }

    case 'CREDIT_MEMO': {
      isPosting = true;
      // DEBIT Income, DEBIT Tax, CREDIT AR
      glLines = [
        { accountId: payload.incomeAccountId || 'acc_4000', debitPaise: Number(subtotalPaise), creditPaise: 0, description: `Credit Memo Sales Adjustment` },
        ...(taxPaise > 0n ? [{ accountId: 'acc_2100', debitPaise: Number(taxPaise), creditPaise: 0, description: `Sales Tax Reversal` }] : []),
        { accountId: 'acc_1100', debitPaise: 0, creditPaise: Number(totalPaise), description: `Credit Memo A/R Credit` },
      ];
      break;
    }

    case 'SALES_RECEIPT': {
      isPosting = true;
      const bankAcc = payload.depositToAccountId || 'acc_1010';
      glLines = [
        { accountId: bankAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: `Sales Receipt Instant Deposit` },
        { accountId: payload.incomeAccountId || 'acc_4000', debitPaise: 0, creditPaise: Number(subtotalPaise - discountPaise), description: `Sales Revenue` },
        ...(taxPaise > 0n ? [{ accountId: 'acc_2100', debitPaise: 0, creditPaise: Number(taxPaise), description: `GST Output 18%` }] : [])
      ];
      break;
    }

    case 'REFUND_RECEIPT': {
      isPosting = true;
      const refundFromAcc = payload.refundFromAccountId || 'acc_1010';
      glLines = [
        { accountId: payload.incomeAccountId || 'acc_4000', debitPaise: Number(subtotalPaise), creditPaise: 0, description: `Customer Refund Debit` },
        ...(taxPaise > 0n ? [{ accountId: 'acc_2100', debitPaise: Number(taxPaise), creditPaise: 0, description: `Tax Refund Debit` }] : []),
        { accountId: refundFromAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Refund Paid Out` }
      ];
      break;
    }

    case 'DELAYED_CREDIT':
    case 'DELAYED_CHARGE': {
      isPosting = false;
      break;
    }

    // ------------------------------------------------------------------------
    // COLUMN 2: VENDORS (9 Workflows)
    // ------------------------------------------------------------------------
    case 'EXPENSE': {
      isPosting = true;
      const paymentAcc = payload.paymentAccountId || payload.payment_account_id || 'acc_1010';
      const expenseAcc = payload.expenseAccountId || payload.expense_account_id || payload.categoryAccountId || 'acc_6020';
      glLines = [
        { accountId: expenseAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: memo || `Operating Expense` },
        { accountId: paymentAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Paid from Bank/Card` }
      ];

      await db.query(
        `INSERT INTO expenses (id, expense_number, payee_name, payment_account_id, payment_date, total_paise, category, memo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [txnId, docNumber, payload.payeeName || payload.payee || 'Vendor Payee', paymentAcc, txnDate, Number(totalPaise), payload.category || 'General', memo]
      );
      break;
    }

    case 'CHECK': {
      isPosting = true;
      const bankAcc = payload.bankAccountId || 'acc_1010';
      const expenseAcc = payload.expenseAccountId || 'acc_6000';
      glLines = [
        { accountId: expenseAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: `Check payment: ${memo}` },
        { accountId: bankAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Check drawn on Bank` }
      ];
      break;
    }

    case 'BILL': {
      isPosting = true;
      const expenseAcc = payload.expenseAccountId || 'acc_5000';
      glLines = [
        { accountId: expenseAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: memo || `Vendor Bill Expense/Inventory` },
        { accountId: 'acc_2000', debitPaise: 0, creditPaise: Number(totalPaise), description: `Accounts Payable (A/P)` }
      ];

      await db.query(
        `INSERT INTO bills (id, bill_number, vendor_id, bill_date, due_date, status, amount_paise, open_balance_paise, notes)
         VALUES ($1, $2, $3, $4, $5, 'UNPAID', $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [txnId, docNumber, contactId || 'vend_1', txnDate, dueDate, Number(totalPaise), Number(totalPaise), memo]
      );
      break;
    }

    case 'BILL_PAYMENT':
    case 'PAY_BILLS': {
      isPosting = true;
      const paymentAcc = payload.paymentAccountId || 'acc_1010';
      glLines = [
        { accountId: 'acc_2000', debitPaise: Number(totalPaise), creditPaise: 0, description: `Accounts Payable (A/P) Paid` },
        { accountId: paymentAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Bill Payment from Bank/Card` }
      ];

      if (payload.billId || payload.linkedTxnId) {
        const bId = payload.billId || payload.linkedTxnId;
        await db.query(
          `UPDATE bills SET open_balance_paise = GREATEST(0, open_balance_paise - $1), status = CASE WHEN open_balance_paise <= $1 THEN 'PAID' ELSE 'PARTIALLY_PAID' END, version = version + 1 WHERE id = $2`,
          [Number(totalPaise), bId]
        );
      }
      break;
    }

    case 'PURCHASE_ORDER': {
      isPosting = false;
      for (const it of lines) {
        const prodId = it.productServiceId || it.id;
        if (prodId) {
          const qty = Number(it.qty || 1);
          await db.query(`UPDATE products_services SET qty_on_order = qty_on_order + $1 WHERE id = $2`, [qty, prodId]);
        }
      }
      break;
    }

    case 'VENDOR_CREDIT': {
      isPosting = true;
      const expenseAcc = payload.expenseAccountId || 'acc_5000';
      glLines = [
        { accountId: 'acc_2000', debitPaise: Number(totalPaise), creditPaise: 0, description: `Vendor Credit on A/P` },
        { accountId: expenseAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Expense Reduction / Inventory Return` }
      ];
      break;
    }

    case 'CREDIT_CARD_CREDIT': {
      isPosting = true;
      const cardAcc = payload.creditCardAccountId || 'acc_1020';
      const expenseAcc = payload.expenseAccountId || 'acc_6020';
      glLines = [
        { accountId: cardAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: `Credit Card Refund Reduction` },
        { accountId: expenseAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Expense Adjustment` }
      ];
      break;
    }

    // ------------------------------------------------------------------------
    // COLUMN 3: TEAM (2 Workflows)
    // ------------------------------------------------------------------------
    case 'PAYROLL_RUN': {
      isPosting = true;
      const grossPaise = Number(payload.grossPayPaise || totalPaise);
      const employerTaxPaise = Number(payload.employerTaxPaise || Math.round(grossPaise * 0.08));
      const withholdingPaise = Number(payload.withholdingPaise || Math.round(grossPaise * 0.12));
      const netPayPaise = grossPaise - withholdingPaise;
      const bankAcc = payload.bankAccountId || 'acc_1010';

      glLines = [
        { accountId: 'acc_6040', debitPaise: grossPaise, creditPaise: 0, description: `Wages & Salaries Gross Expense` },
        { accountId: 'acc_6050', debitPaise: employerTaxPaise, creditPaise: 0, description: `Employer Taxes Expense` },
        { accountId: 'acc_2200', debitPaise: 0, creditPaise: withholdingPaise + employerTaxPaise, description: `Payroll Withholding & Taxes Liability` },
        { accountId: bankAcc, debitPaise: 0, creditPaise: netPayPaise, description: `Net Payroll Direct Deposit` }
      ];
      break;
    }

    // ------------------------------------------------------------------------
    // COLUMN 4: OTHER (7 Workflows)
    // ------------------------------------------------------------------------
    case 'TASK': {
      isPosting = false;
      await db.query(`
        INSERT INTO tasks_and_feed_items (id, item_type, category, title, description, due_date, priority, status)
        VALUES ($1, 'USER_TASK', 'GENERAL_TASK', $2, $3, $4, $5, 'OPEN')
      `, [txnId, payload.title || payload.taskName || 'New Task', memo, dueDate, payload.priority || 'MEDIUM']);
      break;
    }

    case 'BANK_DEPOSIT': {
      isPosting = true;
      const targetBank = payload.depositToAccountId || 'acc_1010';
      const undepositedFunds = 'acc_1050';
      const cashbackPaise = Number(payload.cashbackPaise || 0);

      glLines = [
        { accountId: targetBank, debitPaise: Number(totalPaise) - cashbackPaise, creditPaise: 0, description: `Bank Deposit Net Amount` },
        ...(cashbackPaise > 0 ? [{ accountId: 'acc_1000', debitPaise: cashbackPaise, creditPaise: 0, description: `Cash Back Retained` }] : []),
        { accountId: undepositedFunds, debitPaise: 0, creditPaise: Number(totalPaise), description: `Clear Undeposited Funds` }
      ];
      break;
    }

    case 'TRANSFER': {
      isPosting = true;
      const fromAcc = payload.fromAccountId || 'acc_1010';
      const toAcc = payload.toAccountId || 'acc_1015';
      glLines = [
        { accountId: toAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: `Transfer In to Account` },
        { accountId: fromAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Transfer Out from Account` }
      ];
      break;
    }

    case 'JOURNAL_ENTRY': {
      isPosting = true;
      // Multi-line manual journal entry
      glLines = (payload.journalLines || lines).map(l => ({
        accountId: l.accountId || l.account_id,
        debitPaise: Math.round(Number(l.debit || l.debitPaise || 0) * 100),
        creditPaise: Math.round(Number(l.credit || l.creditPaise || 0) * 100),
        description: l.description || memo
      }));
      break;
    }

    case 'INVENTORY_ADJUSTMENT': {
      isPosting = true;
      const changeQty = Number(payload.changeInQty || payload.qtyChange || 0);
      const unitCostPaise = Math.round(Number(payload.unitCost || 500) * 100);
      const valDeltaPaise = Math.abs(Math.round(changeQty * unitCostPaise));

      if (changeQty < 0) {
        // Shrinkage: Debit COGS, Credit Inventory Asset
        glLines = [
          { accountId: 'acc_5000', debitPaise: valDeltaPaise, creditPaise: 0, description: `Inventory Shrinkage Write-off` },
          { accountId: 'acc_1200', debitPaise: 0, creditPaise: valDeltaPaise, description: `Inventory Asset Reduction` }
        ];
      } else {
        // Stock gain: Debit Inventory Asset, Credit Inventory Adjustment
        glLines = [
          { accountId: 'acc_1200', debitPaise: valDeltaPaise, creditPaise: 0, description: `Inventory Stock Count Gain` },
          { accountId: 'acc_5000', debitPaise: 0, creditPaise: valDeltaPaise, description: `Inventory Adjustment Credit` }
        ];
      }
      break;
    }

    case 'PAY_DOWN_CREDIT_CARD':
    case 'CREDIT_CARD_PAYMENT': {
      isPosting = true;
      const cardAcc = payload.creditCardAccountId || 'acc_1020';
      const bankAcc = payload.bankAccountId || 'acc_1010';
      glLines = [
        { accountId: cardAcc, debitPaise: Number(totalPaise), creditPaise: 0, description: `Pay down credit card liability` },
        { accountId: bankAcc, debitPaise: 0, creditPaise: Number(totalPaise), description: `Payment disbursed from checking` }
      ];
      break;
    }

    default: {
      isPosting = false;
      break;
    }
  }

  const docType = payload.doc_type || payload.docType || (
    txnType === 'ESTIMATE' ? 'estimate' :
    txnType === 'SALES_ORDER' ? 'sales_order' :
    txnType === 'PURCHASE_ORDER' ? 'purchase_order' :
    txnType === 'CREDIT_MEMO' ? 'credit_memo' :
    txnType === 'DELAYED_CREDIT' ? 'delayed_credit' :
    txnType === 'DELAYED_CHARGE' ? 'delayed_charge' :
    txnType.toLowerCase()
  );
  const docStatus = payload.doc_status || payload.docStatus || 'DRAFT';
  const companyId = payload.company_id || payload.companyId || 'comp_1';

  // 1. Post to unified transactions table
  await db.query(`
    INSERT INTO transactions (
      id, company_id, txn_type, doc_number, txn_date, due_date, contact_id, memo,
      is_posting, subtotal, tax_amount, total_amount, balance_due, currency, status,
      doc_type, doc_status, status_history
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'OPEN', $15, $16, $17)
    ON CONFLICT (id) DO NOTHING
  `, [
    txnId, companyId, txnType, docNumber, txnDate, dueDate, contactId, memo,
    isPosting, subtotalNumeric, taxNumeric, totalNumeric, totalNumeric, currency,
    docType, docStatus, JSON.stringify([{ to: docStatus, at: new Date().toISOString() }])
  ]);

  // 1b. Post lines into transaction_lines for conversions
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const lineId = `tl_${randomUUID()}`;
    const qty = Number(l.qty || l.quantity || 1);
    const rate = Number(l.rate || l.price || l.amount || 0);
    const amt = qty * rate;
    await db.query(`
      INSERT INTO transaction_lines (id, transaction_id, description, quantity, rate, amount, sort_order, tax_rate_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [lineId, txnId, l.description || l.memo || '', qty, rate, amt, i, l.tax_rate_id || l.taxRateId || null]);
  }

  // 2. Post to Double-Entry Ledger if posting is TRUE
  let jeRecord = null;
  if (isPosting && glLines.length > 0) {
    jeRecord = await postJournalEntry({
      entryNumber: `JE-${docNumber}`,
      entryDate: txnDate,
      sourceType: txnType,
      docType: txnType,
      narration: memo || `${txnType} #${docNumber}`,
      sourceId: txnId,
      lines: glLines
    });
  }

  // 3. Immutable Audit Log (Rule 5)
  await logAudit({
    action: 'CREATE',
    entityType: txnType,
    entityId: txnId,
    after: {
      docNumber,
      totalNumeric,
      isPosting,
      linesCount: lines.length
    }
  });

  return {
    success: true,
    id: txnId,
    transactionId: txnId,
    docNumber,
    totalAmount: totalNumeric,
    isPosting,
    doc_type: docType,
    doc_status: docStatus,
    journalEntryId: jeRecord?.id || null
  };
}

// ============================================================================
// ROUTE HANDLERS FOR UNIFIED /api/transactions & SPECIFIC 29 ENDPOINTS
// ============================================================================

// 1. Unified Transaction Route
router.post('/', async (req, res) => {
  try {
    const result = await processTransaction(req.body);
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// 2. Customer Specific Sub-routes (Column 1)
router.post('/customers/invoices', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'INVOICE');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/receive-payment', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'RECEIVE_PAYMENT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/statements', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'STATEMENT');
    res.json({ ...result, pdfUrl: '/downloads/statement_sample.pdf' });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/estimates', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'ESTIMATE');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/sales-orders', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'SALES_ORDER');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/credit-memos', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'CREDIT_MEMO');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/sales-receipts', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'SALES_RECEIPT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/refund-receipts', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'REFUND_RECEIPT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/delayed-credits', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'DELAYED_CREDIT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/customers/delayed-charges', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'DELAYED_CHARGE');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// 3. Vendor Specific Sub-routes (Column 2)
router.post('/vendors/expenses', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'EXPENSE');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/checks', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'CHECK');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/bills', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'BILL');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/pay-bills', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'PAY_BILLS');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/purchase-orders', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'PURCHASE_ORDER');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/vendor-credits', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'VENDOR_CREDIT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/credit-card-credits', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'CREDIT_CARD_CREDIT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/vendors/print-checks', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`SELECT * FROM transactions WHERE txn_type = 'CHECK' AND print_status = 'TO_PRINT'`);
    res.json({ success: true, checksToPrint: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/vendors/print-checks', async (req, res) => {
  try {
    const db = await getDb();
    const { checkIds = [], startingCheckNo = 1001 } = req.body;
    let nextNo = Number(startingCheckNo);
    for (const cid of checkIds) {
      await db.query(`UPDATE transactions SET print_status = 'PRINTED', doc_number = $1 WHERE id = $2`, [String(nextNo), cid]);
      nextNo++;
    }
    res.json({ success: true, message: `Assigned check numbers up to ${nextNo - 1} and marked PRINTED` });
  } catch (err) {
    handleApiError(res, err);
  }
});

// 4. Team Specific Sub-routes (Column 3)
router.post('/team/payroll-runs', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'PAYROLL_RUN');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

// 5. Other Specific Sub-routes (Column 4)
router.post('/other/tasks', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'TASK');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/other/bank-deposits', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'BANK_DEPOSIT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/other/transfers', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'TRANSFER');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/other/journal-entries', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'JOURNAL_ENTRY');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/other/inventory-adjustments', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'INVENTORY_ADJUSTMENT');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/other/pay-down-credit-card', async (req, res) => {
  try {
    const result = await processTransaction(req.body, 'PAY_DOWN_CREDIT_CARD');
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

export async function executeWorkflow(workflow, payload, ctx = {}) {
  const normWorkflow = String(workflow || '').toUpperCase().replace(/-/g, '_');
  const body = {
    ...payload,
    txnType: normWorkflow,
    company_id: ctx.companyId || payload.company_id || 'comp_1',
    created_by: ctx.actor || payload.created_by || 'system:recurring',
  };
  const result = await processTransaction(body);
  return { id: result.transactionId, docNumber: result.docNumber, data: result, ...result };
}
executor.setExecutor(executeWorkflow);

export default router;
