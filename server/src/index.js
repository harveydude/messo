import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { initDb } from './db/db.js';
import { seedInitialData } from './db/seed.js';

// Route imports
import dashboardRouter from './routes/dashboard.js';
import invoicesRouter from './routes/invoices.js';
import billsRouter from './routes/bills.js';
import expensesRouter from './routes/expenses.js';
import bankingRouter from './routes/banking.js';
import customersRouter from './routes/customers.js';
import vendorsRouter from './routes/vendors.js';
import ledgerRouter from './routes/ledger.js';
import bookmarksRouter from './routes/bookmarks.js';

// New Enterprise Specification Route imports
import companyRouter from './routes/company.js';
import searchRouter from './routes/search.js';
import aiRouter from './routes/ai.js';
import reportsRouter from './routes/reports.js';
import accountingRouter from './routes/accounting.js';
import contactsRouter from './routes/contacts.js';
import catalogRouter from './routes/catalog.js';
import operationsRouter from './routes/operations.js';
import transactionsRouter from './routes/transactions.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, '../../dist');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend and deployment domains
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Meso Continuous Accounting ERP Engine (2026 Edition)',
    timestamp: new Date().toISOString(),
    currency: 'INR (₹)'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Meso Continuous Accounting ERP Engine (2026 Edition)',
    timestamp: new Date().toISOString(),
    currency: 'INR (₹)'
  });
});

// Primary Accounting & Core Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api', transactionsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/bills', billsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/expenses-bills', expensesRouter);
app.use('/api/banking', bankingRouter);
app.use('/api/customers', customersRouter);
app.use('/api/vendors', vendorsRouter);
app.use('/api/ledger', ledgerRouter);
app.use('/api/bookmarks', bookmarksRouter);

// Master Specification Routes
app.use('/api/company', companyRouter);
app.use('/api/search', searchRouter);
app.use('/api/ai', aiRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/accounting', accountingRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/catalog', catalogRouter);

// Operations & Utility Routes
app.use('/api', operationsRouter);

// Serve Frontend Static Build if available (SPA Fallback)
if (fs.existsSync(distPath)) {
  console.log(`✓ Serving compiled Meso frontend from: ${distPath}`);
  app.use(express.static(distPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'Meso Continuous Accounting Backend',
      frontendDevServer: 'http://127.0.0.1:5173',
      endpoints: [
        '/api/health',
        '/api/dashboard/metrics',
        '/api/invoices',
        '/api/expenses',
        '/api/bills',
        '/api/banking/transactions',
        '/api/reports/balance-sheet',
        '/api/reports/profit-and-loss',
        '/api/reports/cash-flow',
        '/api/search/smart',
        '/api/ai/business-feed'
      ]
    });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// Start Server
async function startServer() {
  try {
    console.log('--- Starting Meso Continuous Accounting Engine (2026 Master Edition) ---');
    await initDb();
    await seedInitialData(true); // Populate master enterprise seed

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ Meso master backend running on http://127.0.0.1:${PORT}`);
      console.log(`✓ All 2026 ERP workflows & double-entry pipelines active.`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
