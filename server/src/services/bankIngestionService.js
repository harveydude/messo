/**
 * Meso Phase 41: Universal Indian Bank Statement & Feed Ingestor
 * Multi-format parser for HDFC, ICICI, SBI, Axis, Kotak, and Credit Cards.
 * Automatic UTR extraction and SHA-256 duplicate transaction prevention.
 */

import crypto from 'crypto';
import { getDb } from '../db/db.js';

export const SUPPORTED_BANKS = {
  HDFC: 'HDFC',
  ICICI: 'ICICI',
  SBI: 'SBI',
  AXIS: 'AXIS',
  KOTAK: 'KOTAK',
  GENERIC: 'GENERIC'
};

/**
 * Extract UTR / Reference number from Indian bank narrations
 * Pattern matches NEFT, RTGS, IMPS, UPI, and POS reference codes.
 */
export function extractUtrNumber(narration = '') {
  if (!narration) return null;
  const utrMatch = narration.match(/(?:NEFT|RTGS|IMPS|UPI|REF|INF)[-/:\s]*([A-Z0-9]{8,22})/i);
  if (utrMatch) return utrMatch[1].toUpperCase();

  const upiMatch = narration.match(/UPI[-/:]*([0-9]{12})/i);
  if (upiMatch) return upiMatch[1];

  const genericAlphaNum = narration.match(/\b([A-Z0-9]{12,18})\b/i);
  return genericAlphaNum ? genericAlphaNum[1] : null;
}

/**
 * Compute SHA-256 hash for strict transaction deduplication
 */
export function computeTransactionHash({ companyId, bankAccountId, date, amountPaise, utr, description }) {
  const normDate = date.trim();
  const normAmt = parseInt(amountPaise, 10);
  const normUtr = (utr || '').trim().toUpperCase();
  const normDesc = (description || '').trim().toLowerCase().replace(/\s+/g, ' ');

  const raw = `${companyId}|${bankAccountId}|${normDate}|${normAmt}|${normUtr || normDesc}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Universal Indian Bank CSV statement parser
 */
export function parseBankCsvContent(csvContent, bankName = SUPPORTED_BANKS.GENERIC) {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    // Simple CSV splitter handling quoted cells
    const cells = rawLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length < 2) continue;

    const rowObj = {};
    headers.forEach((h, idx) => {
      rowObj[h] = cells[idx] || '';
    });

    let date = rowObj['date'] || rowObj['txn date'] || rowObj['transaction date'] || rowObj['value date'] || new Date().toISOString().split('T')[0];
    let description = rowObj['description'] || rowObj['narration'] || rowObj['remarks'] || rowObj['particulars'] || 'Bank Transaction';
    let payee = rowObj['payee'] || rowObj['party name'] || '';
    let debitStr = rowObj['debit'] || rowObj['withdrawal'] || rowObj['dr'] || rowObj['withdrawal amount'] || '0';
    let creditStr = rowObj['credit'] || rowObj['deposit'] || rowObj['cr'] || rowObj['deposit amount'] || '0';
    let refNo = rowObj['cheque no'] || rowObj['ref no'] || rowObj['chq/ref number'] || rowObj['utr'] || '';

    // Clean amounts and convert to integer paise
    const debit = Math.round(parseFloat(debitStr.replace(/[^0-9.]/g, '') || 0) * 100);
    const credit = Math.round(parseFloat(creditStr.replace(/[^0-9.]/g, '') || 0) * 100);

    // Standardize date to YYYY-MM-DD
    if (date.includes('/')) {
      const parts = date.split('/');
      if (parts[2]?.length === 4) {
        // DD/MM/YYYY
        date = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    const utr = refNo || extractUtrNumber(description);

    rows.push({
      date,
      description,
      payee: payee || (utr ? `Party Ref ${utr}` : 'Counterparty'),
      spentPaise: debit,
      receivedPaise: credit,
      utrNumber: utr,
      rawLine: rowObj
    });
  }

  return rows;
}

/**
 * Ingest parsed transactions into bank_transactions with deduplication
 */
export async function ingestBankStatement({
  companyId = 'comp_1',
  bankAccountId,
  bankName = SUPPORTED_BANKS.GENERIC,
  csvContent = '',
  transactionsList = []
}) {
  const db = await getDb();
  const parsedRows = transactionsList.length > 0 
    ? transactionsList 
    : parseBankCsvContent(csvContent, bankName);

  let ingestedCount = 0;
  let duplicateCount = 0;
  const ingestedTransactions = [];

  for (const txn of parsedRows) {
    const netAmount = (txn.spentPaise > 0 ? -txn.spentPaise : txn.receivedPaise);
    const hash = computeTransactionHash({
      companyId,
      bankAccountId,
      date: txn.date,
      amountPaise: netAmount,
      utr: txn.utrNumber,
      description: txn.description
    });

    const txnId = 'bt_' + Date.now() + '_' + Math.floor(Math.random() * 10000);

    try {
      const res = await db.query(
        `INSERT INTO bank_transactions 
         (id, company_id, bank_connection_id, bank_account_id, account_code, date, description, payee, spent_paise, received_paise, status, hash_dedup, utr_number, raw_statement_line)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'FOR_REVIEW', $11, $12, $13)
         ON CONFLICT (company_id, hash_dedup) DO NOTHING
         RETURNING *`,
        [
          txnId,
          companyId,
          bankAccountId,
          bankAccountId,
          '1010', // Default Asset Bank Account Code
          txn.date,
          txn.description,
          txn.payee || '',
          txn.spentPaise || 0,
          txn.receivedPaise || 0,
          hash,
          txn.utrNumber,
          JSON.stringify(txn.rawLine || {})
        ]
      );

      if (res.rows[0]) {
        ingestedCount++;
        ingestedTransactions.push(res.rows[0]);
      } else {
        duplicateCount++;
      }
    } catch (err) {
      if (err.message.includes('unique') || err.message.includes('duplicate')) {
        duplicateCount++;
      } else {
        throw err;
      }
    }
  }

  return {
    success: true,
    bankName,
    totalParsed: parsedRows.length,
    ingestedCount,
    duplicateCount,
    transactions: ingestedTransactions
  };
}
