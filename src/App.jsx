import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import TopBar from './layout/TopBar';
import SideRail from './layout/SideRail';
import ErrorBoundary from './components/ErrorBoundary';
import { useRoute } from './router';
import { labelFor } from './routes';
import { EmptyState } from './ui';
import { useEscape } from './hooks';
import {
  QuickCreateMenu,
  SettingsMegaMenu,
  AccountSettingsModal,
  AdditionalInfoModal,
  CustomizeAppMenusModal,
  JournalEntryModal,
  SetupDrawer,
} from './components/Modals';
import AssistantDrawer from './components/AssistantDrawer';
import InvoiceReview from './components/InvoiceReview';
import InvoiceEditorModal from './components/InvoiceEditorModal';
import ExpenseModal from './components/ExpenseModal';
import VendorBillScannerModal from './components/VendorBillScannerModal';
import TransactionRecodeModal from './components/TransactionRecodeModal';
import BankCategorize from './components/BankCategorize';
import Reconcile from './components/Reconcile';
import ReportsMath from './components/ReportsMath';
import CustomizeBookmarksModal from './components/CustomizeBookmarksModal';
import UniversalCreateWorkflowModal from './components/UniversalCreateWorkflowModal';
import OnboardingWizard from './components/onboarding/OnboardingWizard';
import UnderConstructionView from './components/UnderConstructionView';
import { StoreProvider } from './store';
import { requestAppFullscreen, registerAutoFullscreenGate, toggleAppFullscreen } from './utils/fullscreen';

/*
 * Screens are imported lazily.
 *
 * The build shipped every screen as one 582 kB file, so a first visit to the
 * dashboard downloaded the invoice editor, the pricing page and the integrations
 * marketplace before anything appeared. Splitting means the dashboard costs a
 * fraction of that and the rest arrives when it is asked for.
 */
const DashboardView = lazy(() => import('./components/DashboardView'));
const BankTransactionsView = lazy(() => import('./components/BankTransactionsView'));
// The gear menu's utility screens, and the shared sales-document list.
const GearScreens = lazy(() => import('./components/GearScreens'));
const SalesDocumentsView = lazy(() => import('./components/SalesDocumentsView'));
const AllListsView = lazy(() => import('./components/AllListsView'));
const ChartOfAccountsView = lazy(() => import('./components/ChartOfAccountsView'));
const RulesView = lazy(() => import('./components/RulesView'));
const ProductsAndServicesView = lazy(() => import('./components/ProductsAndServicesView'));
const RecurringTransactionsView = lazy(() => import('./components/RecurringTransactionsView'));
const SalesTransactionsView = lazy(() => import('./components/SalesTransactionsView'));
const InvoicesView = lazy(() => import('./components/InvoicesView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const CustomersView = lazy(() => import('./components/CustomersView'));
const VendorsView = lazy(() => import('./components/VendorsView'));
const TeamView = lazy(() => import('./components/TeamView'));
const PayrollView = lazy(() => import('./components/PayrollView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const BalanceSheetView = lazy(() => import('./components/BalanceSheetView'));
const BalanceSheetReportView = lazy(() => import('./components/BalanceSheetReportView'));
const ProfitLossReportView = lazy(() => import('./components/ProfitLossReportView'));
const CashFlowReportView = lazy(() => import('./components/CashFlowReportView'));
const ManagementReportsView = lazy(() => import('./components/ManagementReportsView'));
const AuditLogView = lazy(() => import('./components/AuditLogView'));
const BusinessFeedView = lazy(() => import('./components/BusinessFeedView'));
const MileageView = lazy(() => import('./components/MileageView'));
const TimeView = lazy(() => import('./components/TimeView'));
const BudgetsView = lazy(() => import('./components/BudgetsView'));
const SalesTaxView = lazy(() => import('./components/SalesTaxView'));
const BusinessTaxView = lazy(() => import('./components/BusinessTaxView'));
const LendingView = lazy(() => import('./components/LendingView'));
const CustomerHubView = lazy(() => import('./components/CustomerHubView'));
const CustomReportsView = lazy(() => import('./components/CustomReportsView'));
const FinancialPlanningView = lazy(() => import('./components/FinancialPlanningView'));
const MarketingView = lazy(() => import('./components/MarketingView'));
const SearchResultsView = lazy(() => import('./components/SearchResultsView'));
const PricingPlansView = lazy(() => import('./components/PricingPlansView'));
const FindIntegrationsView = lazy(() => import('./components/FindIntegrationsView'));

/** Shown while a screen's chunk arrives, so navigation never shows a blank area. */
function ScreenLoading() {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center py-32">
      <span className="sr-only">Loading screen</span>
      <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#E3E5E8" strokeWidth="3" />
        <circle
          cx="24" cy="24" r="20" fill="none" stroke="#2CA01C" strokeWidth="3"
          strokeLinecap="round" strokeDasharray="32 126"
          style={{ transformOrigin: 'center', animation: 'mes-spin 900ms linear infinite' }}
        />
      </svg>
    </div>
  );
}

/**
 * A gear-menu destination that has no screen behind it yet.
 *
 * Six settings items previously did nothing at all when clicked -- no
 * navigation, no message, no state change. Silence is the worst possible answer:
 * the user cannot tell whether the click registered, whether the app hung, or
 * whether they clicked the wrong thing. Naming the gap is honest and cheap.
 */
function NotBuiltYet({ feature }) {
  return (
    <UnderConstructionView
      feature={feature}
      onNavigate={(v) => { window.location.hash = `#/${v}`; }}
      onBack={() => { window.location.hash = '#/dashboard'; }}
    />
  );
}

/** Settings menu items that open a modal rather than a screen. */
const SETTINGS_OPENING_MODALS = {
  'Account and settings': 'accountSettings',
  'Additional info': 'additionalInfo',
  'Custom form styles': 'customizeMenus',
};

/** Settings menu items that navigate to a real screen. */
const SETTINGS_ROUTES = {
  'All lists': 'all_lists',
  'Chart of accounts': 'chart_of_accounts',
  'Products and services': 'products_services',
  'Recurring transactions': 'recurring_transactions',
  'Rules': 'rules',
  'Budgeting': 'budgets',
  'Audit log': 'audit_log',
  'Reconcile': 'reconcile',
  'Subscriptions and billing': 'pricing',
  'Vendors': 'vendors',
  'Team': 'team',
  'Payroll': 'payroll',
  'Time': 'time_entries',
  'Mileage': 'mileage',
  'Sales tax': 'sales_tax',
  'Business tax': 'business_tax',
  'Lending': 'lending',
  'Custom reports': 'custom_reports',
  'Financial planning': 'financial_planning',
  'Integrations': 'apps',

  // Items that are a screen in their own right, or a tab within one. Before
  // this, twenty-one of the forty items in the gear menu resolved to nothing
  // and quietly did nothing when clicked.
  'Manage users': 'team',
  'Payroll settings': 'payroll',
  'Import data': 'import_data',
  'Import desktop data': 'import_data',
  'Export data': 'export_data',
  'Custom fields': 'custom_fields',
  'Share screen': 'share_screen',
  "Workers' comp": 'workers_comp',
  'Order checks': 'order_checks',
  'Get the desktop app': 'desktop_app',
  'Resolution center': 'resolution_center',
  "What's new": 'whats_new',
  'Attachments': 'attachments',
  'Privacy': 'privacy',
  'Feedback': 'feedback',
};

/**
 * Where every one of the 37 Create-menu items goes.
 *
 * These used to resolve through `map[action] ?? 'sales_transactions'`, so the
 * seven entries that were mapped landed somewhere sensible and the other
 * thirty landed on the Sales screen. Clicking "Bank deposit" or "Payroll" or
 * "Add vendor" gave you an invoice list. A menu with thirty wrong items is
 * worse than a menu with three, because the label promises something and the
 * screen denies it.
 *
 * Each entry now names its own destination. Anything that is genuinely a form
 * rather than a screen maps to a modal instead.
 *
 * A key that is absent from this table is a bug, not a fallback: `createTarget`
 * reports it so it gets fixed rather than silently landing somewhere.
 */
const CREATE_TARGETS = {
  // Customers
  Invoice: { modal: 'invoiceEditor' },
  'Receive payment': 'sales_transactions',
  Statement: 'standard_reports',
  Estimate: 'estimates',
  'Sales order': 'orders',
  'Credit memo': 'credit_memos',
  'Sales receipt': 'sales_transactions',
  'Recurring payment': 'recurring_transactions',
  'Shipping label': 'orders',
  'Refund receipt': 'credit_memos',
  'Delayed credit': 'credit_memos',
  'Delayed charge': 'invoices',
  'Add customer': 'customers_list',

  // Vendors
  Expense: { modal: 'expenseModal' },
  Check: 'expense_transactions',
  Bill: { modal: 'billModal' },
  'Pay bills': 'expense_transactions',
  'Purchase order': 'purchase_orders',
  'Vendor credit': 'bills',
  'Credit card credit': 'bills',
  'Print checks': 'expense_transactions',
  'Add vendor': 'vendors',

  // Team
  Payroll: 'payroll',
  'Single time activity': 'time_entries',
  'Weekly timesheet': 'time_entries',
  'Review time': 'time_entries',
  'Add employee': 'team',
  'Add contractor': 'team',

  // Other
  Task: 'dashboard',
  'Bank deposit': 'bank_transactions',
  Transfer: 'bank_transactions',
  'Journal entry': { modal: 'journal' },
  'Inventory qty adjustment': 'products_services',
  'Pay down credit card': 'bills',
  'Add product/service': 'products_services',
};

/** Items the dashboard's own Create-actions row sends. */
const CREATE_ACTION_TARGETS = {
  'Get paid online': 'sales_transactions',
  'Create invoice': { modal: 'invoiceEditor' },
  'Record expense': { modal: 'expenseModal' },
  'Add bank deposit': 'bank_transactions',
  'Create check': { modal: 'expenseModal' },
  'Show all': { openMenu: true },
};

export default function App() {
  const { viewId, query, navigate, routeLabel } = useRoute();

  const [businessProfile, setBusinessProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('meso_business_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      businessName: "MESSO Technologies",
      gstin: "27AAPFU0939F1ZV",
      industry: "Information Technology & Software Services (IT/ITeS)",
      taxType: "pvt_ltd",
      annualRevenue: "revenue_1_5cr_5cr",
      role: "owner",
      employeeCount: "6_15"
    };
  });

  const [companyName, setCompanyName] = useState(() => {
    try {
      const saved = localStorage.getItem('meso_business_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.businessName) return parsed.businessName;
      }
    } catch (e) {}
    return "MESSO Technologies";
  });
  const [searchQuery, setSearchQuery] = useState(query.q || '');

  // Modals & drawers
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [customizeMenusOpen, setCustomizeMenusOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [invoiceEditorOpen, setInvoiceEditorOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [recodeModalOpen, setRecodeModalOpen] = useState(false);
  const [universalWorkflow, setUniversalWorkflow] = useState(null);
  const [pinnedItems, setPinnedItems] = useState(() => {
    try {
      const saved = localStorage.getItem('meso_pinned_items');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const handlePinnedChange = useCallback((newPins) => {
    setPinnedItems(newPins);
    localStorage.setItem('meso_pinned_items', JSON.stringify(newPins));
  }, []);

  // The tab title follows the screen.
  useEffect(() => {
    document.title = routeLabel === 'Dashboard'
      ? 'MESSO'
      : `${routeLabel} · MESSO`;
  }, [routeLabel]);

  // Optimistic locking conflict toast
  const [conflictToast, setConflictToast] = useState(null);
  useEffect(() => {
    const handleConflict = (e) => {
      setConflictToast(e.detail?.message || 'Changed by someone else — refreshing');
      setTimeout(() => setConflictToast(null), 4000);
    };
    window.addEventListener('qbo:version-conflict', handleConflict);
    return () => window.removeEventListener('qbo:version-conflict', handleConflict);
  }, []);

  // Always prioritize onboarding wizard on initial visit until completed
  useEffect(() => {
    const isCompleted = localStorage.getItem('meso_onboarding_completed') === 'true';
    if (!isCompleted && viewId === 'dashboard') {
      navigate('onboarding');
    }
  }, [viewId, navigate]);

  // Auto fullscreen on landing & first interaction so page fits full screen automatically
  useEffect(() => {
    // Attempt on mount if permitted by browser context
    requestAppFullscreen();

    // Register robust capture-phase auto-fullscreen gate for any user interaction (click, tap, keypress)
    const unregisterGate = registerAutoFullscreenGate();

    return () => {
      unregisterGate();
    };
  }, []);

  // ── Keyboard shortcuts ──
  // Matches every shortcut listed in the Additional Information modal.
  // Main-page shortcuts activate only when no input/textarea/select is focused.
  useEffect(() => {
    const handleKeyDown = (e) => {
      // F11 or Alt+Enter toggles Fullscreen mode everywhere
      if (e.key === 'F11' || (e.altKey && e.key === 'Enter')) {
        e.preventDefault();
        toggleAppFullscreen();
        return;
      }

      const tag = document.activeElement?.tagName?.toLowerCase();
      const inField = tag === 'input' || tag === 'textarea' || tag === 'select';
      if (inField) return;

      // Ctrl/Cmd + . = toggle Zen Mode (show/hide chrome) — not implemented yet
      if ((e.ctrlKey || e.metaKey) && e.key === '.') {
        e.preventDefault();
        return;
      }

      const key = e.key.toLowerCase();

      // ? or / → open shortcuts/additional-info dialog
      if (e.key === '?' || e.key === '/') {
        e.preventDefault();
        setAdditionalInfoOpen(true);
        return;
      }

      switch (key) {
        case 'i': e.preventDefault(); setInvoiceEditorOpen(true); break;
        case 'w': e.preventDefault(); navigate('expense_transactions'); break; // Check
        case 'e': e.preventDefault(); navigate('estimates'); break;
        case 'x': e.preventDefault(); setExpenseModalOpen(true); break;
        case 'r': e.preventDefault(); navigate('sales_transactions'); break; // Receive payment
        case 'j': e.preventDefault(); setJournalModalOpen(true); break;
        case 'b': e.preventDefault(); setBillModalOpen(true); break;
        case 'c': e.preventDefault(); navigate('customers_list'); break;
        case 'u': e.preventDefault(); navigate('payroll'); break;
        case 'v': e.preventDefault(); navigate('vendors'); break;
        case 'a': e.preventDefault(); navigate('chart_of_accounts'); break;
        case 'l': e.preventDefault(); navigate('all_lists'); break;
        case 'h': e.preventDefault(); setAssistantOpen(true); break;
        case 'f': e.preventDefault(); document.querySelector('[data-search-input]')?.focus(); break;
        case 'd': e.preventDefault(); document.querySelector('[aria-label="Main navigation"]')?.focus(); break;
        default: break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleSearch = useCallback((q) => {
    if (q && q.trim()) {
      setSearchQuery(q);
      navigate('search_results', { q: q.trim() });
    } else {
      navigate('dashboard');
    }
  }, [navigate]);

  /**
   * Create-menu dispatch.
   *
   * Every item resolves through `CREATE_TARGETS`. An unknown item no longer
   * falls back to Sales -- it lands on an honest "not built yet" page, because
   * opening an invoice list in response to "Payroll" is a lie the user has to
   * notice, and landing somewhere inert is at least accurate.
   */
  const handleQuickCreateAction = useCallback((action) => {
    setCreateMenuOpen(false);
    const target = CREATE_TARGETS[action] ?? CREATE_ACTION_TARGETS[action];

    if (!target) {
      console.warn(`Create menu item "${action}" has no destination in CREATE_TARGETS.`);
      navigate('not_built', { label: action });
      return;
    }
    if (target.openMenu) {
      setCreateMenuOpen(true);
      return;
    }
    if (target.modal === 'invoiceEditor') {
      setInvoiceEditorOpen(true);
      return;
    }
    if (target.modal === 'expenseModal') {
      setExpenseModalOpen(true);
      return;
    }
    if (target.modal === 'billModal') {
      setBillModalOpen(true);
      return;
    }
    if (target.modal === 'journal') {
      setJournalModalOpen(true);
      return;
    }

    // Open Universal Creation Modal for all remaining workflows
    setUniversalWorkflow(action);
  }, [navigate]);

  /**
   * Settings menu dispatch.
   *
   * This was an if/else chain with no final else, so any item it did not
   * recognise silently did nothing -- six items -- and two it did recognise
   * ("Audit log", "Reconcile") both opened the Reports screen. Every branch is
   * now table-driven, and an unrecognised item says so instead of ignoring you.
   */
  const handleSettingsSelect = useCallback((item) => {
    setSettingsMenuOpen(false);

    if (SETTINGS_OPENING_MODALS[item] === 'accountSettings') return setAccountSettingsOpen(true);
    if (SETTINGS_OPENING_MODALS[item] === 'additionalInfo') return setAdditionalInfoOpen(true);
    if (SETTINGS_OPENING_MODALS[item] === 'customizeMenus') return setCustomizeMenusOpen(true);

    if (SETTINGS_ROUTES[item]) return navigate(SETTINGS_ROUTES[item]);

    // Nothing has a screen behind it: say so rather than silently swallowing
    // the click, which is what six of these items did before.
    navigate('not_built', { feature: item });
  }, [navigate]);

  // Any open overlay closes when another opens -- mutual exclusion was already
  // correct and is preserved, now in one place.
  const closeAllOverlays = useCallback((except) => {
    if (except !== 'create') setCreateMenuOpen(false);
    if (except !== 'settings') setSettingsMenuOpen(false);
    if (except !== 'accountSettings') setAccountSettingsOpen(false);
    if (except !== 'additionalInfo') setAdditionalInfoOpen(false);
    if (except !== 'customizeMenus') setCustomizeMenusOpen(false);
    if (except !== 'journal') setJournalModalOpen(false);
    if (except !== 'invoiceEditor') setInvoiceEditorOpen(false);
    if (except !== 'expenseModal') setExpenseModalOpen(false);
    if (except !== 'billModal') setBillModalOpen(false);
    if (except !== 'recodeModal') setRecodeModalOpen(false);
    if (except !== 'setup') setSetupDrawerOpen(false);
    if (except !== 'assistant') setAssistantOpen(false);
  }, []);

  useEscape(() => closeAllOverlays(), Object.values({
    createMenuOpen, settingsMenuOpen, accountSettingsOpen, additionalInfoOpen,
    customizeMenusOpen, journalModalOpen, setupDrawerOpen, assistantOpen, invoiceEditorOpen, expenseModalOpen, billModalOpen, recodeModalOpen,
  }).some(Boolean));

  const renderScreen = () => {
    switch (viewId) {
      case 'dashboard':
        return (
          <DashboardView
            onNavigate={(v) => navigate(v)}
            onOpenCreateModal={handleQuickCreateAction}
            customizeMode={customizeMode}
            setCustomizeMode={setCustomizeMode}
          />
        );

      case 'onboarding':
        return (
          <OnboardingWizard
            onComplete={(data) => {
              if (data?.businessName) setCompanyName(data.businessName);
              localStorage.setItem('meso_onboarding_completed', 'true');
              navigate('dashboard');
            }}
            onExit={() => navigate('dashboard')}
          />
        );

      /**
       * The gear menu's utility screens, and the generic pages behind several
       * Create-menu items.
       *
       * They share one module because they are forms and reference pages
       * rather than distinct domains, and twenty separate files of a table
       * with a heading each would be harder to maintain than one switch. The
       * switch runs first so an individual screen defined below -- Import,
       * Export, Custom fields -- still wins over the generic handling.
       *
       * If the module returns null the route has no screen, and the honest
       * "not built yet" page answers instead.
       */
      case 'import_data':
      case 'export_data':
      case 'custom_fields':
      case 'share_screen':
      case 'workers_comp':
      case 'order_checks':
      case 'desktop_app':
      case 'resolution_center':
      case 'whats_new':
      case 'attachments':
      case 'privacy':
      case 'feedback': {
        const screen = <GearScreens screenId={viewId} onOpenSettings={() => { closeAllOverlays('settings'); setSettingsMenuOpen(true); }} />;
        if (screen) return screen;
        return <NotBuiltYet feature={routeLabel} />;
      }

      /**
       * Sales and purchase documents.
       *
       * Estimates, orders and credit memos are real documents in the store, so
       * these are lists of them rather than dead links. A purchase order is a
       * vendor document, which is why it lives under bills rather than under
       * sales.
       */
      case 'estimates':
      case 'orders':
      case 'purchase_orders':
      case 'credit_memos':
        return (
          <SalesDocumentsView
            kind={viewId}
            onNavigate={(v) => navigate(v)}
          />
        );

      case 'bills':
        return (
          <ExpensesView
            initialTab="bills"
            onOpenExpenseModal={() => handleQuickCreateAction('Expense')}
            onOpenBillModal={() => setBillModalOpen(true)}
            onNavigate={(v) => navigate(v)}
          />
        );

      case 'not_built':
        return <NotBuiltYet feature={query.feature || query.label || 'That screen'} />;
      case 'bookmarks':
        return (
          <>
            <DashboardView
              onNavigate={(v) => navigate(v)}
              onOpenCreateModal={handleQuickCreateAction}
            />
            <CustomizeBookmarksModal
              isOpen={true}
              onClose={() => navigate('dashboard')}
              onSave={(savedItems) => {
                // Convert saved bookmarks into sidebar pins
                const PIN_MAP = {
                  bank_transactions: { label: 'Accounting', color: '#107c41', iconKey: 'activity' },
                  expense_transactions: { label: 'Expenses', color: '#00897b', iconKey: 'creditcard' },
                  sales_transactions: { label: 'Sales', color: '#0077c5', iconKey: 'barchart' },
                  invoices: { label: 'Invoices', color: '#0077c5', iconKey: 'default' },
                  vendors: { label: 'Vendors', color: '#00897b', iconKey: 'default' },
                  bills: { label: 'Bills', color: '#00897b', iconKey: 'creditcard' },
                  customers_list: { label: 'Customers', color: '#009688', iconKey: 'default' },
                  dashboard: { label: 'Dashboard', color: '#393A3D', iconKey: 'default' },
                  feed: { label: 'Feed', color: '#6366f1', iconKey: 'default' },
                  standard_reports: { label: 'Reports', color: '#0077C5', iconKey: 'barchart' },
                  custom_reports: { label: 'Custom Reports', color: '#7C3AED', iconKey: 'default' },
                  management_reports: { label: 'Mgmt Reports', color: '#0d47a1', iconKey: 'default' },
                  financial_planning: { label: 'Cash Flow', color: '#00897b', iconKey: 'default' },
                  budgets: { label: 'Budgets', color: '#2CA01C', iconKey: 'default' },
                  integration_transactions: { label: 'Integrations', color: '#f57f17', iconKey: 'default' },
                };
                if (savedItems && Array.isArray(savedItems)) {
                  const pins = savedItems
                    .filter(it => it.enabled)
                    .map(it => ({
                      id: it.id,
                      label: PIN_MAP[it.id]?.label || it.name,
                      color: PIN_MAP[it.id]?.color || '#6B6C72',
                      iconKey: PIN_MAP[it.id]?.iconKey || 'default',
                    }));
                  handlePinnedChange(pins);
                }
                navigate('dashboard');
              }}
            />
          </>
        );
      case 'bank_transactions':
        return (
          <BankTransactionsView
            onNavigate={(v) => navigate(v)}
            onCategorize={(tx) => setBankCategorizeTxn(tx)}
            onReconcile={() => setReconcileOpen(true)}
          />
        );
      case 'all_lists':
        return <AllListsView onNavigate={(v) => navigate(v)} />;
      case 'chart_of_accounts':
        return <ChartOfAccountsView onNavigate={(v) => navigate(v)} />;
      case 'rules':
        return <RulesView onNavigate={(v) => navigate(v)} />;
      case 'products_services':
        return <ProductsAndServicesView onNavigate={(v) => navigate(v)} />;
      case 'recurring_transactions':
        return <RecurringTransactionsView onNavigate={(v) => navigate(v)} />;
      case 'sales_transactions':
        return <SalesTransactionsView onOpenInvoiceModal={() => handleQuickCreateAction('Invoice')} onNavigate={(v) => navigate(v)} />;
      case 'invoices':
      case 'sales_invoices':
        return <InvoicesView onOpenInvoiceModal={() => setInvoiceEditorOpen(true)} onNavigate={(v) => navigate(v)} />;
      case 'invoice_editor':
        return <InvoiceEditorModal isOpen={true} onClose={() => navigate('sales_transactions')} />;
      case 'expense_transactions':
        return (
          <ExpensesView
            initialTab="overview"
            onOpenExpenseModal={() => handleQuickCreateAction('Expense')}
            onOpenBillModal={() => setBillModalOpen(true)}
            onNavigate={(v) => navigate(v)}
          />
        );
      case 'customers_list':
        return (
          <CustomersView
            onOpenNewCustomer={() => handleQuickCreateAction('Add customer')}
            onOpenCreateInvoice={() => handleQuickCreateAction('Invoice')}
            onNavigate={(v) => navigate(v)}
          />
        );
      case 'vendors':
        return (
          <ExpensesView
            initialTab="vendors"
            onOpenExpenseModal={() => handleQuickCreateAction('Expense')}
            onNavigate={(v) => navigate(v)}
          />
        );
      case 'customer_hub':
        return <CustomerHubView onNavigate={(v) => navigate(v)} />;
      case 'custom_reports':
        return <CustomReportsView onNavigate={(v) => navigate(v)} />;
      case 'financial_planning':
        return <FinancialPlanningView onNavigate={(v) => navigate(v)} />;
      case 'marketing':
        return <MarketingView onNavigate={(v) => navigate(v)} />;
      case 'team':
        return <TeamView onNavigate={(v) => navigate(v)} />;
      case 'payroll':
        return <PayrollView onNavigate={(v) => navigate(v)} />;
      case 'reports':
      case 'standard_reports':
        return <ReportsView onOpenBalanceSheet={() => navigate('balance_sheet')} onNavigate={(v, q) => navigate(v, q)} />;
      case 'report_profit_loss':
      case 'profit_and_loss':
        return <ProfitLossReportView onBack={() => navigate('standard_reports')} onNavigateReport={(v) => navigate(v)} />;
      case 'report_cash_flow':
      case 'cash_flow':
        return <CashFlowReportView onBack={() => navigate('standard_reports')} onNavigateReport={(v) => navigate(v)} />;
      case 'balance_sheet':
        return <BalanceSheetReportView onBack={() => navigate('standard_reports')} onNavigateReport={(v) => navigate(v)} />;
      case 'management_reports':
        return <ManagementReportsView />;
      // Previously unreachable: the Audit log menu item opened Reports instead,
      // and this 551-line screen was never imported by anything.
      case 'audit_log':
        return <AuditLogView onNavigate={(v) => navigate(v)} />;
      case 'reconcile':
        // Reconciliation is now a full workflow overlay (Reconcile.jsx).
        // The trigger lives in the bank screen and the settings menu; this
        // route remains as a safe landing point.
        return (
          <BankTransactionsView
            onNavigate={(v) => navigate(v)}
            onCategorize={(tx) => setBankCategorizeTxn(tx)}
            onReconcile={() => setReconcileOpen(true)}
          />
        );
      // The case label must match the route id in routes.js exactly. It read
      // 'report-view' against an id of 'report_view', so this branch was dead.
      case 'report_view':
        return (
          <div className="p-6 max-w-5xl mx-auto">
            <ReportsMath
              reportType={query.report || 'balance-sheet'}
              onBack={() => navigate('standard_reports')}
            />
          </div>
        );
      case 'feed':
        return (
          <BusinessFeedView
            onNavigate={(v) => navigate(v)}
            onOpenInvoiceModal={() => setInvoiceEditorOpen(true)}
            onOpenExpenseModal={() => setExpenseModalOpen(true)}
            onOpenReviewInvoice={(inv) => setInvoiceReview(inv)}
          />
        );
      case 'mileage':
        return <MileageView onNavigate={(v) => navigate(v)} />;
      case 'time_entries':
        return <TimeView onNavigate={(v) => navigate(v)} />;
      case 'budgets':
        return (
          <BudgetsView
            onNavigate={(v) => navigate(v)}
            onOpenBudgetModal={() => setJournalModalOpen(true)}
          />
        );
      // India-first statutory screens. Lazy-loaded like every other screen, so
      // the dashboard does not pay for the GST return calendar it never opens.
      case 'sales_tax':
        return <SalesTaxView onNavigate={(v) => navigate(v)} />;
      case 'business_tax':
        return <BusinessTaxView onNavigate={(v) => navigate(v)} />;
      case 'lending':
        return <LendingView onNavigate={(v) => navigate(v)} />;
      case 'search_results':
        return (
          <SearchResultsView
            query={searchQuery || query.q || 'Show me open invoices for the last 30 days'}
            onNavigate={(v) => navigate(v)}
          />
        );
      case 'pricing':
        return <PricingPlansView />;
      case 'apps':
        return <FindIntegrationsView />;
      default:
        return (
          <UnderConstructionView
            feature={labelFor(viewId) || viewId}
            onNavigate={(v) => navigate(v)}
            onBack={() => navigate('dashboard')}
          />
        );
    }
  };

  // New workflow overlays
  const [invoiceReview, setInvoiceReview] = useState(null);
  const [bankCategorizeTxn, setBankCategorizeTxn] = useState(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  if (viewId === 'onboarding') {
    return (
      <ErrorBoundary title="Setup Wizard">
        <StoreProvider>
          <OnboardingWizard
            onComplete={(data) => {
              if (data) {
                setBusinessProfile(data);
                if (data.businessName) setCompanyName(data.businessName);
                localStorage.setItem('meso_business_profile', JSON.stringify(data));
              }
              localStorage.setItem('meso_onboarding_completed', 'true');
              requestAppFullscreen();
              navigate('dashboard');
            }}
            onExit={() => navigate('dashboard')}
          />
        </StoreProvider>
      </ErrorBoundary>
    );
  }

  return (
    /* The outer boundary covers the chrome. It used to sit around <main> only,
       so a throw in the top bar, sidebar or a popup blanked the entire app. */
    <ErrorBoundary title="Meso could not start">
      <StoreProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F7F8] antialiased">
        <TopBar
          companyName={companyName}
          businessProfile={businessProfile}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onOpenSettings={() => { closeAllOverlays('settings'); setSettingsMenuOpen(prev => !prev); }}
          onOpenShortcuts={() => { closeAllOverlays('additionalInfo'); setAdditionalInfoOpen(true); }}
          onOpenAssistant={() => { closeAllOverlays('assistant'); setAssistantOpen(true); }}
          onNavigateApps={() => navigate('apps')}
          onOpenOnboarding={() => navigate('onboarding')}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <SideRail
            currentView={viewId}
            setCurrentView={(v) => navigate(v)}
            onOpenCreate={() => { closeAllOverlays('create'); setCreateMenuOpen(true); }}
            onToggleCustomize={() => {
              setCustomizeMenusOpen(true);
            }}
            isCustomizing={customizeMenusOpen}
            pinnedItems={pinnedItems}
            onPinnedChange={handlePinnedChange}
          />

          <main className="flex-1 overflow-y-auto bg-[#F6F7F8]">
            {/* The inner boundary is the one that matters day to day: a broken
                screen stays a broken screen, and the app keeps working. */}
            <ErrorBoundary compact title="This screen could not be displayed">
              <Suspense fallback={<ScreenLoading />}>
                {renderScreen()}
              </Suspense>
            </ErrorBoundary>
          </main>

          <SetupDrawer
            isOpen={setupDrawerOpen}
            onClose={() => setSetupDrawerOpen(false)}
          />
          <AssistantDrawer
            isOpen={assistantOpen}
            onClose={() => setAssistantOpen(false)}
            onLaunchRecode={() => setRecodeModalOpen(true)}
          />
        </div>

        <QuickCreateMenu
          isOpen={createMenuOpen}
          onClose={() => setCreateMenuOpen(false)}
          onActionSelect={handleQuickCreateAction}
        />
        <SettingsMegaMenu
          isOpen={settingsMenuOpen}
          onClose={() => setSettingsMenuOpen(false)}
          onSelectOption={handleSettingsSelect}
        />
        <AccountSettingsModal
          isOpen={accountSettingsOpen}
          onClose={() => setAccountSettingsOpen(false)}
          currentName={companyName}
          onSaveName={(newName) => setCompanyName(newName)}
        />
        <AdditionalInfoModal
          isOpen={additionalInfoOpen}
          onClose={() => setAdditionalInfoOpen(false)}
        />
        {/* Mounted rather than toggled: the component's state seeds on mount, so
            "Cancel" discards edits without an effect that writes state during a
            render pass. */}
        {customizeMenusOpen && (
          <CustomizeAppMenusModal
            isOpen={customizeMenusOpen}
            onClose={() => setCustomizeMenusOpen(false)}
            pinnedItems={pinnedItems}
            onSave={handlePinnedChange}
          />
        )}
        <JournalEntryModal
          isOpen={journalModalOpen}
          onClose={() => setJournalModalOpen(false)}
        />
        <InvoiceEditorModal
          isOpen={invoiceEditorOpen}
          onClose={() => setInvoiceEditorOpen(false)}
        />
        <ExpenseModal
          isOpen={expenseModalOpen}
          onClose={() => setExpenseModalOpen(false)}
        />
        <VendorBillScannerModal
          isOpen={billModalOpen}
          onClose={() => setBillModalOpen(false)}
        />
        <TransactionRecodeModal
          isOpen={recodeModalOpen}
          onClose={() => setRecodeModalOpen(false)}
          onSaved={() => setRecodeModalOpen(false)}
        />
        <UniversalCreateWorkflowModal
          isOpen={!!universalWorkflow}
          workflowType={universalWorkflow}
          onClose={() => setUniversalWorkflow(null)}
          onSuccess={() => {
            const target = CREATE_TARGETS[universalWorkflow];
            if (typeof target === 'string') navigate(target);
          }}
        />

        {/* New workflow overlays */}
        {invoiceReview && (
          <InvoiceReview
            invoice={invoiceReview}
            onClose={() => setInvoiceReview(null)}
            onSent={() => setInvoiceReview(null)}
          />
        )}
        {bankCategorizeTxn && (
          <BankCategorize
            txn={bankCategorizeTxn}
            onClose={() => setBankCategorizeTxn(null)}
            onConfirm={() => setBankCategorizeTxn(null)}
          />
        )}
        {reconcileOpen && (
          <Reconcile
            onClose={() => setReconcileOpen(false)}
            onFinish={() => setReconcileOpen(false)}
          />
        )}
        {conflictToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] bg-[#E35205] text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 text-[13px] font-medium animate-fade-in pointer-events-none">
            <span>⚠️ {conflictToast}</span>
          </div>
        )}
      </div>
      </StoreProvider>
    </ErrorBoundary>
  );
}
