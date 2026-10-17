import express from 'express';
import { smartSearchAndQA } from '../services/aiService.js';

const router = express.Router();

router.post('/smart', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const results = await smartSearchAndQA(query);
    res.json({ success: true, ...results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
