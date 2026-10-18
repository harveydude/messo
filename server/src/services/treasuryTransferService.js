/**
 * Meso Phase 43: Undeposited Funds, Contra Transfers & Credit Card Settlement
 * Clearing accounts, bank-to-bank transfers, and credit card liability settlements.
 */

import { getDb } from '../db/db.js';

/**
 * Record a Bank Deposit from Undeposited Funds clearing account
 */
export async function recordBankDeposit({
  companyId = 'comp_1',
  destinationBankAccountId,
  amountPaise,
  depositDate = new Date().toISOString().split('T')[0],
  referenceNo = '',
  notes = 'Bank deposit from clearing cash/cheques'
}) {
  const db = await getDb();
  const amt = parseInt(amountPaise, 10);
  const transferNumber = 'DEP-' + Date.now();

  // Create balanced GL journal entry
  const jeId = 'je_dep_' + Date.now();
  const entryNumber = 'JE-DEP-' + Date.now();

  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'BANK_DEPOSIT', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, depositDate, `Bank Deposit to ${destinationBankAccountId}`, transferNumber]
  );

  const l1 = 'jel_dep_' + Date.now() + '_1';
  const l2 = 'jel_dep_' + Date.now() + '_2';

  // Debit Destination Bank Asset, Credit Undeposited Funds
  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, $3, $4, 0, 'Funds deposited into bank account'),
            ($5, $2, 'acc_undeposited_funds', 0, $4, 'Cleared from undeposited funds holding')`,
    [l1, jeId, destinationBankAccountId, amt, l2]
  );

  const trRes = await db.query(
    `INSERT INTO bank_transfers 
     (company_id, transfer_number, transfer_date, transfer_type, from_account_id, to_account_id, amount_paise, journal_entry_id, reference_no, notes)
     VALUES ($1, $2, $3, 'DEPOSIT', 'acc_undeposited_funds', $4, $5, $6, $7, $8)
     RETURNING *`,
    [companyId, transferNumber, depositDate, destinationBankAccountId, amt, jeId, referenceNo, notes]
  );

  return trRes.rows[0];
}

/**
 * Record a Contra Bank-to-Bank Transfer
 */
export async function recordContraTransfer({
  companyId = 'comp_1',
  fromBankAccountId,
  toBankAccountId,
  amountPaise,
  transferDate = new Date().toISOString().split('T')[0],
  referenceNo = '',
  notes = 'Internal bank transfer'
}) {
  const db = await getDb();
  const amt = parseInt(amountPaise, 10);
  const transferNumber = 'CONTRA-' + Date.now();

  const jeId = 'je_contra_' + Date.now();
  const entryNumber = 'JE-CNTR-' + Date.now();

  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'CONTRA_TRANSFER', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, transferDate, `Contra transfer from ${fromBankAccountId} to ${toBankAccountId}`, transferNumber]
  );

  const l1 = 'jel_cntr_' + Date.now() + '_1';
  const l2 = 'jel_cntr_' + Date.now() + '_2';

  // Debit Destination Bank, Credit Source Bank
  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, $3, $4, 0, 'Funds transferred in (Contra)'),
            ($5, $2, $6, 0, $4, 'Funds transferred out (Contra)')`,
    [l1, jeId, toBankAccountId, amt, l2, fromBankAccountId]
  );

  const trRes = await db.query(
    `INSERT INTO bank_transfers 
     (company_id, transfer_number, transfer_date, transfer_type, from_account_id, to_account_id, amount_paise, journal_entry_id, reference_no, notes)
     VALUES ($1, $2, $3, 'CONTRA', $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [companyId, transferNumber, transferDate, fromBankAccountId, toBankAccountId, amt, jeId, referenceNo, notes]
  );

  return trRes.rows[0];
}

/**
 * Record a Credit Card Bill Paydown
 */
export async function recordCreditCardPaydown({
  companyId = 'comp_1',
  bankAccountId,
  creditCardAccountId = 'acc_corporate_card',
  amountPaise,
  paydownDate = new Date().toISOString().split('T')[0],
  referenceNo = '',
  notes = 'Credit card bill clearance'
}) {
  const db = await getDb();
  const amt = parseInt(amountPaise, 10);
  const transferNumber = 'CCPAY-' + Date.now();

  const jeId = 'je_ccpay_' + Date.now();
  const entryNumber = 'JE-CCPAY-' + Date.now();

  await db.query(
    `INSERT INTO journal_entries (id, company_id, entry_number, entry_date, memo, source_type, source_id, status)
     VALUES ($1, $2, $3, $4, $5, 'CREDIT_CARD_PAYMENT', $6, 'POSTED')`,
    [jeId, companyId, entryNumber, paydownDate, `Credit Card bill payment to ${creditCardAccountId}`, transferNumber]
  );

  const l1 = 'jel_ccpay_' + Date.now() + '_1';
  const l2 = 'jel_ccpay_' + Date.now() + '_2';

  // Debit Credit Card Liability Account (decreases liability), Credit Bank Asset (decreases cash)
  await db.query(
    `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
     VALUES ($1, $2, $3, $4, 0, 'Credit card balance settlement'),
            ($5, $2, $6, 0, $4, 'Bank account disbursement')`,
    [l1, jeId, creditCardAccountId, amt, l2, bankAccountId]
  );

  const trRes = await db.query(
    `INSERT INTO bank_transfers 
     (company_id, transfer_number, transfer_date, transfer_type, from_account_id, to_account_id, amount_paise, journal_entry_id, reference_no, notes)
     VALUES ($1, $2, $3, 'CREDIT_CARD_PAYDOWN', $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [companyId, transferNumber, paydownDate, bankAccountId, creditCardAccountId, amt, jeId, referenceNo, notes]
  );

  return trRes.rows[0];
}
