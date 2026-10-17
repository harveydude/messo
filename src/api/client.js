/**
 * Meso Master API Client (2026 Edition)
 * Full-stack continuous accounting connector.
 * Connects every UI component directly to PostgreSQL on Disk D and Supabase.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

export function notifyMutation(detail = {}) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('qbo:data-mutated', { detail }));
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    const method = (options.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      notifyMutation({ endpoint, method });
    }

    return data;
  } catch (err) {
    console.warn(`[Meso API] ${endpoint}:`, err.message);
    throw err;
  }
}

export const api = {
  // Health
  checkHealth: () => request('/health'),

  // Company Profile & Settings
  getCompany: () => request('/company/current'),
  getCompanySettings: () => request('/company/settings'),
  updateCompanySettings: (data) => request('/company/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  getCompanyUsers: () => request('/company/users'),
  createCompanyUser: (data) => request('/company/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Global Smart Search & Q&A (Pipeline 5)
  smartSearch: (query) => request('/search/smart', {
    method: 'POST',
    body: JSON.stringify({ query }),
  }),

  // AI Pipelines (Pipelines 1, 2, 3, Intuit Assist)
  getBusinessFeed: () => request('/ai/business-feed'),
  actionBusinessFeed: (id, action) => request(`/ai/business-feed/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  }),
  parseReceipt: (filename, fileContent) => request('/ai/parse-receipt', {
    method: 'POST',
    body: JSON.stringify({ filename, fileContent }),
  }),
  sendInvoiceReminder: (invoiceId, severityLevel = 'GENTLE') => request('/ai/invoice-reminder', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, severityLevel }),
  }),
  sendHelpMessage: (message) => request('/ai/help-chat', {
    method: 'POST',
    body: JSON.stringify({ message }),
  }),

  // Financial Reports (Pipeline 4)
  getBalanceSheet: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/balance-sheet${q ? `?${q}` : ''}`);
  },
  getProfitLoss: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/profit-and-loss${q ? `?${q}` : ''}`);
  },
  getCashFlow: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/reports/cash-flow${q ? `?${q}` : ''}`);
  },
  getFavoriteReports: () => request('/reports/favorites'),

  // Accounting Core & General Ledger (Rules 1 & 2)
  getChartOfAccounts: () => request('/accounting/chart-of-accounts'),
  createAccount: (data) => request('/accounting/chart-of-accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getJournalEntries: () => request('/accounting/journal-entries'),
  createJournalEntry: (data) => request('/accounting/journal-entries', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getRules: () => request('/accounting/rules-and-recurring'),
  getBudgets: () => request('/accounting/budgets'),
  reconcileBank: (data) => request('/accounting/reconcile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // CRM Contacts (Customers, Leads, Vendors, Contractors)
  getContacts: (type) => request(`/contacts${type ? `?type=${type}` : ''}`),
  createContact: (data) => request('/contacts', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getCustomers: () => request('/customers'),
  createCustomer: (data) => request('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getVendors: () => request('/vendors'),
  createVendor: (data) => request('/vendors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Products & Services Catalog
  getProductsServices: () => request('/catalog/products-services'),
  createProductService: (data) => request('/catalog/products-services', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Dashboard Overview Metrics
  getDashboardMetrics: (period = 'This month') => request(`/dashboard/metrics?period=${encodeURIComponent(period)}`),

  // Sales & Invoices
  getInvoices: () => request('/invoices'),
  createInvoice: (data) => request('/invoices', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  sendInvoice: (id) => request(`/invoices/${id}/send`, { method: 'POST' }),
  receivePayment: (id, data) => request(`/invoices/${id}/payment`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Expenses & Bills
  getExpensesAndBills: () => request('/expenses-bills'),
  getBills: () => request('/bills'),
  createBill: (data) => request('/bills', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  payBill: (id, bankAccountId = 'acc_1010') => request(`/bills/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify({ bankAccountId }),
  }),
  scheduleBillPayment: (id, scheduledDate) => request(`/bills/${id}/schedule-payment`, {
    method: 'POST',
    body: JSON.stringify({ scheduledDate }),
  }),
  getExpenses: () => request('/expenses'),
  createExpense: (data) => request('/expenses', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Banking & Bank Feeds
  getBankConnections: () => request('/banking/connections'),
  getBankTransactions: () => request('/banking/transactions'),
  getBankFeed: () => request('/banking/feed'),
  linkBankAccount: (data) => request('/banking/link-account', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  matchBankTransaction: (id) => request(`/banking/feed/${id}/match`, {
    method: 'POST',
  }),
  categorizeBankTransaction: (id, categoryAccountId) => request(`/banking/feed/${id}/categorize`, {
    method: 'POST',
    body: JSON.stringify({ categoryAccountId }),
  }),

  // Operations: Mileage, Projects, Timesheets, Payroll, Taxes, Lending, Marketing
  getMileage: () => request('/mileage'),
  createMileage: (data) => request('/mileage', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getProjects: () => request('/projects'),
  getTimesheets: () => request('/timesheets'),
  runPayroll: (data) => request('/payroll/run', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTaxSummary: () => request('/taxes/summary'),
  getLendingOffers: () => request('/lending/offers'),
  getMarketingCampaigns: () => request('/marketing/campaigns'),

  // Audit Logs & System State
  getAuditLogs: () => request('/audit-logs'),
  getUserPreferences: () => request('/user/preferences'),
  updateUserPreferences: (data) => request('/user/preferences', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
  getNotifications: () => request('/notifications'),
  getIntegrations: () => request('/integrations'),
  getBookmarks: () => request('/bookmarks'),
  updateBookmarks: (bookmarks) => request('/bookmarks', {
    method: 'PUT',
    body: JSON.stringify({ bookmarks }),
  }),
  // Unified Transactions (29 +Create Workflows)
  createTransaction: (data) => request('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Section 3 Business At A Glance & Layout Feedback
  getBusinessAtAGlance: () => request('/dashboard/business-at-a-glance'),
  sendLayoutFeedback: (feedback, comment = '') => request('/dashboard/feedback/layout-customization', {
    method: 'POST',
    body: JSON.stringify({ feedback, comment }),
  }),
};

export default api;
