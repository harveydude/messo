import express from 'express';
import { multiTenantContext, requirePermission } from '../middleware/rbac.js';
import { parseRawImportFile } from '../services/ingestionParser.js';
import { autoDiscoverSchemaMapping, transformRowWithMapping, saveSchemaMappingTemplate } from '../services/schemaMapper.js';
import { validateMappedRow } from '../services/stagingDoctor.js';
import { promoteImportBatch, rollbackImportBatch } from '../services/promotionEngine.js';
import { getDb } from '../db/db.js';

const router = express.Router();

router.use(multiTenantContext);

/**
 * 1. File Ingestion & Checksum Quarantine (Phase 6)
 */
router.post('/upload', async (req, res) => {
  try {
    const { content, fileName, formatHint, sourceSoftware } = req.body;
    if (!content) {
      return res.status(400).json({ success: false, error: 'File content is required.' });
    }

    const parsed = parseRawImportFile({ content, fileName: fileName || 'import.csv', formatHint });
    const db = await getDb();

    // Prevent duplicate imports using SHA-256 hash
    const dupCheck = await db.query(
      `SELECT id, file_name, status FROM import_batches WHERE company_id = $1 AND file_sha256 = $2`,
      [req.companyId, parsed.fileSha256]
    );

    if (dupCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: `Duplicate file detected: Exactly identical file has already been uploaded as batch ${dupCheck.rows[0].id} (Status: ${dupCheck.rows[0].status}).`
      });
    }

    const batchRes = await db.query(
      `INSERT INTO import_batches (
        company_id, file_name, file_format, file_sha256, source_software, total_rows, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        req.companyId,
        parsed.fileName,
        parsed.fileFormat,
        parsed.fileSha256,
        sourceSoftware || 'CUSTOM',
        parsed.totalRows,
        req.user?.name || 'System Import'
      ]
    );

    const batch = batchRes.rows[0];

    res.json({
      success: true,
      batch,
      previewRows: parsed.rows.slice(0, 5),
      totalRows: parsed.totalRows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. Schema Discovery & Mapping (Phase 7)
 */
router.post('/analyze-schema', (req, res) => {
  try {
    const { rows, targetEntity, sourceSystem } = req.body;
    const discovery = autoDiscoverSchemaMapping({
      rows: rows || [],
      targetEntity: targetEntity || 'contacts',
      sourceSystem: sourceSystem || 'CUSTOM'
    });
    res.json({ success: true, discovery });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. Staging Sandbox Validation (Phase 8)
 */
router.post('/stage', async (req, res) => {
  try {
    const { batchId, rows, mappings, targetEntity } = req.body;
    const db = await getDb();

    let validRows = 0;
    let errorRows = 0;

    await db.query('BEGIN');
    try {
      for (let i = 0; i < (rows || []).length; i++) {
        const raw = rows[i];
        const mapped = transformRowWithMapping(raw, mappings);
        const validation = validateMappedRow(targetEntity, mapped);

        const status = validation.valid ? 'VALID' : 'INVALID';
        if (validation.valid) validRows++;
        else errorRows++;

        await db.query(
          `INSERT INTO import_staging_rows (
            batch_id, company_id, row_index, target_entity, raw_data, mapped_data,
            validation_status, validation_errors
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            batchId,
            req.companyId,
            i + 1,
            targetEntity,
            JSON.stringify(raw),
            JSON.stringify(mapped),
            status,
            JSON.stringify(validation.errors)
          ]
        );
      }

      await db.query(
        `UPDATE import_batches 
         SET valid_rows = $1, error_rows = $2, status = 'VALIDATED' 
         WHERE id = $3`,
        [validRows, errorRows, batchId]
      );

      await db.query('COMMIT');
    } catch (err) {
      try { await db.query('ROLLBACK'); } catch {}
      throw err;
    }

    res.json({
      success: true,
      batchId,
      validRows,
      errorRows,
      status: 'VALIDATED'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 4. Atomic Ledger Promotion (Phase 10)
 */
router.post('/promote', async (req, res) => {
  try {
    const { batchId } = req.body;
    const result = await promoteImportBatch({
      batchId,
      companyId: req.companyId,
      user: req.user
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 5. 1-Click Rollback Pipeline (Phase 10)
 */
router.post('/rollback', async (req, res) => {
  try {
    const { batchId } = req.body;
    const result = await rollbackImportBatch({
      batchId,
      companyId: req.companyId,
      user: req.user
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 6. Batches list
 */
router.get('/batches', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(
      `SELECT * FROM import_batches WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.companyId]
    );
    res.json({ success: true, count: result.rows.length, batches: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
