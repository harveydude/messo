/**
 * Meso Phase 28: Ind AS 115 / ASC 606 Automated Revenue Recognition Engine
 * Handles performance obligations, unearned/deferred revenue liabilities (acc_2100),
 * and automated straight-line or milestone monthly revenue recognition schedules.
 */

import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

export async function createRevenueContract({
  companyId = 'comp_1',
  customerId,
  contractNumber,
  invoiceId = null,
  totalContractValuePaise,
  recognitionMethod = 'STRAIGHT_LINE_MONTHLY',
  startDate = new Date().toISOString().slice(0, 10),
  totalPeriods = 12,
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();
  const cNo = contractNumber || `REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const totalVal = BigInt(totalContractValuePaise);

  const startD = new Date(startDate);
  const endD = new Date(startD);
  endD.setMonth(endD.getMonth() + totalPeriods);
  const endDateStr = endD.toISOString().slice(0, 10);

  // 1. Insert Contract
  const cRes = await db.query(
    `INSERT INTO revenue_contracts (
      company_id, contract_number, customer_id, invoice_id,
      total_contract_value_paise, recognized_revenue_paise, deferred_revenue_paise,
      recognition_method, start_date, end_date, total_periods, status
    ) VALUES ($1, $2, $3, $4, $5, 0, $5, $6, $7, $8, $9, 'ACTIVE')
    RETURNING *`,
    [
      companyId,
      cNo,
      customerId,
      invoiceId,
      totalVal.toString(),
      recognitionMethod,
      startDate,
      endDateStr,
      totalPeriods
    ]
  );
  const contract = cRes.rows[0];

  // 2. Generate Monthly Schedules
  const baseMonthly = totalVal / BigInt(totalPeriods);
  const remainder = totalVal - (baseMonthly * BigInt(totalPeriods));

  for (let i = 1; i <= totalPeriods; i++) {
    const sDate = new Date(startD);
    sDate.setMonth(sDate.getMonth() + (i - 1));
    const sDateStr = sDate.toISOString().slice(0, 10);

    // Give remainder paise to period 1
    const amount = i === 1 ? baseMonthly + remainder : baseMonthly;

    await db.query(
      `INSERT INTO revenue_schedules (
        contract_id, period_index, schedule_date, amount_to_recognize_paise, status
      ) VALUES ($1, $2, $3, $4, 'PENDING')`,
      [contract.id, i, sDateStr, amount.toString()]
    );
  }

  // 3. Post Initial Unearned Revenue Journal Entry: Debit A/R, Credit Deferred Revenue (acc_2100)
  const jeId = 'je_rev_init_' + Date.now();
  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'REVENUE_CONTRACT_INIT', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        'JE-UNEARNED-' + cNo,
        startDate,
        `Initial Unearned Revenue recognition liability for Contract ${cNo}`,
        contract.id
      ]
    );

    // Ensure Accounts Exist
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_1100', $1, '1100', 'Accounts Receivable', 'BALANCE_SHEET', 'ACCOUNTS_RECEIVABLE') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2100', $1, '2100', 'Deferred / Unearned Revenue', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit A/R
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_1100', $3, 0, 'Subscription contract receivable')`,
      ['jel_ar_' + Date.now(), jeId, totalVal.toString()]
    );

    // Credit Deferred Revenue
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2100', 0, $3, 'Unearned revenue liability under Ind AS 115')`,
      ['jel_unearned_' + Date.now(), jeId, totalVal.toString()]
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
    entityType: 'revenue_contract',
    entityId: contract.id,
    action: 'CREATE',
    afterJson: { contractNumber: cNo, totalValuePaise: totalVal.toString(), totalPeriods }
  });

  return contract;
}

export async function recognizeScheduledRevenue({
  companyId = 'comp_1',
  contractId,
  periodIndex = 1,
  recognitionDate = new Date().toISOString().slice(0, 10),
  user = { id: 'usr_1', role: 'FINANCE_MANAGER' }
}) {
  const db = await getDb();

  // 1. Fetch Contract & Schedule
  const cRes = await db.query(
    `SELECT * FROM revenue_contracts WHERE id = $1 AND company_id = $2`,
    [contractId, companyId]
  );
  if (cRes.rows.length === 0) {
    throw new Error(`Revenue Contract ${contractId} not found`);
  }
  const contract = cRes.rows[0];

  const sRes = await db.query(
    `SELECT * FROM revenue_schedules WHERE contract_id = $1 AND period_index = $2`,
    [contractId, periodIndex]
  );
  if (sRes.rows.length === 0) {
    throw new Error(`Schedule period ${periodIndex} not found for contract ${contractId}`);
  }
  const schedule = sRes.rows[0];

  if (schedule.status === 'RECOGNIZED') {
    throw new Error(`Schedule period ${periodIndex} has already been recognized`);
  }

  const amountPaise = BigInt(schedule.amount_to_recognize_paise);
  const jeId = 'je_rev_rec_' + Date.now();

  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 2. Post Monthly Recognition Journal Entry: Debit Deferred Revenue (acc_2100), Credit Sales Revenue (acc_4000)
    await db.query(
      `INSERT INTO journal_entries (
        id, company_id, entry_number, entry_date, memo, source_type, source_id, status
      ) VALUES ($1, $2, $3, $4, $5, 'REVENUE_RECOGNITION', $6, 'POSTED')`,
      [
        jeId,
        companyId,
        `JE-REC-${contract.contract_number}-P${periodIndex}`,
        recognitionDate,
        `Amortization of Period ${periodIndex} Revenue for Contract ${contract.contract_number}`,
        schedule.id
      ]
    );

    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_2100', $1, '2100', 'Deferred / Unearned Revenue', 'BALANCE_SHEET', 'CURRENT_LIABILITY') ON CONFLICT (id) DO NOTHING`, [companyId]);
    await db.query(`INSERT INTO chart_of_accounts (id, company_id, code, name, statement_group, account_type) VALUES ('acc_4000', $1, '4000', 'Sales Revenue', 'PROFIT_AND_LOSS', 'INCOME') ON CONFLICT (id) DO NOTHING`, [companyId]);

    // Debit Deferred Revenue (reduces liability)
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_2100', $3, 0, 'Release deferred revenue')`,
      ['jel_rec_def_' + Date.now(), jeId, amountPaise.toString()]
    );

    // Credit Sales Revenue (earns P&L income)
    await db.query(
      `INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_paise, credit_paise, description)
       VALUES ($1, $2, 'acc_4000', 0, $3, 'Recognized earned revenue under Ind AS 115')`,
      ['jel_rec_rev_' + Date.now(), jeId, amountPaise.toString()]
    );

    // 3. Update Schedule
    await db.query(
      `UPDATE revenue_schedules
       SET status = 'RECOGNIZED', journal_entry_id = $1, recognized_at = NOW()
       WHERE id = $2`,
      [jeId, schedule.id]
    );

    // 4. Update Contract
    const newRecognized = BigInt(contract.recognized_revenue_paise) + amountPaise;
    const newDeferred = BigInt(contract.deferred_revenue_paise) - amountPaise;
    const isCompleted = newDeferred <= 0n;

    await db.query(
      `UPDATE revenue_contracts
       SET recognized_revenue_paise = $1, deferred_revenue_paise = $2,
           status = CASE WHEN $3 = true THEN 'COMPLETED' ELSE status END
       WHERE id = $4`,
      [newRecognized.toString(), newDeferred.toString(), isCompleted, contract.id]
    );

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  return {
    success: true,
    contractId: contract.id,
    periodIndex,
    recognizedAmountPaise: amountPaise.toString(),
    journalEntryId: jeId
  };
}

export async function getRevenueContractSummary(contractId, companyId = 'comp_1') {
  const db = await getDb();
  const cRes = await db.query(
    `SELECT * FROM revenue_contracts WHERE id = $1 AND company_id = $2`,
    [contractId, companyId]
  );
  if (cRes.rows.length === 0) return null;
  const contract = cRes.rows[0];

  const sRes = await db.query(
    `SELECT * FROM revenue_schedules WHERE contract_id = $1 ORDER BY period_index ASC`,
    [contractId]
  );

  const total = BigInt(contract.total_contract_value_paise);
  const recognized = BigInt(contract.recognized_revenue_paise);
  const progressPercent = total > 0n ? Number((recognized * 10000n) / total) / 100 : 0;

  return {
    ...contract,
    progressPercent,
    schedules: sRes.rows || []
  };
}
