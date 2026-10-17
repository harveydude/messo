import express from 'express';
import {
  generateBalanceSheet,
  generateProfitAndLoss,
  generateCashFlowStatement
} from '../services/ledgerService.js';
import { getDb } from '../db/db.js';

const router = express.Router();

// GET Balance Sheet
router.get('/balance-sheet', async (req, res) => {
  try {
    const { asOfDate, accountingMethod = 'ACCRUAL' } = req.query;
    const report = await generateBalanceSheet({ asOfDate, accountingMethod });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Profit & Loss
router.get(['/profit-loss', '/profit-and-loss'], async (req, res) => {
  try {
    const { startDate, endDate, accountingMethod = 'ACCRUAL' } = req.query;
    const report = await generateProfitAndLoss({ startDate, endDate, accountingMethod });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Cash Flow Statement
router.get('/cash-flow', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await generateCashFlowStatement({ startDate, endDate });
    res.json({ success: true, report });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET / POST Favorite Reports
router.get('/favorites', async (req, res) => {
  res.json({
    success: true,
    favorites: [
      { id: 'balance_sheet', name: 'Balance Sheet', statement: 'BALANCE_SHEET', isFavorite: true },
      { id: 'profit_and_loss', name: 'Profit and Loss', statement: 'PROFIT_AND_LOSS', isFavorite: true },
      { id: 'cash_flow', name: 'Statement of Cash Flows', statement: 'CASH_FLOW', isFavorite: true },
      { id: 'ar_aging', name: 'Accounts Receivable Aging Summary', statement: 'AR', isFavorite: false },
      { id: 'ap_aging', name: 'Accounts Payable Aging Summary', statement: 'AP', isFavorite: false },
    ]
  });
});

export default router;
