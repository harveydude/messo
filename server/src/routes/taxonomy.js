import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getDb } from '../db/db.js';
import * as tax from '../services/taxService.js';
import * as docs from '../services/docService.js';
import * as rec from '../services/recurringService.js';
import executor from '../services/workflowExecutor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Middleware to ensure adaptive companyId
router.use((req, res, next) => {
  req.companyId = req.companyId || req.header('x-company-id') || req.user?.company_id || 'comp_1';
  next();
});

const STORE = path.join(__dirname, '..', '..', 'data', 'attachments'); // lives on D: with the project
fs.mkdirSync(STORE, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const company = req.companyId || 'comp_1';
      const d = path.join(STORE, String(company));
      fs.mkdirSync(d, { recursive: true });
      cb(null, d);
    },
    filename: (req, file, cb) =>
      cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname || '')}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(null, /image\/(png|jpe?g|webp)|application\/pdf|text\/plain/.test(file.mimetype)),
});

const errMap = (res, e) =>
  res.status(e.status || 500).json({ error: { code: e.code || 'INTERNAL', message: e.message } });

/* ---- taxes ---- */
router.get('/taxes/agencies', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT * FROM tax_agencies WHERE company_id=$1 ORDER BY name`,
      [req.companyId]
    );
    res.json({ data: rows });
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/taxes/agencies', async (req, res) => {
  const { name, kind = 'GST' } = req.body || {};
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `INSERT INTO tax_agencies (company_id, name, kind) VALUES ($1,$2,$3) RETURNING *`,
      [req.companyId, name, kind]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    errMap(res, e);
  }
});

router.get('/taxes/rates', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT * FROM tax_rates WHERE company_id=$1 AND ($2::text IS NULL OR kind=$2) ORDER BY kind, name`,
      [req.companyId, req.query.kind || null]
    );
    res.json({ data: rows });
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/taxes/rates', async (req, res) => {
  const { name, kind = 'GST', rate_bp, split, agency_id } = req.body || {};
  if (typeof rate_bp !== 'number' || rate_bp < 0 || rate_bp > 10000) {
    return res
      .status(422)
      .json({ error: { code: 'VALIDATION', message: 'rate_bp must be 0..10000' } });
  }
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `INSERT INTO tax_rates (company_id, agency_id, kind, name, rate_bp, split) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        req.companyId,
        agency_id || null,
        kind,
        name,
        rate_bp,
        split ? JSON.stringify(split) : null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/taxes/compute-preview', async (req, res) => {
  try {
    const { amount_minor, tax_rate_id, is_intra_state = true } = req.body || {};
    res.json(
      await tax.computeLineTaxById({
        companyId: req.companyId,
        taxRateId: tax_rate_id,
        amountMinor: amount_minor,
        isIntraState: is_intra_state,
      })
    );
  } catch (e) {
    errMap(res, e);
  }
});

/* ---- attachments ---- */
router.post('/attachments', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(422).json({ error: { code: 'VALIDATION', message: 'file field required' } });
    }
    const fullPath = req.file.path;
    const sha = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
    const relPath = path.relative(STORE, fullPath);
    const db = await getDb();
    const { rows } = await db.query(
      `INSERT INTO attachments (company_id, entity_type, entity_id, file_name, mime_type, size_bytes, storage_path, sha256, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, file_name, mime_type, size_bytes, sha256, created_at`,
      [
        req.companyId,
        req.body.entity_type || 'unassigned',
        req.body.entity_id || null,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        relPath,
        sha,
        req.user?.id || null,
      ]
    );
    res.status(201).json({ ...rows[0], url: `/api/attachments/${rows[0].id}/file` });
  } catch (e) {
    errMap(res, e);
  }
});

router.get('/attachments', async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT id, entity_type, entity_id, file_name, mime_type, size_bytes, sha256, created_at
       FROM attachments WHERE company_id=$1
       AND ($2::text IS NULL OR entity_type=$2) AND ($3::text IS NULL OR entity_id=$3)
       ORDER BY created_at DESC`,
      [req.companyId, entity_type || null, entity_id ? String(entity_id) : null]
    );
    res.json({ data: rows });
  } catch (e) {
    errMap(res, e);
  }
});

router.get('/attachments/:id/file', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT * FROM attachments WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.companyId]
    );
    if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    const full = path.isAbsolute(rows[0].storage_path)
      ? rows[0].storage_path
      : path.join(STORE, rows[0].storage_path);
    if (!fs.existsSync(full)) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'File missing from disk' } });
    }
    res.sendFile(full);
  } catch (e) {
    errMap(res, e);
  }
});

router.delete('/attachments/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `DELETE FROM attachments WHERE id=$1 AND company_id=$2 RETURNING storage_path`,
      [req.params.id, req.companyId]
    );
    if (!rows[0]) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    const full = path.isAbsolute(rows[0].storage_path)
      ? rows[0].storage_path
      : path.join(STORE, rows[0].storage_path);
    fs.unlink(full, () => {});
    res.json({ ok: true });
  } catch (e) {
    errMap(res, e);
  }
});

/* ---- recurring ---- */
router.get('/recurring', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT * FROM recurring_schedules WHERE company_id=$1 ORDER BY next_run`,
      [req.companyId]
    );
    res.json({ data: rows });
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/recurring', async (req, res) => {
  const { name, frequency, template, next_run, end_date, max_occurrences } = req.body || {};
  if (!template?.workflow) {
    return res
      .status(422)
      .json({ error: { code: 'VALIDATION', message: 'template.workflow required' } });
  }
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `INSERT INTO recurring_schedules (company_id, name, frequency, template, next_run, end_date, max_occurrences, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.companyId,
        name,
        frequency,
        JSON.stringify(template),
        next_run || new Date().toISOString().slice(0, 10),
        end_date || null,
        max_occurrences || null,
        req.user?.id || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    errMap(res, e);
  }
});

router.patch('/recurring/:id', async (req, res) => {
  // pause/resume/rename
  const { state, name } = req.body || {};
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `UPDATE recurring_schedules SET
         state = COALESCE($3, state), name = COALESCE($4, name)
       WHERE id=$1 AND company_id=$2 RETURNING *`,
      [req.params.id, req.companyId, state || null, name || null]
    );
    rows[0] ? res.json(rows[0]) : res.status(404).json({ error: { code: 'NOT_FOUND' } });
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/recurring/:id/run-now', async (req, res) => {
  try {
    const results = await rec.runDue({
      companyId: req.companyId,
      actor: req.user?.email || 'admin@meso.local',
      forceScheduleId: req.params.id,
      limit: 1,
    });
    res.json({ results });
  } catch (e) {
    errMap(res, e);
  }
});

/* ---- document state machines ---- */
router.get('/documents/:id', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT id, doc_type, doc_status, status_history FROM transactions WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.companyId]
    );
    rows[0] ? res.json(rows[0]) : res.status(404).json({ error: { code: 'NOT_FOUND' } });
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/documents/:id/init', async (req, res) => {
  try {
    res.json(
      await docs.init({
        companyId: req.companyId,
        docId: req.params.id,
        docType: req.body?.doc_type,
        actor: req.user?.email,
      })
    );
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/documents/:id/status', async (req, res) => {
  try {
    res.json(
      await docs.changeStatus({
        companyId: req.companyId,
        docId: req.params.id,
        to: req.body?.to,
        actor: req.user?.email,
      })
    );
  } catch (e) {
    errMap(res, e);
  }
});

router.post('/documents/:id/convert-to-invoice', async (req, res) => {
  try {
    const db = await getDb();
    const { rows } = await db.query(
      `SELECT * FROM transactions WHERE id=$1 AND company_id=$2`,
      [req.params.id, req.companyId]
    );
    const doc = rows[0];
    if (!doc) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
    if (!['estimate', 'sales_order'].includes(doc.doc_type)) {
      return res.status(422).json({
        error: {
          code: 'VALIDATION',
          message: `doc_type '${doc.doc_type}' is not convertible`,
        },
      });
    }

    const { rows: lines } = await db.query(
      `SELECT * FROM transaction_lines WHERE transaction_id=$1 ORDER BY sort_order`,
      [doc.id]
    );

    const payload = {
      customer_id: doc.contact_id || doc.customer_id || doc.party_id || req.body?.customer_id || 'cust_1',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
      lines: lines.map((l) => ({
        description: l.description || l.memo || 'Converted line',
        quantity: Number(l.quantity || l.qty || 1),
        rate: Number(l.rate || l.rate_minor || l.amount || 0),
        tax_rate_id: l.tax_rate_id || undefined,
      })),
    };

    const invoice = await executor.execute('invoice', payload, {
      companyId: req.companyId,
      actor: req.user?.email,
    });

    const document = await docs.changeStatus({
      companyId: req.companyId,
      docId: doc.id,
      to: 'CONVERTED_TO_INVOICE',
      actor: req.user?.email,
    });

    await db.query(
      `UPDATE transactions SET status_history = COALESCE(status_history, '[]'::jsonb) || $3::jsonb WHERE id=$1 AND company_id=$2`,
      [
        doc.id,
        req.companyId,
        JSON.stringify([
          {
            event: 'converted',
            invoice_id: invoice?.id ?? null,
            at: new Date().toISOString(),
          },
        ]),
      ]
    );

    res.json({ ok: true, invoice_id: invoice?.id ?? null, document });
  } catch (e) {
    errMap(res, e);
  }
});

export default router;
