/**
 * The route table.
 *
 * Split out of `router.jsx` so that file exports only the hook and the Link
 * component -- a file exporting both components and plain values disables
 * React fast refresh, so every edit there would do a full reload.
 *
 * One table is the single source of truth for navigation. Before this existed,
 * adding a screen meant adding an `if` in App.jsx, an id in PillNav.jsx and an
 * arm in the gear menu; missing any one produced a blank screen or the wrong
 * one, and three of the dashboard's links did exactly that.
 */

/**
 * Every screen, its address, and the name a user would recognise.
 * `aliases` are spellings that should land here rather than 404 -- they exist
 * because these ids were scattered through the old code.
 */
export const ROUTES = [
  { id: 'dashboard', slug: '/', label: 'Dashboard' },
  { id: 'bookmarks', slug: '/bookmarks', label: 'Bookmarks' },

  { id: 'bank_transactions', slug: '/banking', label: 'Bank transactions' },
  { id: 'all_lists', slug: '/lists', label: 'All lists' },
  { id: 'chart_of_accounts', slug: '/chart-of-accounts', label: 'Chart of accounts' },
  { id: 'rules', slug: '/rules', label: 'Rules' },
  { id: 'products_services', slug: '/products-and-services', label: 'Products and services' },
  { id: 'recurring_transactions', slug: '/recurring', label: 'Recurring transactions' },

  { id: 'sales_transactions', slug: '/sales', label: 'Sales', aliases: ['/invoices'] },
  { id: 'invoices', slug: '/invoices/list', label: 'Invoices' },
  { id: 'expense_transactions', slug: '/expenses', label: 'Expenses',
    // The dashboard cards used to navigate to 'expenses', which no branch
    // matched, so three links produced a completely blank screen.
    aliases: ['/expenses-to-review', '/categorize'] },
  { id: 'customers_list', slug: '/customers', label: 'Customers' },

  { id: 'standard_reports', slug: '/reports', label: 'Reports' },
  { id: 'balance_sheet', slug: '/reports/balance-sheet', label: 'Balance sheet' },
  { id: 'management_reports', slug: '/reports/management', label: 'Management reports' },
  { id: 'audit_log', slug: '/audit-log', label: 'Audit log' },
  { id: 'reconcile', slug: '/reconcile', label: 'Reconcile' },

  { id: 'feed', slug: '/feed', label: 'Business feed' },
  { id: 'mileage', slug: '/mileage', label: 'Mileage' },
  { id: 'time_entries', slug: '/time', label: 'Time', aliases: ['/team'] },
  { id: 'budgets', slug: '/budgets', label: 'Budgets' },
  { id: 'pricing', slug: '/pricing', label: 'Plans' },
  { id: 'apps', slug: '/apps', label: 'Integrations' },
  { id: 'search_results', slug: '/search', label: 'Search results' },

  // A settings destination with no screen written yet. Given its own route
  // rather than a flag on the dashboard, so leaving it is ordinary navigation.
  { id: 'not_built', slug: '/not-built', label: 'Not built yet' },
];

/** Where an unrecognised address goes. A dashboard is a better wrong answer
 *  than a blank page. */
export const FALLBACK_ROUTE = 'dashboard';

const bySlug = new Map();
const byId = new Map();
for (const route of ROUTES) {
  byId.set(route.id, route);
  bySlug.set(route.slug, route.id);
  for (const alias of route.aliases || []) bySlug.set(alias, route.id);
}

export function slugFor(viewId) {
  return byId.get(viewId)?.slug ?? '/';
}

export function labelFor(viewId) {
  return byId.get(viewId)?.label ?? 'Screen not found';
}

export function viewIdForSlug(path) {
  return bySlug.get(path) ?? FALLBACK_ROUTE;
}

export { byId as ROUTE_BY_ID };
