import { CHART_OF_ACCOUNTS } from './chartOfAccounts.js';
import { INDIA_TAX_SEED } from './indiaTaxSeed.js';

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
    currency: 'INR',
    plan: 'Plus',
    firstDayOfWeek: 'Monday',
    salesToggles: { deliveryMethod: 'Email', customTxnNums: false, serviceDate: true, discount: true, deposit: false, tips: false, tags: false },
    timeSettings: { firstDayOfWeek: 'Monday', showServiceField: true, billableTime: true },
    usageLimits: { users: 5, accounts: 250 },
  },
  /**
 * Staff.
 *
 * `role` is the job title; `access` is the Meso permission level
 * (Admin / Standard / Time only) that decides what the person can actually do.
 * They are separate fields because conflating them was a real defect: a
 * bookkeeper and an administrator are different things, and the access level
 * is the one with consequences.
 *
 * `rate` is the hourly rate in the company's own currency. The owner's is zero
 * because the owner is not paid an hourly wage -- that is a fact about the
 * arrangement, not a missing value.
 */
  users: [
    { id: 1, first: 'Craig', last: 'Carlson', email: 'craig@samplecompany.com', phone: '(555) 010-1001', role: 'Owner', access: 'Admin', status: 'Active', rate: 0, active: true },
    { id: 2, first: 'Emily', last: 'Platt', email: 'emily@samplecompany.com', phone: '(555) 010-1002', role: 'Bookkeeper', access: 'Admin', status: 'Active', rate: 45, active: true },
    { id: 3, first: 'John', last: 'Johnson', email: 'john@samplecompany.com', phone: '(555) 010-1003', role: 'Field crew', access: 'TimeOnly', status: 'Active', rate: 25, active: true },
    { id: 4, first: 'Priya', last: 'Raghavan', email: 'priya@samplecompany.com', phone: '(555) 010-1004', role: 'Accountant', access: 'Standard', status: 'Active', rate: 62, active: true },
    { id: 5, first: 'Marcus', last: 'Bell', email: 'marcus@samplecompany.com', phone: '(555) 010-1005', role: 'Estimator', access: 'Standard', status: 'Active', rate: 40, active: true },
    { id: 6, first: 'Sofia', last: 'Marino', email: 'sofia@samplecompany.com', phone: '(555) 010-1006', role: 'Design assistant', access: 'TimeOnly', status: 'Inactive', rate: 28, active: false },
  ],
  customers: [
    { id: 1, displayName: 'Cool Cars', first: 'Gaurav', last: 'Parikh', email: 'Cool_Cars@meso.in', phone: '+91 98201 23456', billingAddress: '65 Marine Drive, Nariman Point, Mumbai, MH 400021', terms: 'Net 30', notes: '', balance: 0 },
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
  /**
   * The sales history.
   *
   * These were 2 pumps at 15, one design at 80 and one installation at 50 --
   * 160 in total for a quarter, from a business with a 13,495 truck, two staff
   * on payroll and a monthly lease. The books balanced and told a story no
   * business could live: revenue three orders of magnitude below its costs.
   *
   * Now the revenue is a landscaping and fountain contractor's actual shape --
   * a few thousand a month, with material cost against inventory lines, so the
   * gross profit and the cash position are both credible. Rates are per unit on
   * a job, not the per-litre price of a pump fitting.
   */
  invoices: [
    { id: 1, no: 'INV-1001', customerId: 1, date: '2025-10-01', dueDate: '2025-10-31', terms: 'Net 30', lines: [{ productId: 3, desc: 'Fountain pumps and fittings', qty: 2, rate: 1850, taxable: true }], discount: { mode: '%', value: 0 }, taxRateId: 1, status: 'Sent', sentAt: null, timeEntryIds: [] },
    { id: 2, no: 'INV-1002', customerId: 4, date: '2025-10-15', dueDate: '2025-10-15', terms: 'Due on receipt', lines: [{ productId: 1, desc: 'Garden design', qty: 1, rate: 4800, taxable: false }], discount: { mode: '%', value: 0 }, taxRateId: null, status: 'Overdue', sentAt: null, timeEntryIds: [] },
    { id: 3, no: 'INV-1003', customerId: 2, date: '2025-10-20', dueDate: '2025-11-19', terms: 'Net 30', lines: [{ productId: 6, desc: 'Landscaping installation', qty: 1, rate: 3200, taxable: false }], discount: { mode: '%', value: 0 }, taxRateId: null, status: 'Paid', sentAt: '2025-10-20T10:00:00Z', timeEntryIds: [] },
    { id: 4, no: 'INV-1004', customerId: 3, date: '2025-09-05', dueDate: '2025-10-05', terms: 'Net 30', lines: [{ productId: 4, desc: 'Rock fountain, installed', qty: 1, rate: 14200, taxable: true }], discount: { mode: '%', value: 0 }, taxRateId: 1, status: 'Paid', sentAt: '2025-09-05T09:00:00Z', timeEntryIds: [] },
    { id: 5, no: 'INV-1005', customerId: 5, date: '2025-09-18', dueDate: '2025-10-18', terms: 'Net 30', lines: [{ productId: 6, desc: 'Patio and decking', qty: 1, rate: 6750, taxable: false }], discount: { mode: '%', value: 0 }, taxRateId: null, status: 'Paid', sentAt: '2025-09-18T11:00:00Z', timeEntryIds: [] },
  ],
  estimates: [
    { id: 1, no: 'EST-001', customerId: 1, date: '2025-10-01', expiry: '2025-10-31', lines: [{ productId: 1, desc: 'Garden design', qty: 1, rate: 4800, taxable: false }], status: 'Sent', convertedTo: null },
  ],

  /**
   * Sales documents other than invoices.
   *
   * Estimates, sales orders, purchase orders and credit memos. They are held in
   * one map keyed by type rather than four sibling arrays, because they are one
   * shape and a fifth type should not mean a fifth array here.
   *
   * None of them posts to the ledger. An estimate is an intention to trade and
   * an order is a commitment; neither has been earned, so booking either would
   * put revenue in the books for work that has not happened. They become money
   * when converted to an invoice, which does post.
   */
  salesDocs: {
    estimates: [
      { id: 1, no: 'EST-001', customerId: 1, date: '2025-10-06', dueDate: '2025-11-05', terms: 'Net 30', lines: [{ productId: 4, desc: 'Rock fountain with installation', qty: 1, rate: 16500, taxable: true }], discount: { mode: '%', value: 5 }, status: 'Sent', memo: 'Includes planting and first-year maintenance' },
      { id: 2, no: 'EST-002', customerId: 3, date: '2025-10-11', dueDate: '2025-11-10', terms: 'Net 30', lines: [{ productId: 6, desc: 'Patio and decking', qty: 1, rate: 9800, taxable: false }], discount: { mode: '%', value: 0 }, status: 'Draft', memo: '' },
    ],
    orders: [
      { id: 1, no: 'SO-001', customerId: 5, date: '2025-09-20', dueDate: '2025-10-20', terms: 'Net 30', lines: [{ productId: 3, desc: 'Fountain pumps and fittings', qty: 4, rate: 1850, taxable: true }], discount: { mode: '%', value: 0 }, status: 'Closed', memo: 'Delivered 2025-09-28' },
    ],
    purchase_orders: [
      { id: 1, no: 'PO-001', vendorId: 1, date: '2025-09-25', dueDate: '2025-10-25', terms: 'Net 30', lines: [{ desc: 'Fountain pump units', qty: 6, rate: 640, taxable: true }], discount: { mode: '%', value: 0 }, status: 'Received', memo: 'For SO-001' },
    ],
    credit_memos: [
      { id: 1, no: 'CM-001', customerId: 2, date: '2025-10-08', dueDate: '2025-10-08', terms: 'Due on receipt', lines: [{ productId: 5, desc: 'Lighting supplied short on site', qty: 1, rate: 450, taxable: false }], discount: { mode: '%', value: 0 }, status: 'Sent', memo: 'Credited against INV-1003' },
    ],
  },
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
    // Payroll posts the GROSS to Payroll Expenses, not the net. The gross is
    // what the payroll costs the business and what actually leaves the bank --
    // the employee receives gross-minus-tax and the tax authority receives the
    // rest. Booking the net would understate both the expense and the cash.
    { id: 2, payeeId: null, payeeName: 'Payroll - August', paymentAccountId: 1, method: 'Transfer', date: '2025-08-29', lines: [{ accountId: 35, desc: 'Payroll 1-31 Aug 2025', amount: 1400.00 }], memo: 'Two staff, monthly gross', attachment: null, source: 'Payroll' },
    { id: 3, payeeId: null, payeeName: 'Payroll - September', paymentAccountId: 1, method: 'Transfer', date: '2025-09-30', lines: [{ accountId: 35, desc: 'Payroll 1-30 Sep 2025', amount: 1400.00 }], memo: 'Two staff, monthly gross', attachment: null, source: 'Payroll' },
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
    // Settles INV-1003. The amount is the invoice total exactly, because a match
    // clears the receivable it names and a mismatch leaves a residue nobody can
    // explain. It is 3,200, not the 50 the old fixture carried.
    { id: 3, date: '2025-10-20', desc: 'Payment - Sunset Landscaping', amount: 3200.00, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1003', categoryAccountId: null },
    // September's two invoices, settled before this period. Without these the
    // bank shows the business collecting nothing for a whole quarter while the
    // invoices say it invoiced 21,000.
    { id: 9, date: '2025-09-18', desc: 'Payment - Greenwood Estates', amount: 6750.00, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1005', categoryAccountId: null },
    { id: 10, date: '2025-09-28', desc: 'Payment - Riverside HOA', amount: 16756.00, bankAccountId: 1, state: 'Match', suggestion: null, matchedRef: 'INV-1004', categoryAccountId: null },
    { id: 4, date: '2025-10-21', desc: 'Utility Power', amount: -120.00, bankAccountId: 1, state: 'Suggested', suggestion: { accountId: 32, confidence: 87 }, matchedRef: null, categoryAccountId: null },
    { id: 5, date: '2025-10-20', desc: 'Miscellaneous', amount: -35.00, bankAccountId: 1, state: 'Uncategorized', suggestion: null, matchedRef: null, categoryAccountId: null },
    { id: 6, date: '2025-10-19', desc: 'Payroll', amount: -900.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 35 },
    // The two monthly payroll runs above each credit Checking, so each needs a
    // bank row that actually left the account. Without these the ledger took
    // 7,200 out of cash that never moved, which is how a balance sheet can
    // balance and still be nonsense: Checking went to -7,091.56 on a company
    // whose bank feed shows six transactions.
    { id: 7, date: '2025-08-29', desc: 'Payroll — August', amount: -1400.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 35 },
    { id: 8, date: '2025-09-30', desc: 'Payroll — September', amount: -1400.00, bankAccountId: 1, state: 'Reviewed', suggestion: null, matchedRef: null, categoryAccountId: 35 },
  ],
  rules: [
    { id: 1, name: 'Telephone', field: 'Description', contains: 'Cal Telephone', targetAccountId: 33, autoConfirm: true },
    { id: 2, name: 'Office Supplies', field: 'Description', contains: 'Office Supplies', targetAccountId: 31, autoConfirm: true },
  ],
  recurring: [
    { id: 1, name: 'Monthly Building Lease', type: 'Scheduled', txnType: 'Expense', interval: 'Monthly', intervalN: 1, startDate: '2025-09-01', entityId: 3, lines: [{ accountId: 38, desc: 'Building lease', amount: 900 }], email: false, reminderDays: 3, nextDate: '2025-11-01' },
    { id: 2, name: 'Telephone Bill', type: 'Scheduled', txnType: 'Bill', interval: 'Monthly', intervalN: 1, startDate: '2025-09-12', entityId: 1, lines: [{ accountId: 33, desc: 'Telephone service', amount: 74.36 }], email: false, reminderDays: 3, nextDate: '2025-11-12' },
  ],
  /**
   * Vehicles own the rate; trips do not. Distance is end odometer minus start
   * odometer and the deduction is distance times the vehicle's rate -- both
   * derived on the Mileage screen, so correcting a reading corrects the money
   * instead of leaving a stored figure that no longer adds up.
   *
   * Rates are rupees per kilometre. Per-kilometre reimbursement is the Indian
   * convention; the per-mile equivalent is a different unit and a different
   * number, and borrowing it would put a foreign rate on an Indian return.
   */
  vehicles: [
    { id: 1, name: 'Tata Nexon', plate: 'MH 12 AB 1234', ratePerKm: 18, primary: true },
    { id: 2, name: 'Mahindra Bolero', plate: 'MH 12 CD 5678', ratePerKm: 24, primary: false },
    { id: 3, name: 'Honda Activa', plate: 'MH 12 EF 9012', ratePerKm: 12, primary: false },
  ],
  mileage: [
    { id: 1, date: '2025-10-02', vehicleId: 1, purpose: 'Site visit — Cool Cars, Half Moon Bay', customerId: 1, startOdo: 12480, endOdo: 12512, billable: true },
    { id: 2, date: '2025-10-06', vehicleId: 2, purpose: 'Material pickup — Amy’s Bird Sanctuary', customerId: 2, startOdo: 8820, endOdo: 8859, billable: true },
    { id: 3, date: '2025-10-11', vehicleId: 1, purpose: 'Client meeting — Paulsen Medical Supplies', customerId: 3, startOdo: 12512, endOdo: 12538, billable: true },
    { id: 4, date: '2025-10-17', vehicleId: 3, purpose: 'Bank deposit and stationery run', customerId: null, startOdo: 3210, endOdo: 3224, billable: false },
    { id: 5, date: '2025-10-23', vehicleId: 1, purpose: 'Install day — Island Events', customerId: 5, startOdo: 12538, endOdo: 12571, billable: true },
  ],
  /**
   * Payroll runs.
   *
   * Each run here is backed by exactly ONE real posting already in the books,
   * named in `expenseId` or `bankTxnId`. That matters: a payroll table whose
   * rows are not connected to any transaction is the same defect as a typed-in
   * balance, and adding these runs without the backing would have made the
   * screen look right while moving nothing.
   *
   *   PR-0001 / PR-0002  backed by expenses 2 and 3 (gross to Payroll Expenses)
   *   PR-0003            backed by bank transaction 6 (categorised to Payroll)
   *
   * `journalEntryId` is null on all three, and that is the honest value: no
   * journal entry has been raised against these runs. The field is kept because
   * a run that grows one should say so rather than the screen pretending every
   * run is documented.
   *
   * `net` is NOT stored. It is gross minus taxes, computed wherever it is
   * shown, so correcting a tax figure cannot leave a stale rupee amount behind.
   */
  payrollRuns: [
    { id: 1, no: 'PR-0001', date: '2025-08-29', period: '1–31 Aug 2025', payeeId: null, payee: 'Staff payroll', gross: 1400, taxes: 0, status: 'Paid', expenseId: 2, bankTxnId: null, journalEntryId: null },
    { id: 2, no: 'PR-0002', date: '2025-09-30', period: '1–30 Sep 2025', payeeId: null, payee: 'Staff payroll', gross: 1400, taxes: 0, status: 'Paid', expenseId: 3, bankTxnId: null, journalEntryId: null },
    { id: 3, no: 'PR-0003', date: '2025-10-19', period: '1–19 Oct 2025', payeeId: null, payee: 'Payroll — October', gross: 900, taxes: 0, status: 'Paid', expenseId: null, bankTxnId: 6, journalEntryId: null },
    { id: 4, no: 'PR-0004', date: '2025-10-31', period: '1–31 Oct 2025', payeeId: null, payee: 'Staff payroll', gross: 1400, taxes: 0, status: 'Draft', expenseId: null, bankTxnId: null, journalEntryId: null },
  ],
  /**
   * `hours`/`minutes` are the duration and `rate` is that person's billable
   * rate on that job. The amount is neither of those multiplied by hand -- it is
   * derived on the Time screen from the two, so a corrected duration cannot
   * leave a stale rupee figure behind.
   *
   * `status` stays Unbilled until the work goes on an invoice; `invoiceId`
   * names which one, so the screen can say "already billed" rather than guess.
   */
  timeEntries: [
    { id: 1, date: '2025-10-01', userId: 2, customerId: 1, project: 'Cool Cars fountain', description: 'Fountain layout and client walkthrough', hours: 3, minutes: 30, rate: 450, billable: true, status: 'Unbilled', invoiceId: null },
    { id: 2, date: '2025-10-03', userId: 3, customerId: 4, project: 'Sushi signage', description: 'Menu board design revisions', hours: 2, minutes: 0, rate: 350, billable: true, status: 'Unbilled', invoiceId: null },
    { id: 3, date: '2025-10-07', userId: 2, customerId: 2, project: 'Irrigation survey', description: 'Irrigation survey and planting plan', hours: 5, minutes: 15, rate: 450, billable: true, status: 'Billed', invoiceId: 3 },
    { id: 4, date: '2025-10-09', userId: 1, customerId: null, project: '', description: 'Monthly accounts review and GST workings', hours: 4, minutes: 0, rate: 600, billable: true, status: 'Unbilled', invoiceId: null },
    { id: 5, date: '2025-10-14', userId: 3, customerId: 3, project: 'Paulsen fitout', description: 'Site measurement call-out', hours: 1, minutes: 45, rate: 350, billable: true, status: 'Unbilled', invoiceId: null },
    { id: 6, date: '2025-10-16', userId: 2, customerId: 5, project: 'Island Events setup', description: 'Event setup and lighting rig', hours: 6, minutes: 0, rate: 450, billable: true, status: 'Billed', invoiceId: 3 },
    { id: 7, date: '2025-10-20', userId: 1, customerId: null, project: '', description: 'Year-end audit preparation', hours: 2, minutes: 30, rate: 0, billable: false, status: 'Unbilled', invoiceId: null },
    { id: 8, date: '2025-10-22', userId: 3, customerId: 1, project: 'Cool Cars fountain', description: 'Pump delivery and commissioning', hours: 3, minutes: 0, rate: 350, billable: true, status: 'Unbilled', invoiceId: null },
    { id: 9, date: '2025-10-24', userId: 2, customerId: 2, project: 'Seasonal maintenance', description: 'Seasonal maintenance visit', hours: 4, minutes: 30, rate: 450, billable: true, status: 'Unbilled', invoiceId: null },
  ],
  /**
   * Indian GST rates, the return register, the ITC book, the TDS register, the
   * advance-tax schedule and the loan book.
   *
   * Spread rather than written inline so the whole statutory picture lives in
   * one reviewable module (`indiaTaxSeed.js`) instead of being scattered through
   * the transaction seed, and so all three tax screens read the same numbers.
   * It deliberately replaces the `taxRates` array it used to sit beside: those
   * were California percentages, and an Indian product carrying a US sales tax
   * rate is the same defect as a `$` sign on a rupee amount.
   */
  ...INDIA_TAX_SEED,
  /**
   * A budget is a plan: a name, the account it is measured against, the period
   * it covers and the rupee amount allowed. That is ALL it is.
   *
   * There is deliberately no "actual" and no "variance" field here. Actual spend
   * is derived from the ledger by BudgetsView, so a bill coded to Telephone
   * moves the Telephone budget without anybody touching it. A stored actual is a
   * second source of truth that goes stale the moment a transaction lands, and
   * the whole defect this project exists to remove was figures that looked
   * right and were connected to nothing.
   */
  budgets: [
    { id: 1, name: 'Telephone and internet', accountId: 33, period: '2025-10', amount: 120 },
    { id: 2, name: 'Electricity and water', accountId: 32, period: '2025-10', amount: 150 },
    { id: 3, name: 'Office supplies', accountId: 31, period: '2025-10', amount: 100 },
    { id: 4, name: 'Advertising and promotion', accountId: 36, period: '2025-10', amount: 3000 },
    { id: 5, name: 'Mileage reimbursement', accountId: 34, period: '2025-10', amount: 2500 },
    { id: 6, name: 'Payroll', accountId: 35, period: '2025-10', amount: 800 },
  ],
  notifications: [
    { id: 1, text: 'Invoice INV-1002 is overdue', time: '2h ago', read: false, route: '/sales' },
    { id: 2, text: 'Bill BILL-001 is overdue', time: '1d ago', read: false, route: '/expenses' },
  ],

  /**
   * Dated notes against customers, for the Customer Hub timeline.
   *
   * A note is its own row rather than a field on the customer because the
   * timeline sorts on date. `customer.notes` is a single undated string and
   * could only ever hold one of these.
   */
  customerNotes: [
    { id: 1, customerId: 1, date: '2025-10-02', text: 'Asked for two pumps delivered before the end of October. Confirmed the lead time.', author: 'Craig Carlson' },
    { id: 2, customerId: 2, date: '2025-10-20', text: 'Settled the installation invoice by transfer on the day it was raised.', author: 'Craig Carlson' },
    { id: 3, customerId: 4, date: '2025-10-22', text: 'Design work unpaid. Following up again on Monday.', author: 'Emily Platt' },
  ],
  /** Facts about statements sent. The money is recomputed from the ledger. */
  statements: [
    { id: 1, customerId: 1, date: '2025-10-25', sentTo: 'Cool_Cars@meso.in' },
  ],

  /**
   * The financial plan.
   *
   * Twelve months of TARGETS, and nothing else. Every actual figure on the
   * planning screen is derived from the ledger for that month, so editing a
   * transaction changes the variance without anyone re-entering a number here.
   *
   * The targets are monthly P&L: a revenue target and an expense target per
   * expense account. They are stated for the calendar year the transactions sit
   * in (2025), because a plan for months that have no transactions behind them
   * would be a target against nothing.
   */
  plan: {
    year: 2025,
    months: [
      { month: '2025-01', revenue: 9000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 0 } },
      { month: '2025-02', revenue: 9500, expenses: { 35: 3600, 38: 900, 33: 75, 36: 0 } },
      { month: '2025-03', revenue: 11000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 400 } },
      { month: '2025-04', revenue: 10500, expenses: { 35: 3600, 38: 900, 33: 75, 36: 0 } },
      { month: '2025-05', revenue: 12000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 300 } },
      { month: '2025-06', revenue: 14000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 500 } },
      { month: '2025-07', revenue: 13000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 0 } },
      { month: '2025-08', revenue: 11500, expenses: { 35: 3600, 38: 900, 33: 75, 36: 200 } },
      { month: '2025-09', revenue: 12500, expenses: { 35: 3600, 38: 900, 33: 75, 36: 350 } },
      { month: '2025-10', revenue: 15000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 600 } },
      { month: '2025-11', revenue: 16000, expenses: { 35: 3600, 38: 900, 33: 75, 36: 800 } },
      { month: '2025-12', revenue: 14500, expenses: { 35: 3600, 38: 900, 33: 75, 36: 1200 } },
    ],
  },

  /**
   * Marketing campaigns.
   *
   * `attributedRevenue` is null on most rows, and that is the honest state of
   * it: nothing in the books ties a campaign to the invoices it produced, so
   * there is no attributable revenue to divide a spend by. The screen says the
   * ratio cannot be calculated rather than dividing spend by total company
   * revenue, which would produce a confident number describing nothing.
   */
  marketing: {
    campaigns: [
      { id: 1, name: 'Local search — fountain installers', channel: 'Google Ads', startDate: '2025-07-01', endDate: '2025-12-31', budget: 60000, spendToDate: 41250, status: 'Active', attributedRevenue: null },
      { id: 2, name: 'Spring landscaping showcase', channel: 'Print', startDate: '2025-03-01', endDate: '2025-04-30', budget: 35000, spendToDate: 33200, status: 'Ended', attributedRevenue: null },
      { id: 3, name: 'Referral programme', channel: 'Referral', startDate: '2025-01-01', endDate: '2025-12-31', budget: 25000, spendToDate: 9600, status: 'Active', attributedRevenue: 184500 },
      { id: 4, name: 'Instagram — before and after', channel: 'Social media', startDate: '2025-09-01', endDate: '2025-10-31', budget: 18000, spendToDate: 18400, status: 'Ended', attributedRevenue: null },
      { id: 5, name: 'Trade association sponsorship', channel: 'Sponsorship', startDate: '2025-05-01', endDate: '2025-11-30', budget: 90000, spendToDate: 54000, status: 'Active', attributedRevenue: null },
      { id: 6, name: 'Newsletter sponsorship', channel: 'Email', startDate: '2025-10-01', endDate: '2025-12-31', budget: 12000, spendToDate: 0, status: 'Planned', attributedRevenue: null },
    ],
  },

  /**
   * Saved custom reports.
   *
   * Definitions, not output. `source` names a collection, `fields` the columns,
   * `groupBy` the column to aggregate on, and `filter` narrows the rows. The
   * table is produced by running the recipe against the store at the moment the
   * report is opened -- so these four read correctly today and next month
   * without being re-saved.
   */
  customReports: [
    { id: 1, name: 'Sales by customer', source: 'invoices', fields: ['date', 'no', 'customer', 'status', 'total'], groupBy: 'customer', filter: { field: 'status', op: 'not', value: 'Draft' } },
    { id: 2, name: 'Sales by product', source: 'invoices', fields: ['product', 'customer', 'date', 'qty', 'rate', 'amount'], groupBy: 'product', filter: { field: 'status', op: 'not', value: 'Draft' } },
    { id: 3, name: 'Expenses by category', source: 'expenses', fields: ['date', 'account', 'payee', 'amount'], groupBy: 'account', filter: null },
    { id: 4, name: 'A/R by customer', source: 'invoices', fields: ['date', 'no', 'customer', 'dueDate', 'status', 'total'], groupBy: 'customer', filter: { field: 'status', op: 'not', value: 'Paid' } },
  ],
  audit: [
    { date: new Date('2025-10-24T19:11:00+11:00'), user: 'Craig Carlson', event: 'Created invoice INV-1001', view: true, ref: { type: 'invoice', id: 1 } },
    { date: new Date('2025-10-23T10:00:00+11:00'), user: 'Craig Carlson', event: 'Added expense to Office Supplies ₹48.20', view: true, ref: { type: 'expense', id: 2 } },
    { date: new Date('2025-10-22T14:30:00+11:00'), user: 'Craig Carlson', event: 'Added bill from Cal Telephone', view: true, ref: { type: 'bill', id: 1 } },
  ],
  dashboard: { widgets: ['sales', 'bank', 'pnl', 'expenses', 'cashflow', 'feed'], privacy: false, period: 'This month' },
  favorites: [],
  bookmarks: [],
  ui: { page: 'dashboard', zenMode: false, bankFullscreen: false, overlays: {} },
};

export default SEED;
