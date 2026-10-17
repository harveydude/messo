import React, { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from 'react';
import { CHART_OF_ACCOUNTS } from './data/chartOfAccounts';
import { deriveLedger, accountsOfType } from './ledger';
import { SEED } from './data/seed';
import api from './api/client';

/**
 * Central store with localStorage persistence.
 *
 * Every mutation goes through dispatch -> reducer -> state -> localStorage.
 * Components read via useStore() and write via dispatch().
 *
 * Audit law: every create/edit/delete/schedule/send/match/link pushes an
 * audit entry {date, user, event, view, ref} and persists.
 *
 * The store holds transactions, not results. Nothing here stores a balance --
 * those are derived from this data by `src/ledger.js`, so recording something
 * here moves every report that reads it.
 */

/**
 * Bumped to v2 when account balances stopped being typed in and started being
 * derived. A v1 payload carries a chart of accounts with a `qb` balance frozen
 * into each row, and hydrating it would keep showing those invented figures
 * forever. Discarding v1 is the point, not a migration inconvenience -- there
 * is no real user data to lose.
 *
 * Bumped to v3 when `taxRates` changed shape from three California percentages
 * to GST slabs carrying a CGST/SGST/IGST split and an HSN code. A v2 payload
 * holds the old rates under the same key, and `{ ...SEED, ...parsed }` would
 * let those win -- so the screen would open showing "California (8%)" in an
 * Indian product. Same reasoning as v2: the shape changed, so the old payload
 * is discarded rather than half-honoured.
 */
const STORAGE_KEY = 'messo-store-v3';

export { CHART_OF_ACCOUNTS };

function logAudit(state, event, view = false, ref = null) {
  return [{ date: new Date(), user: 'Craig Carlson', event, view, ref }, ...state.audit];
}

/**
 * Next id for a locally-created collection.
 *
 * Seeded entities use small integers; rows created in the browser cannot use
 * those without colliding, so anything created here takes a large id that will
 * not run into a hand-written one. A timestamp is the honest choice: it is
 * monotonic enough for a single user and needs no counter kept in storage that
 * a corrupt payload could reset.
 */
function nextLocalId(list) {
  const max = (list || []).reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  return max > 1e9 ? max + 1 : Date.now();
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
    case 'UPDATE_VENDOR':
      return { ...state, vendors: state.vendors.map(v => v.id === action.payload.id ? action.payload : v), audit: logAudit(state, `Updated vendor ${action.payload.displayName}`, true, { type: 'vendor', id: action.payload.id }) };
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
    /* -- GST, TDS and lending. Each one writes a FACT (a rate, a filing date,
       * a payment) and leaves every figure derived from it to the screens. See
       * the note above `blankPostings` for why nothing here stores a total. -- */
    case 'ADD_TAX_RATE':
      return { ...state, taxRates: [...state.taxRates, action.payload], audit: logAudit(state, `Added GST rate ${action.payload.name}`, false, { type: 'taxRate', id: action.payload.id }) };
    case 'FILE_GST_RETURN':
      return { ...state, gstReturns: state.gstReturns.map((r) => (r.id === action.payload.id ? { ...r, ...action.payload } : r)), audit: logAudit(state, `Filed ${action.payload.returnType || 'return'} for ${action.payload.id}`, false, { type: 'gstReturn', id: action.payload.id }) };
    case 'ADD_TDS_ENTRY':
      return { ...state, tdsEntries: [action.payload, ...state.tdsEntries], audit: logAudit(state, `Recorded TDS u/s ${action.payload.section} on ${action.payload.grossAmount}`, false, { type: 'tdsEntry', id: action.payload.id }) };
    case 'DEPOSIT_TDS':
      return { ...state, tdsEntries: state.tdsEntries.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload } : t)), audit: logAudit(state, `Deposited TDS for ${action.payload.id}`, false, { type: 'tdsEntry', id: action.payload.id }) };
    case 'FILE_TDS_RETURN':
      return { ...state, tdsReturns: state.tdsReturns.map((t) => (t.id === action.payload.id ? { ...t, ...action.payload } : t)), audit: logAudit(state, `Filed ${action.payload.id}`, false, { type: 'tdsReturn', id: action.payload.id }) };
    case 'PAY_ADVANCE_TAX':
      return { ...state, advanceTax: { ...state.advanceTax, payments: [...(state.advanceTax?.payments || []), action.payload] }, audit: logAudit(state, `Paid advance tax instalment ${action.payload.instalmentNo}`, false, { type: 'advanceTax', id: action.payload.instalmentNo }) };
    case 'ADD_LOAN':
      return { ...state, loans: [...(state.loans || []), action.payload], audit: logAudit(state, `Recorded loan from ${action.payload.lender}`, false, { type: 'loan', id: action.payload.id }) };
    case 'RECORD_LOAN_REPAYMENT':
      // The outstanding balance is not written here. It is principal minus the
      // repayments below, recomputed on the screen -- so a repayment can never
      // leave a stored balance that disagrees with its own schedule.
      return { ...state, loans: state.loans.map((l) => (l.id === action.payload.loanId ? { ...l, repayments: [...(l.repayments || []), action.payload.repayment] } : l)), audit: logAudit(state, `Recorded a repayment on the ${action.payload.loanName || 'loan'}`, false, { type: 'loan', id: action.payload.loanId }) };
    case 'UPDATE_COMPANY':
      return { ...state, company: { ...state.company, ...action.payload }, audit: logAudit(state, 'Changed settings', false, null) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload }, audit: logAudit(state, 'Changed settings', false, null) };
    /**
     * A payroll run is a record that names the expense or bank transaction
     * which posted it -- `expenseId`/`bankTxnId`. It is deliberately NOT a place
     * to store net pay: net is gross less tax, computed on the Payroll screen,
     * so a corrected tax figure cannot leave a stale amount behind.
     */
    case 'ADD_PAYROLL_RUN':
      return { ...state, payrollRuns: [...state.payrollRuns, action.payload], audit: logAudit(state, `Added payroll run ${action.payload.no}`, true, { type: 'payrollRun', id: action.payload.id }) };
    case 'UPDATE_PAYROLL_RUN':
      return { ...state, payrollRuns: state.payrollRuns.map(r => r.id === action.payload.id ? action.payload : r), audit: logAudit(state, `Updated payroll run ${action.payload.no}`, true, { type: 'payrollRun', id: action.payload.id }) };
    case 'ADD_USER':
      return { ...state, users: [...state.users, action.payload], audit: logAudit(state, `Added user ${action.payload.first} ${action.payload.last}`, true, { type: 'user', id: action.payload.id }) };
    case 'UPDATE_USER':
      return { ...state, users: state.users.map(u => u.id === action.payload.id ? action.payload : u), audit: logAudit(state, `Updated user ${action.payload.first} ${action.payload.last}`, true, { type: 'user', id: action.payload.id }) };
    /**
     * Time, mileage and budgets are all "the user recorded a fact". None of them
     * stores a derived figure: a time entry stores hours/minutes and a rate and
     * the screen multiplies them, a trip stores two odometer readings and the
     * screen subtracts them, and a budget stores only its allowance because the
     * actual comes from the ledger. Storing the result instead is what let a
     * report and its own source disagree.
     */
    case 'ADD_TIME_ENTRY':
      return { ...state, timeEntries: [...state.timeEntries, action.payload], audit: logAudit(state, `Added time entry: ${action.payload.description}`, true, { type: 'timeEntry', id: action.payload.id }) };
    case 'UPDATE_TIME_ENTRY':
      return { ...state, timeEntries: state.timeEntries.map(t => t.id === action.payload.id ? action.payload : t), audit: logAudit(state, `Updated time entry: ${action.payload.description}`, true, { type: 'timeEntry', id: action.payload.id }) };
    case 'DELETE_TIME_ENTRY':
      return { ...state, timeEntries: state.timeEntries.filter(t => t.id !== action.payload), audit: logAudit(state, 'Deleted time entry', false, null) };
    case 'ADD_MILEAGE_TRIP':
      return { ...state, mileage: [...state.mileage, action.payload], audit: logAudit(state, `Added trip: ${action.payload.purpose}`, true, { type: 'mileage', id: action.payload.id }) };
    case 'DELETE_MILEAGE_TRIP':
      return { ...state, mileage: state.mileage.filter(m => m.id !== action.payload), audit: logAudit(state, 'Deleted trip', false, null) };
    case 'ADD_VEHICLE':
      return { ...state, vehicles: [...state.vehicles, action.payload], audit: logAudit(state, `Added vehicle ${action.payload.name}`, true, { type: 'vehicle', id: action.payload.id }) };
    case 'UPDATE_VEHICLE':
      return { ...state, vehicles: state.vehicles.map(v => v.id === action.payload.id ? action.payload : v), audit: logAudit(state, `Updated vehicle ${action.payload.name}`, true, { type: 'vehicle', id: action.payload.id }) };
    case 'DELETE_VEHICLE':
      return { ...state, vehicles: state.vehicles.filter(v => v.id !== action.payload), audit: logAudit(state, `Deleted vehicle ${action.payload}`, false, null) };
    case 'ADD_BUDGET':
      return { ...state, budgets: [...state.budgets, action.payload], audit: logAudit(state, `Created budget ${action.payload.name}`, true, { type: 'budget', id: action.payload.id }) };
    case 'UPDATE_BUDGET':
      return { ...state, budgets: state.budgets.map(b => b.id === action.payload.id ? action.payload : b), audit: logAudit(state, `Updated budget ${action.payload.name}`, true, { type: 'budget', id: action.payload.id }) };
    case 'DELETE_BUDGET':
      return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload), audit: logAudit(state, `Deleted budget ${action.payload}`, false, null) };
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

    /**
     * Customer Hub: a note typed against a customer.
     *
     * Stored as its own row rather than appended to `customer.notes`, because a
     * note has a date and the timeline sorts on it. A single text field on the
     * customer could only ever hold one undated sentence.
     */
    case 'ADD_CUSTOMER_NOTE':
      return {
        ...state,
        customerNotes: [...(state.customerNotes || []), action.payload],
        audit: logAudit(state, `Noted "${action.payload.text}" on customer ${action.payload.customerId}`, true, { type: 'customer', id: action.payload.customerId }),
      };
    case 'DELETE_CUSTOMER_NOTE':
      return {
        ...state,
        customerNotes: (state.customerNotes || []).filter((n) => n.id !== action.payload),
        audit: logAudit(state, 'Deleted a customer note', false, null),
      };

    /**
     * A statement sent to a customer.
     *
     * The figures on the statement are recomputed from the ledger every time it
     * is opened. What is stored is the fact that it was sent, on what date, and
     * to which address -- a snapshot of the money would immediately be able to
     * disagree with the ledger, which is the defect this app exists to remove.
     */
    case 'SEND_STATEMENT':
      return {
        ...state,
        statements: [...(state.statements || []), action.payload],
        audit: logAudit(state, `Sent statement to customer ${action.payload.customerId}`, true, { type: 'customer', id: action.payload.customerId }),
      };

    /**
     * Saved custom-report definitions.
     *
     * A definition is a *recipe* -- source, fields, grouping, filters -- never a
     * result. The table it produces is recomputed from the store every time the
     * report is run, so a report saved last month shows this month's numbers
     * rather than a photograph of last month's.
     */
    case 'SAVE_CUSTOM_REPORT':
      return {
        ...state,
        customReports: action.payload.id
          ? (state.customReports || []).map((r) => (r.id === action.payload.id ? action.payload : r))
          : [...(state.customReports || []), { ...action.payload, id: action.payload.id || nextLocalId(state.customReports) }],
        audit: logAudit(state, `Saved custom report ${action.payload.name}`, false, { type: 'customReport', id: action.payload.id }),
      };
    case 'DELETE_CUSTOM_REPORT':
      return {
        ...state,
        customReports: (state.customReports || []).filter((r) => r.id !== action.payload),
        audit: logAudit(state, 'Deleted a custom report', false, null),
      };

    /**
     * The financial plan.
     *
     * Only targets are stored. Every "actual" on the planning screen is derived
     * from the ledger for the month in question, so changing a transaction
     * changes the variance without anyone re-entering the plan.
     */
    case 'SET_PLAN':
      return { ...state, plan: action.payload, audit: logAudit(state, 'Edited the financial plan', false, null) };
    case 'SET_PLAN_MONTH':
      return {
        ...state,
        plan: { ...(state.plan || {}), months: (state.plan?.months || []).map((m) => (m.month === action.payload.month ? { ...m, ...action.payload.values } : m)) },
        audit: logAudit(state, `Edited the plan for ${action.payload.month}`, false, null),
      };

    /**
     * Marketing campaigns.
     *
     * `attributedRevenue` is nullable on purpose. Most campaigns have no
     * attributable revenue, and the screen says so rather than dividing spend by
     * total company revenue to manufacture an ROI.
     */
    case 'ADD_CAMPAIGN':
      return {
        ...state,
        marketing: { ...(state.marketing || {}), campaigns: [...((state.marketing || {}).campaigns || []), action.payload] },
        audit: logAudit(state, `Created marketing campaign ${action.payload.name}`, true, { type: 'campaign', id: action.payload.id }),
      };
    case 'UPDATE_CAMPAIGN':
      return {
        ...state,
        marketing: {
          ...(state.marketing || {}),
          campaigns: ((state.marketing || {}).campaigns || []).map((c) => (c.id === action.payload.id ? { ...c, ...action.payload.values } : c)),
        },
        audit: logAudit(state, `Updated marketing campaign ${action.payload.id}`, true, { type: 'campaign', id: action.payload.id }),
      };
    case 'DELETE_CAMPAIGN':
      return {
        ...state,
        marketing: { ...(state.marketing || {}), campaigns: ((state.marketing || {}).campaigns || []).filter((c) => c.id !== action.payload) },
        audit: logAudit(state, 'Deleted a marketing campaign', false, null),
      };

    /**
     * Sales documents: estimates, sales orders, purchase orders, credit memos.
     *
     * These were dispatched by SalesDocumentsView from the start, with no case
     * to receive them, so creating an estimate silently did nothing -- the
     * dialog closed and the table stayed empty, which reads as a bug and not as
     * a missing action.
     *
     * They are kept under one `salesDocs` map keyed by type rather than four
     * sibling arrays, because they are one shape and adding a fifth type should
     * not mean a fifth array in the seed.
     *
     * Note what they do NOT do: they do not post to the ledger. An estimate is
     * an intention to trade and a sales order is a commitment; neither is a
     * transaction, and treating either as one would put revenue in the books
     * for work that has not been done. They become real money when converted
     * into an invoice, which does post.
     */
    case 'ADD_SALES_DOC':
      return {
        ...state,
        salesDocs: {
          ...state.salesDocs,
          [action.payload.kind]: [...(state.salesDocs?.[action.payload.kind] || []), action.payload],
        },
        audit: logAudit(state, `Created ${action.payload.no}`, true, { type: 'salesDoc', id: action.payload.id }),
      };
    case 'UPDATE_SALES_DOC':
      return {
        ...state,
        salesDocs: {
          ...state.salesDocs,
          [action.payload.kind]: (state.salesDocs?.[action.payload.kind] || []).map((d) =>
            d.id === action.payload.doc.id ? { ...d, ...action.payload.doc } : d
          ),
        },
        audit: logAudit(state, `Updated ${action.payload.doc.no}`, true, { type: 'salesDoc', id: action.payload.doc.id }),
      };
    case 'DELETE_SALES_DOC':
      return {
        ...state,
        salesDocs: {
          ...state.salesDocs,
          [action.payload.kind]: (state.salesDocs?.[action.payload.kind] || []).filter((d) => d.id !== action.payload.id),
        },
        audit: logAudit(state, `Deleted ${action.payload.no}`, false, null),
      };

    default:
      return state;
  }
}

const StoreContext = createContext();

export function StoreProvider({ children }) {
  const [state, rawDispatch] = useReducer(reducer, SEED);

  // Background API dispatcher that keeps local state and backend PostgreSQL synced
  const dispatch = useCallback((action) => {
    rawDispatch(action);

    // Asynchronously sync mutations with backend
    try {
      if (action.type === 'ADD_INVOICE') {
        const inv = action.payload;
        api.createInvoice({
          customerId: inv.customerId ? `cust_${inv.customerId}` : 'cust_1',
          invoiceNumber: inv.no ? String(inv.no).replace(/^INV-/, '') : undefined,
          dueDate: inv.dueDate,
          items: (inv.lines || []).map(l => ({
            name: l.desc || 'Services',
            desc: l.desc || '',
            qty: Number(l.qty || 1),
            rate: Number(l.rate || 0),
          })),
        }).catch(err => console.warn('[Meso Sync] Invoice backend sync notice:', err.message));
      } else if (action.type === 'ADD_EXPENSE') {
        const exp = action.payload;
        api.createExpense({
          payeeName: exp.payeeName || 'Vendor',
          paymentDate: exp.date,
          memo: exp.memo,
          lines: exp.lines,
        }).catch(err => console.warn('[Meso Sync] Expense backend sync notice:', err.message));
      } else if (action.type === 'ADD_CUSTOMER') {
        const c = action.payload;
        api.createCustomer({
          displayName: c.displayName,
          firstName: c.first,
          lastName: c.last,
          email: c.email,
          phone: c.phone,
          billingAddress: c.billingAddress,
          gstin: c.gstin,
          pan: c.pan,
        }).catch(err => console.warn('[Meso Sync] Customer backend sync notice:', err.message));
      } else if (action.type === 'ADD_VENDOR') {
        const v = action.payload;
        api.createVendor({
          displayName: v.displayName,
          companyName: v.company,
          email: v.email,
          phone: v.phone,
          address: v.address,
          gstin: v.gstin,
          pan: v.pan,
        }).catch(err => console.warn('[Meso Sync] Vendor backend sync notice:', err.message));
      } else if (action.type === 'UPDATE_BANK_TXN') {
        const tx = action.payload;
        if (tx.matched) {
          api.matchBankTransaction(tx.id).catch(err => console.warn('[Meso Sync] Match bank transaction notice:', err.message));
        } else {
          api.categorizeBankTransaction(tx.id).catch(err => console.warn('[Meso Sync] Categorize bank transaction notice:', err.message));
        }
      }
    } catch (e) {
      console.warn('[Meso Sync] Dispatch sync handler:', e);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        rawDispatch({ type: 'HYDRATE', payload: { ...SEED, ...parsed } });
      } catch { /* ignore corrupt data */ }
    }

    // Hydrate live data from Meso PostgreSQL / Supabase
    async function syncFromBackend() {
      try {
        const [invRes, custRes, vendRes, bankRes, bmRes] = await Promise.allSettled([
          api.getInvoices(),
          api.getCustomers(),
          api.getVendors(),
          api.getBankTransactions(),
          api.getBookmarks(),
        ]);

        const patch = {};

        if (invRes.status === 'fulfilled' && invRes.value?.invoices?.length > 0) {
          patch.invoices = invRes.value.invoices.map((inv) => ({
            id: inv.id,
            no: inv.invoice_number ? `INV-${inv.invoice_number}` : inv.id,
            customerId: inv.customer_id,
            customerName: inv.customer_name,
            customerEmail: inv.customer_email,
            date: inv.issue_date?.split('T')[0],
            dueDate: inv.due_date?.split('T')[0],
            status: inv.status === 'SENT' ? 'Sent' : inv.status === 'OVERDUE' ? 'Overdue' : inv.status === 'PAID' ? 'Paid' : 'Open',
            total: Number(inv.total_inr || (Number(inv.total_paise || 0) / 100)),
            lines: [{ desc: 'Professional Services', qty: 1, rate: Number(inv.total_inr || 0), taxable: false }],
          }));
        }

        if (custRes.status === 'fulfilled' && custRes.value?.customers?.length > 0) {
          patch.customers = custRes.value.customers.map((c) => ({
            id: c.id,
            displayName: c.display_name,
            first: c.first_name,
            last: c.last_name,
            company: c.company_name,
            email: c.email,
            phone: c.phone,
            billingAddress: c.billing_address,
            gstin: c.gstin,
            pan: c.pan,
            terms: c.terms || 'Net 30',
            balance: Number(c.open_balance_inr || 0),
          }));
        }

        if (vendRes.status === 'fulfilled' && vendRes.value?.vendors?.length > 0) {
          patch.vendors = vendRes.value.vendors.map((v) => ({
            id: v.id,
            displayName: v.display_name,
            company: v.company_name,
            email: v.email,
            phone: v.phone,
            address: v.address,
            gstin: v.gstin,
            pan: v.pan,
            balance: Number(v.open_balance_inr || 0),
          }));
        }

        if (bankRes.status === 'fulfilled' && bankRes.value?.transactions?.length > 0) {
          patch.bankTxns = bankRes.value.transactions.map((tx) => ({
            id: tx.id,
            date: tx.date?.split('T')[0],
            desc: tx.description,
            payee: tx.payee,
            spent: tx.spent_inr ? Number(tx.spent_inr) : 0,
            received: tx.received_inr ? Number(tx.received_inr) : 0,
            status: tx.status,
            matched: tx.status === 'MATCHED',
          }));
        }

        if (bmRes.status === 'fulfilled' && bmRes.value?.bookmarks?.length > 0) {
          patch.bookmarks = bmRes.value.bookmarks.map((bm) => ({
            id: bm.page_id,
            name: bm.name,
            enabled: bm.enabled,
            sortOrder: bm.sort_order,
          }));
        }

        if (Object.keys(patch).length > 0) {
          rawDispatch({ type: 'HYDRATE', payload: { ...SEED, ...(saved ? JSON.parse(saved) : {}), ...patch } });
        }
      } catch (err) {
        console.warn('Backend sync warning:', err);
      }
    }

    syncFromBackend();
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

/** Vehicles own the per-kilometre rate; trips inherit it rather than repeat it. */
export function useVehicles() {
  const { state } = useStore();
  return state.vehicles ?? [];
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

/**
 * Dated notes against a customer, for the Customer Hub timeline.
 * Defaulted to `[]` because these collections were added after the first
 * release and a browser holding an older payload has no key at all.
 */
export function useCustomerNotes() {
  const { state } = useStore();
  return state.customerNotes || [];
}

/** Statements sent to customers. Facts, not amounts -- see SEND_STATEMENT. */
export function useStatements() {
  const { state } = useStore();
  return state.statements || [];
}

/** Saved custom-report definitions. Recipes, never results. */
export function useCustomReports() {
  const { state } = useStore();
  return state.customReports || [];
}

/** The financial plan. Targets only; actuals come from the ledger. */
export function usePlan() {
  const { state } = useStore();
  return state.plan;
}

/** Marketing campaigns and their budgets. */
export function useCampaigns() {
  const { state } = useStore();
  return state.marketing?.campaigns || [];
}

/**
 * The derived books: every account balance and every statement total, computed
 * from the transaction history.
 *
 * Screens call this instead of reading a balance off an account, because there
 * is no longer anywhere to read one from. It is memoised on `state`, so it only
 * recomputes when something actually changed -- which is the property that
 * makes it safe for the Balance Sheet and the Profit & Loss to disagree with
 * each other never.
 */
export function useLedger() {
  const { state } = useStore();
  return useMemo(() => deriveLedger(state), [state]);
}

/** Accounts of one canonical type, sub-accounts excluded. For pickers. */
export function useAccountsOfType(type) {
  const { state } = useStore();
  return useMemo(() => accountsOfType(state.accounts, type), [state.accounts, type]);
}

export { SEED, STORAGE_KEY };