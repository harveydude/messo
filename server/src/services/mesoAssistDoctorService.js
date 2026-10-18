/**
 * Phase 48: "Meso Assist" AI Accounting Error Doctor
 * Proactively scans the general ledger for accounting anomalies:
 * 1. Inter-state vendor GST mismatch (CGST/SGST charged instead of IGST)
 * 2. Missing TDS under Section 194J on professional fees >= ₹30,000
 * 3. Negative Cash/Bank ledger balance
 * 4. Uncategorized suspense entries
 * Surfaces 1-click remediation actions with instant resolution.
 */

import { getDb } from '../db/db.js';

/**
 * Scan ledger for all accounting anomalies
 */
export async function runMesoAssistScan(companyId = 'comp_1') {
  const db = await getDb();
  const detectedAnomalies = [];

  // Get company details (e.g. GSTIN)
  let companyGstin = '27AABCM1234F1Z5'; // Default MH
  try {
    const compRes = await db.query(
      `SELECT id, name, tax_id_number FROM companies WHERE id = $1`,
      [companyId]
    );
    if (compRes.rows[0]?.tax_id_number && compRes.rows[0].tax_id_number.length >= 2) {
      companyGstin = compRes.rows[0].tax_id_number;
    }
  } catch {}
  const companyStateCode = companyGstin.substring(0, 2);

  // ============================================================================
  // Anomaly 1: GST Inter-State Place of Supply Mismatch
  // Vendor in different state (e.g. 29 KA), but bill line has CGST/SGST instead of IGST
  // ============================================================================
  const billGstRes = await db.query(
    `SELECT b.id, b.bill_number, b.vendor_id, b.cgst_paise, b.sgst_paise, b.igst_paise,
            c.display_name AS vendor_name, c.gstin AS vendor_gstin
     FROM bills b
     JOIN contacts c ON c.id = b.vendor_id
     WHERE b.company_id = $1 
       AND c.gstin IS NOT NULL 
       AND LENGTH(c.gstin) >= 2
       AND SUBSTRING(c.gstin, 1, 2) != $2
       AND (b.cgst_paise > 0 OR b.sgst_paise > 0)
       AND b.status != 'VOID'`,
    [companyId, companyStateCode]
  );

  for (const b of billGstRes.rows) {
    const totalLocalTax = parseInt(b.cgst_paise || 0, 10) + parseInt(b.sgst_paise || 0, 10);
    const anomalyId = `anom_gst_${b.id}`;
    const desc = `Inter-state vendor ${b.vendor_name} (GSTIN: ${b.vendor_gstin}, State: ${b.vendor_gstin.substring(0, 2)}) billed with CGST/SGST (₹${(totalLocalTax / 100).toFixed(2)}) instead of statutory IGST for Company State ${companyStateCode}.`;

    detectedAnomalies.push({
      id: anomalyId,
      companyId,
      anomalyType: 'GST_INTER_STATE_MISMATCH',
      severity: 'HIGH',
      entityType: 'BILL',
      entityId: b.id,
      description: desc,
      remediationAction: 'CONVERT_TO_IGST',
      remediationPayload: {
        billId: b.id,
        currentCgstPaise: parseInt(b.cgst_paise || 0, 10),
        currentSgstPaise: parseInt(b.sgst_paise || 0, 10),
        targetIgstPaise: totalLocalTax
      }
    });
  }

  // ============================================================================
  // Anomaly 2: Missing TDS under Section 194J on Professional & Technical Fees
  // Threshold: >= ₹30,000 (3,000,000 paise) on professional/consulting bills
  // ============================================================================
  const tdsRes = await db.query(
    `SELECT b.id, b.bill_number, COALESCE(b.amount_paise, b.open_balance_paise, 0) AS total_paise, 
            COALESCE(b.subtotal_paise, b.amount_paise, 0) AS subtotal_paise, b.notes,
            c.display_name AS vendor_name
     FROM bills b
     JOIN contacts c ON c.id = b.vendor_id
     WHERE b.company_id = $1
       AND COALESCE(b.amount_paise, b.open_balance_paise, 0) >= 3000000
       AND (
         LOWER(b.notes) LIKE '%consult%' OR 
         LOWER(b.notes) LIKE '%legal%' OR 
         LOWER(b.notes) LIKE '%professional%' OR 
         LOWER(b.notes) LIKE '%audit%' OR
         LOWER(c.display_name) LIKE '%consult%' OR
         LOWER(c.display_name) LIKE '%legal%' OR
         LOWER(c.display_name) LIKE '%advisor%'
       )
       AND (b.tds_deducted_paise IS NULL OR b.tds_deducted_paise = 0)
       AND b.status != 'VOID'`,
    [companyId]
  );

  for (const b of tdsRes.rows) {
    const anomalyId = `anom_tds_${b.id}`;
    const subtotal = parseInt(b.subtotal_paise || b.total_paise, 10);
    const statutoryTdsPaise = Math.round(subtotal * 0.10); // 10% standard Section 194J
    const desc = `Vendor bill ${b.bill_number || b.id} from ${b.vendor_name} for Professional Fees (₹${(subtotal / 100).toFixed(2)}) exceeds Section 194J ₹30,000 threshold with zero TDS deducted.`;

    detectedAnomalies.push({
      id: anomalyId,
      companyId,
      anomalyType: 'MISSING_TDS_194J',
      severity: 'CRITICAL',
      entityType: 'BILL',
      entityId: b.id,
      description: desc,
      remediationAction: 'DEDUCT_TDS_194J',
      remediationPayload: {
        billId: b.id,
        subtotalPaise: subtotal,
        tdsRatePercent: 10,
        tdsAmountPaise: statutoryTdsPaise,
        adjustedBalanceDuePaise: Math.max(0, parseInt(b.total_paise, 10) - statutoryTdsPaise)
      }
    });
  }

  // ============================================================================
  // Anomaly 3: Negative Cash / Bank Ledger Balance
  // Cash in Hand or Bank account net balance < 0 (unnatural credit on an asset)
  // ============================================================================
  const cashRes = await db.query(
    `SELECT coa.id, coa.code, coa.name,
            COALESCE(SUM(jel.debit_paise), 0) - COALESCE(SUM(jel.credit_paise), 0) AS net_balance_paise
     FROM chart_of_accounts coa
     LEFT JOIN journal_entry_lines jel ON jel.account_id = coa.id
     LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'POSTED'
     WHERE coa.company_id = $1 
       AND coa.statement_group = 'BALANCE_SHEET'
       AND coa.account_type IN ('BANK', 'CURRENT_ASSET')
       AND (coa.code IN ('1000', '1010', '1011') OR LOWER(coa.name) LIKE '%cash%')
     GROUP BY coa.id, coa.code, coa.name
     HAVING (COALESCE(SUM(jel.debit_paise), 0) - COALESCE(SUM(jel.credit_paise), 0)) < 0`,
    [companyId]
  );

  for (const c of cashRes.rows) {
    const netBal = parseInt(c.net_balance_paise, 10);
    const anomalyId = `anom_neg_cash_${c.id}`;
    const desc = `Account ${c.code} (${c.name}) has an unnatural negative cash balance of ₹${(netBal / 100).toFixed(2)}. Physical cash cannot be negative; unrecorded deposits or timing discrepancies exist.`;

    detectedAnomalies.push({
      id: anomalyId,
      companyId,
      anomalyType: 'NEGATIVE_CASH_BALANCE',
      severity: 'HIGH',
      entityType: 'ACCOUNT',
      entityId: c.id,
      description: desc,
      remediationAction: 'INVESTIGATE_UNRECORDED_DEPOSITS',
      remediationPayload: {
        accountId: c.id,
        currentNegativeBalancePaise: netBal,
        recommendedAdjustmentPaise: Math.abs(netBal)
      }
    });
  }

  // ============================================================================
  // Anomaly 4: Uncategorized Suspense Clearing Entries
  // Entries posted into account code 2080 (Suspense Account)
  // ============================================================================
  const suspenseRes = await db.query(
    `SELECT jel.id AS line_id, jel.journal_entry_id, jel.debit_paise, jel.credit_paise, jel.description,
            je.entry_number, je.entry_date
     FROM journal_entry_lines jel
     JOIN chart_of_accounts coa ON coa.id = jel.account_id
     JOIN journal_entries je ON je.id = jel.journal_entry_id
     WHERE coa.company_id = $1 
       AND (coa.code = '2080' OR coa.id = 'acc_suspense_clearing')
       AND je.status = 'POSTED'`,
    [companyId]
  );

  for (const s of suspenseRes.rows) {
    const anomalyId = `anom_susp_${s.line_id}`;
    const amount = parseInt(s.debit_paise, 10) || parseInt(s.credit_paise, 10);
    const desc = `Journal entry ${s.entry_number} contains unclassified suspense transaction of ₹${(amount / 100).toFixed(2)} on line ${s.line_id}.`;

    detectedAnomalies.push({
      id: anomalyId,
      companyId,
      anomalyType: 'UNCATEGORIZED_SUSPENSE',
      severity: 'MEDIUM',
      entityType: 'JOURNAL_ENTRY_LINE',
      entityId: s.line_id,
      description: desc,
      remediationAction: 'RECLASSIFY_SUSPENSE',
      remediationPayload: {
        lineId: s.line_id,
        journalEntryId: s.journal_entry_id,
        amountPaise: amount,
        suggestedAccountId: 'acc_office_expenses'
      }
    });
  }

  // Persist anomalies into accounting_anomalies table
  for (const anom of detectedAnomalies) {
    await db.query(
      `INSERT INTO accounting_anomalies (
         id, company_id, anomaly_type, severity, entity_type, entity_id,
         description, remediation_action, remediation_payload, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'OPEN')
       ON CONFLICT (id) DO UPDATE SET
         description = EXCLUDED.description,
         remediation_payload = EXCLUDED.remediation_payload`,
      [
        anom.id,
        companyId,
        anom.anomalyType,
        anom.severity,
        anom.entityType,
        anom.entityId,
        anom.description,
        anom.remediationAction,
        JSON.stringify(anom.remediationPayload)
      ]
    );
  }

  return {
    scannedAt: new Date().toISOString(),
    companyId,
    totalAnomaliesCount: detectedAnomalies.length,
    anomalies: detectedAnomalies
  };
}

/**
 * 1-Click Remediation Execution
 */
export async function resolveAnomaly(companyId = 'comp_1', anomalyId) {
  const db = await getDb();

  const anomRes = await db.query(
    `SELECT * FROM accounting_anomalies WHERE id = $1 AND company_id = $2`,
    [anomalyId, companyId]
  );

  if (!anomRes.rows[0]) {
    throw new Error(`Anomaly ${anomalyId} not found`);
  }

  const anom = anomRes.rows[0];
  const payload = typeof anom.remediation_payload === 'string' 
    ? JSON.parse(anom.remediation_payload) 
    : anom.remediation_payload;

  let remediationDetails = {};

  if (anom.anomaly_type === 'GST_INTER_STATE_MISMATCH') {
    // Convert CGST + SGST to IGST on bill
    await db.query(
      `UPDATE bills 
       SET cgst_paise = 0, sgst_paise = 0, igst_paise = $1 
       WHERE id = $2 AND company_id = $3`,
      [payload.targetIgstPaise, payload.billId, companyId]
    );
    remediationDetails = { actionTaken: 'Converted CGST and SGST into IGST', igstPaise: payload.targetIgstPaise };
  } else if (anom.anomaly_type === 'MISSING_TDS_194J') {
    // Apply Section 194J TDS and adjust balance due
    await db.query(
      `UPDATE bills 
       SET tds_section = '194J', 
           tds_deducted_paise = $1, 
           open_balance_paise = $2 
       WHERE id = $3 AND company_id = $4`,
      [payload.tdsAmountPaise, payload.adjustedBalanceDuePaise, payload.billId, companyId]
    );
    remediationDetails = { actionTaken: 'Applied Section 194J 10% TDS deduction', tdsAmountPaise: payload.tdsAmountPaise };
  } else if (anom.anomaly_type === 'UNCATEGORIZED_SUSPENSE') {
    // Reclassify line from suspense to target expense account
    await db.query(`SET app.allow_journal_mutation = 'on'`);
    try {
      await db.query(
        `UPDATE journal_entry_lines 
         SET account_id = $1, description = description || ' [Reclassified from Suspense by Meso Assist]' 
         WHERE id = $2`,
        [payload.suggestedAccountId || 'acc_office_expenses', payload.lineId]
      );
    } finally {
      await db.query(`SET app.allow_journal_mutation = 'off'`);
    }
    remediationDetails = { actionTaken: 'Reclassified line from Suspense to target expense category', lineId: payload.lineId };
  } else {
    remediationDetails = { actionTaken: 'Flagged for accountant manual verification' };
  }

  // Mark resolved
  const updatedRes = await db.query(
    `UPDATE accounting_anomalies 
     SET status = 'RESOLVED', resolved_at = NOW() 
     WHERE id = $1 AND company_id = $2 
     RETURNING *`,
    [anomalyId, companyId]
  );

  return {
    success: true,
    anomalyId,
    status: 'RESOLVED',
    remediationDetails,
    anomaly: updatedRes.rows[0]
  };
}
