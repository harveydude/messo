import React, { createContext, useContext, useReducer, useEffect } from 'react';

/**
 * Central store with localStorage persistence.
 *
 * Every mutation goes through dispatch → reducer → state → localStorage.
 * Components read via useStore() and write via dispatch().
 *
 * Audit law: every create/edit/delete/schedule/send/match/link pushes an
 * audit entry {date, user, event, view, ref} and persists.
 */

const STORAGE_KEY = 'messo-store-v1';

const SEED = {
  company: {
    name: 'Sample Company',
    legalName: 'Sample Company LLC',
    logo: null,
    email: 'hello@samplecompany.com',
    phone: '(555) 123-4567',
    website: 'www.samplecompany.com',
    industry: 'Professional Services',
    address: { street: '123 Main St', city: 'San Francisco', state: 'CA', zip: '94105' },
    ein: '12-3456789',
    businessType: 'LLC',
    legalAddress: '123 Main St, San Francisco, CA 94105',
  },
  settings: {
    accountingMethod: 'Accrual',
    multicurrency: false,
    currency: 'USD',
    plan: 'Plus',
    firstDayOfWeek: 'Monday',
    salesToggles: { deliveryMethod: 'Email', customTxnNums: false, serviceDate: true, discount: true, deposit: false, tips: false, tags: false },
    timeSettings: { firstDayOfWeek: 'Monday', showServiceField: true, billableTime: true },
    usageLimits: { users: 5, accounts: 250 },
  },
  users: [
    { id: 1, first: 'Craig', last: 'Carlson', email: 'craig@samplecompany.com', role: 'Admin', status: 'Active', rate: 0 },
    { id: 2, first: 'Emily', last: 'Platt', email: 'emily@samplecompany.com', role: 'Standard', status: 'Active', rate: 45 },
    { id: 3, first: 'John', last: 'Johnson', email: 'john@samplecompany.com', role: 'TimeOnly', status: 'Active', rate: 25 },
  ],
  customers: [
    { id: 1, displayName: 'Cool Cars', first: 'Grace', last: 'Pariente', email: 'Cool_Cars@intuit.com', phone: '(555) 234-5678', billingAddress: '65 Ocean Dr, Half Moon Bay, CA 94213', terms: 'Net 30', notes: '', balance: 0 },
    { id: 2, displayName: "Amy's Bird Sanctuary", first: 'Amy', last: 'Bird', email: 'amy@birdsanctuary.com', phone: '(555) 345-6789', billingAddress: '456 Oak Ave, San Francisco, CA 94102', terms: 'Due on receipt', notes: '', balance: 0 },
    { id: 3, displayName: 'Paulsen Medical Supplies', first: 'Paul', last: 'Paulsen', email: 'paul@medical.com', phone: '(555) 456-7890', billingAddress: '789 Pine St, Oakland, CA 94601', terms: 'Net 15', notes: '', balance: 0 },
    { id: 4, displayName: 'Sushi by Katsuyuki', first: 'Katsuyuki', last: 'Sushi', email: 'katsuyuki@sushi.com', phone: '(555) 567-8901', billingAddress: '321 Elm St, San Francisco, CA 94103', terms: 'Due on receipt', notes: '', balance: 80 },
    { id: 5, displayName: 'Island Events', first: 'Island', last: 'Events', email: 'island@events.com', phone: '(555) 678-9012', billingAddress: '654 Maple Ave, Berkeley, CA 94704', terms: 'Net 30', notes: '', balance: 0 },
  ],
  vendors: [
    { id: 1, displayName: 'Cal Telephone', company: 'Cal Telephone', email: 'billing@caltelephone.com', phone: '(555) 111-2222', address: '100 Telecom Way, San Francisco, CA 94101', terms: 'Net 30', balance: 0 },
    { id: 2, displayName: 'Office Supplies Co', company: 'Office Supplies Co', email: 'sales@officesupplies.com', phone: '(555) 222-3333', address: '200 Supply St, Oakland, CA 94602', terms: 'Net 15', balance: 0 },
    { id: 3, displayName: 'Utility Power', company: 'Utility Power', email: 'billing@utilitypower.com', phone: '(555) 333-4444', address: '300 Power Ave, San Francisco, CA 94104', terms: 'Net 30', balance: 0 },
  ],
  accounts: [
    { id: 1, name: 'Checking', type: 'Bank', badge: 'BAL', detail: 'Checking', bank: true, qb: 1201.00, bankBal: -3621.93, action: 'View register', indent: 0, active: true },
    { id: 2, name: 'Savings', type: 'Bank', badge: 'BAL', detail: 'Savings', bank: true, qb: 800.00, bankBal: 200.00, action: 'View register', indent: 0, active: true },
    { id: 3, name: 'Mastercard', type: 'Credit Card', badge: 'BAL', detail: 'Mastercard', bank: true, qb: 157.72, bankBal: 304.96, action: 'View register', indent: 0, active: true },
    { id: 4, name: 'Accounts Receivable', type: 'Accounts Receivable', badge: 'BAL', detail: 'Accounts Receivable', bank: false, qb: 5475.92, bankBal: null, action: 'View register', indent: 0, active: true },
    { id: 5, name: 'Accounts Payable', type: 'Accounts Payable', badge: 'BAL', detail: 'Accounts Payable', bank: false, qb: 1602.67, bankBal: null, action: 'View register', indent: 0, active: true },
    { id: 6, name: 'Sales Tax Payable', type: 'Other Current Liability', badge: 'BAL', detail: 'Sales Tax Payable', bank: false, qb: 0, bankBal: null, action: 'View register', indent: 0, active: true },
    { id: 7, name: 'Retained Earnings', type: 'Equity', badge: 'BAL', detail: 'Retained Earnings', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 8, name: 'Opening Balance Equity', type: 'Equity', badge: 'BAL', detail: 'Opening Balance Equity', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 9, name: 'Design Income', type: 'Income', badge: 'P&L', detail: 'Design Income', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 10, name: 'Landscaping Income', type: 'Income', badge: 'P&L', detail: 'Landscaping Income', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 11, name: 'Office Supplies', type: 'Expense', badge: 'P&L', detail: 'Office Supplies', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 12, name: 'Utilities', type: 'Expense', badge: 'P&L', detail: 'Utilities', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 13, name: 'Telephone', type: 'Expense', badge: 'P&L', detail: 'Telephone', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 14, name: 'Mileage', type: 'Expense', badge: 'P&L', detail: 'Mileage', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 15, name: 'Payroll Expenses', type: 'Expense', badge: 'P&L', detail: 'Payroll Expenses', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
    { id: 16, name: 'Cost of Goods Sold', type: 'Cost of Goods Sold', badge: 'P&L', detail: 'Cost of Goods Sold', bank: false, qb: 0, bankBal: null, action: 'Run report', indent: 0, active: true },
  ],
  products: [
    { id: 1, name: 'Design', sku: '', category: 'Design', type: 'Service', price: 75, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Custom design work', active: true },
    { id: 2, name: 'Concrete', sku: '', category: 'Fountains', type: 'Inventory', price: 0, cost: 0, taxable: false, qty: 0, reorder: 0, desc: 'Concrete for fountains', active: true },
    { id: 3, name: 'Pump', sku: 'P461-17', category: 'Fountains', type: 'Inventory', price: 15, cost: 10, taxable: true, qty: 25, reorder: 5, desc: 'Fountain Pump', active: true },
    { id: 4, name: 'Rock Fountain', sku: 'R154-88', category: 'Fountains', type: 'Inventory', price: 275, cost: 125, taxable: true, qty: 2, reorder: 1, desc: 'Rock Fountain', active: true },
    { id: 5, name: 'Lighting', sku: '', category: 'Fountains', type: 'Non-inventory', price: 0, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Fountain Lighting', active: true },
    { id: 6, name: 'Installation', sku: '', category: 'Landscaping', type: 'Service', price: 50, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Installation of landscape design', active: true },
  ],
  categories: ['Design', 'Fountains', 'Landscaping'],
  invoices: [
    { id: 1, no: 'INV-1001', customerId: 1, date: '2025-10-01', dueDate: '2025-10-31', terms: 'Net 30', lines: [{ productId: 3, desc: 'Fountain Pump', qty: 2, rate: 15, taxable: true }], discount: { mode: '%', value: 0 }, taxRateId: 1, status: 'Sent', sentAt: null, timeEntryIds: [] },
    { id: 2, no: 'INV-1002', customerId: 4, date: '2025-10-15', dueDate: '2025-10-15', terms: 'Due on receipt', lines: [{ productId: 1, desc: 'Sushi design', qty: 1, rate: 80, taxable: false }], discount: { mode: '%', value: 0 }, taxRateId: null, status: 'Overdue', sentAt: null, timeEntryIds: [] },
    { id: 3, no: 'INV-1003', customerId: 2, date: '2025-10-20', dueDate: '2025-11-19', terms: 'Net 30', lines: [{ productId: 6, desc: 'Landscaping installation', qty: 1, rate: 50, taxable: false }], discount: { mode: '%', value: 0 }, taxRateId: null, status: 'Paid', sentAt: '2025-10-20T10:00:00Z', timeEntryIds: [] },
  ],
  estimates: [
    { id: 1, no: 'EST-001', customerId: 1, date: '2025-10-01', expiry: '2025-10-31', lines: [{ productId: 1, desc: 'Design work', qty: 1, rate: 75, taxable: false }], status: 'Open', convertedTo: null },
  ],
  bills: [
    { id: 1, no: 'BILL-001', vendorId: 1, date: '2025-10-01', dueDate: '2025-10-31', terms: 'Net 30', lines: [{ accountId: 13, desc: 'Telephone service', amount: 74.36 }], status: 'Overdue', scheduleDate: null, paidDate: null },
    { id: 2, no: 'BILL-002', vendorId: 2, date: '2025-10-05', dueDate: '2025-10-20', terms: 'Net 15', lines: [{ accountId: 11, desc: 'Office supplies', amount: 48.20 }], status: 'Paid', scheduleDate: null, paidDate: '2025-10-18' },
  ],
  expenses: [
    { id: 1, payeeId: 1, payeeName: 'Cal Telephone', paymentAccountId: 1, method: 'Check', date: '2025-10-12', lines: [{ accountId: 13, desc: 'Telephone bill', amount: 74.36 }], memo: '', attachment: null, source: 'Manual' },
    { id: 2, payeeId: 2, payeeName: 'Office Supplies Co', paymentAccountId: 1, method: 'Card', date: '2025-10-15', lines: [{ accountId: 11, desc: 'Office supplies', amount: 48.20 }], memo: '', attachment: null, source: 'Manual' },
  ],
  payments: [],
  journalEntries: [],
  bankAccounts: [
    { id: 1, name: 'Checking', institution: 'Sample Bank', type: 'Checking', balance: 1201.00, connected: true },
    { id: 2, name: 'Savings', institution: 'Sample Bank', type: 'Savings', balance: 800.00, connected: true },
  ],
  bankTxns: [
    { id: 1, date: '2025-10-24', desc: 'Cal Telephone', amount: -74.36, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'BILL-001', categoryAccountId: null },
    { id: 2, date: '2025-10-23', desc: 'Office Supplies Co', amount: -48.20, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'BILL-002', categoryAccountId: null },
    { id: 3, date: '2025-10-22', desc: 'Client Payment - Cool Cars', amount: 500.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 4 },
    { id: 4, date: '2025-10-21', desc: 'Utility Power', amount: -120.00, bankAccountId: 1, state: 'Suggested', suggestion: { accountId: 12, confidence: 87 }, matchedRef: null, categoryAccountId: null },
    { id: 5, date: '2025-10-20', desc: 'Miscellaneous', amount: -35.00, bankAccountId: 1, state: 'Uncategorized', suggestion: null, matchedRef: null, categoryAccountId: null },
    { id: 6, date: '2025-10-19', desc: 'Payroll', amount: -2000.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 15 },
  ],
  rules: [
    { id: 1, name: 'Telephone', field: 'Description', contains: 'Cal Telephone', targetAccountId: 13, autoConfirm: true },
    { id: 2, name: 'Office Supplies', field: 'Description', contains: 'Office Supplies', targetAccountId: 11, autoConfirm: true },
  ],
  recurring: [
    { id: 1, name: 'Monthly Building Lease', type: 'Scheduled', txnType: 'Expense', interval: 'Monthly', intervalN: 1, startDate: '2025-09-01', entityId: 3, lines: [{ accountId: 12, desc: 'Building lease', amount: 900 }], email: false, reminderDays: 3, nextDate: '2025-11-01' },
    { id: 2, name: 'Telephone Bill', type: 'Scheduled', txnType: 'Bill', interval: 'Monthly', intervalN: 1, startDate: '2025-09-12', entityId: 1, lines: [{ accountId: 13, desc: 'Telephone service', amount: 74.36 }], email: false, reminderDays: 3, nextDate: '2025-11-12' },
  ],
  mileage: [],
  payrollRuns: [],
  timeEntries: [],
  taxRates: [
    { id: 1, name: 'California (8%)', pct: 8 },
    { id: 2, name: 'California (7.25%)', pct: 7.25 },
    { id: 3, name: 'Out of state (0%)', pct: 0 },
  ],
  budgets: [],
  notifications: [
    { id: 1, text: 'Invoice INV-1002 is overdue', time: '2h ago', read: false, route: '/sales' },
    { id: 2, text: 'Bill BILL-001 is overdue', time: '1d ago', read: false, route: '/expenses' },
  ],
  audit: [
    { date: new Date('2025-10-24T19:11:00+11:00'), user: 'Craig Carlson', event: 'Created invoice INV-1001', view: true, ref: { type: 'invoice', id: 1 } },
    { date: new Date('2025-10-23T10:00:00+11:00'), user: 'Craig Carlson', event: 'Added expense to Office Supplies $48.20', view: true, ref: { type: 'expense', id: 2 } },
    { date: new Date('2025-10-22T14:30:00+11:00'), user: 'Craig Carlson', event: 'Added bill from Cal Telephone', view: true, ref: { type: 'bill', id: 1 } },
  ],
  dashboard: { widgets: ['sales', 'bank', 'pnl', 'expenses', 'cashflow', 'feed'], privacy: false, period: 'This month' },
  favorites: [],
  bookmarks: [],
  ui: { page: 'dashboard', zenMode: false, bankFullscreen: false, overlays: {} },
};

function logAudit(state, event, view = false, ref = null) {
  return [{ date: new Date(), user: 'Craig Carlson', event, view, ref }, ...state.audit];
}

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return action.payload;
    case 'ADD_INVOICE':
      return { ...state, invoices: [...state.invoices, action.payload], audit: logAudit(state, `Created invoice ${action.payload.no}`, true, { type: 'invoice', id: action.payload.id }) };
    case 'UPDATE_INVOICE':
      return { ...state, invoices: state.invoices.map(i => i.id === action.payload.id ? action.payload : i), audit: logAudit(state, `Updated invoice ${action.payload.no}`, true, { type: 'invoice', id: action.payload.id }) };
    case 'DELETE_INVOICE':
      return { ...state, invoices: state.invoices.filter(i => i.id !== action.payload), audit: logAudit(state, `Deleted invoice ${action.payload}`, false, null) };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload], audit: logAudit(state, `Added customer ${action.payload.displayName}`, true, { type: 'customer', id: action.payload.id }) };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c), audit: logAudit(state, `Updated customer ${action.payload.displayName}`, true, { type: 'customer', id: action.payload.id }) };
    case 'ADD_VENDOR':
      return { ...state, vendors: [...state.vendors, action.payload], audit: logAudit(state, `Added vendor ${action.payload.displayName}`, true, { type: 'vendor', id: action.payload.id }) };
    case 'ADD_PRODUCT':
      return { ...state, products: [...state.products, action.payload], audit: logAudit(state, `Added product ${action.payload.name}`, true, { type: 'product', id: action.payload.id }) };
    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...state.accounts, action.payload], audit: logAudit(state, `Added account ${action.payload.name}`, true, { type: 'account', id: action.payload.id }) };
    case 'UPDATE_ACCOUNT':
      return { ...state, accounts: state.accounts.map(a => a.id === action.payload.id ? action.payload : a), audit: logAudit(state, `Updated account ${action.payload.name}`, true, { type: 'account', id: action.payload.id }) };
    case 'ADD_BILL':
      return { ...state, bills: [...state.bills, action.payload], audit: logAudit(state, `Added bill from ${action.payload.vendorId}`, true, { type: 'bill', id: action.payload.id }) };
    case 'UPDATE_BILL':
      return { ...state, bills: state.bills.map(b => b.id === action.payload.id ? action.payload : b), audit: logAudit(state, `Updated bill ${action.payload.no}`, true, { type: 'bill', id: action.payload.id }) };
    case 'ADD_EXPENSE':
      return { ...state, expenses: [...state.expenses, action.payload], audit: logAudit(state, `Added expense to ${action.payload.lines[0]?.accountId}`, true, { type: 'expense', id: action.payload.id }) };
    case 'ADD_BANK_TXN':
      return { ...state, bankTxns: [...state.bankTxns, action.payload], audit: logAudit(state, `Added bank transaction`, false, null) };
    case 'UPDATE_BANK_TXN':
      return { ...state, bankTxns: state.bankTxns.map(t => t.id === action.payload.id ? action.payload : t), audit: logAudit(state, `Categorized ${action.payload.desc}`, true, { type: 'bankTxn', id: action.payload.id }) };
    case 'ADD_RULE':
      return { ...state, rules: [...state.rules, action.payload], audit: logAudit(state, `Added rule ${action.payload.name}`, true, { type: 'rule', id: action.payload.id }) };
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, action.payload], audit: logAudit(state, `Received payment for ${action.payload.appliedTo.join(', ')}`, true, { type: 'payment', id: action.payload.id }) };
    case 'ADD_JOURNAL_ENTRY':
      return { ...state, journalEntries: [...state.journalEntries, action.payload], audit: logAudit(state, `Added journal entry ${action.payload.no}`, true, { type: 'journalEntry', id: action.payload.id }) };
    case 'UPDATE_COMPANY':
      return { ...state, company: { ...state.company, ...action.payload }, audit: logAudit(state, 'Changed settings', false, null) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload }, audit: logAudit(state, 'Changed settings', false, null) };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload], audit: logAudit(state, `Added user ${action.payload.first} ${action.payload.last}`, true, { type: 'user', id: action.payload.id }) };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u), audit: logAudit(state, `Updated user ${action.payload.first} ${action.payload.last}`, true, { type: 'user', id: action.payload.id }) };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_READ':
      return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'TOGGLE_PRIVACY':
      return { ...state, dashboard: { ...state.dashboard, privacy: !state.dashboard.privacy } };
    case 'SET_PERIOD':
      return { ...state, dashboard: { ...state.dashboard, period: action.payload } };
    case 'TOGGLE_WIDGET':
      return { ...state, dashboard: { ...state.dashboard, widgets: state.dashboard.widgets.includes(action.payload) ? state.dashboard.widgets.filter(w => w !== action.payload) : [...state.dashboard.widgets, action.payload] } };
    case 'ADD_FAVORITE':
      return { ...state, favorites: [...state.favorites, action.payload] };
    case 'REMOVE_FAVORITE':
      return { ...state, favorites: state.favorites.filter(f => f !== action.payload) };
    case 'ADD_BOOKMARK':
      return { ...state, bookmarks: [...state.bookmarks, action.payload] };
    case 'REMOVE_BOOKMARK':
      return { ...state, bookmarks: state.bookmarks.filter(b => b !== action.payload) };
    case 'TOGGLE_ZEN_MODE':
      return { ...state, ui: { ...state.ui, zenMode: !state.ui.zenMode } };
    case 'TOGGLE_BANK_FULLSCREEN':
      return { ...state, ui: { ...state.ui, bankFullscreen: !state.ui.bankFullscreen } };
    default:
      return state;
  }
}

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, SEED);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: 'HYDRATE', payload: { ...SEED, ...parsed } });
      } catch { /* ignore corrupt data */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const { state, dispatch } = useContext(StoreContext);
  return { state, dispatch };
}

export function useAudit() {
  const { state } = useStore();
  return state.audit;
}

export function useCompany() {
  const { state } = useStore();
  return state.company;
}

export function useSettings() {
  const { state } = useStore();
  return state.settings;
}

export function useInvoices() {
  const { state } = useStore();
  return state.invoices;
}

export function useCustomers() {
  const { state } = useStore();
  return state.customers;
}

export function useVendors() {
  const { state } = useStore();
  return state.vendors;
}

export function useAccounts() {
  const { state } = useStore();
  return state.accounts;
}

export function useProducts() {
  const { state } = useStore();
  return state.products;
}

export function useBankTxns() {
  const { state } = useStore();
  return state.bankTxns;
}

export function useRules() {
  const { state } = useStore();
  return state.rules;
}

export function useBills() {
  const { state } = useStore();
  return state.bills;
}

export function useExpenses() {
  const { state } = useStore();
  return state.expenses;
}

export function useNotifications() {
  const { state } = useStore();
  return state.notifications;
}

export function useDashboard() {
  const { state } = useStore();
  return state.dashboard;
}

export function useTaxRates() {
  const { state } = useStore();
  return state.taxRates;
}

export function useJournalEntries() {
  const { state } = useStore();
  return state.journalEntries;
}

export function useUsers() {
  const { state } = useStore();
  return state.users;
}

export function useTimeEntries() {
  const { state } = useStore();
  return state.timeEntries;
}

export function usePayrollRuns() {
  const { state } = useStore();
  return state.payrollRuns;
}

export function useMileage() {
  const { state } = useStore();
  return state.mileage;
}

export function useBankAccounts() {
  const { state } = useStore();
  return state.bankAccounts;
}

export function useRecurring() {
  const { state } = useStore();
  return state.recurring;
}

export function useBudgets() {
  const { state } = useStore();
  return state.budgets;
}

export function useEstimates() {
  const { state } = useStore();
  return state.estimates;
}

export function usePayments() {
  const { state } = useStore();
  return state.payments;
}

export function useUi() {
  const { state } = useStore();
  return state.ui;
}

export function useFavorites() {
  const { state } = useStore();
  return state.favorites;
}

export function useBookmarks() {
  const { state } = useStore();
  return state.bookmarks;
}

export function useCategories() {
  const { state } = useStore();
  return state.categories;
}

export { SEED, STORAGE_KEY };
