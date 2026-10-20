import express from 'express';
import { handleApiError } from '../utils/errorHelper.js';
import { smartSearchAndQA } from '../services/aiService.js';

const router = express.Router();

router.post('/smart', async (req, res) => {
  try {
    const { query = '' } = req.body;
    const results = await smartSearchAndQA(query);
    res.json({ success: true, ...results });
  } catch (err) {
    handleApiError(res, err);
  }
});

export default router;
