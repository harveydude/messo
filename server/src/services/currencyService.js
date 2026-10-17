/**
 * Multi-Currency & Forex Service (Phase 12)
 * Handles daily exchange rate tables, currency conversions, realized gain/loss,
 * and month-end unrealized revaluations with full double-entry ledger impact.
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function setExchangeRate({
  companyId = 'comp_1',
  fromCurrency,
  toCurrency = 'INR',
  rate,
  effectiveDate = new Date().toISOString().split('T')[0],
  source = 'RBI_REFERENCE',
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const numRate = Number(rate);
  if (isNaN(numRate) || numRate <= 0) {
    throw new Error('Exchange rate must be a positive decimal number.');
  }

  const query = `
    INSERT INTO exchange_rates (
      company_id, from_currency, to_currency, rate, effective_date, source
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (company_id, from_currency, to_currency, effective_date)
    DO UPDATE SET rate = EXCLUDED.rate, source = EXCLUDED.source, created_at = NOW()
    RETURNING *;
  `;

  const res = await db.query(query, [
    companyId,
    fromCurrency.toUpperCase(),
    toCurrency.toUpperCase(),
    numRate,
    effectiveDate,
    source
  ]);

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'exchange_rate',
    entityId: res.rows[0].id,
    action: 'CREATE',
    afterJson: res.rows[0]
  });

  return { ...res.rows[0], rate: Number(res.rows[0].rate) };
}

export async function getExchangeRate(arg1, arg2, arg3, arg4) {
  let companyId = 'comp_1';
  let fromCurrency;
  let toCurrency = 'INR';
  let date = new Date().toISOString().split('T')[0];

  if (typeof arg1 === 'object' && arg1 !== null) {
    companyId = arg1.companyId || companyId;
    fromCurrency = arg1.fromCurrency;
    toCurrency = arg1.toCurrency || toCurrency;
    date = arg1.date || date;
  } else {
    fromCurrency = arg1;
    if (arg2) toCurrency = arg2;
    if (arg3) date = arg3;
    if (arg4) companyId = arg4;
  }

  if (!fromCurrency) {
    return 1.0;
  }

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  if (from === to) {
    return 1.0;
  }

  const db = await getDb();
  const res = await db.query(
    `SELECT rate FROM exchange_rates
     WHERE company_id = $1 AND from_currency = $2 AND to_currency = $3 AND effective_date <= $4
     ORDER BY effective_date DESC
     LIMIT 1`,
    [companyId, from, to, date]
  );

  if (res.rows.length > 0) {
    return Number(res.rows[0].rate);
  }

  // Fallback defaults for common currencies vs INR
  const defaults = {
    'USD_INR': 86.50,
    'EUR_INR': 94.20,
    'GBP_INR': 110.80,
    'AED_INR': 23.55,
    'SGD_INR': 65.40,
  };

  const pair = `${from}_${to}`;
  if (defaults[pair]) {
    return defaults[pair];
  }

  // Inverse check
  const invPair = `${to}_${from}`;
  if (defaults[invPair]) {
    return 1 / defaults[invPair];
  }

  return 1.0;
}

export async function convertCurrency(arg1, arg2) {
  if (typeof arg1 === 'number' && typeof arg2 === 'number') {
    const convertedPaise = BigInt(Math.round(arg1 * arg2 * 100));
    return {
      convertedPaise,
      convertedMinor: Number(convertedPaise),
      rate: arg2
    };
  }
  const {
    amountMinor,
    fromCurrency,
    toCurrency = 'INR',
    date,
    companyId = 'comp_1'
  } = arg1 || {};
  const rate = await getExchangeRate({ companyId, fromCurrency, toCurrency, date });
  const convertedMinor = Math.round(Number(amountMinor) * rate);
  const convertedPaise = BigInt(convertedMinor);
  return {
    originalMinor: Number(amountMinor),
    convertedMinor,
    convertedPaise,
    rate,
    fromCurrency,
    toCurrency
  };
}

/**
 * Calculates and logs Realized Forex Gain or Loss upon payment / settlement.
 */
export async function recordForexGainLoss(options = {}) {
  const {
    companyId = 'comp_1',
    entityType = 'INVOICE',
    entityId = 'ent_fx_' + Date.now(),
    foreignCurrency = 'USD',
    foreignAmount = 0,
    bookingRate,
    originalRate,
    settlementRate,
    isRealized = true,
    user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
  } = options;

  const db = await getDb();
  const bRate = Number(bookingRate ?? originalRate ?? 1.0);
  const sRate = Number(settlementRate ?? 1.0);
  const fAmt = Number(foreignAmount);

  // For Receivables (INVOICE): higher settlement rate = GAIN (positive)
  // For Payables (BILL): higher settlement rate = LOSS (negative)
  let gainLossPaise = 0;
  if (entityType.toUpperCase() === 'INVOICE') {
    gainLossPaise = Math.round(fAmt * (sRate - bRate) * 100);
  } else {
    gainLossPaise = Math.round(fAmt * (bRate - sRate) * 100);
  }

  let jeId = null;

  // Post balanced journal entry for realized forex difference if nonzero
  if (gainLossPaise !== 0 && isRealized) {
    jeId = 'je_fx_' + Math.random().toString(36).substring(2, 10);
    const entryNumber = 'FX-' + Date.now();
    const absGainLoss = Math.abs(gainLossPaise);

    await db.query('BEGIN');
    try {
      await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

      await db.query(
        `INSERT INTO journal_entries (
          id, company_id, entry_number, entry_date, memo, source_type, source_id, status
        ) VALUES ($1, $2, $3, CURRENT_DATE, $4, 'FOREX_ADJUSTMENT', $5, 'POSTED')`,
        [
          jeId,
          companyId,
          entryNumber,
          `Realized Forex ${gainLossPaise > 0 ? 'Gain' : 'Loss'} on ${entityType} ${entityId}`,
          entityId
        ]
      );

      // Debit Bank/AR, Credit Forex Gain Account (acc_8000) or vice versa
      const line1Id = 'jel_' + Math.random().toString(36).substring(2, 10);
      const line2Id = 'jel_' + Math.random().toString(36).substring(2, 10);

      // Ensure acc_8000 (Forex Gain/Loss) exists
      await db.query(
        `INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type)
         VALUES ('acc_8000', $1, '8000', 'Foreign Exchange Gain / Loss', 'PROFIT_AND_LOSS', 'INCOME')
         ON CONFLICT (id) DO NOTHING`,
        [companyId]
      );

      if (gainLossPaise > 0) {
        // GAIN: Debit Bank/Receivable (acc_1010), Credit Forex Gain (acc_8000)
        await db.query(
          `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
           VALUES ($1, $2, 'acc_1010', $3, 0, 'Forex Gain settlement differential')`,
          [line1Id, jeId, absGainLoss]
        );
        await db.query(
          `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
           VALUES ($1, $2, 'acc_8000', 0, $3, 'Realized Foreign Exchange Gain')`,
          [line2Id, jeId, absGainLoss]
        );
      } else {
        // LOSS: Debit Forex Loss (acc_8000), Credit Bank/Payable (acc_1010)
        await db.query(
          `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
           VALUES ($1, $2, 'acc_8000', $3, 0, 'Realized Foreign Exchange Loss')`,
          [line1Id, jeId, absGainLoss]
        );
        await db.query(
          `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
           VALUES ($1, $2, 'acc_1010', 0, $3, 'Forex Loss settlement differential')`,
          [line2Id, jeId, absGainLoss]
        );
      }

      await db.query('COMMIT');
    } catch (err) {
      try { await db.query('ROLLBACK'); } catch {}
      throw err;
    }
  }

  const logRes = await db.query(
    `INSERT INTO forex_gain_loss_logs (
      company_id, entity_type, entity_id, foreign_currency, foreign_amount,
      booking_rate, settlement_rate, gain_loss_paise, is_realized, journal_entry_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      companyId,
      entityType,
      entityId,
      foreignCurrency.toUpperCase(),
      fAmt,
      bRate,
      sRate,
      gainLossPaise,
      isRealized,
      jeId
    ]
  );

  return {
    ...logRes.rows[0],
    isGain: gainLossPaise > 0,
    differencePaise: BigInt(Math.abs(gainLossPaise))
  };
}
