import React, { useMemo, useState } from 'react';
import { Search, X, Check, Printer, Share2, Settings, Clock } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Time.
 * ============================================================================
 * The stub this replaces had a filter row and an empty-state illustration, and
 * nothing else. It could not record a minute of work, so "time" on this screen
 * was a word rather than a feature.
 *
 * Every figure on this screen is computed from the store, never typed in:
 *
 *   duration   hours + minutes/60               -- the two the user entered
 *   amount     duration x rate                  -- never stored, so a corrected
 *                                                 duration cannot leave a stale
 *                                                 rupee figure behind
 *   totals     summed over whatever rows the filters left visible
 *
 * That last one matters more than it looks. A total that ignores the filter bar
 * is a lie the moment anyone uses it, and this screen exists so that the number
 * a person reads is the number their own filter produced.
 *
 * Grouping (day / week / month / person / project) inserts a subtotal row per
 * group rather than re-sorting into a different screen, so the detail stays
 * reachable and each group's hours can be checked by hand.
 *
 * Handles the empty cases honestly: with no team members there is no person to
 * record time against, and the screen says so instead of offering a form that
 * cannot be saved.
 */

/** Group-by options. `label` is what the picker shows, `value` what we store. */
const GROUPS = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'person', label: 'Person' },
  { value: 'project', label: 'Project' },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_BADGE = {
  Unbilled: 'bg-orange-50 text-orange-800',
  Billed: 'bg-green-50 text-green-700',
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Duration in hours. Minutes are part of an hour, not a separate quantity. */
function hoursOf(entry) {
  return (Number(entry.hours) || 0) + (Number(entry.minutes) || 0) / 60;
}

/** The amount a row is worth. Never read from the entry -- always this. */
function amountOf(entry) {
  return round2(hoursOf(entry) * (Number(entry.rate) || 0));
}

/** `2025-10-14` -> `14 Oct 2025`. Dates are stored as plain strings. */
function prettyDate(iso) {
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** The Monday of the week containing `iso`, for weekly grouping. */
function weekStart(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const shift = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - shift);
  return d.toISOString().slice(0, 10);
}

const personName = (u) => (u ? `${u.first} ${u.last}`.trim() : 'Unassigned');

export default function TimeView({ onNavigate }) {
  const { state, dispatch } = useStore();

  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState('month');
  const [personFilter, setPersonFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [showNew, setShowNew] = useState(false);

  // A company with no team has nobody to record time against. The screen has to
  // say that rather than present a picker full of nobody.
  // people is memoised on the collection itself, not on a ?? [] default.
  // A fresh empty array each render is a new reference every time, so anything
  // depending on it recomputes on every render -- which is the memo doing
  // nothing while pretending otherwise.
  const people = useMemo(() => state.users ?? [], [state.users]);
  const hasPeople = people.length > 0;

  const nameOf = useMemo(() => {
    const byId = new Map(people.map((u) => [u.id, personName(u)]));
    return (id) => byId.get(id) ?? 'Unassigned';
  }, [people]);

  const customerOf = useMemo(() => {
    const byId = new Map((state.customers ?? []).map((c) => [c.id, c.displayName]));
    return (id) => (id == null ? null : byId.get(id) ?? 'Unknown customer');
  }, [state.customers]);

  /** Enrich once, then every view below reads the same computed fields. */
  const rows = useMemo(() => {
    return (state.timeEntries ?? [])
      .map((t) => ({
        ...t,
        hours: hoursOf(t),
        amount: amountOf(t),
        person: nameOf(t.userId),
        customer: customerOf(t.customerId),
      }))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [state.timeEntries, nameOf, customerOf]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (personFilter !== 'all' && String(r.userId) !== personFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.description, r.person, r.customer, r.project]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, personFilter, statusFilter]);

  /** Group rows under a label, preserving the newest-first order within a group. */
  const groups = useMemo(() => {
    const keyFor = (r) => {
      switch (groupBy) {
        case 'day': return r.date;
        case 'week': return weekStart(r.date);
        case 'month': return r.date.slice(0, 7);
        case 'person': return r.person;
        case 'project': return r.project || 'No project';
        default: return 'All time';
      }
    };
    const map = new Map();
    for (const r of filtered) {
      const key = keyFor(r);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: groupBy === 'month' ? monthLabel(key) : groupBy === 'day' || groupBy === 'week' ? prettyDate(key) : key,
      items,
      hours: round2(items.reduce((s, r) => s + r.hours, 0)),
      amount: round2(items.reduce((s, r) => s + r.amount, 0)),
    }));
  }, [filtered, groupBy]);

  const totals = useMemo(() => {
    const sum = (list) => round2(list.reduce((s, r) => s + r.hours, 0));
    const money = (list) => round2(list.reduce((s, r) => s + r.amount, 0));
    const unbilled = filtered.filter((r) => r.status === 'Unbilled');
    return {
      hours: sum(filtered),
      amount: money(filtered),
      unbilledHours: sum(unbilled),
      unbilledAmount: money(unbilled),
      unbilledCount: unbilled.length,
    };
  }, [filtered]);

  const selected = rows.find((r) => r.id === selectedId) || null;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
            <img src="/app-icons/time.png" alt="Time" className="w-full h-full object-contain block" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Time</h1>
            <p className="text-xs text-gray-500 mt-0.5">Time entries, hourly tracking and billing status</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNew(true)}
            disabled={!hasPeople}
            title={hasPeople ? undefined : 'Add a team member before recording time'}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            New time entry
          </button>
        </div>
      </div>

      {/* Filter bar -- every filter narrows the totals below it, together. */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Group by</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium"
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Person</label>
          <select
            value={personFilter}
            onChange={(e) => setPersonFilter(e.target.value)}
            disabled={!hasPeople}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium disabled:opacity-50"
          >
            <option value="all">All people</option>
            {people.map((u) => (
              <option key={u.id} value={String(u.id)}>{personName(u)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium"
          >
            <option value="all">All</option>
            <option value="Unbilled">Unbilled</option>
            <option value="Billed">Billed</option>
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Description, person or project"
              className="w-full text-xs pl-3 pr-8 py-1.5 border border-gray-300 rounded bg-white"
            />
            <Search size={14} className="absolute right-2.5 top-2 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center gap-3 text-gray-600 pb-1.5">
          <Printer size={15} className="cursor-pointer hover:text-gray-900" />
          <Share2 size={15} className="cursor-pointer hover:text-gray-900" />
          <Settings size={15} className="cursor-pointer hover:text-gray-900" />
        </div>
      </div>

      {/* Unbilled total. A plain sentence rather than a stat card: the point is
          "this much work is sitting unbilled", not a second dashboard. */}
      <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-xs flex flex-wrap items-center gap-x-6 gap-y-1">
        <p className="text-xs text-gray-600">
          <span className="font-semibold text-gray-900">{formatMoney(totals.unbilledAmount)}</span>
          {' '}unbilled across {totals.unbilledCount}{' '}
          {totals.unbilledCount === 1 ? 'entry' : 'entries'}
          {' '}({totals.unbilledHours.toFixed(2)} h)
        </p>
        <p className="text-xs text-gray-500">
          Shown below: {formatMoney(totals.amount)} over {totals.hours.toFixed(2)} h in {filtered.length}{' '}
          {filtered.length === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Person</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Description</th>
                <th className="p-3 text-right">Duration</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groups.map((g) => (
                <React.Fragment key={g.key}>
                  <tr className="bg-gray-50/60">
                    <td colSpan={4} className="p-2 pl-3 font-semibold text-gray-700">{g.label}</td>
                    <td className="p-2 text-right font-semibold text-gray-700 tabular-nums">{g.hours.toFixed(2)} h</td>
                    <td className="p-2" />
                    <td className="p-2 text-right font-semibold text-gray-700 tabular-nums">{formatMoney(g.amount)}</td>
                    <td className="p-2" />
                  </tr>
                  {g.items.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(r.id)}
                      className="hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="p-3 whitespace-nowrap">{prettyDate(r.date)}</td>
                      <td className="p-3">{r.person}</td>
                      <td className="p-3 text-gray-600">{r.customer ?? '—'}</td>
                      <td className="p-3 text-gray-700">{r.description}</td>
                      <td className="p-3 text-right tabular-nums">{r.hours.toFixed(2)} h</td>
                      <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(r.rate)}</td>
                      <td className="p-3 text-right font-medium tabular-nums">{formatMoney(r.amount)}</td>
                      <td className="p-3 text-right">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    {rows.length === 0 ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-14 h-14 rounded-full border-4 border-teal-500/70 flex items-center justify-center text-teal-600 bg-teal-50">
                          <Clock size={26} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">No time entries yet</h3>
                        <p className="text-xs text-gray-500 max-w-xs">
                          {hasPeople
                            ? 'Record the first one and it will appear here, totalled by the group above.'
                            : 'There are no team members yet, so there is nobody to record time against. Add a team member first.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No time entries match these filters.
                      </p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer total -- computed from the visible rows, never a stored number. */}
        {filtered.length > 0 && (
          <div className="border-t border-gray-200 bg-gray-50 px-3 py-2 flex justify-end gap-6 text-xs font-semibold text-gray-700">
            <span className="tabular-nums">{totals.hours.toFixed(2)} h</span>
            <span className="tabular-nums w-28 text-right">{formatMoney(totals.amount)}</span>
          </div>
        )}
      </div>

      {selected && (
        <EntryDrawer
          entry={selected}
          onClose={() => setSelectedId(null)}
          onDelete={() => {
            dispatch({ type: 'DELETE_TIME_ENTRY', payload: selected.id });
            setSelectedId(null);
          }}
          onNavigate={onNavigate}
        />
      )}

      {showNew && hasPeople && <NewTimeEntryModal onClose={() => setShowNew(false)} onSaved={() => setShowNew(false)} />}
    </div>
  );
}

/** `2025-10` -> `October 2025`. */
function monthLabel(key) {
  const [y, m] = String(key).split('-');
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || !MONTHS[idx]) return key;
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${full[idx]} ${y}`;
}

function EntryDrawer({ entry, onClose, onDelete, onNavigate }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{entry.description}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{prettyDate(entry.date)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <dl className="space-y-3 text-sm">
            {[
              ['Person', entry.person],
              ['Customer', entry.customer ?? '—'],
              ['Project', entry.project || '—'],
              ['Duration', `${entry.hours.toFixed(2)} hours`],
              ['Billable rate', entry.billable ? formatMoney(entry.rate) : 'Not billable'],
              ['Status', entry.status],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="col-span-2 text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">{formatMoney(entry.amount)}</span>
          </div>

          <p className="text-[11px] text-gray-500">
            Computed as {entry.hours.toFixed(2)} h x {formatMoney(entry.rate)}. It is not stored on the entry,
            so correcting the duration corrects this figure.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onDelete}
            className="px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-lg"
          >
            Delete
          </button>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
              Close
            </button>
            {entry.status === 'Unbilled' && (
              <button
                onClick={() => { onClose(); onNavigate?.('sales_transactions'); }}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
              >
                Bill this time
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const BLANK = {
  date: new Date().toISOString().slice(0, 10),
  userId: '',
  customerId: '',
  project: '',
  description: '',
  hours: '1',
  minutes: '0',
  rate: '0',
  billable: true,
};

function NewTimeEntryModal({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState('');

  const people = state.users ?? [];
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // The amount preview is computed as the user types, from the same rule the
  // table uses. If it ever disagreed with the saved row the form would be lying.
  const preview = round2(
    ((Number(form.hours) || 0) + (Number(form.minutes) || 0) / 60) * (Number(form.rate) || 0)
  );

  const save = () => {
    if (!form.description.trim()) return setError('Describe the work done.');
    if (!form.userId) return setError('Choose who did the work.');
    if ((Number(form.hours) || 0) === 0 && (Number(form.minutes) || 0) === 0) {
      return setError('Enter how long it took.');
    }

    const billable = form.billable;
    dispatch({
      type: 'ADD_TIME_ENTRY',
      payload: {
        id: Date.now(),
        date: form.date,
        userId: Number(form.userId),
        customerId: form.customerId ? Number(form.customerId) : null,
        project: form.project.trim(),
        description: form.description.trim(),
        hours: Number(form.hours) || 0,
        minutes: Number(form.minutes) || 0,
        rate: billable ? Number(form.rate) || 0 : 0,
        billable,
        status: 'Unbilled',
        invoiceId: null,
      },
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">New time entry</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={set('date')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Person</label>
              <select value={form.userId} onChange={set('userId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select a person</option>
                {people.map((u) => (
                  <option key={u.id} value={u.id}>{personName(u)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Customer</label>
            <select value={form.customerId} onChange={set('customerId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">No customer</option>
              {(state.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Project (optional)</label>
            <input
              type="text"
              value={form.project}
              onChange={set('project')}
              placeholder="e.g. Cool Cars fountain"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input
              type="text"
              value={form.description}
              onChange={set('description')}
              placeholder="What was done"
              className={`w-full px-3 py-2 border rounded-lg text-sm ${error && !form.description.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Hours</label>
              <input
                type="number" min="0" step="0.25"
                value={form.hours}
                onChange={set('hours')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Minutes</label>
              <input
                type="number" min="0" max="59" step="5"
                value={form.minutes}
                onChange={set('minutes')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Rate per hour</label>
              <input
                type="number" min="0" step="1"
                value={form.rate}
                onChange={set('rate')}
                disabled={!form.billable}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.billable}
              onChange={(e) => setForm((f) => ({ ...f, billable: e.target.checked }))}
              className="rounded text-[#2ca01c]"
            />
            Billable
          </label>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Amount</span>
            <span className="text-base font-bold text-gray-900 tabular-nums">{formatMoney(preview)}</span>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-2"
          >
            <Check size={16} />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}