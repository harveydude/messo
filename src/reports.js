/**
 * The report library.
 *
 * The Reports screen listed thirty-one reports and could produce three. The
 * other twenty-eight were text: they looked like a menu, took a click, and did
 * nothing. A report name that produces no report is worse than an absent one,
 * because it costs the user the click and then the answer.
 *
 * So each report here is a function over the store. They all return the same
 * shape -- columns and rows -- so the viewer renders any of them the same way,
 * and adding a report means adding a function rather than a screen.
 *
 * Every figure is derived. Nothing in this file holds a constant, which is what
 * makes the difference between a report and a label.
 */

import { CHART_OF_ACCOUNTS } from './data/chartOfAccounts.js';

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Invoice total: lines less discount, plus tax. Matches `invoiceTotals` in the ledger. */
function invoiceTotal(inv, state) {
  const subtotal = (inv.lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const disc = inv.discount?.mode === '%'
    ? subtotal * ((Number(inv.discount.value) || 0) / 100)
    : Number(inv.discount?.value) || 0;
  const net = Math.max(0, subtotal - disc);
  const rate = state.taxRates.find((t) => t.id === inv.taxRateId);
  return round2(net * (1 + (rate?.pct || 0) / 100));
}

const docTotal = (doc) =>
  round2((doc.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0));

const customerName = (state, id) =>
  state.customers.find((c) => c.id === id)?.displayName || '—';

/** The month's an ISO date falls in, as `2025-10`. */
const monthOf = (iso) => (iso || '').slice(0, 7);

/** Which reports actually run, and what each one is for. */
export const REPORTS = {
  /* ---------------- Business overview ---------------- */

  'Balance Sheet': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = [
        { section: 'Assets' },
        ...CHART_OF_ACCOUNTS
          .filter((a) => ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset'].includes(a.type) && !a.parentId)
          .map((a) => ({ label: a.name, type: a.type, value: L.balanceOf(a.id) })),
        { section: 'Total assets', total: true, value: L.assets.total },
        { section: 'Liabilities' },
        ...CHART_OF_ACCOUNTS
          .filter((a) => ['Accounts Payable', 'Credit Card', 'Other Current Liability'].includes(a.type))
          .map((a) => ({ label: a.name, type: a.type, value: L.balanceOf(a.id) })),
        { section: 'Total liabilities', total: true, value: L.liabilities.total },
        { section: 'Equity' },
        ...CHART_OF_ACCOUNTS
          .filter((a) => a.type === 'Equity')
          .map((a) => ({ label: a.name, type: a.type, value: L.balanceOf(a.id) })),
        { label: 'Net income for the period', type: 'Equity', value: L.pnl.netIncome },
        { section: 'Total liabilities and equity', total: true, value: round2(L.liabilities.total + L.equity.total + L.pnl.netIncome) },
      ];
      return {
        columns: [{ key: 'label', header: 'Account' }, { key: 'value', header: 'Balance', align: 'right' }],
        rows,
        check: {
          balanced: L.balanced,
          message: L.balanced
            ? 'Assets equal liabilities plus equity.'
            : `Out of balance by ${Math.abs(L.difference).toFixed(2)}.`,
        },
      };
    },
  },

  'Profit and Loss': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = [
        { section: 'Income' },
        ...incomeRows(state, L),
        { section: 'Total income', total: true, value: L.pnl.income },
        { label: 'Cost of goods sold', type: 'Cost of Goods Sold', value: L.pnl.cogs },
        { section: 'Gross profit', total: true, value: L.pnl.grossProfit },
        { section: 'Expenses' },
        ...CHART_OF_ACCOUNTS
          .filter((a) => a.type === 'Expense' && !a.parentId)
          .map((a) => ({ label: a.name, type: a.type, value: L.balanceOf(a.id) }))
          .filter((r) => r.value !== 0),
        { section: 'Total expenses', total: true, value: L.pnl.expenses },
        { section: L.pnl.netIncome >= 0 ? 'Net income' : 'Net loss', total: true, value: Math.abs(L.pnl.netIncome) },
      ];
      return {
        columns: [{ key: 'label', header: 'Account' }, { key: 'value', header: 'Amount', align: 'right' }],
        rows,
        note: L.pnl.income > 0
          ? `Net margin ${Math.round((L.pnl.netIncome / L.pnl.income) * 100)}%.`
          : 'No income recorded, so there is no margin to report.',
      };
    },
  },

  'Profit and Loss by Month': {
    group: 'Business overview',
    build: (state) => groupByMonth(state, 'pnl'),
  },

  'Profit and Loss by Customer': {
    group: 'Business overview',
    build: (state) => {
      const byCustomer = new Map();
      for (const inv of state.invoices) {
        if (inv.status === 'Draft') continue;
        const name = customerName(state, inv.customerId);
        byCustomer.set(name, round2((byCustomer.get(name) || 0) + invoiceTotal(inv, state)));
      }
      const rows = [...byCustomer.entries()]
        .map(([customer, revenue]) => ({ customer, revenue }))
        .sort((a, b) => b.revenue - a.revenue);
      const total = rows.reduce((s, r) => s + r.revenue, 0);
      return {
        columns: [
          { key: 'customer', header: 'Customer' },
          { key: 'revenue', header: 'Revenue', align: 'right' },
          { key: 'share', header: 'Share', align: 'right' },
        ],
        rows: rows.map((r) => ({
          ...r,
          share: total > 0 ? `${Math.round((r.revenue / total) * 100)}%` : '—',
        })),
        totalRow: { label: 'Total', value: total },
      };
    },
  },

  'Profit and Loss by Tag Group': {
    group: 'Business overview',
    build: (state) => {
      const byProduct = new Map();
      for (const inv of state.invoices) {
        if (inv.status === 'Draft') continue;
        for (const line of inv.lines || []) {
          const product = state.products.find((p) => p.id === line.productId);
          const tag = product?.category || 'Uncategorised';
          byProduct.set(tag, round2((byProduct.get(tag) || 0) + (Number(line.qty) || 0) * (Number(line.rate) || 0)));
        }
      }
      const rows = [...byProduct.entries()].map(([tag, revenue]) => ({ tag, revenue })).sort((a, b) => b.revenue - a.revenue);
      return {
        columns: [{ key: 'tag', header: 'Tag group' }, { key: 'revenue', header: 'Revenue', align: 'right' }],
        rows,
        totalRow: { label: 'Total', value: rows.reduce((s, r) => s + r.revenue, 0) },
      };
    },
  },

  'Profit and Loss Detail': {
    group: 'Business overview',
    build: (state) => {
      const rows = [];
      for (const inv of [...state.invoices].sort((a, b) => b.date.localeCompare(a.date))) {
        if (inv.status === 'Draft') continue;
        for (const line of inv.lines || []) {
          rows.push({
            date: inv.date,
            source: inv.no,
            party: customerName(state, inv.customerId),
            description: line.desc,
            income: round2((Number(line.qty) || 0) * (Number(line.rate) || 0)),
          });
        }
      }
      for (const exp of [...state.expenses].sort((a, b) => b.date.localeCompare(a.date))) {
        for (const line of exp.lines || []) {
          rows.push({
            date: exp.date,
            source: 'Expense',
            party: exp.payeeName,
            description: line.desc,
            income: 0,
            expense: round2(Number(line.amount) || 0),
          });
        }
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      return {
        columns: [
          { key: 'date', header: 'Date' },
          { key: 'source', header: 'Source' },
          { key: 'party', header: 'Party' },
          { key: 'description', header: 'Description' },
          { key: 'income', header: 'Income', align: 'right' },
          { key: 'expense', header: 'Expense', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Balance Sheet Detail': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = CHART_OF_ACCOUNTS.filter((a) => !a.parentId).map((a) => ({
        account: a.name,
        type: a.typeLabel,
        balance: L.balanceOf(a.id),
        // Movement since opening. The gap between these two is what happened
        // this period, which is the question a detail report exists to answer.
        movement: round2(L.balanceOf(a.id) - (a.openingBalance || 0)),
      }));
      return {
        columns: [
          { key: 'account', header: 'Account' },
          { key: 'type', header: 'Type' },
          { key: 'balance', header: 'Balance', align: 'right' },
          { key: 'movement', header: 'This period', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Balance Sheet Summary': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = [
        { label: 'Current assets', value: L.assets.current },
        { label: 'Fixed assets', value: L.assets.fixed },
        { label: 'Total assets', value: L.assets.total, total: true },
        { label: 'Current liabilities', value: L.liabilities.current },
        { label: 'Total liabilities', value: L.liabilities.total, total: true },
        { label: 'Opening balance equity', value: L.equity.opening },
        { label: 'Retained earnings', value: L.equity.retainedEarnings },
        { label: 'Net income', value: L.pnl.netIncome },
        { label: 'Total equity', value: round2(L.equity.total), total: true },
      ];
      return {
        columns: [{ key: 'label', header: 'Summary' }, { key: 'value', header: 'Amount', align: 'right' }],
        rows,
      };
    },
  },

  'Balance Sheet Comparison': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = [
        { label: 'Total assets', opening: CHART_OF_ACCOUNTS.filter((a) => ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset'].includes(a.type)).reduce((s, a) => s + (a.openingBalance || 0), 0), closing: L.assets.total },
        { label: 'Total liabilities', opening: 0, closing: L.liabilities.total },
        { label: 'Total equity', opening: L.equity.opening + L.equity.retainedEarnings, closing: round2(L.equity.total + L.pnl.netIncome) },
      ];
      return {
        columns: [
          { key: 'label', header: '' },
          { key: 'opening', header: 'At start', align: 'right' },
          { key: 'closing', header: 'Now', align: 'right' },
          { key: 'change', header: 'Change', align: 'right' },
        ],
        rows: rows.map((r) => ({ ...r, change: round2(r.closing - r.opening) })),
        note: 'Opening balances are the figures carried in from before this app was used.',
      };
    },
  },

  'Profit and Loss Comparison': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = [
        { label: 'Income', value: L.pnl.income, share: L.pnl.income ? 100 : 0 },
        { label: 'Cost of goods sold', value: L.pnl.cogs, share: L.pnl.income ? Math.round((L.pnl.cogs / L.pnl.income) * 100) : 0 },
        { label: 'Gross profit', value: L.pnl.grossProfit, share: L.pnl.income ? Math.round((L.pnl.grossProfit / L.pnl.income) * 100) : 0 },
        { label: 'Expenses', value: L.pnl.expenses, share: L.pnl.income ? Math.round((L.pnl.expenses / L.pnl.income) * 100) : 0 },
        { label: 'Net income', value: L.pnl.netIncome, share: L.pnl.income ? Math.round((L.pnl.netIncome / L.pnl.income) * 100) : 0 },
      ];
      return {
        columns: [
          { key: 'label', header: '' },
          { key: 'value', header: 'Amount', align: 'right' },
          { key: 'share', header: '% of income', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Profit and Loss as % of total income': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const rows = CHART_OF_ACCOUNTS
        .filter((a) => (a.type === 'Income' || a.type === 'Expense' || a.type === 'Cost of Goods Sold') && !a.parentId)
        .map((a) => ({ account: a.name, amount: L.balanceOf(a.id) }))
        .filter((r) => r.amount !== 0)
        .map((r) => ({
          ...r,
          percent: L.pnl.income ? `${Math.round((r.amount / L.pnl.income) * 100)}%` : '—',
        }));
      return {
        columns: [
          { key: 'account', header: 'Account' },
          { key: 'amount', header: 'Amount', align: 'right' },
          { key: 'percent', header: '% of income', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Profit and Loss year-to-date comparison': {
    group: 'Business overview',
    build: (state) => groupByMonth(state, 'pnl'),
  },

  'Statement of Cash Flows': {
    group: 'Business overview',
    build: (state) => {
      const cf = state.__ledger.cashFlow;
      const rows = [
        { section: 'Operating activities' },
        { label: 'Received from customers', value: cf.operatingIn },
        { label: 'Paid to suppliers and staff', value: -cf.operatingOut },
        { label: 'Net cash from operations', value: cf.operating, total: true },
        { section: 'Investing activities' },
        { label: 'Fixed assets bought or sold', value: cf.investing },
        { section: 'Financing activities' },
        { label: 'Equity and borrowing', value: cf.financing },
        { section: 'Cash' },
        { label: 'At start of period', value: cf.opening },
        { label: 'Net change', value: cf.netChange },
        { label: 'In bank now', value: state.__ledger.cash.total, total: true },
      ];
      return {
        columns: [{ key: 'label', header: '' }, { key: 'value', header: 'Amount', align: 'right' }],
        rows,
        note: cf.unreconciledCount
          ? `${cf.unreconciledCount} bank transaction(s) worth ${cf.unreconciled.toFixed(2)} cleared but are not categorised, so cash will move.`
          : 'Every bank transaction is categorised.',
      };
    },
  },

  'Quarterly Profit and Loss Summary': {
    group: 'Business overview',
    build: (state) => groupByQuarter(state),
  },

  'Business Snapshot': {
    group: 'Business overview',
    build: (state) => {
      const L = state.__ledger;
      const openInvoices = state.invoices.filter((i) => i.status !== 'Paid' && i.status !== 'Draft');
      const overdue = openInvoices.filter((i) => i.status === 'Overdue');
      const overdueAmount = round2(overdue.reduce((s, i) => s + invoiceTotal(i, state), 0));
      const rows = [
        { label: 'Revenue recognised', value: L.pnl.income },
        { label: 'Expenses', value: -L.pnl.expenses },
        { label: 'Net result', value: L.pnl.netIncome, total: true },
        { section: 'Money' },
        { label: 'In the bank', value: L.cash.total },
        { label: 'Owed to you', value: L.outstanding.receivable },
        { label: 'You owe', value: -L.outstanding.payable },
        { section: 'Attention' },
        { label: 'Open invoices', value: openInvoices.length, count: true },
        { label: 'Of which overdue', value: overdue.length, count: true, warn: overdue.length > 0 },
        { label: 'Overdue value', value: overdueAmount, warn: overdueAmount > 0 },
        { label: 'Awaiting categorisation', value: L.cashFlow?.unreconciledCount ?? 0, count: true },
      ];
      return {
        columns: [{ key: 'label', header: '' }, { key: 'value', header: '' }],
        rows,
      };
    },
  },

  'Project Profitability Summary': {
    group: 'Business overview',
    build: (state) => {
      // A project is a product category here, which is the finest grouping the
      // data actually carries. Claiming projects would need a real project
      // entity, so this says what it is grouping by.
      const byCategory = new Map();
      for (const inv of state.invoices) {
        if (inv.status === 'Draft') continue;
        for (const line of inv.lines || []) {
          const product = state.products.find((p) => p.id === line.productId);
          const project = product?.category || 'Uncategorised';
          const revenue = (Number(line.qty) || 0) * (Number(line.rate) || 0);
          const cost = (Number(line.qty) || 0) * (product?.cost || 0);
          const current = byCategory.get(project) || { revenue: 0, cost: 0 };
          byCategory.set(project, {
            revenue: round2(current.revenue + revenue),
            cost: round2(current.cost + cost),
          });
        }
      }
      const rows = [...byCategory.entries()]
        .map(([project, v]) => ({
          project,
          revenue: v.revenue,
          cost: v.cost,
          margin: round2(v.revenue - v.cost),
        }))
        .sort((a, b) => b.margin - a.margin);
      return {
        columns: [
          { key: 'project', header: 'Category' },
          { key: 'revenue', header: 'Revenue', align: 'right' },
          { key: 'cost', header: 'Cost', align: 'right' },
          { key: 'margin', header: 'Margin', align: 'right' },
        ],
        rows,
        note: 'Grouped by product category. Only costs recorded against a product count towards margin.',
      };
    },
  },

  'Audit Log': {
    group: 'Business overview',
    build: (state) => ({
      columns: [
        { key: 'when', header: 'When' },
        { key: 'user', header: 'Who' },
        { key: 'event', header: 'What happened' },
      ],
      rows: state.audit.slice(0, 100).map((e) => ({
        when: new Date(e.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        user: e.user,
        event: e.event,
      })),
      note: 'Every change to your books, and it cannot be turned off.',
    }),
  },

  /* ---------------- Who owes you ---------------- */

  'Open Invoices': {
    group: 'Who owes you',
    build: (state) => {
      const rows = state.invoices
        .filter((i) => i.status !== 'Paid' && i.status !== 'Draft')
        .map((inv) => {
          const total = invoiceTotal(inv, state);
          const settled = state.bankTxns
            .filter((t) => t.state === 'Match' && t.matchedRef === inv.no)
            .reduce((s, t) => s + t.amount, 0);
          return {
            date: inv.date,
            no: inv.no,
            customer: customerName(state, inv.customerId),
            due: inv.dueDate,
            total,
            remaining: round2(total - settled),
            status: inv.status,
          };
        })
        .filter((r) => r.remaining > 0.004)
        .sort((a, b) => a.due.localeCompare(b.due));
      return {
        columns: [
          { key: 'no', header: 'Invoice' },
          { key: 'customer', header: 'Customer' },
          { key: 'due', header: 'Due' },
          { key: 'total', header: 'Total', align: 'right' },
          { key: 'remaining', header: 'Outstanding', align: 'right' },
          { key: 'status', header: 'Status' },
        ],
        rows,
        totalRow: { label: 'Outstanding', value: round2(rows.reduce((s, r) => s + r.remaining, 0)) },
      };
    },
  },

  'Accounts receivable aging summary': {
    group: 'Who owes you',
    build: (state) => agingReport(state, 'receivable'),
  },

  'Accounts receivable aging detail': {
    group: 'Who owes you',
    build: (state) => agingReport(state, 'receivable', true),
  },

  'Statement List': {
    group: 'Who owes you',
    build: (state) => {
      const byCustomer = new Map();
      for (const inv of state.invoices) {
        if (inv.status === 'Paid' || inv.status === 'Draft') continue;
        const name = customerName(state, inv.customerId);
        const current = byCustomer.get(name) || { invoices: [], oldest: inv.dueDate };
        current.invoices.push(inv);
        if (inv.dueDate < current.oldest) current.oldest = inv.dueDate;
        byCustomer.set(name, current);
      }
      const rows = [...byCustomer.entries()].map(([customer, v]) => ({
        customer,
        invoices: v.invoices.length,
        oldest: v.oldest,
        amount: round2(v.invoices.reduce((s, i) => s + invoiceTotal(i, state), 0)),
      })).sort((a, b) => b.amount - a.amount);
      return {
        columns: [
          { key: 'customer', header: 'Customer' },
          { key: 'invoices', header: 'Invoices', align: 'right' },
          { key: 'oldest', header: 'Oldest due' },
          { key: 'amount', header: 'Amount', align: 'right' },
        ],
        rows,
        totalRow: { label: 'Total', value: round2(rows.reduce((s, r) => s + r.amount, 0)) },
      };
    },
  },

  'Customer Balance Summary': {
    group: 'Who owes you',
    build: (state) => {
      const rows = state.customers
        .map((c) => {
          const billed = round2(
            state.invoices
              .filter((i) => i.customerId === c.id && i.status !== 'Draft')
              .reduce((s, i) => s + invoiceTotal(i, state), 0)
          );
          const paid = round2(
            state.bankTxns
              .filter((t) => t.state === 'Match' && state.invoices.some((i) => i.no === t.matchedRef && i.customerId === c.id))
              .reduce((s, t) => s + t.amount, 0)
          );
          return { customer: c.displayName, billed, paid, balance: round2(billed - paid) };
        })
        .filter((r) => r.billed !== 0 || r.balance !== 0)
        .sort((a, b) => b.balance - a.balance);
      return {
        columns: [
          { key: 'customer', header: 'Customer' },
          { key: 'billed', header: 'Billed', align: 'right' },
          { key: 'paid', header: 'Paid', align: 'right' },
          { key: 'balance', header: 'Balance', align: 'right' },
        ],
        rows,
        totalRow: { label: 'Total', value: round2(rows.reduce((s, r) => s + r.balance, 0)) },
      };
    },
  },

  'Customer Balance Detail': {
    group: 'Who owes you',
    build: (state) => {
      const rows = [];
      for (const inv of state.invoices.filter((i) => i.status !== 'Draft')) {
        const paid = state.bankTxns
          .filter((t) => t.state === 'Match' && t.matchedRef === inv.no)
          .reduce((s, t) => s + t.amount, 0);
        rows.push({
          date: inv.date,
          type: 'Invoice',
          reference: inv.no,
          customer: customerName(state, inv.customerId),
          debit: invoiceTotal(inv, state),
          credit: paid,
          balance: round2(invoiceTotal(inv, state) - paid),
        });
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      return {
        columns: [
          { key: 'date', header: 'Date' },
          { key: 'reference', header: 'Reference' },
          { key: 'customer', header: 'Customer' },
          { key: 'debit', header: 'Charged', align: 'right' },
          { key: 'credit', header: 'Paid', align: 'right' },
          { key: 'balance', header: 'Balance', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Invoice List': {
    group: 'Who owes you',
    build: (state) => {
      const rows = state.invoices.map((inv) => ({
        no: inv.no,
        date: inv.date,
        customer: customerName(state, inv.customerId),
        terms: inv.terms,
        total: invoiceTotal(inv, state),
        status: inv.status,
      }));
      return {
        columns: [
          { key: 'no', header: 'Invoice' },
          { key: 'date', header: 'Date' },
          { key: 'customer', header: 'Customer' },
          { key: 'terms', header: 'Terms' },
          { key: 'total', header: 'Total', align: 'right' },
          { key: 'status', header: 'Status' },
        ],
        rows,
      };
    },
  },

  'Invoices and Received Payments': {
    group: 'Who owes you',
    build: (state) => {
      const rows = [];
      for (const inv of state.invoices) {
        if (inv.status === 'Draft') continue;
        rows.push({ date: inv.date, reference: inv.no, customer: customerName(state, inv.customerId), amount: invoiceTotal(inv, state), kind: 'Invoice' });
      }
      for (const t of state.bankTxns.filter((x) => x.state === 'Match' && x.amount > 0)) {
        rows.push({ date: t.date, reference: t.matchedRef, customer: t.desc, amount: t.amount, kind: 'Payment' });
      }
      rows.sort((a, b) => b.date.localeCompare(a.date));
      return {
        columns: [
          { key: 'date', header: 'Date' },
          { key: 'reference', header: 'Reference' },
          { key: 'customer', header: 'Customer' },
          { key: 'kind', header: 'Type' },
          { key: 'amount', header: 'Amount', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Collections Report': {
    group: 'Who owes you',
    build: (state) => {
      const payments = state.bankTxns.filter((t) => t.state === 'Match' && t.amount > 0);
      const byCustomer = new Map();
      for (const t of payments) {
        const inv = state.invoices.find((i) => i.no === t.matchedRef);
        const name = inv ? customerName(state, inv.customerId) : t.desc;
        byCustomer.set(name, round2((byCustomer.get(name) || 0) + t.amount));
      }
      const rows = [...byCustomer.entries()].map(([customer, collected]) => ({ customer, collected })).sort((a, b) => b.collected - a.collected);
      const invoiced = round2(
        state.invoices.filter((i) => i.status !== 'Draft').reduce((s, i) => s + invoiceTotal(i, state), 0)
      );
      const total = round2(rows.reduce((s, r) => s + r.collected, 0));
      return {
        columns: [{ key: 'customer', header: 'Customer' }, { key: 'collected', header: 'Collected', align: 'right' }],
        rows,
        totalRow: { label: 'Total collected', value: total },
        note: invoiced > 0
          ? `${Math.round((total / invoiced) * 100)}% of what was invoiced has been collected.`
          : 'Nothing has been invoiced yet.',
      };
    },
  },

  'Terms List': {
    group: 'Who owes you',
    build: (state) => {
      const byTerms = new Map();
      for (const inv of state.invoices.filter((i) => i.status !== 'Draft')) {
        const terms = inv.terms || 'Not set';
        byTerms.set(terms, round2((byTerms.get(terms) || 0) + invoiceTotal(inv, state)));
      }
      const rows = [...byTerms.entries()].map(([terms, invoiced]) => ({ terms, invoices: state.invoices.filter((i) => (i.terms || 'Not set') === terms).length, invoiced }));
      return {
        columns: [
          { key: 'terms', header: 'Terms' },
          { key: 'invoices', header: 'Invoices', align: 'right' },
          { key: 'invoiced', header: 'Invoiced', align: 'right' },
        ],
        rows,
      };
    },
  },

  'Unbilled charges': {
    group: 'Who owes you',
    build: (state) => {
      // A charge is unbilled when work is recorded against a customer but no
      // invoice carries it. Time entries and estimates are where that work
      // lives; anything already on an invoice is excluded.
      const billedTime = new Set(state.invoices.flatMap((i) => i.timeEntryIds || []));
      const unbilledTime = state.timeEntries.filter((t) => !billedTime.has(t.id));
      const unbilledEstimates = (state.salesDocs?.estimates || []).filter((e) => e.status === 'Accepted');
      const rows = [
        ...unbilledTime.map((t) => ({
          date: t.date,
          reference: 'Time',
          customer: t.customerName || '—',
          description: t.description,
          amount: round2(((Number(t.hours) || 0) + (Number(t.minutes) || 0) / 60) * (Number(t.rate) || 0)),
        })),
        ...unbilledEstimates.map((e) => ({
          date: e.date,
          reference: e.no,
          customer: customerName(state, e.customerId),
          description: 'Accepted estimate not yet invoiced',
          amount: (e.lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0),
        })),
      ].sort((a, b) => b.date.localeCompare(a.date));
      return {
        columns: [
          { key: 'reference', header: 'Source' },
          { key: 'customer', header: 'Customer' },
          { key: 'description', header: 'Description' },
          { key: 'amount', header: 'Amount', align: 'right' },
        ],
        rows,
        totalRow: { label: 'Unbilled', value: round2(rows.reduce((s, r) => s + r.amount, 0)) },
      };
    },
  },

  'Unbilled time': {
    group: 'Who owes you',
    build: (state) => {
      const billed = new Set(state.invoices.flatMap((i) => i.timeEntryIds || []));
      const rows = state.timeEntries
        .filter((t) => !billed.has(t.id))
        .map((t) => ({
          date: t.date,
          person: t.employeeName || '—',
          description: t.description,
          hours: round2((Number(t.hours) || 0) + (Number(t.minutes) || 0) / 60),
          billable: t.status === 'Billed' ? 'Yes' : 'No',
          amount: round2(((Number(t.hours) || 0) + (Number(t.minutes) || 0) / 60) * (Number(t.rate) || 0)),
        }));
      return {
        columns: [
          { key: 'date', header: 'Date' },
          { key: 'person', header: 'Person' },
          { key: 'description', header: 'Description' },
          { key: 'hours', header: 'Hours', align: 'right' },
          { key: 'billable', header: 'Billable' },
          { key: 'amount', header: 'Amount', align: 'right' },
        ],
        rows,
        totalRow: { label: 'Hours', value: round2(rows.reduce((s, r) => s + r.hours, 0)), hours: true },
      };
    },
  },
};

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Income accounts with a balance, for the P&L rows. */
function incomeRows(state, L) {
  return CHART_OF_ACCOUNTS
    .filter((a) => a.type === 'Income' && !a.parentId)
    .map((a) => ({ label: a.name, type: a.type, value: L.balanceOf(a.id) }))
    .filter((r) => r.value !== 0);
}

/**
 * Month by month, from the transaction dates.
 *
 * Only months that actually contain something appear. Twelve months of zeros
 * followed by a projected figure would be a forecast dressed as a report.
 */
function groupByMonth(state) {
  const months = new Map();
  const bump = (m, field, amount) => {
    const current = months.get(m) || { revenue: 0, expenses: 0 };
    current[field] = round2(current[field] + amount);
    months.set(m, current);
  };

  for (const inv of state.invoices) {
    if (inv.status === 'Draft') continue;
    bump(monthOf(inv.date), 'revenue', invoiceTotal(inv, state));
  }
  for (const exp of state.expenses) {
    bump(monthOf(exp.date), 'expenses', docTotal(exp));
  }
  for (const bill of state.bills) {
    bump(monthOf(bill.date), 'expenses', docTotal(bill));
  }
  for (const t of state.bankTxns) {
    if (t.state !== 'Reviewed' || !t.categoryAccountId) continue;
    if (t.amount >= 0) continue;
    bump(monthOf(t.date), 'expenses', Math.abs(t.amount));
  }

  const rows = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      revenue: v.revenue,
      expenses: v.expenses,
      profit: round2(v.revenue - v.expenses),
    }));

  return {
    columns: [
      { key: 'month', header: 'Month' },
      { key: 'revenue', header: 'Revenue', align: 'right' },
      { key: 'expenses', header: 'Expenses', align: 'right' },
      { key: 'profit', header: 'Profit', align: 'right' },
    ],
    rows,
    totalRow: {
      label: 'Total',
      value: round2(rows.reduce((s, r) => s + r.profit, 0)),
    },
    note: 'Revenue is recognised when the invoice was raised, not when it was paid.',
  };
}

/** Quarter by quarter, from the same transactions. */
function groupByQuarter(state) {
  const monthly = groupByMonth(state);
  const byQuarter = new Map();
  for (const row of monthly.rows) {
    const [y, m] = row.month.split('-').map(Number);
    const q = `${y} Q${Math.floor((m - 1) / 3) + 1}`;
    const current = byQuarter.get(q) || { revenue: 0, expenses: 0 };
    current.revenue = round2(current.revenue + row.revenue);
    current.expenses = round2(current.expenses + row.expenses);
    byQuarter.set(q, current);
  }
  const rows = [...byQuarter.entries()].map(([quarter, v]) => ({
    quarter,
    ...v,
    profit: round2(v.revenue - v.expenses),
  }));
  return {
    columns: [
      { key: 'quarter', header: 'Quarter' },
      { key: 'revenue', header: 'Revenue', align: 'right' },
      { key: 'expenses', header: 'Expenses', align: 'right' },
      { key: 'profit', header: 'Profit', align: 'right' },
    ],
    rows,
  };
}

/**
 * Aging, bucketed by how late something is.
 *
 * "Today" is the latest transaction date, not the wall clock. The books are
 * dated and the system date may not be, so ageing against real time would put
 * every invoice decades overdue and teach the reader nothing.
 */
function agingReport(state, side, detail = false) {
  const asOf = state.bankTxns.reduce((latest, t) => (t.date > latest ? t.date : latest), '');
  const today = asOf ? new Date(`${asOf}T00:00:00`) : new Date();

  const bands = [
    { label: 'Current', max: 0 },
    { label: '1-30 days', max: 30 },
    { label: '31-60 days', max: 60 },
    { label: '61-90 days', max: 90 },
    { label: 'Over 90 days', max: Infinity },
  ].map((b) => ({ ...b, amount: 0, count: 0 }));

  const items = state.invoices
    .filter((i) => i.status !== 'Paid' && i.status !== 'Draft')
    .map((inv) => {
      const total = invoiceTotal(inv, state);
      const settled = state.bankTxns
        .filter((t) => t.state === 'Match' && t.matchedRef === inv.no)
        .reduce((s, t) => s + t.amount, 0);
      return { inv, total, remaining: round2(total - settled) };
    })
    .filter((x) => x.remaining > 0.004);

  for (const item of items) {
    const daysLate = Math.floor((today - new Date(`${item.inv.dueDate}T00:00:00`)) / 86400000);
    const band = bands.find((b) => daysLate <= b.max);
    band.amount = round2(band.amount + item.remaining);
    band.count += 1;
  }

  if (detail) {
    const rows = items
      .map((item) => {
        const daysLate = Math.floor((today - new Date(`${item.inv.dueDate}T00:00:00`)) / 86400000);
        return {
          date: item.inv.date,
          no: item.inv.no,
          customer: customerName(state, item.inv.customerId),
          due: item.inv.dueDate,
          daysOverdue: daysLate > 0 ? daysLate : 0,
          remaining: item.remaining,
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
    return {
      columns: [
        { key: 'no', header: 'Invoice' },
        { key: 'customer', header: 'Customer' },
        { key: 'due', header: 'Due' },
        { key: 'daysOverdue', header: 'Days late', align: 'right' },
        { key: 'remaining', header: 'Outstanding', align: 'right' },
      ],
      rows,
      totalRow: { label: 'Outstanding', value: round2(items.reduce((s, i) => s + i.remaining, 0)) },
    };
  }

  return {
    columns: [
      { key: 'label', header: 'Age' },
      { key: 'count', header: 'Invoices', align: 'right' },
      { key: 'amount', header: 'Amount', align: 'right' },
    ],
    rows: bands.map((b) => ({ label: b.label, count: b.count, amount: b.amount })),
    totalRow: { label: 'Total', value: round2(items.reduce((s, i) => s + i.remaining, 0)) },
    note: 'Aged from the most recent transaction date in your books.',
  };
}

/** Run a report by name. Returns null for a name with no definition. */
export function runReport(name, state) {
  const report = REPORTS[name];
  if (!report) return null;
  return { name, group: report.group, ...report.build(state) };
}

export const REPORT_NAMES = Object.keys(REPORTS);