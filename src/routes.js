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
  { id: 'dashboard', slug: '/', label: 'Dashboard', aliases: ['/dashboard', '/home'] },
  { id: 'onboarding', slug: '/onboarding', label: 'Setup wizard', aliases: ['/setup', '/wizard'] },
  { id: 'bookmarks', slug: '/bookmarks', label: 'Bookmarks' },

  { id: 'bank_transactions', slug: '/banking', label: 'Bank transactions' },
  { id: 'all_lists', slug: '/lists', label: 'All lists' },
  { id: 'chart_of_accounts', slug: '/chart-of-accounts', label: 'Chart of accounts' },
  { id: 'rules', slug: '/rules', label: 'Rules' },
  { id: 'products_services', slug: '/products-and-services', label: 'Products and services' },
  { id: 'recurring_transactions', slug: '/recurring', label: 'Recurring transactions' },

  { id: 'sales_transactions', slug: '/sales', label: 'Sales' },
  { id: 'invoices', slug: '/invoices', label: 'Invoices', aliases: ['/invoices/list'] },
  { id: 'invoice_editor', slug: '/invoices/new', label: 'New Invoice', aliases: ['/invoice-editor', '/invoices/create'] },
  { id: 'expense_transactions', slug: '/expenses', label: 'Expenses',
    // The dashboard cards used to navigate to 'expenses', which no branch
    // matched, so three links produced a completely blank screen.
    aliases: ['/expenses-to-review', '/categorize'] },
  { id: 'customers_list', slug: '/customers', label: 'Customers' },
  // The supplier-side lists. `/vendors` and `/team` were previously claimed by
  // other routes (the Time screen aliased `/team`), so they were unreachable:
  // the address a person would guess from the menu led somewhere else entirely.
  { id: 'vendors', slug: '/vendors', label: 'Vendors' },
  { id: 'team', slug: '/team', label: 'Team' },
  { id: 'payroll', slug: '/payroll', label: 'Payroll' },

  { id: 'standard_reports', slug: '/reports', label: 'Reports' },
  { id: 'balance_sheet', slug: '/reports/balance-sheet', label: 'Balance sheet' },
  { id: 'management_reports', slug: '/reports/management', label: 'Management reports' },
  { id: 'audit_log', slug: '/audit-log', label: 'Audit log' },
  { id: 'reconcile', slug: '/reconcile', label: 'Reconcile' },
  { id: 'report_view', slug: '/reports/view', label: 'Report', aliases: ['/report'] },

  // India-first statutory screens. `sales_tax` is the GST screen -- CGST, SGST,
  // IGST, HSN/SAC and the GSTR return calendar -- not a US sales-tax form with
  // the wording changed. Aliases cover the spellings these have been reached by.
  { id: 'sales_tax', slug: '/sales-tax', label: 'Sales tax', aliases: ['/gst', '/tax'] },
  { id: 'business_tax', slug: '/business-tax', label: 'Business tax', aliases: ['/tds'] },
  { id: 'lending', slug: '/lending', label: 'Lending', aliases: ['/loans'] },

  { id: 'feed', slug: '/feed', label: 'Business feed' },
  { id: 'mileage', slug: '/mileage', label: 'Mileage' },
  // `/team` used to be an alias for this. It is now the Team screen's own address
// -- the alias meant the name people expected to reach the staff list opened
// the timesheet instead, which is why the Team screen had no way in.
{ id: 'time_entries', slug: '/time', label: 'Time' },
  { id: 'budgets', slug: '/budgets', label: 'Budgets' },
  { id: 'pricing', slug: '/pricing', label: 'Plans' },
  { id: 'apps', slug: '/apps', label: 'Integrations' },
  { id: 'search_results', slug: '/search', label: 'Search results' },

  // Create-menu and gear-menu destinations.
  //
  // These exist so that clicking "Payroll" or "Lending" or "Order checks"
  // arrives somewhere real rather than being swallowed. Each maps to the screen
  // that genuinely covers that job: purchase orders live with bills because
  // they are a vendor document, estimates with sales because that is where an
  // estimate is raised.
  { id: 'vendors', slug: '/vendors', label: 'Vendors' },
  { id: 'team', slug: '/team', label: 'Team' },
  { id: 'payroll', slug: '/payroll', label: 'Payroll' },
  { id: 'sales_tax', slug: '/sales-tax', label: 'Sales tax' },
  { id: 'business_tax', slug: '/business-tax', label: 'Business tax' },
  { id: 'customer_hub', slug: '/customer-hub', label: 'Customer hub' },
  { id: 'custom_reports', slug: '/reports/custom', label: 'Custom reports' },
  { id: 'financial_planning', slug: '/planning', label: 'Financial planning' },
  { id: 'marketing', slug: '/marketing', label: 'Marketing' },

  // Sales documents.
  { id: 'estimates', slug: '/estimates', label: 'Estimates' },
  { id: 'orders', slug: '/orders', label: 'Sales orders' },
  { id: 'purchase_orders', slug: '/purchase-orders', label: 'Purchase orders' },
  { id: 'credit_memos', slug: '/credit-memos', label: 'Credit memos' },
  { id: 'bills', slug: '/bills', label: 'Bills' },

  // Gear-menu utility screens.
  { id: 'import_data', slug: '/import', label: 'Import data' },
  { id: 'export_data', slug: '/export', label: 'Export data' },
  { id: 'custom_fields', slug: '/custom-fields', label: 'Custom fields' },
  { id: 'share_screen', slug: '/share', label: 'Share screen' },
  { id: 'workers_comp', slug: '/workers-comp', label: "Workers' comp" },
  { id: 'order_checks', slug: '/order-checks', label: 'Order checks' },
  { id: 'desktop_app', slug: '/desktop-app', label: 'Desktop app' },
  { id: 'resolution_center', slug: '/resolution-center', label: 'Resolution center' },
  { id: 'whats_new', slug: '/whats-new', label: "What's new" },
  { id: 'attachments', slug: '/attachments', label: 'Attachments' },
  { id: 'privacy', slug: '/privacy', label: 'Privacy' },
  { id: 'feedback', slug: '/feedback', label: 'Feedback' },

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
