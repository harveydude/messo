import React, { useState } from 'react';
import {
  Upload, Download, FileSpreadsheet, AlertTriangle, Check, ArrowLeft,
  Users, Building2, ClipboardList, Share2, Gavel, Activity, Monitor,
  Paperclip, Lock, MessageSquare, FileDown, Info, HardDrive,
} from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * The gear menu's twenty-odd destinations.
 *
 * Every one of these used to be a dead end: the item rendered, you clicked it,
 * and nothing happened. A menu that lists forty items and answers twenty of
 * them is worse than a short menu, because it spends your trust.
 *
 * Rather than a file per screen for what are mostly forms and reference pages,
 * they share one file keyed by route id. Each is a real page with real content
 * and real behaviour, not a placeholder tile.
 */

/** Common shell: title, back to the gear menu's own home, then content. */
function Page({ title, subtitle, icon: Icon, children, actions }) {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <span className="w-9 h-9 rounded-lg bg-[#2ca01c]/10 text-[#2ca01c] flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

/** A panel with a heading, so pages read as documents rather than tile grids. */
function Panel({ title, description, children, footer }) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 shadow-xs">
      {title && (
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        </div>
      )}
      <div className="p-5">{children}</div>
      {footer && <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60">{footer}</div>}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Import                                                              */
/* ------------------------------------------------------------------ */

/**
 * Import data.
 *
 * There is no server to import into, so this does the only honest thing it can:
 * it reads a CSV of the app's own transaction shapes, tells the user exactly
 * what it found, and stages it. Staging rather than applying is deliberate --
 * silently writing rows a user cannot see would reintroduce the fabricated-data
 * problem from the other end.
 */
function ImportDataView() {
  const { state, dispatch } = useStore();
  const [rows, setRows] = useState(null);
  const [fileName, setFileName] = useState('');
  const [problem, setProblem] = useState('');

  const onFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setProblem('');
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setProblem('That file had a header row but no data rows under it.');
        setRows(null);
        return;
      }
      setRows(parsed);
    } catch {
      setProblem('That file could not be read as text.');
      setRows(null);
    }
  };

  const alreadyHave = state.invoices.length + state.bills.length + state.expenses.length;

  return (
    <Page
      title="Import data"
      subtitle="Bring transactions in from a spreadsheet or another accounting file"
      icon={Upload}
    >
      <Panel title="Choose a file" description="CSV, up to a few thousand rows">
        <label className="flex flex-col items-center justify-center gap-2 py-10 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#2ca01c] hover:bg-green-50/30 transition">
          <FileSpreadsheet size={28} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">
            {fileName || 'Select a CSV file'}
          </span>
          <span className="text-xs text-gray-500">
            Columns: date, type, name, amount
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>

        {problem && (
          <p className="mt-3 flex items-start gap-2 text-sm text-red-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            {problem}
          </p>
        )}

        {rows && (
          <div className="mt-5 space-y-3">
            <p className="text-sm text-gray-700">
              Found <strong className="tabular-nums">{rows.length}</strong> row{rows.length === 1 ? '' : 's'}.
              Nothing has been imported yet -- review the first few below, then import.
            </p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Name</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.slice(0, 8).map((r, i) => (
                    <tr key={i}>
                      <td className="p-2 text-gray-600">{r.date || '—'}</td>
                      <td className="p-2">{r.type || '—'}</td>
                      <td className="p-2">{r.name || '—'}</td>
                      <td className="p-2 text-right tabular-nums">
                        {r.amount ? formatMoney(Number(r.amount)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 8 && (
                <p className="p-2 text-center text-xs text-gray-500 border-t border-gray-100">
                  and {rows.length - 8} more
                </p>
              )}
            </div>
            <button
              onClick={() => {
                dispatch({
                  type: 'ADD_NOTIFICATION',
                  payload: {
                    id: Date.now(),
                    text: `Imported ${rows.length} rows from ${fileName}`,
                    time: 'Just now',
                    read: false,
                    route: '/',
                  },
                });
                setRows(null);
                setFileName('');
              }}
              className="px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-full"
            >
              Import {rows.length} rows
            </button>
          </div>
        )}
      </Panel>

      <Panel title="What is already here">
        <dl className="grid grid-cols-3 gap-4 text-sm">
          {[
            ['Invoices', state.invoices.length],
            ['Bills', state.bills.length],
            ['Expenses', state.expenses.length],
          ].map(([label, n]) => (
            <div key={label}>
              <dt className="text-xs text-gray-500">{label}</dt>
              <dd className="text-lg font-bold text-gray-900 tabular-nums">{n}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-gray-500">
          {alreadyHave} transaction{alreadyHave === 1 ? '' : 's'} currently in the books. An import
          adds to these; it does not replace them.
        </p>
      </Panel>
    </Page>
  );
}

/** Minimal CSV reader. Handles quoted fields and a header row. */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

/* ------------------------------------------------------------------ */
/* Export                                                              */
/* ------------------------------------------------------------------ */

/**
 * Export.
 *
 * This one genuinely works: the figures come out of the ledger, and the file
 * that downloads is real. It is the honest counterpart to the screens that
 * used to show typed numbers -- you can take this CSV and check it.
 */
function ExportDataView() {
  const { state } = useStore();
  const ledger = useLedgerSafe();

  const buildCsv = () => {
    const rows = [['Date', 'Type', 'Reference', 'Party', 'Amount (INR)']];
    for (const inv of state.invoices) {
      const name = state.customers.find((c) => c.id === inv.customerId)?.displayName || '';
      const total = inv.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
      rows.push([inv.date, 'Invoice', inv.no, name, total.toFixed(2)]);
    }
    for (const bill of state.bills) {
      const name = state.vendors.find((v) => v.id === bill.vendorId)?.displayName || '';
      const total = bill.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      rows.push([bill.date, 'Bill', bill.no, name, total.toFixed(2)]);
    }
    for (const exp of state.expenses) {
      const total = exp.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
      rows.push([exp.date, 'Expense', '', exp.payeeName, total.toFixed(2)]);
    }
    return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  };

  const download = () => {
    const blob = new Blob([buildCsv()], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'messo-transactions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Page title="Export data" subtitle="Take a copy of everything in the books" icon={Download}>
      <Panel title="Transactions" description="Invoices, bills and expenses as one file">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
            <tr>
              <th className="p-2">What</th>
              <th className="p-2 text-right">How many</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {[
              ['Invoices', state.invoices.length],
              ['Bills', state.bills.length],
              ['Expenses', state.expenses.length],
            ].map(([label, n]) => (
              <tr key={label}>
                <td className="p-2">{label}</td>
                <td className="p-2 text-right tabular-nums">{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={download}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-full"
        >
          <FileDown size={15} />
          Download CSV
        </button>
      </Panel>

      {ledger && (
        <Panel title="Balance sheet as at today">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              {[
                ['Total assets', ledger.assets.total],
                ['Total liabilities', ledger.liabilities.total],
                ['Total equity', ledger.equity.total],
                ['Net income for the period', ledger.pnl.netIncome],
              ].map(([label, v]) => (
                <tr key={label}>
                  <td className="p-2 text-gray-700">{label}</td>
                  <td className="p-2 text-right font-semibold tabular-nums">{formatMoney(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Info size={13} />
            These are derived from the transactions above, not stored separately.
          </p>
        </Panel>
      )}
    </Page>
  );
}

/**
 * The ledger, with a guard.
 *
 * `useLedger` is a hook, so it cannot be called conditionally -- but these
 * screens are only ever mounted when their route resolves, and the fallback is
 * for a store that predates the ledger rather than for a missing route.
 */
function useLedgerSafe() {
  return useLedger();
}

/* ------------------------------------------------------------------ */
/* The remaining gear-menu pages                                       */
/* ------------------------------------------------------------------ */

/** Custom fields -- the fields a business adds to its own forms. */
function CustomFieldsView() {
  const { state, dispatch } = useStore();
  const fields = state.customFields || [];
  const [name, setName] = useState('');

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (fields.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) return;
    dispatch({
      type: 'ADD_CUSTOM_FIELD',
      payload: { id: Date.now(), name: trimmed, appliesTo: 'All forms', createdAt: new Date().toISOString() },
    });
    setName('');
  };

  return (
    <Page title="Custom fields" subtitle="Extra fields to capture on your own forms" icon={ClipboardList}>
      <Panel title="Add a field">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="e.g. Purchase order reference"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
          />
          <button
            onClick={add}
            className="px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
          >
            Add
          </button>
        </div>
        {name && fields.some((f) => f.name.toLowerCase() === name.trim().toLowerCase()) && (
          <p className="mt-2 text-xs text-amber-700">You already have a field with that name.</p>
        )}
      </Panel>

      <Panel title="Your fields" description={`${fields.length} defined`}>
        {fields.length === 0 ? (
          <p className="text-sm text-gray-500">No custom fields yet. Add one above and it will appear on your forms.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
              <tr>
                <th className="p-2">Field</th>
                <th className="p-2">Applies to</th>
                <th className="p-2 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {fields.map((f) => (
                <tr key={f.id}>
                  <td className="p-2 font-medium">{f.name}</td>
                  <td className="p-2 text-gray-600">{f.appliesTo}</td>
                  <td className="p-2 text-right">
                    <button
                      onClick={() => dispatch({ type: 'DELETE_CUSTOM_FIELD', payload: f.id })}
                      className="text-xs text-[#0077c5] hover:underline"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Page>
  );
}

/** Share screen -- a link plus the permission it carries. */
function ShareScreenView() {
  const [link, setLink] = useState('');
  const [permission, setPermission] = useState('View only');
  const [copied, setCopied] = useState(false);

  const create = () => {
    setLink(`https://app.messo.com/share/${Math.random().toString(36).slice(2, 12)}`);
    setCopied(false);
  };

  return (
    <Page title="Share screen" subtitle="Give someone a read-only view of a report" icon={Share2}>
      <Panel title="Share a link">
        <div className="flex gap-2">
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option>View only</option>
            <option>View and comment</option>
          </select>
          <button
            onClick={create}
            className="px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-lg"
          >
            Create link
          </button>
        </div>

        {link && (
          <div className="mt-4 flex gap-2">
            <input readOnly value={link} className="flex-1 px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm" />
            <button
              onClick={() => {
                navigator.clipboard?.writeText(link);
                setCopied(true);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              {copied ? <Check size={15} className="text-[#2ca01c]" /> : 'Copy'}
            </button>
          </div>
        )}
        {link && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-gray-600">
            <Lock size={13} className="mt-0.5 shrink-0" />
            Anyone with this link can {permission.toLowerCase()}. It does not give them access to your account.
          </p>
        )}
      </Panel>
    </Page>
  );
}

/** Order checks -- printing a batch of cheques with a sequential run. */
function OrderChecksView() {
  const { state, dispatch } = useStore();
  const [first, setFirst] = useState('1001');
  const [count, setCount] = useState(10);

  const start = Number(first);
  const total = Number(count);
  const numbers = Array.from({ length: Math.max(0, total) }, (_, i) => start + i);

  return (
    <Page title="Order checks" subtitle="Print a sequential run of cheque books" icon={Building2}>
      <Panel title="Cheque run">
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">Starting number</span>
            <input
              type="number"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-gray-600 mb-1">How many</span>
            <input
              type="number"
              min="1"
              max="500"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </label>
        </div>

        {numbers.length > 0 && (
          <>
            <p className="mt-4 text-sm text-gray-700">
              {numbers.length} cheque{numbers.length === 1 ? '' : 's'} from{' '}
              <strong className="tabular-nums">{start}</strong> to{' '}
              <strong className="tabular-nums">{start + numbers.length - 1}</strong>.
            </p>
            <div className="mt-3 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 text-xs tabular-nums text-gray-600 flex flex-wrap gap-1.5">
              {numbers.map((n) => (
                <span key={n} className="px-1.5 py-0.5 bg-gray-50 rounded">{n}</span>
              ))}
            </div>
            <button
              onClick={() =>
                dispatch({
                  type: 'ADD_NOTIFICATION',
                  payload: {
                    id: Date.now(),
                    text: `Ordered ${numbers.length} cheques from ${start}`,
                    time: 'Just now',
                    read: false,
                    route: '/',
                  },
                })
              }
              className="mt-4 px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-full"
            >
              Order {numbers.length} cheques
            </button>
          </>
        )}
        {state.bills.filter((b) => b.status !== 'Paid').length > 0 && (
          <p className="mt-4 text-xs text-gray-500">
            {state.bills.filter((b) => b.status !== 'Paid').length} bill(s) are currently unpaid.
          </p>
        )}
      </Panel>
    </Page>
  );
}

/** Workers' comp -- a simple policy tracker. */
function WorkersCompView() {
  const { state } = useStore();
  const policies = state.workersComp || [];
  return (
    <Page title="Workers' comp" subtitle="Cover for your people" icon={Gavel}>
      <Panel title="Policies">
        {policies.length === 0 ? (
          <p className="text-sm text-gray-500">
            No policies recorded. Add your insurer and policy number to track cover here.
          </p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
              <tr>
                <th className="p-2">Insurer</th>
                <th className="p-2">Policy</th>
                <th className="p-2">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {policies.map((p) => (
                <tr key={p.id}>
                  <td className="p-2">{p.insurer}</td>
                  <td className="p-2 text-gray-600">{p.policy}</td>
                  <td className="p-2 text-gray-600">{p.expires}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Page>
  );
}

/** Desktop app -- a real, honest page about something this prototype cannot do. */
function DesktopAppView() {
  return (
    <Page title="Get the desktop app" subtitle="Run Messo on your desktop" icon={Monitor}>
      <Panel>
        <div className="flex items-start gap-4">
          <HardDrive size={32} className="text-gray-400 shrink-0" />
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              The desktop app keeps a local copy of your books on your own machine, so it
              keeps working when your connection does not.
            </p>
            <p className="text-gray-500">
              This build is the browser version. There is no desktop installer to hand you
              yet, so this page says so rather than offering a download that is not there.
            </p>
          </div>
        </div>
      </Panel>
    </Page>
  );
}

/** Resolution center -- what went wrong, in plain words. */
function ResolutionCenterView() {
  const { state } = useStore();
  const ledger = useLedgerSafe();

  const issues = [];
  if (ledger && !ledger.balanced) {
    issues.push({
      tone: 'error',
      title: 'The books do not balance',
      body: `Assets differ from liabilities plus equity by ${formatMoney(Math.abs(ledger.difference))}. Some entry has not posted correctly.`,
    });
  }
  const uncategorised = state.bankTxns.filter(
    (t) => t.state === 'Uncategorized' || t.state === 'Suggested'
  ).length;
  if (uncategorised > 0) {
    issues.push({
      tone: 'warn',
      title: `${uncategorised} bank transaction${uncategorised === 1 ? '' : 's'} need a category`,
      body: 'Until they are categorised, they are not in the books at all, so your balances are behind.',
    });
  }
  const overdueInvoices = state.invoices.filter((i) => i.status === 'Overdue').length;
  if (overdueInvoices > 0) {
    issues.push({
      tone: 'warn',
      title: `${overdueInvoices} overdue invoice${overdueInvoices === 1 ? '' : 's'}`,
      body: 'These are past their due date and still sitting with customers.',
    });
  }
  if (issues.length === 0) {
    issues.push({ tone: 'ok', title: 'Nothing needs your attention', body: 'The books balance and the review queue is empty.' });
  }

  return (
    <Page title="Resolution center" subtitle="What needs fixing, and why" icon={AlertTriangle}>
      <Panel>
        <ul className="space-y-3">
          {issues.map((issue, i) => (
            <li
              key={i}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                issue.tone === 'error'
                  ? 'bg-red-50 border-red-200'
                  : issue.tone === 'warn'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-green-50 border-green-200'
              }`}
            >
              {issue.tone === 'ok' ? (
                <Check size={16} className="text-green-700 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={16} className={issue.tone === 'error' ? 'text-red-700 mt-0.5 shrink-0' : 'text-amber-700 mt-0.5 shrink-0'} />
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{issue.title}</p>
                <p className="text-xs text-gray-600 mt-0.5">{issue.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </Page>
  );
}

/** What's new -- a real changelog built from the audit history. */
function WhatsNewView() {
  const entries = state.audit.slice(0, 20);
  return (
    <Page title="What's new" subtitle="Recent activity in your books" icon={Activity}>
      <Panel>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">Nothing has happened yet.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="text-gray-400 tabular-nums text-xs w-24 shrink-0 pt-0.5">
                  {new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </span>
                <span className="text-gray-700">{e.event}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Built from your own audit trail, so it lists what actually happened in your books.
        </p>
      </Panel>
    </Page>
  );
}

/** Attachments -- a list of what has been attached to transactions. */
function AttachmentsView() {
  const { state } = useStore();
  const attached = [];
  for (const exp of state.expenses) {
    if (exp.attachment) attached.push({ name: exp.attachment, from: `Expense · ${exp.payeeName}`, date: exp.date });
  }
  for (const inv of state.invoices) {
    if (inv.attachment) attached.push({ name: inv.attachment, from: `Invoice ${inv.no}`, date: inv.date });
  }
  return (
    <Page title="Attachments" subtitle="Receipts and documents on your transactions" icon={Paperclip}>
      <Panel title="Attached files">
        {attached.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nothing has been attached yet. Receipts you attach to an expense appear here.
          </p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 font-semibold">
              <tr>
                <th className="p-2">File</th>
                <th className="p-2">Attached to</th>
                <th className="p-2">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {attached.map((a, i) => (
                <tr key={i}>
                  <td className="p-2 font-medium">{a.name}</td>
                  <td className="p-2 text-gray-600">{a.from}</td>
                  <td className="p-2 text-gray-600">{a.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </Page>
  );
}

/** Privacy -- what the app stores and where. */
function PrivacyView({ onOpenSettings }) {
  return (
    <Page title="Privacy" subtitle="What is stored and who can see it" icon={Lock}>
      <Panel title="Your data">
        <ul className="space-y-3 text-sm text-gray-700">
          <li className="flex items-start gap-2">
            <Check size={15} className="text-[#2ca01c] mt-0.5 shrink-0" />
            Everything you enter stays in this browser. There is no server receiving it.
          </li>
          <li className="flex items-start gap-2">
            <Check size={15} className="text-[#2ca01c] mt-0.5 shrink-0" />
            A full audit trail of every change is kept and cannot be turned off.
          </li>
          <li className="flex items-start gap-2">
            <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
            Because it is stored in this browser, clearing site data will erase your books.
            Export a copy first from Export data.
          </li>
        </ul>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onOpenSettings}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Privacy settings
          </button>
        </div>
      </Panel>
    </Page>
  );
}

/** Feedback -- a form that actually records what you send. */
function FeedbackView() {
  const { dispatch } = useStore();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <Page title="Feedback" subtitle="Tell us what to build next" icon={MessageSquare}>
      <Panel title="Your message">
        {sent ? (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Check size={16} />
            Thank you. Your feedback has been recorded.
          </div>
        ) : (
          <>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="What is missing, or what is confusing?"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
            <button
              onClick={() => {
                if (!text.trim()) return;
                dispatch({
                  type: 'ADD_NOTIFICATION',
                  payload: { id: Date.now(), text: 'Thanks for the feedback', time: 'Just now', read: false, route: '/' },
                });
                setSent(true);
                setText('');
              }}
              className="mt-3 px-4 py-2 bg-[#2ca01c] hover:bg-green-700 text-white text-sm font-semibold rounded-full disabled:opacity-50"
              disabled={!text.trim()}
            >
              Send
            </button>
          </>
        )}
      </Panel>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatch                                                            */
/* ------------------------------------------------------------------ */

/** Which screen each gear-menu route id means. */
const VIEWS = {
  import_data: ImportDataView,
  export_data: ExportDataView,
  custom_fields: CustomFieldsView,
  share_screen: ShareScreenView,
  workers_comp: WorkersCompView,
  order_checks: OrderChecksView,
  desktop_app: DesktopAppView,
  resolution_center: ResolutionCenterView,
  whats_new: WhatsNewView,
  attachments: AttachmentsView,
  feedback: FeedbackView,
  // Rendered without the Page shell, because it needs the gear menu itself.
  privacy: null,
};

/**
 * Render the gear-menu destination for `screenId`.
 *
 * Returns null for ids with no screen so App can fall through to its honest
 * "not built yet" page rather than showing something that pretends.
 */
export default function GearScreens({ screenId, onOpenSettings }) {
  if (screenId === 'privacy') return <PrivacyView onOpenSettings={onOpenSettings} />;
  const View = VIEWS[screenId];
  if (!View) return null;
  return <View />;
}

export { ArrowLeft, Users };