import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { multiTenantContext, requirePermission, ROLES } from '../middleware/rbac.js';
import { getCompanyPolicy, updateCompanyPolicy, checkBooksLock, getEffectiveTaxSchedule } from '../services/policyService.js';
import { verifyAuditChain, recordAuditLog } from '../services/auditService.js';
import { softDeleteTransaction, softDeleteAttachment } from '../services/deletionService.js';
import { getDb } from '../db/db.js';

const router = express.Router();

router.use(multiTenantContext);

/**
 * 1. Policy Management (Phase 2 & Phase 5)
 */
router.get('/policies', async (req, res) => {
  try {
    const policy = await getCompanyPolicy(req.companyId);
    res.json({ success: true, policy });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.put('/policies', requirePermission('MANAGE_POLICIES'), async (req, res) => {
  try {
    const updated = await updateCompanyPolicy(req.companyId, req.body, req.user);
    res.json({ success: true, policy: updated });
  } catch (err) {
    handleApiError(res, err);
  }
});

/**
 * 2. Books Closure Lock Check (Phase 5)
 */
router.post('/check-lock', async (req, res) => {
  try {
    const { txn_date, is_prior_period_adjustment } = req.body;
    const lockCheck = await checkBooksLock(req.companyId, txn_date, is_prior_period_adjustment);
    if (!lockCheck.allowed) {
      return res.status(403).json({ success: false, ...lockCheck });
    }
    res.json({ success: true, ...lockCheck });
  } catch (err) {
    handleApiError(res, err);
  }
});

/**
 * 3. MCA Rule 3(1) Tamper-Evident Audit Trail (Phase 3)
 */
router.get('/audit-trail', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT id, company_id, user_id, user_role, entity_type, entity_id, action,
              before_json, after_json, previous_hash, current_hash, created_at, event_summary
       FROM audit_logs
       WHERE company_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [req.companyId]
    );
    res.json({ success: true, count: result.rows.length, audit_logs: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/audit-trail/verify', async (req, res) => {
  try {
    const verification = await verifyAuditChain(req.companyId);
    res.json({ success: true, verification });
  } catch (err) {
    handleApiError(res, err);
  }
});

/**
 * 4. Safe Soft-Deletion Pipeline with Reversing Journal Entries (Phase 4)
 */
router.post('/void', requirePermission('SOFT_DELETE_OR_VOID'), async (req, res) => {
  try {
    const { entity_type, entity_id, deletion_reason } = req.body;
    const result = await softDeleteTransaction({
      companyId: req.companyId,
      entityType: entity_type,
      entityId: entity_id,
      deletionReason: deletion_reason,
      user: req.user
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/attachments/void', requirePermission('SOFT_DELETE_OR_VOID'), async (req, res) => {
  try {
    const { attachment_id, deletion_reason } = req.body;
    const result = await softDeleteAttachment({
      companyId: req.companyId,
      attachmentId: attachment_id,
      deletionReason: deletion_reason,
      user: req.user
    });
    res.json(result);
  } catch (err) {
    handleApiError(res, err);
  }
});

/**
 * 5. Effective-Dated Tax Schedules (Phase 5)
 */
router.get('/tax-schedules', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT * FROM effective_dated_tax_schedules WHERE company_id = $1 ORDER BY effective_from DESC`,
      [req.companyId]
    );
    res.json({ success: true, count: result.rows.length, schedules: result.rows });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.post('/tax-schedules', requirePermission('MANAGE_POLICIES'), async (req, res) => {
  try {
    const { hsn_or_section_code, kind, description, rate_bp, effective_from, effective_to } = req.body;
    const db = await getDb();

    const insertRes = await db.query(
      `INSERT INTO effective_dated_tax_schedules (
        company_id, hsn_or_section_code, kind, description, rate_bp, effective_from, effective_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.companyId,
        hsn_or_section_code,
        kind || 'GST',
        description || '',
        rate_bp,
        effective_from,
        effective_to || '2099-12-31'
      ]
    );

    const created = insertRes.rows[0];

    await recordAuditLog({
      companyId: req.companyId,
      userId: req.user.id,
      userRole: req.user.role,
      entityType: 'tax_schedule',
      entityId: created.id,
      action: 'CREATE',
      afterJson: created
    });

    res.json({ success: true, schedule: created });
  } catch (err) {
    handleApiError(res, err);
  }
});

router.get('/effective-tax', async (req, res) => {
  try {
    const { code, kind, date } = req.query;
    const schedule = await getEffectiveTaxSchedule(req.companyId, code, kind, date);
    res.json({ success: true, schedule });
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
