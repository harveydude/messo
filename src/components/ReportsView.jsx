import React, { useState, useMemo } from 'react';
import { Star, MoreVertical, ChevronDown, ChevronRight, FileText, Search, Printer, X } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';
import { REPORTS, REPORT_NAMES, runReport } from '../reports';

/**
 * The Reports screen.
 *
 * It used to list thirty-one report names and produce three. The other
 * twenty-eight were text with a click handler that did nothing -- a menu that
 * spends your trust on labels and then answers none of them.
 *
 * Every name now maps to a function over the store in `src/reports.js`, and the
 * reader below renders any of them from one shape: columns and rows. Adding a
 * report means adding a function, not a screen.
 *
 * A name with no function still renders, but it says plainly that it has no
 * definition rather than pretending.
 */
export default function ReportsView({ onNavigate }) {
  const { state } = useStore();
  const ledger = useLedger();

  const [openGroups, setOpenGroups] = useState({ 'Business overview': true, 'Who owes you': true });
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('messo_favorite_reports') || '["Balance Sheet","Profit and Loss","Open Invoices"]');
    } catch {
      return ['Balance Sheet', 'Profit and Loss', 'Open Invoices'];
    }
  });

  // The report engine reads the ledger off the state so that it stays pure and
  // every report sees the same derived figures as every screen.
  const ledgerState = useMemo(() => ({ ...state, __ledger: ledger }), [state, ledger]);

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const names = q ? REPORT_NAMES.filter((n) => n.toLowerCase().includes(q)) : REPORT_NAMES;
    const out = {};
    for (const name of names) {
      const group = REPORTS[name].group;
      (out[group] ||= []).push(name);
    }
    return out;
  }, [search]);

  const result = useMemo(
    () => (selected ? runReport(selected, ledgerState) : null),
    [selected, ledgerState]
  );

  const toggleFavorite = (name) => {
    const next = favorites.includes(name)
      ? favorites.filter((n) => n !== name)
      : [...favorites, name];
    setFavorites(next);
    try {
      localStorage.setItem('messo_favorite_reports', JSON.stringify(next));
    } catch { /* storage full or blocked: favourites are a convenience, not data */ }
  };

  const favoriteRows = favorites.filter((n) => REPORT_NAMES.includes(n));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {REPORT_NAMES.length} reports. Every figure comes from your transactions.
          </p>
        </div>
        <button
          onClick={() => onNavigate?.('custom_reports')}
          className="text-xs font-semibold text-[#0077c5] hover:underline"
        >
          Custom reports
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports"
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
          />
        </div>
        <Printer size={15} className="text-gray-500 hover:text-gray-900 cursor-pointer" />
      </div>

      {/* Reader. Replaces the list while a report is open, the way a real one does. */}
      {selected && (
        <ReportReader
          name={selected}
          result={result}
          favorite={favorites.includes(selected)}
          onToggleFavorite={() => toggleFavorite(selected)}
          onClose={() => setSelected(null)}
        />
      )}

      {!selected && (
        <>
          {favoriteRows.length > 0 && (
            <Group
              title="Favorites"
              open={openGroups.Favorites ?? true}
              onToggle={() => setOpenGroups((g) => ({ ...g, Favorites: !(g.Favorites ?? true) }))}
            >
              {favoriteRows.map((name) => (
                <ReportRow
                  key={name}
                  name={name}
                  favorite
                  onOpen={() => setSelected(name)}
                  onToggleFavorite={() => toggleFavorite(name)}
                />
              ))}
            </Group>
          )}

          {Object.entries(grouped).map(([group, names]) => (
            <Group
              key={group}
              title={group}
              open={openGroups[group] ?? true}
              onToggle={() => setOpenGroups((g) => ({ ...g, [group]: !(g[group] ?? true) }))}
            >
              {names.map((name) => (
                <ReportRow
                  key={name}
                  name={name}
                  favorite={favorites.includes(name)}
                  onOpen={() => setSelected(name)}
                  onToggleFavorite={() => toggleFavorite(name)}
                />
              ))}
            </Group>
          ))}

          {REPORT_NAMES.length === 0 && (
            <p className="text-sm text-gray-500 py-10 text-center">No reports match "{search}".</p>
          )}
        </>
      )}
    </div>
  );
}

/** One collapsible section. */
function Group({ title, open, onToggle, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center space-x-2 text-sm font-bold text-gray-900 bg-gray-50/70 border-b border-gray-200"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span>{title}</span>
        <span className="text-xs font-normal text-gray-500 ml-1">
          {Array.isArray(children) ? children.length : 1} report{Array.isArray(children) && children.length === 1 ? '' : 's'}
        </span>
      </button>
      {open && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1.5">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * One report name. It is a link, not a button that may do nothing -- every name
 * here has a function behind it, and clicking always opens a report.
 */
function ReportRow({ name, onOpen, onToggleFavorite, favorite }) {
  return (
    <div className="flex items-center justify-between p-1.5 hover:bg-gray-50 rounded transition group">
      <button
        onClick={onOpen}
        className="flex items-center space-x-2 text-xs text-[#0077c5] font-semibold hover:underline text-left min-w-0"
      >
        <FileText size={14} className="text-[#0077c5] shrink-0" />
        <span className="truncate">{name}</span>
      </button>
      <div className="flex items-center space-x-2 text-gray-300 shrink-0">
        <button
          onClick={onToggleFavorite}
          title={favorite ? 'Remove from favorites' : 'Add to favorites'}
          className="cursor-pointer"
        >
          <Star
            size={13}
            className={favorite ? 'fill-green-600 text-green-600' : 'hover:text-green-600'}
          />
        </button>
        <MoreVertical size={13} className="hover:text-gray-600 cursor-pointer" />
      </div>
    </div>
  );
}

/**
 * The report itself.
 *
 * Columns come from the report's own definition, so a report with three columns
 * gets three columns and one with six gets six. No card grid -- a report is a
 * table, and a table wrapped in rounded tiles stops reading as a table.
 */
function ReportReader({ name, result, favorite, onToggleFavorite, onClose }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50/70">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded" title="Back to reports">
            <X size={15} />
          </button>
          <h2 className="text-sm font-bold text-gray-900 truncate">{name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onToggleFavorite} className="cursor-pointer" title="Favorite">
            <Star size={14} className={favorite ? 'fill-green-600 text-green-600' : 'text-gray-400'} />
          </button>
          <Printer size={15} className="text-gray-500 hover:text-gray-900 cursor-pointer" />
        </div>
      </div>

      {!result ? (
        <p className="p-8 text-center text-sm text-gray-500">
          This report has no definition yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
              <tr>
                {result.columns.map((col) => (
                  <th key={col.key} className={`p-2.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => {
                if (row.section) {
                  return (
                    <tr key={i} className="bg-gray-50/50">
                      <td colSpan={result.columns.length} className={`px-2.5 py-1.5 font-bold text-gray-700 ${row.total ? 'border-t border-gray-300' : ''}`}>
                        {row.section}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={i} className={`hover:bg-gray-50 ${row.total ? 'font-bold bg-gray-50/60' : ''} ${row.warn ? 'text-red-700' : ''}`}>
                    {result.columns.map((col, ci) => (
                      <td
                        key={col.key}
                        className={`px-2.5 py-1.5 tabular-nums ${col.align === 'right' ? 'text-right' : 'text-left'} ${ci === 0 ? 'text-gray-800' : ''}`}
                      >
                        {formatCell(row[col.key], row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
              {result.rows.length === 0 && (
                <tr>
                  <td colSpan={result.columns.length} className="p-8 text-center text-gray-500">
                    Nothing to report yet. Record a transaction and this fills in.
                  </td>
                </tr>
              )}
            </tbody>
            {result.totalRow && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                  <td className="px-2.5 py-2" colSpan={result.columns.length - 1}>
                    {result.totalRow.label}
                  </td>
                  <td className="px-2.5 py-2 text-right tabular-nums">
                    {result.totalRow.hours
                      ? result.totalRow.value.toFixed(2)
                      : formatMoney(result.totalRow.value)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {result?.check && (
        <div className={`px-4 py-2.5 border-t text-sm font-medium ${
          result.check.balanced
            ? 'bg-green-50 text-green-800 border-green-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {result.check.message}
        </div>
      )}
      {result?.note && !result.check && (
        <p className="px-4 py-2.5 border-t border-gray-100 text-xs text-gray-600 bg-gray-50/60">
          {result.note}
        </p>
      )}
    </div>
  );
}

/**
 * A cell's formatting, decided by its value rather than its column.
 *
 * Counts stay integers, money gets the rupee formatter, and a per-row flag
 * wins over the column's alignment for anything categorical.
 */
function formatCell(value, row) {
  if (value === null || value === undefined || value === '—') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (row.count) return String(value);
  if (typeof value === 'number') {
    // A key that already holds a formatted string (a percentage, a share) is
    // not a number by the time it gets here.
    return formatMoney(value);
  }
  return String(value);
}