import { CHART_OF_ACCOUNTS } from './chartOfAccounts.js';

/**
 * The starting books.
 *
 * These live apart from the store so that scripts/verify-ledger.mjs can read
 * the same data under plain Node. That matters: the app's central defect was
 * figures that looked correct and were connected to nothing, and a check that
 * cannot import the real seed is a check against a copy that drifts.
 *
 * Everything here is transaction data. No account carries a balance -- those
 * are derived by src/ledger.js from what follows.
 */
export const SEED = {
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
  // The chart of accounts carries structure and opening balances only. Every
  // closing balance is derived from the transaction history by src/ledger.js --
  // no account stores its own balance, which is the whole point.
  accounts: CHART_OF_ACCOUNTS,
  products: [
    // `incomeAccountId` is what makes a sale land somewhere. Without it the
    // ledger has to guess a revenue account per product, and a guess that lands
    // every sale in one bucket makes the P&L wrong in a way nobody can see.
    { id: 1, name: 'Design', sku: '', category: 'Design', type: 'Service', price: 75, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Custom design work', incomeAccountId: 17, active: true },
    { id: 2, name: 'Concrete', sku: '', category: 'Fountains', type: 'Inventory', price: 0, cost: 0, taxable: false, qty: 0, reorder: 0, desc: 'Concrete for fountains', incomeAccountId: 21, active: true },
    { id: 3, name: 'Pump', sku: 'P461-17', category: 'Fountains', type: 'Inventory', price: 15, cost: 10, taxable: true, qty: 25, reorder: 5, desc: 'Fountain Pump', incomeAccountId: 21, active: true },
    { id: 4, name: 'Rock Fountain', sku: 'R154-88', category: 'Fountains', type: 'Inventory', price: 275, cost: 125, taxable: true, qty: 2, reorder: 1, desc: 'Rock Fountain', incomeAccountId: 21, active: true },
    { id: 5, name: 'Lighting', sku: '', category: 'Fountains', type: 'Non-inventory', price: 0, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Fountain Lighting', incomeAccountId: 21, active: true },
    { id: 6, name: 'Installation', sku: '', category: 'Landscaping', type: 'Service', price: 50, cost: 0, taxable: false, qty: null, reorder: null, desc: 'Installation of landscape design', incomeAccountId: 27, active: true },
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
    { id: 1, no: 'BILL-001', vendorId: 1, date: '2025-10-01', dueDate: '2025-10-31', terms: 'Net 30', lines: [{ accountId: 33, desc: 'Telephone service', amount: 74.36 }], status: 'Paid', scheduleDate: null, paidDate: '2025-10-24' },
    { id: 2, no: 'BILL-002', vendorId: 2, date: '2025-10-05', dueDate: '2025-10-20', terms: 'Net 15', lines: [{ accountId: 31, desc: 'Office supplies', amount: 48.20 }], status: 'Paid', scheduleDate: null, paidDate: '2025-10-23' },
  ],
  expenses: [
    // Only genuinely manual expenses belong here. The two that used to sit
    // alongside BILL-001 and BILL-002 were the same money recorded twice: the
    // bills already carried those amounts, so the ledger double-counted the
    // telephone and the office supplies against the bank.
    { id: 1, payeeId: 3, payeeName: 'Utility Power', paymentAccountId: 1, method: 'Card', date: '2025-10-21', lines: [{ accountId: 32, desc: 'Electricity', amount: 120.00 }], memo: '', attachment: null, source: 'Manual' },
  ],
  payments: [],
  journalEntries: [],
  bankAccounts: [
    { id: 1, name: 'Checking', institution: 'Sample Bank', type: 'Checking', balance: 1201.00, connected: true },
    { id: 2, name: 'Savings', institution: 'Sample Bank', type: 'Savings', balance: 800.00, connected: true },
  ],
  bankTxns: [
    // `state` decides whether a row is in the books. Matched settles the named
    // document. Reviewed has been categorised and posts. Suggested and
    // Uncategorized are proposals -- they sit in the review queue and are worth
    // nothing to the balance sheet, which is the entire point of the queue.
    { id: 1, date: '2025-10-24', desc: 'Cal Telephone', amount: -74.36, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'BILL-001', categoryAccountId: null },
    { id: 2, date: '2025-10-23', desc: 'Office Supplies Co', amount: -48.20, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'BILL-002', categoryAccountId: null },
    { id: 3, date: '2025-10-20', desc: 'Payment - Sunset Landscaping', amount: 50.00, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1003', categoryAccountId: null },
    { id: 4, date: '2025-10-21', desc: 'Utility Power', amount: -120.00, bankAccountId: 1, state: 'Suggested', suggestion: { accountId: 32, confidence: 87 }, matchedRef: null, categoryAccountId: null },
    { id: 5, date: '2025-10-20', desc: 'Miscellaneous', amount: -35.00, bankAccountId: 1, state: 'Uncategorized', suggestion: null, matchedRef: null, categoryAccountId: null },
    { id: 6, date: '2025-10-19', desc: 'Payroll', amount: -900.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 35 },
  ],
  rules: [
    { id: 1, name: 'Telephone', field: 'Description', contains: 'Cal Telephone', targetAccountId: 33, autoConfirm: true },
    { id: 2, name: 'Office Supplies', field: 'Description', contains: 'Office Supplies', targetAccountId: 31, autoConfirm: true },
  ],
  recurring: [
    { id: 1, name: 'Monthly Building Lease', type: 'Scheduled', txnType: 'Expense', interval: 'Monthly', intervalN: 1, startDate: '2025-09-01', entityId: 3, lines: [{ accountId: 38, desc: 'Building lease', amount: 900 }], email: false, reminderDays: 3, nextDate: '2025-11-01' },
    { id: 2, name: 'Telephone Bill', type: 'Scheduled', txnType: 'Bill', interval: 'Monthly', intervalN: 1, startDate: '2025-09-12', entityId: 1, lines: [{ accountId: 33, desc: 'Telephone service', amount: 74.36 }], email: false, reminderDays: 3, nextDate: '2025-11-12' },
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

export default SEED;
