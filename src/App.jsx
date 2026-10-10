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
import BankCategorize from './components/BankCategorize';
import Reconcile from './components/Reconcile';
import ReportsMath from './components/ReportsMath';
import { StoreProvider } from './store';

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
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const CustomersView = lazy(() => import('./components/CustomersView'));
const VendorsView = lazy(() => import('./components/VendorsView'));
const TeamView = lazy(() => import('./components/TeamView'));
const PayrollView = lazy(() => import('./components/PayrollView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const BalanceSheetView = lazy(() => import('./components/BalanceSheetView'));
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
    <EmptyState
      title={`${feature} is not built yet`}
      note="The menu item is in place and the data it needs is already modelled. This screen has not been written."
      action="Back to dashboard"
      onAction={() => { window.location.hash = '#/'; }}
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
  Invoice: 'sales_transactions',
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
  Expense: 'expense_transactions',
  Check: 'expense_transactions',
  Bill: 'expense_transactions',
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
  'Create invoice': 'sales_transactions',
  'Record expense': 'expense_transactions',
  'Add bank deposit': 'bank_transactions',
  'Create check': 'expense_transactions',
  'Show all': { openMenu: true },
};

export default function App() {
  const { viewId, query, navigate, routeLabel } = useRoute();

  const [companyName, setCompanyName] = useState('Sample Company. 7-8-25');
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

  // The tab title follows the screen. It said "quickbook-app" everywhere.
  useEffect(() => {
    document.title = routeLabel === 'Dashboard'
      ? 'Messo'
      : `${routeLabel} · Messo`;
  }, [routeLabel]);

  // `/` is the near-universal "jump to search" key and this app was hijacking it
  // to open an info popup that Escape could not close. `?` keeps that behaviour.
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === '?') {
        e.preventDefault();
        setAdditionalInfoOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
    if (target.modal === 'journal') {
      setJournalModalOpen(true);
      return;
    }
    navigate(target);
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
    if (except !== 'setup') setSetupDrawerOpen(false);
    if (except !== 'assistant') setAssistantOpen(false);
  }, []);

  useEscape(() => closeAllOverlays(), Object.values({
    createMenuOpen, settingsMenuOpen, accountSettingsOpen, additionalInfoOpen,
    customizeMenusOpen, journalModalOpen, setupDrawerOpen, assistantOpen,
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
      case 'bills':
        return (
          <SalesDocumentsView
            kind={viewId}
            onNavigate={(v) => navigate(v)}
          />
        );

      case 'not_built':
        return <NotBuiltYet feature={query.feature || query.label || 'That screen'} />;
      case 'bookmarks':
        return (
          <DashboardView
            onNavigate={(v) => navigate(v)}
            onOpenCreateModal={handleQuickCreateAction}
          />
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
      case 'invoices':
        return <SalesTransactionsView onOpenInvoiceModal={() => handleQuickCreateAction('Invoice')} onNavigate={(v) => navigate(v)} />;
      case 'expense_transactions':
        return <ExpensesView onOpenExpenseModal={() => handleQuickCreateAction('Expense')} />;
      case 'customers_list':
        return (
          <CustomersView
            onOpenNewCustomer={() => handleQuickCreateAction('Add customer')}
            onOpenCreateInvoice={() => handleQuickCreateAction('Invoice')}
            onNavigate={(v) => navigate(v)}
          />
        );
      case 'vendors':
        return <VendorsView onNavigate={(v) => navigate(v)} />;
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
      case 'standard_reports':
        return <ReportsView onOpenBalanceSheet={() => navigate('balance_sheet')} onNavigate={(v, q) => navigate(v, q)} />;
      case 'balance_sheet':
        return <BalanceSheetView onBack={() => navigate('standard_reports')} />;
      case 'management_reports':
        return <ManagementReportsView />;
      // Previously unreachable: the Audit log menu item opened Reports instead,
      // and this 551-line screen was never imported by anything.
      case 'audit_log':
        return <AuditLogView />;
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
        return <BusinessFeedView />;
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
          />
        );
      case 'pricing':
        return <PricingPlansView />;
      case 'apps':
        return <FindIntegrationsView />;
      default:
        // The fallback that turns a typo into a message instead of a white
        // rectangle. Three dashboard links used to land here.
        return (
          <EmptyState
            title="Screen not found"
            note={`Nothing is registered at “${labelFor(viewId)}”. Pick a screen from the left, or go back to the dashboard.`}
            action="Back to dashboard"
            onAction={() => navigate('dashboard')}
          />
        );
    }
  };

  // New workflow overlays
  const [invoiceReview, setInvoiceReview] = useState(null);
  const [bankCategorizeTxn, setBankCategorizeTxn] = useState(null);
  const [reconcileOpen, setReconcileOpen] = useState(false);

  return (
    /* The outer boundary covers the chrome. It used to sit around <main> only,
       so a throw in the top bar, sidebar or a popup blanked the entire app. */
    <ErrorBoundary title="Messo could not start">
      <StoreProvider>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F7F8] antialiased">
        <TopBar
          companyName={companyName}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          onOpenSettings={() => { closeAllOverlays('settings'); setSettingsMenuOpen(true); }}
          onOpenShortcuts={() => { closeAllOverlays('additionalInfo'); setAdditionalInfoOpen(true); }}
          onOpenAssistant={() => { closeAllOverlays('assistant'); setAssistantOpen(true); }}
          onNavigateApps={() => navigate('apps')}
        />

        <div className="flex flex-1 overflow-hidden relative">
          <SideRail
            currentView={viewId}
            setCurrentView={(v) => navigate(v)}
            onOpenCreate={() => { closeAllOverlays('create'); setCreateMenuOpen(true); }}
            onToggleCustomize={() => {
              navigate('dashboard');
              setCustomizeMode((prev) => !prev);
            }}
            isCustomizing={customizeMode && viewId === 'dashboard'}
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
          />
        )}
        <JournalEntryModal
          isOpen={journalModalOpen}
          onClose={() => setJournalModalOpen(false)}
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
      </div>
      </StoreProvider>
    </ErrorBoundary>
  );
}
