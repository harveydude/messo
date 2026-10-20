import express from 'express';
import { getDb } from '../db/db.js';
import { handleApiError } from '../utils/errorHelper.js';

const router = express.Router();

// GET all bookmarks with tenant isolation
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const result = await db.query(`
      SELECT * FROM user_bookmarks
      WHERE (company_id = $1 OR company_id IS NULL)
      ORDER BY sort_order ASC
    `, [companyId]);

    res.json({ success: true, bookmarks: result.rows });
  } catch (err) {
    handleApiError(res, err, 'Failed to fetch bookmarks.');
  }
});

// PUT update bookmarks
router.put('/', async (req, res) => {
  try {
    const db = await getDb();
    const companyId = req.companyId || 'comp_1';
    const { bookmarks = [] } = req.body;

    for (const bm of bookmarks) {
      await db.query(
        `INSERT INTO user_bookmarks (id, company_id, page_id, name, enabled, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (page_id) DO UPDATE SET
           name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           sort_order = EXCLUDED.sort_order`,
        [bm.id || `bm_${bm.page_id}`, companyId, bm.page_id, bm.name, !!bm.enabled, bm.sort_order || 0]
      );
    }

    const updated = await db.query(`SELECT * FROM user_bookmarks WHERE (company_id = $1 OR company_id IS NULL) ORDER BY sort_order ASC`, [companyId]);
    res.json({ success: true, bookmarks: updated.rows });
  } catch (err) {
    handleApiError(res, err, 'Failed to update bookmarks.');
  }
});

export default router;
