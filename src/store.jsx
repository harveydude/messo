import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { CHART_OF_ACCOUNTS } from './data/chartOfAccounts';
import { deriveLedger, accountsOfType } from './ledger';
import { SEED } from './data/seed';

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
 */
const STORAGE_KEY = 'messo-store-v2';

export { CHART_OF_ACCOUNTS };

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