import express from 'express';
import { getDb } from '../db/db.js';

const router = express.Router();

// GET all bookmarks
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.query(`
      SELECT * FROM user_bookmarks
      ORDER BY sort_order ASC
    `);

    res.json({ success: true, bookmarks: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update bookmarks
router.put('/', async (req, res) => {
  try {
    const db = await getDb();
    const { bookmarks = [] } = req.body;

    for (const bm of bookmarks) {
      await db.query(
        `INSERT INTO user_bookmarks (id, page_id, name, enabled, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (page_id) DO UPDATE SET
           name = EXCLUDED.name,
           enabled = EXCLUDED.enabled,
           sort_order = EXCLUDED.sort_order`,
        [bm.id || `bm_${bm.page_id}`, bm.page_id, bm.name, !!bm.enabled, bm.sort_order || 0]
      );
    }

    const updated = await db.query(`SELECT * FROM user_bookmarks ORDER BY sort_order ASC`);
    res.json({ success: true, bookmarks: updated.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
