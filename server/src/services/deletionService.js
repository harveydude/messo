import { getDb } from '../db/db.js';
import { recordAuditLog } from './auditService.js';

/**
 * Non-destructive soft-deletion pipeline conforming to MCA Rule 3(1).
 * Never executes SQL DELETE on financial records.
 * Marks record VOIDED/is_deleted = true, records deletion reason, and automatically
 * generates a reversing double-entry journal entry to cleanly adjust balances.
 */
export async function softDeleteTransaction({
  companyId = 'comp_1',
  entityType, // 'invoice', 'bill', 'expense', 'journal_entry'
  entityId,
  deletionReason,
  user = { id: 'usr_1', name: 'Authorized Accountant', role: 'CHARTERED_ACCOUNTANT' }
}) {
  if (!deletionReason || deletionReason.trim().length < 3) {
    throw new Error('Mandatory deletion_reason (at least 3 characters) required by MCA Rule 3(1) audit standards.');
  }

  const db = await getDb();
  const tableMap = {
    invoice: 'invoices',
    bill: 'bills',
    expense: 'expenses',
    journal_entry: 'journal_entries'
  };

  const tableName = tableMap[entityType];
  if (!tableName) {
    throw new Error(`Unsupported entityType for financial deletion: ${entityType}`);
  }

  // 1. Fetch current record
  const fetchRes = await db.query(
    `SELECT * FROM ${tableName} WHERE id = $1 AND company_id = $2`,
    [entityId, companyId]
  );

  if (fetchRes.rows.length === 0) {
    throw new Error(`${entityType} with ID ${entityId} not found`);
  }

  const record = fetchRes.rows[0];
  if (record.is_deleted) {
    throw new Error(`This ${entityType} has already been soft-deleted/voided.`);
  }

  // 2. Locate associated journal entry
  let originalJe = null;
  if (entityType === 'journal_entry') {
    originalJe = record;
  } else {
    const jeRes = await db.query(
      `SELECT * FROM journal_entries 
       WHERE company_id = $1 AND source_id = $2 AND is_deleted = false
       LIMIT 1`,
      [companyId, entityId]
    );
    originalJe = jeRes.rows[0] || null;
  }

  await db.query('BEGIN');
  let updatedRecord;
  let reversingEntryId = null;

  try {
    await db.query("SET LOCAL app.allow_journal_mutation = 'on'");

    // 3. If there is a posted journal entry, generate a Reversing Journal Entry
    if (originalJe) {
      const linesRes = await db.query(
        `SELECT * FROM journal_entry_lines WHERE journal_entry_id = $1 ORDER BY id ASC`,
        [originalJe.id]
      );

      const originalLines = linesRes.rows || [];

      if (originalLines.length > 0) {
        const revNumber = `REV-${originalJe.entry_number || originalJe.doc_number || originalJe.id}`;
        const reversalJeRes = await db.query(
          `INSERT INTO journal_entries (
            company_id, entry_date, entry_number, doc_number, memo, narration, source_type,
            doc_type, source_id, created_by, status, is_reversal, reverses_entry_id
          ) VALUES (
            $1, CURRENT_DATE, $2, $2, $3, $4, 'REVERSAL',
            'REVERSING_JOURNAL_ENTRY', $5, $6, 'POSTED', true, $7
          ) RETURNING id`,
          [
            companyId,
            revNumber,
            `Automatic Reversal: ${deletionReason}`,
            `MCA Compliant Reversal of ${originalJe.entry_number || originalJe.doc_number || originalJe.id} due to void: ${deletionReason}`,
            entityId,
            user.name || 'Accountant',
            originalJe.id
          ]
        );

        reversingEntryId = reversalJeRes.rows[0].id;

        // Swap debits and credits for every line to cleanly unwind ledger
        for (const line of originalLines) {
          const reversedDebit = Number(line.credit || 0);
          const reversedCredit = Number(line.debit || 0);
          const reversedDebitPaise = line.credit_paise ? Number(line.credit_paise) : Math.round(reversedDebit * 100);
          const reversedCreditPaise = line.debit_paise ? Number(line.debit_paise) : Math.round(reversedCredit * 100);

          await db.query(
            `INSERT INTO journal_entry_lines (
              journal_entry_id, account_id, debit, credit,
              debit_paise, credit_paise, debit_minor, credit_minor, description, contact_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              reversingEntryId,
              line.account_id,
              reversedDebit,
              reversedCredit,
              reversedDebitPaise,
              reversedCreditPaise,
              reversedDebitPaise,
              reversedCreditPaise,
              `Reversal line: ${line.description || ''}`,
              line.contact_id
            ]
          );
        }

        // Link original entry as reversed
        await db.query(
          `UPDATE journal_entries SET reversed_by_entry_id = $1 WHERE id = $2`,
          [reversingEntryId, originalJe.id]
        );
      }
    }

    // 4. Mark original entity as soft-deleted
    const updateRes = await db.query(
      `UPDATE ${tableName} 
       SET is_deleted = true,
           status = 'VOIDED',
           deleted_at = NOW(),
           deleted_by = $1,
           deletion_reason = $2,
           reversing_entry_id = $3
       WHERE id = $4 AND company_id = $5
       RETURNING *`,
      [user.name || 'Accountant', deletionReason, reversingEntryId, entityId, companyId]
    );

    updatedRecord = updateRes.rows[0];

    await db.query('COMMIT');
  } catch (err) {
    try { await db.query('ROLLBACK'); } catch {}
    throw err;
  }

  // 5. Append to MCA Rule 3(1) tamper-evident SHA-256 audit log
  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType,
    entityId,
    action: 'VOID',
    beforeJson: record,
    afterJson: {
      ...updatedRecord,
      reversing_entry_id: reversingEntryId
    }
  });

  return {
    success: true,
    entityType,
    entityId,
    status: updatedRecord?.status || 'VOIDED',
    is_deleted: true,
    reversingEntryId,
    deletionReason
  };
}

/**
 * Soft-deletes / archives an attachment while retaining cryptographic hash and audit trail.
 */
export async function softDeleteAttachment({
  companyId = 'comp_1',
  attachmentId,
  deletionReason,
  user = { id: 'usr_1', name: 'Authorized Accountant', role: 'OWNER' }
}) {
  if (!deletionReason || deletionReason.trim().length < 3) {
    throw new Error('Mandatory deletion_reason required for audit compliance.');
  }

  const db = await getDb();
  const fetchRes = await db.query(
    `SELECT * FROM attachments WHERE id = $1 AND company_id = $2`,
    [attachmentId, companyId]
  );

  if (fetchRes.rows.length === 0) {
    throw new Error(`Attachment ${attachmentId} not found`);
  }

  const current = fetchRes.rows[0];

  const updateRes = await db.query(
    `UPDATE attachments
     SET status = 'ARCHIVED_DELETED',
         deleted_at = NOW(),
         deleted_by = $1,
         deletion_reason = $2
     WHERE id = $3 AND company_id = $4
     RETURNING *`,
    [user.name || 'Accountant', deletionReason, attachmentId, companyId]
  );

  const updated = updateRes.rows[0];

  await recordAuditLog({
    companyId,
    userId: user.id,
    userRole: user.role,
    entityType: 'attachment',
    entityId: attachmentId,
    action: 'SOFT_DELETE',
    beforeJson: current,
    afterJson: updated
  });

  return {
    success: true,
    attachmentId,
    status: 'ARCHIVED_DELETED',
    sha256: current.sha256
  };
}
