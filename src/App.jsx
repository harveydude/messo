import React, { useState, useEffect } from 'react';
import TopBar from './layout/TopBar';
import SideRail from './layout/SideRail';
import DashboardView from './components/DashboardView';
import BankTransactionsView from './components/BankTransactionsView';
import SalesTransactionsView from './components/SalesTransactionsView';
import ExpensesView from './components/ExpensesView';
import CustomersView from './components/CustomersView';
import ReportsView from './components/ReportsView';
import BalanceSheetView from './components/BalanceSheetView';
import ManagementReportsView from './components/ManagementReportsView';
import BusinessFeedView from './components/BusinessFeedView';
import MileageView from './components/MileageView';
import TimeView from './components/TimeView';
import BudgetsView from './components/BudgetsView';
import SearchResultsView from './components/SearchResultsView';
import PricingPlansView from './components/PricingPlansView';
import FindIntegrationsView from './components/FindIntegrationsView';
import AssistantDrawer from './components/AssistantDrawer';
import ChartOfAccountsView from './components/ChartOfAccountsView';
import RulesView from './components/RulesView';
import ProductsAndServicesView from './components/ProductsAndServicesView';
import RecurringTransactionsView from './components/RecurringTransactionsView';
import AllListsView from './components/AllListsView';
import ErrorBoundary from './components/ErrorBoundary';
import {
  QuickCreateMenu,
  SettingsMegaMenu,
  AccountSettingsModal,
  AdditionalInfoModal,
  CustomizeAppMenusModal,
  JournalEntryModal,
  SetupDrawer
} from './components/Modals';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [companyName, setCompanyName] = useState('Sample Company');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers state
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [additionalInfoOpen, setAdditionalInfoOpen] = useState(false);
  const [customizeMenusOpen, setCustomizeMenusOpen] = useState(false);
  const [journalModalOpen, setJournalModalOpen] = useState(false);
  const [setupDrawerOpen, setSetupDrawerOpen] = useState(false);
  const [customizeMode, setCustomizeMode] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);


  // Global shortcut ? or / opens Additional Info modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }
      if (e.key === '?' || (e.key === '/' && !e.ctrlKey && !e.metaKey)) {
        e.preventDefault();
        setAdditionalInfoOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (q) => {
    if (q && q.trim()) {
      setSearchQuery(q);
      setCurrentView('search_results');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleQuickCreateAction = (action) => {
    if (action === 'Journal entry') {
      setJournalModalOpen(true);
    } else if (action === 'Invoice' || action === 'Create invoice') {
      setCurrentView('sales_transactions');
    } else if (action === 'Expense' || action === 'Record expense') {
      setCurrentView('expense_transactions');
    } else if (action === 'Add customer') {
      setCurrentView('customers_list');
    } else if (action === 'Bank deposit' || action === 'Add bank deposit') {
      setCurrentView('bank_transactions');
    } else {
      setCurrentView('sales_transactions');
    }
  };

  const handleSettingsSelect = (item) => {
    if (item === 'Account and settings') {
      setAccountSettingsOpen(true);
    } else if (item === 'Additional info') {
      setAdditionalInfoOpen(true);
    } else if (item === 'All lists') {
      setCurrentView('all_lists');
    } else if (item === 'Chart of accounts') {
      setCurrentView('chart_of_accounts');
    } else if (item === 'Products and services') {
      setCurrentView('products_services');
    } else if (item === 'Recurring transactions') {
      setCurrentView('recurring_transactions');
    } else if (item === 'Rules') {
      setCurrentView('rules');
    } else if (item === 'Audit log' || item === 'Reconcile') {
      setCurrentView('standard_reports');
    } else if (item === 'Budgeting') {
      setCurrentView('budgets');
    } else if (item === 'Subscriptions and billing') {
      setCurrentView('pricing');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F6F7F8] antialiased">
      {/* 1. Top Bar (1920×56, fixed height) */}
      <TopBar
        companyName={companyName}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onOpenSettings={() => setSettingsMenuOpen(true)}
        onOpenShortcuts={() => setAdditionalInfoOpen(true)}
        onOpenAssistant={() => setAssistantOpen(true)}
        onNavigateApps={() => setCurrentView('apps')}
      />

      {/* 2. Main App Body (SideRail + Canvas) */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Rail (w: 84px) */}
        <SideRail
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenCreate={() => setCreateMenuOpen(true)}
          onToggleCustomize={() => {
            setCurrentView('dashboard');
            setCustomizeMode(prev => !prev);
          }}
          isCustomizing={customizeMode && currentView === 'dashboard'}
        />

        {/* Main Canvas Area */}
        <main className="flex-1 overflow-y-auto bg-[#F6F7F8]">
          <ErrorBoundary>
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={(v) => setCurrentView(v)}
                onOpenCreateModal={handleQuickCreateAction}
                customizeMode={customizeMode}
                setCustomizeMode={setCustomizeMode}
              />
            )}

            {currentView === 'bank_transactions' && (
              <BankTransactionsView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'all_lists' && (
              <AllListsView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'chart_of_accounts' && (
              <ChartOfAccountsView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'rules' && (
              <RulesView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'products_services' && (
              <ProductsAndServicesView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'recurring_transactions' && (
              <RecurringTransactionsView onNavigate={(v) => setCurrentView(v)} />
            )}

            {currentView === 'sales_transactions' && (
              <SalesTransactionsView
                onOpenInvoiceModal={() => handleQuickCreateAction('Invoice')}
              />
            )}

            {currentView === 'invoices' && (
              <SalesTransactionsView
                onOpenInvoiceModal={() => handleQuickCreateAction('Invoice')}
              />
            )}

            {currentView === 'expense_transactions' && (
              <ExpensesView
                onOpenExpenseModal={() => handleQuickCreateAction('Expense')}
              />
            )}

            {currentView === 'customers_list' && (
              <CustomersView
                onOpenNewCustomer={() => handleQuickCreateAction('Add customer')}
                onOpenCreateInvoice={() => handleQuickCreateAction('Invoice')}
              />
            )}

            {currentView === 'standard_reports' && (
              <ReportsView
                onOpenBalanceSheet={() => setCurrentView('balance_sheet')}
              />
            )}

            {currentView === 'balance_sheet' && (
              <BalanceSheetView
                onBack={() => setCurrentView('standard_reports')}
              />
            )}

            {currentView === 'management_reports' && (
              <ManagementReportsView />
            )}

            {currentView === 'feed' && (
              <BusinessFeedView />
            )}

            {currentView === 'mileage' && (
              <MileageView />
            )}

            {currentView === 'time_entries' && (
              <TimeView />
            )}

            {currentView === 'budgets' && (
              <BudgetsView
                onOpenBudgetModal={() => setJournalModalOpen(true)}
              />
            )}

            {currentView === 'search_results' && (
              <SearchResultsView
                query={searchQuery || "Show me open invoices for the last 30 days"}
              />
            )}

            {currentView === 'pricing' && (
              <PricingPlansView />
            )}

            {(currentView === 'apps' || currentView === 'integrations_find') && (
              <FindIntegrationsView />
            )}

            {currentView === 'bookmarks' && (
              <DashboardView
                onNavigate={(v) => setCurrentView(v)}
                onOpenCreateModal={handleQuickCreateAction}
              />
            )}
          </ErrorBoundary>
        </main>

        {/* Setup Drawer */}
        <SetupDrawer
          isOpen={setupDrawerOpen}
          onClose={() => setSetupDrawerOpen(false)}
        />

        {/* Intuit Assistant Drawer */}
        <AssistantDrawer
          isOpen={assistantOpen}
          onClose={() => setAssistantOpen(false)}
        />
      </div>

      {/* Floating Modals and Menus */}
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

      <CustomizeAppMenusModal
        isOpen={customizeMenusOpen}
        onClose={() => setCustomizeMenusOpen(false)}
      />

      <JournalEntryModal
        isOpen={journalModalOpen}
        onClose={() => setJournalModalOpen(false)}
      />
    </div>
  );
}
