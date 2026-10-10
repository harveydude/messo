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
const AllListsView = lazy(() => import('./components/AllListsView'));
const ChartOfAccountsView = lazy(() => import('./components/ChartOfAccountsView'));
const RulesView = lazy(() => import('./components/RulesView'));
const ProductsAndServicesView = lazy(() => import('./components/ProductsAndServicesView'));
const RecurringTransactionsView = lazy(() => import('./components/RecurringTransactionsView'));
const SalesTransactionsView = lazy(() => import('./components/SalesTransactionsView'));
const ExpensesView = lazy(() => import('./components/ExpensesView'));
const CustomersView = lazy(() => import('./components/CustomersView'));
const ReportsView = lazy(() => import('./components/ReportsView'));
const BalanceSheetView = lazy(() => import('./components/BalanceSheetView'));
const ManagementReportsView = lazy(() => import('./components/ManagementReportsView'));
const AuditLogView = lazy(() => import('./components/AuditLogView'));
const BusinessFeedView = lazy(() => import('./components/BusinessFeedView'));
const MileageView = lazy(() => import('./components/MileageView'));
const TimeView = lazy(() => import('./components/TimeView'));
const BudgetsView = lazy(() => import('./components/BudgetsView'));
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
};

export default function App() {
  const { viewId, query, navigate, routeLabel } = useRoute();

  const [companyName, setCompanyName] = useState('Sample Company');
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

  const handleQuickCreateAction = useCallback((action) => {
    setCreateMenuOpen(false);
    const map = {
      'Journal entry': () => setJournalModalOpen(true),
      'Invoice': 'sales_transactions',
      'Create invoice': 'sales_transactions',
      'Expense': 'expense_transactions',
      'Record expense': 'expense_transactions',
      'Add customer': 'customers_list',
      'Bank deposit': 'bank_transactions',
      'Add bank deposit': 'bank_transactions',
    };
    const target = map[action] ?? 'sales_transactions';
    if (typeof target === 'function') target();
    else navigate(target);
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
      case 'not_built':
        return <NotBuiltYet feature={query.feature || 'That screen'} />;
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
        return <BusinessFeedView onNavigate={(v) => navigate(v)} />;
      case 'mileage':
        return <MileageView />;
      case 'time_entries':
        return <TimeView />;
      case 'budgets':
        return <BudgetsView onOpenBudgetModal={() => setJournalModalOpen(true)} />;
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
