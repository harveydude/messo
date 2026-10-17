import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';
import { matchOrAutoCreateContact, matchOrAutoCreateAccount } from './stagingDoctor.js';

/**
 * Promotes a validated import batch atomically into live tables (Phase 10).
 */
export async function promoteImportBatch({ batchId, companyId = 'comp_1', user = { id: 'usr_1', role: 'OWNER' } }) {
  const db = await getDb();

  const batchRes = await db.query(
    `SELECT * FROM import_batches WHERE id = $1 AND company_id = $2`,
    [batchId, companyId]
  );

  if (batchRes.rows.length === 0) {
    throw new Error(`Import batch ${batchId} not found`);
  }

  const batch = batchRes.rows[0];
  if (batch.status === 'PROMOTED') {
    throw new Error(`Batch ${batchId} has already been promoted to live ledger.`);
  }

  const rowsRes = await db.query(
    `SELECT * FROM import_staging_rows 
     WHERE batch_id = $1 AND validation_status IN ('VALID', 'SUSPENSE_CORRECTED')
     ORDER BY row_index ASC`,
    [batchId]
  );

  const stagingRows = rowsRes.rows || [];
  if (stagingRows.length === 0) {
    throw new Error('No valid staging rows found to promote.');
  }

  await db.query('BEGIN');
  let promotedCount = 0;

  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    for (const staged of stagingRows) {
      const data = staged.mapped_data || {};
      let promotedId = null;

      if (staged.target_entity === 'contacts') {
        const { contact } = await matchOrAutoCreateContact({
          companyId,
          name: data.display_name,
          gstin: data.gstin,
          pan: data.pan,
          contactType: data.contact_type || 'CUSTOMER'
        });
        promotedId = contact.id;
        await db.query(`UPDATE contacts SET import_batch_id = $1 WHERE id = $2`, [batchId, promotedId]);
      } else if (staged.target_entity === 'invoices') {
        const invId = 'inv_' + Math.random().toString(36).substring(2, 10);
        const amount = Number(data.total_amount || 0);
        const amountPaise = Math.round(amount * 100);

        // Ensure contact exists
        const { contact } = await matchOrAutoCreateContact({
          companyId,
          name: data.contact_name || 'Imported Customer',
          contactType: 'CUSTOMER'
        });

        await db.query(
          `INSERT INTO invoices (
            id, company_id, invoice_number, customer_id, issue_date, due_date,
            subtotal_paise, total_paise, balance_due_paise, status, import_batch_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            invId,
            companyId,
            data.doc_number || `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            contact.id,
            data.txn_date || new Date().toISOString().split('T')[0],
            data.txn_date || new Date().toISOString().split('T')[0],
            amountPaise,
            amountPaise,
            amountPaise,
            'OPEN',
            batchId
          ]
        );
        promotedId = invId;
      } else if (staged.target_entity === 'chart_of_accounts') {
        const { account } = await matchOrAutoCreateAccount({
          companyId,
          accountName: data.name,
          accountType: data.account_type || 'Expense'
        });
        promotedId = account.id;
        await db.query(`UPDATE chart_of_accounts SET import_batch_id = $1 WHERE id = $2`, [batchId, promotedId]);
      }

      await db.query(
        `UPDATE import_staging_rows 
         SET validation_status = 'PROMOTED', promoted_entity_id = $1 
         WHERE id = $2`,
        [promotedId, staged.id]
      );

      promotedCount++;
    }

    await db.query(
      `UPDATE import_batches
       SET status = 'PROMOTED', promoted_at = NOW()
       WHERE id = $1`,
      [batchId]
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
    entityType: 'import_batch',
    entityId: batchId,
    action: 'CREATE',
    afterJson: { batchId, promotedCount, fileName: batch.file_name }
  });

  return {
    success: true,
    batchId,
    promotedCount,
    status: 'PROMOTED'
  };
}

/**
 * 1-Click Rollback Pipeline: cleanly reverses an entire imported batch (Phase 10).
 */
export async function rollbackImportBatch({ batchId, companyId = 'comp_1', user = { id: 'usr_1', role: 'OWNER' } }) {
  const db = await getDb();

  const batchRes = await db.query(
    `SELECT * FROM import_batches WHERE id = $1 AND company_id = $2`,
    [batchId, companyId]
  );

  if (batchRes.rows.length === 0) {
    throw new Error(`Batch ${batchId} not found`);
  }

  const batch = batchRes.rows[0];
  if (batch.status === 'ROLLED_BACK') {
    throw new Error(`Batch ${batchId} has already been rolled back.`);
  }

  await db.query('BEGIN');
  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 1. Soft-delete invoices from this batch
    await db.query(
      `UPDATE invoices 
       SET is_deleted = true, status = 'VOIDED', deletion_reason = 'Rollback of Import Batch ' || $1
       WHERE import_batch_id = $1 AND company_id = $2`,
      [batchId, companyId]
    );

    // 2. Soft-delete bills from this batch
    await db.query(
      `UPDATE bills 
       SET is_deleted = true, status = 'VOIDED', deletion_reason = 'Rollback of Import Batch ' || $1
       WHERE import_batch_id = $1 AND company_id = $2`,
      [batchId, companyId]
    );

    // 3. Mark batch as ROLLED_BACK
    await db.query(
      `UPDATE import_batches 
       SET status = 'ROLLED_BACK', rolled_back_at = NOW() 
       WHERE id = $1`,
      [batchId]
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
    entityType: 'import_batch',
    entityId: batchId,
    action: 'VOID',
    afterJson: { batchId, action: 'ROLLBACK', fileName: batch.file_name }
  });

  return {
    success: true,
    batchId,
    status: 'ROLLED_BACK'
  };
}
