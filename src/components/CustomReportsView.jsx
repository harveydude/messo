/**
 * Custom reports.
 * ----------------------------------------------------------------------------
 * A report builder that actually builds. The screen lets you pick a source, pick
 * the columns, choose what to group by and narrow the rows, then RUNS that recipe
 * against the store and prints the table. Nothing here is a preview of a picture
 * of a report: `runReport` walks the real collections and aggregates them, so
 * the figure in the last row is the sum of the rows above it, and it moves when
 * a transaction moves.
 *
 * WHY A DEFINITION IS STORED AND A RESULT IS NOT
 * ----------------------------------------------
 * `state.customReports` holds recipes -- {source, fields, groupBy, filter} -- and
 * never output. That is the whole design. A stored result is a photograph of the
 * books on the day the report was saved, which goes stale the moment anything is
 * edited and then disagrees with every other screen without anyone noticing. A
 * stored recipe is re-run on open, so "Sales by customer" is this morning's sales
 * by customer, and a saved report can never be wrong in the way a cached
 * snapshot can.
 *
 * ROWS VERSUS LINES
 * -----------------
 * A source can be read at two granularities. A DOCUMENT row is one invoice; a
 * LINE row is one product on one invoice. "Sales by customer" wants documents --
 * counting each sale once. "Sales by product" wants lines, because a customer
 * who bought two different things is two rows, and grouping by product over
 * documents would silently drop the second item. The builder exposes the choice
 * rather than guessing, because guessing it wrong produces a wrong total that
 * still looks like a total.
 *
 * WHY THE FILTERS ARE DELIBERATELY FEW
 * ------------------------------------
 * Date range, status and a text match cover the questions this data can
 * actually answer. A query language would be more impressive and would also let
 * someone write a report that silently excludes two thirds of their sales. Three
 * filters you can see are better than an expression box that can hide anything.
 */

import React, { useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  Play,
  Save,
  Trash2,
  Check,
  X,
  Printer,
  Download,
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';
import { invoiceTotals } from '../ledger';

/**
 * What each source can be read at, and which columns it offers.
 *
 * `rows` names the granularity: 'document' or 'line'. A source with no line
 * concept (payments) declares only 'document' and the builder hides the choice.
 */
const SOURCES = {
  invoices: {
    label: 'Invoices',
    hint: 'Sales documents you have raised',
    rows: ['document', 'line'],
    granularity: { document: 'One row per invoice', line: 'One row per invoice line' },
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'no', label: 'Invoice no.', type: 'text' },
      { key: 'customer', label: 'Customer', type: 'text', groupable: true },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text', groupable: true },
      { key: 'terms', label: 'Terms', type: 'text' },
      { key: 'product', label: 'Product', type: 'text', groupable: true },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'rate', label: 'Rate', type: 'money' },
      { key: 'tax', label: 'Tax', type: 'money' },
      { key: 'total', label: 'Amount', type: 'money' },
    ],
  },
  bills: {
    label: 'Bills',
    hint: 'What vendors have invoiced you',
    rows: ['document', 'line'],
    granularity: { document: 'One row per bill', line: 'One row per bill line' },
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'no', label: 'Bill no.', type: 'text' },
      { key: 'vendor', label: 'Vendor', type: 'text', groupable: true },
      { key: 'dueDate', label: 'Due date', type: 'date' },
      { key: 'status', label: 'Status', type: 'text', groupable: true },
      { key: 'account', label: 'Expense account', type: 'text', groupable: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'total', label: 'Amount', type: 'money' },
    ],
  },
  expenses: {
    label: 'Expenses',
    hint: 'Money out that is not a vendor bill',
    rows: ['line'],
    granularity: { line: 'One row per expense line' },
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'payee', label: 'Paid to', type: 'text', groupable: true },
      { key: 'account', label: 'Category', type: 'text', groupable: true },
      { key: 'description', label: 'Description', type: 'text' },
      { key: 'method', label: 'Method', type: 'text', groupable: true },
      { key: 'amount', label: 'Amount', type: 'money' },
    ],
  },
  payments: {
    label: 'Payments received',
    hint: 'Money in from customers',
    rows: ['document'],
    granularity: { document: 'One row per payment' },
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'customer', label: 'Customer', type: 'text', groupable: true },
      { key: 'method', label: 'Method', type: 'text', groupable: true },
      { key: 'appliedTo', label: 'Applied to', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'money' },
    ],
  },
  estimates: {
    label: 'Estimates',
    hint: 'Quotes sent, before they become invoices',
    rows: ['document', 'line'],
    granularity: { document: 'One row per estimate', line: 'One row per estimate line' },
    fields: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'no', label: 'Estimate no.', type: 'text' },
      { key: 'customer', label: 'Customer', type: 'text', groupable: true },
      { key: 'expiry', label: 'Expires', type: 'date' },
      { key: 'status', label: 'Status', type: 'text', groupable: true },
      { key: 'product', label: 'Product', type: 'text', groupable: true },
      { key: 'qty', label: 'Qty', type: 'number' },
      { key: 'rate', label: 'Rate', type: 'money' },
      { key: 'total', label: 'Amount', type: 'money' },
    ],
  },
};

/** Account id to name, so a category column can say what the account is. */
function accountName(accounts, id) {
  const a = accounts.find((x) => x.id === id);
  return a ? a.name : `Account ${id}`;
}

export default function CustomReportsView({ onNavigate }) {
  const { state, dispatch } = useStore();

  const [draft, setDraft] = useState(() => ({
    id: null,
    name: 'Untitled report',
    source: 'invoices',
    granularity: 'document',
    fields: ['date', 'customer', 'total'],
    groupBy: 'customer',
    filter: { field: 'status', op: 'not', value: 'Draft' },
  }));

  // `null` until Run is pressed. The table below the builder is the last result,
  // not a live preview -- a builder that redraws on every checkbox click makes
  // it impossible to tell what a change actually did.
  const [result, setResult] = useState(null);
  const [ranFrom, setRanFrom] = useState(null);
  const [showSave, setShowSave] = useState(false);

  const source = SOURCES[draft.source];
  const saved = state.customReports || [];

  const run = (definition) => {
    const built = runReport(definition, state);
    setResult(built);
    setRanFrom(definition);
  };

  const patch = (changes) => setDraft((d) => ({ ...d, ...changes }));

  const changeSource = (key) => {
    const next = SOURCES[key];
    const allowed = next.fields.filter((f) => draft.fields.includes(f.key)).map((f) => f.key);
    // Keep whatever columns still make sense in the new source, and fall back
    // to the first two plus the amount so the report is never empty by default.
    const fields = allowed.length >= 2 ? allowed : next.fields.slice(0, 2).map((f) => f.key).concat(next.fields[next.fields.length - 1].key);
    const groupable = next.fields.filter((f) => f.groupable).map((f) => f.key);
    patch({
      source: key,
      granularity: next.rows[0],
      fields: Array.from(new Set(fields)),
      groupBy: groupable.includes(draft.groupBy) ? draft.groupBy : (groupable[0] ?? null),
      filter: draft.filter && next.fields.some((f) => f.key === draft.filter.field) ? draft.filter : null,
    });
  };

  const toggleField = (key) => {
    const has = draft.fields.includes(key);
    // The report must keep its dimension column, or "group by" has nothing to
    // group on and the table collapses to a single unnamed row.
    if (has && draft.fields.length === 1) return;
    patch({ fields: has ? draft.fields.filter((f) => f !== key) : [...draft.fields, key] });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => onNavigate?.('standard_reports')}
            className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline mb-1.5"
          >
            <ArrowLeft size={13} />
            Reports
          </button>
          <h1 className="text-xl font-bold text-gray-900">Custom reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose what to show, group it, and run it against your transactions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSave(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0077c5] border border-[#0077c5] rounded-full hover:bg-blue-50"
          >
            <Save size={13} />
            Save report
          </button>
          <button
            onClick={run.bind(null, draft)}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            <Play size={13} />
            Run report
          </button>
        </div>
      </div>

      {/* Saved reports */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-900">
            Saved reports
            <span className="ml-2 font-normal text-gray-500">{saved.length} saved</span>
          </h2>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3 w-44">Source</th>
              <th className="p-3 w-44">Grouped by</th>
              <th className="p-3 w-24 text-right">Columns</th>
              <th className="p-3 w-28 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {saved.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-900">{r.name}</td>
                <td className="p-3 text-gray-600">{SOURCES[r.source]?.label || r.source}</td>
                <td className="p-3 text-gray-600">
                  {r.groupBy ? SOURCES[r.source]?.fields.find((f) => f.key === r.groupBy)?.label || r.groupBy : 'No grouping'}
                </td>
                <td className="p-3 text-right tabular-nums text-gray-600">{(r.fields || []).length}</td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => {
                      setDraft({ ...r, granularity: r.granularity || SOURCES[r.source]?.rows[0] || 'document' });
                      run({ ...r, granularity: r.granularity || SOURCES[r.source]?.rows[0] || 'document' });
                    }}
                    className="text-[#0077c5] font-semibold hover:underline mr-3"
                  >
                    Run
                  </button>
                  <button
                    onClick={() => {
                      setDraft({ ...r, granularity: r.granularity || 'document' });
                    }}
                    className="text-[#0077c5] font-semibold hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => dispatch({ type: 'DELETE_CUSTOM_REPORT', payload: r.id })}
                    className="text-gray-400 hover:text-red-700"
                    title="Delete this report"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {saved.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">
                  No saved reports. Build one below and save it.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* The builder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-900">Build a report</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* 1. Source */}
          <div>
            <Step n={1} title="What are you reporting on" />
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOURCES).map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => changeSource(key)}
                  aria-pressed={draft.source === key}
                  title={s.hint}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                    draft.source === key
                      ? 'bg-[#2ca01c] text-white border-[#2ca01c]'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Granularity -- only where it changes the answer */}
          {source.rows.length > 1 && (
            <div>
              <Step n={2} title="One row per" />
              <div className="flex flex-wrap gap-2">
                {source.rows.map((g) => (
                  <button
                    key={g}
                    onClick={() => patch({ granularity: g })}
                    aria-pressed={draft.granularity === g}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${
                      draft.granularity === g
                        ? 'bg-[#2ca01c] text-white border-[#2ca01c]'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {source.granularity[g]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 3. Columns */}
          <div>
            <Step n={3} title="Columns" />
            <div className="flex flex-wrap gap-1.5">
              {source.fields.map((f) => {
                const on = draft.fields.includes(f.key);
                return (
                  <button
                    key={f.key}
                    onClick={() => toggleField(f.key)}
                    aria-pressed={on}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded border ${
                      on ? 'bg-blue-50 border-blue-300 text-blue-800' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {on && <Check size={10} className="inline mr-1" />}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Group by */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Step n={4} title="Group by" />
              <div className="relative">
                <select
                  value={draft.groupBy || ''}
                  onChange={(e) => patch({ groupBy: e.target.value || null })}
                  aria-label="Group by"
                  className="w-full pl-3 pr-8 py-2 text-xs border border-gray-300 rounded-lg bg-white appearance-none"
                >
                  <option value="">No grouping — one row per record</option>
                  {source.fields.filter((f) => f.groupable).map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* 5. Filter */}
            <div>
              <Step n={5} title="Filter" />
              <div className="flex items-center gap-2">
                <select
                  value={draft.filter?.field || ''}
                  onChange={(e) => patch({ filter: e.target.value ? { field: e.target.value, op: draft.filter?.op || 'is', value: draft.filter?.value || '' } : null })}
                  aria-label="Filter on"
                  className="flex-1 pl-3 pr-8 py-2 text-xs border border-gray-300 rounded-lg bg-white appearance-none"
                >
                  <option value="">No filter</option>
                  {source.fields.filter((f) => f.type === 'text').map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
                <select
                  value={draft.filter?.op || 'is'}
                  onChange={(e) => patch({ filter: { ...draft.filter, op: e.target.value } })}
                  disabled={!draft.filter}
                  aria-label="Filter condition"
                  className="px-2 py-2 text-xs border border-gray-300 rounded-lg bg-white disabled:opacity-40"
                >
                  <option value="is">is</option>
                  <option value="not">is not</option>
                  <option value="contains">contains</option>
                </select>
                <input
                  value={draft.filter?.value || ''}
                  onChange={(e) => patch({ filter: { ...draft.filter, value: e.target.value } })}
                  disabled={!draft.filter}
                  placeholder="value"
                  aria-label="Filter value"
                  className="w-28 px-3 py-2 text-xs border border-gray-300 rounded-lg disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The result */}
      <ResultTable result={result} ranFrom={ranFrom} />

      {showSave && (
        <SaveDialog
          initialName={draft.name}
          onClose={() => setShowSave(false)}
          onSave={(name) => {
            dispatch({ type: 'SAVE_CUSTOM_REPORT', payload: { ...draft, name, id: draft.id || null } });
            setShowSave(false);
          }}
        />
      )}
    </div>
  );
}

function Step({ n, title }) {
  return (
    <p className="text-[11px] font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 text-[10px] flex items-center justify-center">{n}</span>
      {title}
    </p>
  );
}

/**
 * The report output.
 *
 * `result` is null until the report has been run, and the panel says so rather
 * than showing an empty table -- an empty table reads as "your business has no
 * sales", which is a very different and very wrong claim.
 */
function ResultTable({ result, ranFrom }) {
  if (!result) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
        <p className="text-sm font-semibold text-gray-900">No report run yet</p>
        <p className="text-xs text-gray-500 mt-1">
          Choose your columns above and press <span className="font-semibold">Run report</span>. The table
          will be built from your transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900 truncate">{result.title}</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            {result.rowCount} row{result.rowCount === 1 ? '' : 's'} from{' '}
            {SOURCES[ranFrom?.source]?.label || ranFrom?.source}
            {ranFrom?.granularity && ranFrom?.granularity !== 'document' && ' · one row per line'}
            {ranFrom?.filter?.value && ` · ${ranFrom.filter.field} ${ranFrom.filter.op} “${ranFrom.filter.value}”`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-500 shrink-0">
          <Printer size={15} className="hover:text-gray-900 cursor-pointer" />
          <Download size={15} className="hover:text-gray-900 cursor-pointer" />
        </div>
      </div>

      {result.columns.length === 0 || result.rows.length === 0 ? (
        <p className="p-10 text-center text-sm text-gray-500">
          {result.rowCount === 0
            ? 'Nothing matched. These transactions have not been recorded yet — raise one and run the report again.'
            : 'No columns selected.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                {result.columns.map((c) => (
                  <th key={c.key} className={`p-3 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.header}
                  </th>
                ))}
                <th className="p-3 text-right text-gray-500 font-normal">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  {result.columns.map((c) => (
                    <td key={c.key} className={`p-3 tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left text-gray-700'}`}>
                      {renderCell(row[c.key], c)}
                    </td>
                  ))}
                  <td className="p-3 text-right tabular-nums text-gray-400">{row.__count ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            {result.totalRow && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                  {result.columns.map((c, i) => (
                    <td key={c.key} className={`p-3 tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {i === 0
                        ? result.totalRow.label
                        : c.type === 'money'
                          ? formatMoney(result.totalRow[c.key] ?? 0)
                          : result.totalRow[c.key] ?? '—'}
                    </td>
                  ))}
                  <td className="p-3 text-right tabular-nums">{result.totalRow.__count ?? '—'}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 text-[11px] text-gray-600">
        {result.note}
      </p>
    </div>
  );
}

/** Money gets the rupee formatter; counts stay integers. */
function renderCell(value, col) {
  if (value === null || value === undefined || value === '') return '—';
  if (col.type === 'money') return formatMoney(value) ?? '—';
  if (col.type === 'number') return String(value);
  return String(value);
}

function SaveDialog({ initialName, onClose, onSave }) {
  const [name, setName] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const error = touched && !name.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">Save this report</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">
          <label className="block">
            <span className="block text-xs font-medium text-gray-700 mb-1">Report name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className={`w-full px-3 py-2 border rounded-lg text-sm ${error ? 'border-red-400' : 'border-gray-300'}`}
            />
            {error && <span className="block text-[11px] text-red-600 mt-1">A name is required.</span>}
          </label>
          <p className="text-[11px] text-gray-500 mt-3">
            Only the recipe is saved — which source, columns, grouping and filter. The table is rebuilt
            from your transactions every time it is opened, so it never goes stale.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => {
              setTouched(true);
              if (!name.trim()) return;
              onSave(name.trim());
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            <Check size={14} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- The engine -- */

/**
 * Flatten one source into flat rows.
 *
 * Every row is a plain object keyed by field, so the grouping and totalling
 * below never has to know what an invoice is. Line rows carry `__doc` so two
 * lines of the same invoice can be counted as one document rather than two
 * sales.
 */
function sourceRows(source, granularity, state) {
  const acct = (id) => accountName(state.accounts, id);
  const person = (list, id) => list.find((p) => p.id === id)?.displayName || '—';
  const rows = [];

  if (source === 'invoices') {
    for (const inv of state.invoices) {
      const totals = invoiceTotals(inv, state);
      const base = {
        date: inv.date, no: inv.no, customer: person(state.customers, inv.customerId),
        dueDate: inv.dueDate, status: inv.status, terms: inv.terms,
        tax: totals.tax, total: totals.total, __id: inv.id, __doc: inv.no,
      };
      if (granularity === 'line') {
        inv.lines.forEach((l, i) => {
          rows.push({
            ...base,
            __id: `${inv.id}-${i}`,
            product: l.desc || state.products.find((p) => p.id === l.productId)?.name || '—',
            qty: Number(l.qty) || 0,
            rate: Number(l.rate) || 0,
            total: (Number(l.qty) || 0) * (Number(l.rate) || 0),
            tax: null,
          });
        });
      } else {
        rows.push(base);
      }
    }
  }

  if (source === 'estimates') {
    for (const est of state.estimates) {
      const net = (est.lines || []).reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
      const base = {
        date: est.date, no: est.no, customer: person(state.customers, est.customerId),
        expiry: est.expiry, status: est.status, total: net, __id: est.id, __doc: est.no,
      };
      if (granularity === 'line') {
        est.lines.forEach((l, i) => {
          rows.push({
            ...base,
            __id: `${est.id}-${i}`,
            product: l.desc || state.products.find((p) => p.id === l.productId)?.name || '—',
            qty: Number(l.qty) || 0,
            rate: Number(l.rate) || 0,
            total: (Number(l.qty) || 0) * (Number(l.rate) || 0),
          });
        });
      } else {
        rows.push(base);
      }
    }
  }

  if (source === 'bills') {
    for (const bill of state.bills) {
      const total = (bill.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0);
      const base = {
        date: bill.date, no: bill.no, vendor: person(state.vendors, bill.vendorId),
        dueDate: bill.dueDate, status: bill.status, total, __id: bill.id, __doc: bill.no,
      };
      if (granularity === 'line') {
        bill.lines.forEach((l, i) => {
          rows.push({
            ...base,
            __id: `${bill.id}-${i}`,
            account: acct(l.accountId),
            description: l.desc,
            total: Number(l.amount) || 0,
          });
        });
      } else {
        rows.push(base);
      }
    }
  }

  if (source === 'expenses') {
    for (const exp of state.expenses) {
      exp.lines.forEach((l, i) => {
        rows.push({
          date: exp.date, payee: exp.payeeName || '—', account: acct(l.accountId),
          description: l.desc, method: exp.method, amount: Number(l.amount) || 0,
          __id: `${exp.id}-${i}`, __doc: `EXP-${exp.id}`,
        });
      });
    }
  }

  if (source === 'payments') {
    for (const p of state.payments) {
      rows.push({
        date: p.date, customer: person(state.customers, p.customerId), method: p.method,
        appliedTo: (p.appliedTo || []).join(', '), amount: Number(p.amount) || 0,
        __id: p.id, __doc: `PMT-${p.id}`,
      });
    }
  }

  return rows;
}

/** Does this row survive the filter? Mirrors the three operators the UI offers. */
function passes(row, filter) {
  if (!filter || !filter.field) return true;
  const value = row[filter.field];
  const target = String(filter.value ?? '');
  if (value === null || value === undefined) return false;
  const text = String(value);
  if (filter.op === 'not') return text.toLowerCase() !== target.toLowerCase();
  if (filter.op === 'contains') return text.toLowerCase().includes(target.toLowerCase());
  return text.toLowerCase() === target.toLowerCase();
}

/**
 * Run a definition against the store and return columns and rows.
 *
 * With a `groupBy`, money and count columns are aggregated per group and the
 * first column is the group itself. Without one, every row is a record. Either
 * way the figures are summed from the transactions in front of us -- nothing is
 * read from a precomputed total.
 */
function runReport(definition, state) {
  const spec = SOURCES[definition.source];
  const columns = (spec?.fields || []).filter((f) => (definition.fields || []).includes(f.key));

  const flat = sourceRows(definition.source, definition.granularity || 'document', state)
    .filter((r) => passes(r, definition.filter));

  const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

  if (!definition.groupBy) {
    const totalRow = { __count: new Set(flat.map((r) => r.__doc)).size };
    for (const c of columns) {
      if (c.type === 'money') totalRow[c.key] = round2(flat.reduce((s, r) => s + (Number(r[c.key]) || 0), 0));
    }
    return {
      title: definition.name || 'Custom report',
      columns: columns.map((c) => ({ key: c.key, header: c.label, type: c.type, align: c.type === 'money' || c.type === 'number' ? 'right' : 'left' })),
      rows: flat.map((r) => ({ ...r, __count: 1 })),
      totalRow,
      rowCount: flat.length,
      note: flat.length === 0
        ? 'No transactions matched. This is what the books contain, not what they should contain.'
        : `${flat.length} record${flat.length === 1 ? '' : 's'} across ${new Set(flat.map((r) => r.__doc)).size} document${new Set(flat.map((r) => r.__doc)).size === 1 ? '' : 's'}. Totals are summed from these rows.`,
    };
  }

  const groups = new Map();
  for (const row of flat) {
    const key = row[definition.groupBy] ?? '—';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const entries = Array.from(groups.entries()).sort((a, b) => {
    const aSum = a[1].reduce((s, r) => s + (Number(r.total ?? r.amount) || 0), 0);
    const bSum = b[1].reduce((s, r) => s + (Number(r.total ?? r.amount) || 0), 0);
    return bSum - aSum;
  });

  const groupColumn = { key: definition.groupBy, header: spec.fields.find((f) => f.key === definition.groupBy)?.label || 'Group', type: 'text', align: 'left' };
  const rest = columns.filter((c) => c.key !== definition.groupBy);

  const rows = entries.map(([key, members]) => {
    const out = { [definition.groupBy]: key, __count: new Set(members.map((r) => r.__doc)).size };
    for (const c of rest) {
      if (c.type === 'money') out[c.key] = round2(members.reduce((s, r) => s + (Number(r[c.key]) || 0), 0));
      else if (c.type === 'number') out[c.key] = round2(members.reduce((s, r) => s + (Number(r[c.key]) || 0), 0));
      else out[c.key] = null;
    }
    return out;
  });

  const totalRow = { [definition.groupBy]: 'Total', __count: new Set(flat.map((r) => r.__doc)).size };
  for (const c of rest) {
    if (c.type === 'money' || c.type === 'number') {
      totalRow[c.key] = round2(rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0));
    }
  }

  return {
    title: definition.name || 'Custom report',
    columns: [groupColumn, ...rest.map((c) => ({ key: c.key, header: c.label, type: c.type, align: c.type === 'money' || c.type === 'number' ? 'right' : 'left' }))],
    rows,
    totalRow,
    rowCount: rows.length,
    note: `${rows.length} group${rows.length === 1 ? '' : 's'} from ${flat.length} record${flat.length === 1 ? '' : 's'}. Each figure is summed from the rows behind it.`,
  };
}
