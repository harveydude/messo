import React, { useMemo, useState } from 'react';
import { Search, Printer, Settings, X, Check, UserPlus, Pencil, ShieldCheck, Clock, Mail, Phone, Briefcase, IndianRupee, Users } from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

/**
 * Team.
 *
 * The people who work in this business, what each of them is allowed to do, and
 * what they cost per hour.
 *
 * Two fields that were previously one: `role` is the job title and `access` is
 * the Meso permission level. Collapsing them was a real defect -- a
 * bookkeeper and an administrator are different things, and only one of them
 * decides what the person can see and change. The column is called ACCESS LEVEL
 * for that reason, and it is the one with consequences.
 *
 * WHAT IS NOT HERE, stated plainly because a missing number looks like a bug:
 * this screen does not show what anyone was paid. A user row has an hourly rate
 * and a job title; it does not have a payslip, and inferring one from an hourly
 * rate would be inventing a pay period, an hours-worked figure and a tax
 * deduction that nobody entered. Hours actually worked come from the Time
 * screen (`state.timeEntries`); pay actually disbursed comes from Payroll
 * (`state.payrollRuns`). Both are counted here so the gap is visible rather than
 * papered over.
 *
 * Every rupee figure on this screen is derived from those two lists.
 */

/** The Meso permission levels, and what each one actually permits. */
const ACCESS = {
  Admin: {
    pill: 'bg-[#EAF6EA] text-[#1B5E20]',
    note: 'Full access, including billing, banking and the chart of accounts.',
  },
  Standard: 'bg-[#EEF4FB] text-[#00508A]',
  TimeOnly: 'bg-[#F1F1F1] text-[#5F6368]',
};

const ACCESS_LEVELS = [
  { value: 'Admin', label: 'Admin — full access' },
  { value: 'Standard', label: 'Standard — no banking' },
  { value: 'TimeOnly', label: 'Time only — time entries only' },
];

const ROLES = [
  'Owner', 'Bookkeeper', 'Accountant', 'Estimator', 'Designer',
  'Field crew', 'Design assistant', 'Office manager', 'Sales',
];

const fullName = (u) => `${u.first || ''} ${u.last || ''}`.trim();
const initials = (u) => `${(u.first || '?')[0] || ''}${(u.last || '')[0] || ''}`.toUpperCase();

/** Hours and minutes on a time entry, as decimal hours. Derived, not stored. */
const decimalHours = (t) => (Number(t.hours) || 0) + (Number(t.minutes) || 0) / 60;

export default function TeamView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const [accessFilter, setAccessFilter] = useState('All');
  const [showInactive, setShowInactive] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [inviting, setInviting] = useState(false);

  /**
   * Each person with what they have actually done.
   *
   * Hours come from summing `state.timeEntries`, and pay comes from summing
   * `state.payrollRuns` that name them. Both are counted, neither is estimated,
   * and where neither exists the screen says so rather than printing a zero
   * that would read as "this person cost nothing".
   */
  const rows = useMemo(() => {
    const runsByUser = (userId) =>
      state.payrollRuns.filter((r) => r.payeeId === userId);

    return state.users.map((u) => {
      const entries = state.timeEntries.filter((t) => t.userId === u.id);
      const runs = runsByUser(u.id);
      const hours = entries.reduce((s, t) => s + decimalHours(t), 0);

      return {
        ...u,
        fullName: fullName(u),
        entries,
        runs,
        hours,
        unbilledHours: entries.filter((t) => t.status === 'Unbilled').reduce((s, t) => s + decimalHours(t), 0),
        // Net is gross minus tax, computed here rather than trusted from the row.
        payToDate: runs.reduce((s, r) => s + ((Number(r.gross) || 0) - (Number(r.taxes) || 0)), 0),
      };
    });
  }, [state.users, state.timeEntries, state.payrollRuns]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((u) => {
      const matchesSearch =
        !q ||
        [u.fullName, u.email, u.role, u.phone]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q));
      const matchesAccess = accessFilter === 'All' || u.access === accessFilter;
      const matchesActive = showInactive || u.active !== false;
      return matchesSearch && matchesAccess && matchesActive;
    });
  }, [rows, query, accessFilter, showInactive]);

  /** Headcount and cost, both counted off the rows on screen. */
  const totals = useMemo(
    () => ({
      active: filtered.filter((u) => u.active !== false).length,
      hourlyRates: filtered.filter((u) => (Number(u.rate) || 0) > 0).map((u) => Number(u.rate) || 0),
      payToDate: filtered.reduce((s, u) => s + u.payToDate, 0),
    }),
    [filtered]
  );

  /**
   * Nobody is paid hourly here, so an "average rate" would be a number about
   * nobody. Instead: how many people carry a rate at all, and whether any of
   * them is paid. Both are counts, and both are true statements.
   */
  const rateCoverage = `${totals.hourlyRates.length} of ${filtered.length} carry an hourly rate`;

  const selected = rows.find((u) => u.id === selectedId) || null;

  return (
    <div className="flex flex-col h-full w-full bg-white select-none overflow-y-auto">
      <div className="px-8 py-5 max-w-[1720px] w-full mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <img src="/app-icons/team.png" alt="Team" className="w-full h-full object-contain block" />
            </div>
            <div>
              <h1 className="text-[28px] font-bold text-[#393A3D] leading-tight">Team</h1>
              <button
                onClick={() => onNavigate?.('all_lists')}
                className="text-[14px] text-[#0077C5] hover:underline flex items-center font-medium mt-1 cursor-pointer"
              >
                &lt; All Lists
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setInviting(true)}
              className="h-[38px] px-5 rounded-[4px] border border-[#2CA01C] text-[#2CA01C] text-[14px] font-semibold hover:bg-[#F0FAF0] transition cursor-pointer"
            >
              Give access
            </button>
            <button
              onClick={() => setInviting(true)}
              className="h-[38px] px-6 rounded-[4px] bg-[#2CA01C] hover:bg-[#248817] text-white text-[14px] font-semibold transition cursor-pointer"
            >
              Add team member
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mt-5 mb-3">
          <div className="flex items-center space-x-2">
            <div className="relative w-[300px]">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search team members"
                className="w-full h-[38px] pl-9 pr-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] placeholder-[#8D9096] focus:outline-none focus:border-[#0077C5]"
              />
              <Search size={17} className="absolute left-3 top-[10px] text-[#6B6C72]" />
            </div>

            <select
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              className="h-[38px] px-3 rounded-[4px] border border-[#8D9096] bg-white text-[14px] text-[#393A3D] focus:outline-none focus:border-[#0077C5] cursor-pointer"
            >
              {['All', 'Admin', 'Standard', 'TimeOnly'].map((a) => (
                <option key={a} value={a}>{a === 'All' ? 'All access levels' : ACCESS[a]?.label ?? a}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-[13px] text-[#393A3D] cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C]"
              />
              Show inactive
            </label>
          </div>

          <div className="flex items-center space-x-3">
            <Printer size={18} className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer" />
            <Settings size={18} className="text-[#6B6C72] hover:text-[#393A3D] cursor-pointer" />
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#D4D7DC] rounded-[4px] overflow-hidden bg-white shadow-xs">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="h-[42px] border-b border-[#D4D7DC] text-[13px] font-semibold text-[#393A3D]">
                <th className="w-[44px] pl-3.5 pr-1">
                  <input type="checkbox" checked={filtered.length > 0} readOnly aria-label="Select all" className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C]" />
                </th>
                <th className="w-[230px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">NAME</th>
                <th className="w-[180px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">ROLE</th>
                <th className="w-[240px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">EMAIL</th>
                <th className="w-[160px] px-3 uppercase text-[12px] tracking-wider border-r border-[#E3E5E8]">ACCESS LEVEL</th>
                <th className="w-[130px] px-3 uppercase text-[12px] tracking-wider text-right border-r border-[#E3E5E8]">HOURLY RATE</th>
                <th className="w-[130px] px-3 uppercase text-[12px] tracking-wider text-right pr-4">ACTION</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedId(u.id)}
                  className="h-[59px] border-b border-[#E3E5E8] hover:bg-[#F7F8FA] transition cursor-pointer"
                >
                  <td className="pl-3.5 pr-1" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${u.fullName}`} className="w-[16px] h-[16px] rounded border-[#8D9096] accent-[#2CA01C] cursor-pointer" />
                  </td>
                  <td className="px-3 border-r border-[#E3E5E8]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-[30px] h-[30px] rounded-full bg-[#E0E3E8] text-[#393A3D] text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {initials(u)}
                      </span>
                      <div>
                        <p className="font-medium text-[#393A3D] leading-tight">{u.fullName}</p>
                        {u.active === false && (
                          <p className="text-[11px] text-[#8D9096] leading-tight">Inactive</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">{u.role || '—'}</td>
                  <td className="px-3 text-[#393A3D] border-r border-[#E3E5E8]">
                    <span className="hover:text-[#0077C5] hover:underline">{u.email || '—'}</span>
                  </td>
                  <td className="px-3 border-r border-[#E3E5E8]">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${ACCESS[u.access]?.pill ?? ACCESS.TimeOnly}`}>
                      {u.access || '—'}
                    </span>
                  </td>
                  <td className="px-3 text-right border-r border-[#E3E5E8] tabular-nums text-[#393A3D]">
                    {Number(u.rate) > 0 ? formatMoney(u.rate) : <span className="text-[#9AA0A6]">—</span>}
                  </td>
                  <td className="px-3 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setEditing(u)}
                      className="inline-flex items-center gap-1 text-[#0077C5] font-medium hover:underline cursor-pointer"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[14px] text-[#6B6C72]">
                    {query.trim() || accessFilter !== 'All'
                      ? `No team members match this filter. Clear it to see all ${rows.length}.`
                      : 'No one has been added to the team yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Honest footer. Counts and a derived total, and an explicit statement
            of what this screen does NOT know. */}
        <div className="mt-4 border border-[#E3E5E8] rounded-[4px] bg-[#F7F8FA] px-4 py-3 text-[13px] text-[#393A3D]">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <span className="flex items-center gap-1.5">
              <Users size={14} className="text-[#6B6C72]" />
              {totals.active} active of {filtered.length} shown
            </span>
            <span className="flex items-center gap-1.5">
              <IndianRupee size={14} className="text-[#6B6C72]" />
              {rateCoverage}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-[#6B6C72]" />
              {filtered.reduce((s, u) => s + u.unbilledHours, 0).toFixed(2)} unbilled hours
            </span>
            <span className="flex items-center gap-1.5">
              <Briefcase size={14} className="text-[#6B6C72]" />
              Paid to this team: <span className="font-semibold tabular-nums">{formatMoney(totals.payToDate)}</span>
            </span>
          </div>
          <p className="mt-2 text-[12px] text-[#6B6C72]">
            {totals.payToDate === 0
              ? 'No payroll run in the books names anyone on this list, so no pay figure can be shown. Payroll is where pay is recorded.'
              : 'Paid figures are taken from payroll runs that name these people. An hourly rate is a price per hour worked, not a record that hours were worked.'}
          </p>
        </div>
      </div>

      {selected && (
        <MemberDrawer
          member={selected}
          onClose={() => setSelectedId(null)}
          onEdit={() => { setEditing(selected); setSelectedId(null); }}
          onNavigate={onNavigate}
        />
      )}
      {editing && (
        <EditMemberModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          dispatch={dispatch}
        />
      )}
      {inviting && <InviteModal onClose={() => setInviting(false)} onSaved={() => setInviting(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Drawer -- */

function MemberDrawer({ member, onClose, onEdit, onNavigate }) {
  const tabs = [
    ['details', 'Details'],
    ['time', `Time (${member.entries.length})`],
    ['pay', `Pay (${member.runs.length})`],
  ];
  const [tab, setTab] = useState('details');

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="w-[42px] h-[42px] rounded-full bg-[#E0E3E8] text-[#393A3D] text-[14px] font-semibold flex items-center justify-center">
              {initials(member)}
            </span>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{member.fullName}</h2>
              <p className="text-xs text-gray-500 mt-0.5">{member.role || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 grid grid-cols-3 gap-3 bg-gray-50 border-b border-gray-200">
          <Figure label="Hours logged" value={`${member.hours.toFixed(2)} h`} />
          <Figure label="Unbilled" value={`${member.unbilledHours.toFixed(2)} h`} />
          <Figure label="Paid to date" value={formatMoney(member.payToDate)} />
        </div>

        <div className="flex gap-1 px-6 pt-3 border-b border-gray-200">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${
                tab === id ? 'border-[#2ca01c] text-[#2ca01c]' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'details' && (
            <div className="space-y-4">
              <dl className="space-y-3 text-sm">
                {[
                  [Briefcase, 'Job title', member.role],
                  [Mail, 'Email', member.email],
                  [Phone, 'Phone', member.phone],
                ].map(([Icon, label, value]) => (
                  <div key={label} className="grid grid-cols-3 gap-2">
                    <dt className="text-gray-500 flex items-center gap-1.5">
                      <Icon size={13} />
                      {label}
                    </dt>
                    <dd className="col-span-2 text-gray-900">{value || '—'}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">Access level</p>
                <div className="flex items-start gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                  <ShieldCheck size={16} className="text-[#2ca01c] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{member.access || '—'}</p>
                    <p className="text-[12px] text-gray-600 mt-0.5">
                      {ACCESS[member.access]?.note ?? 'Access level not recorded.'}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Hourly rate</p>
                <p className="text-sm text-gray-900 tabular-nums">
                  {Number(member.rate) > 0 ? formatMoney(member.rate) : 'No hourly rate recorded.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'time' && (
            <div className="space-y-2">
              {member.entries.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.description || t.project || 'Time entry'}</p>
                    <p className="text-[11px] text-gray-500">
                      {t.date} · {decimalHours(t).toFixed(2)} h{t.billable ? ' · billable' : ''}
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F1F1] text-[#5F6368]">
                    {t.status}
                  </span>
                </div>
              ))}
              {member.entries.length === 0 && (
                <p className="text-sm text-gray-500 py-6 text-center">No hours logged against this person.</p>
              )}
            </div>
          )}

          {tab === 'pay' && (
            <div className="space-y-2">
              {member.runs.map((r) => (
                <div key={r.id} className="p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{r.no}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EAF6EA] text-[#1B5E20]">
                      {r.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{r.period}</p>
                  {/* Net is gross less tax, computed. Never read off the row. */}
                  <p className="text-sm text-gray-700 mt-2 tabular-nums">
                    Gross {formatMoney(r.gross)} − tax {formatMoney(r.taxes)} ={' '}
                    <span className="font-semibold text-gray-900">
                      {formatMoney((Number(r.gross) || 0) - (Number(r.taxes) || 0))}
                    </span>
                  </p>
                </div>
              ))}
              {member.runs.length === 0 && (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500">No payroll run names this person.</p>
                  <p className="text-[12px] text-gray-400 mt-1">
                    Nothing has been paid here, which is different from being paid nothing.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
          <button onClick={onEdit} className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg">
            Edit
          </button>
          <button
            onClick={() => { onClose(); onNavigate?.('time_entries'); }}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
          >
            View time
          </button>
        </div>
      </div>
    </div>
  );
}

function Figure({ label, value, warn }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${warn ? 'text-[#B3261E]' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------- Edit member -- */

/**
 * Change someone's job title, hourly rate, access level or active status.
 *
 * Written through UPDATE_USER, which replaces the row and pushes an audit
 * entry. Nothing here is cosmetic: the rate is what a Time entry defaults to
 * and the access level is what the app actually enforces.
 */
function EditMemberModal({ member, onClose, onSaved, dispatch }) {
  const [form, setForm] = useState({
    role: member.role || '',
    access: member.access || 'Standard',
    rate: member.rate ?? 0,
    active: member.active !== false,
  });
  const [error, setError] = useState('');

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = () => {
    const rate = Number(form.rate);
    if (!Number.isFinite(rate) || rate < 0) return setError('The hourly rate must be zero or more.');

    dispatch({
      type: 'UPDATE_USER',
      payload: {
        ...member,
        role: form.role.trim() || member.role,
        access: form.access,
        rate,
        active: form.active,
        // `status` mirrors `active` because the older seed only carried one of
        // them. Keeping both in step means neither screen can show a person as
        // both active and inactive.
        status: form.active ? 'Active' : 'Inactive',
      },
    });
    onSaved();
  };

  return (
    <Shell title={`Edit ${member.fullName}`} onClose={onClose}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Job title</label>
          <input
            list="role-options"
            type="text"
            value={form.role}
            onChange={set('role')}
            data-autofocus=""
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
          />
          <datalist id="role-options">
            {ROLES.map((r) => <option key={r} value={r} />)}
          </datalist>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Access level</label>
          <select value={form.access} onChange={set('access')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {ACCESS_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">{ACCESS[form.access]?.note}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Hourly rate</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.rate}
            onChange={set('rate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
          />
          <p className="text-[11px] text-gray-500 mt-1">
            A rate per hour worked. It is not a salary and it does not mean hours were worked.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={set('active')}
            className="w-[16px] h-[16px] rounded border-gray-400 accent-[#2ca01c]"
          />
          Currently employed
        </label>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <Actions onClose={onClose} onSave={save} />
    </Shell>
  );
}

/* -------------------------------------------------------------- Give access -- */

/**
 * Give someone access to this company file.
 *
 * An invitation is a user row with an access level and nothing else -- there is
 * no mail server here, so nothing is sent and nothing is claimed to have been
 * sent. The person appears in the list immediately and can be edited or removed
 * the same way.
 */
function InviteModal({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const [form, setForm] = useState({ first: '', last: '', email: '', role: '', access: 'Standard', rate: 0 });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.first.trim() || !form.last.trim()) return setError('A first and last name are required.');

    const email = form.email.trim().toLowerCase();
    if (!email) return setError('An email address is required — it is how the person signs in.');
    if (state.users.some((u) => (u.email || '').toLowerCase() === email)) {
      return setError('Someone with that email address already has access.');
    }

    const rate = Number(form.rate);
    if (!Number.isFinite(rate) || rate < 0) return setError('The hourly rate must be zero or more.');

    dispatch({
      type: 'ADD_USER',
      payload: {
        id: Date.now(),
        first: form.first.trim(),
        last: form.last.trim(),
        email,
        phone: '',
        role: form.role.trim() || 'Team member',
        access: form.access,
        status: 'Active',
        rate,
        active: true,
      },
    });
    onSaved();
  };

  return (
    <Shell title="Give access" onClose={onClose}>
      <div className="p-6 space-y-4">
        <p className="text-[13px] text-gray-600">
          This adds the person to the team and records what they may do. No invitation
          email is sent — this build has no mail server, so nothing would arrive.
        </p>

        {[
          ['First name *', 'first', ''],
          ['Last name *', 'last', ''],
          ['Email *', 'email', 'name@company.com'],
          ['Job title', 'role', 'e.g. Bookkeeper'],
        ].map(([label, key, placeholder], i) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
            <input
              type="text"
              value={form[key]}
              onChange={set(key)}
              placeholder={placeholder}
              data-autofocus={i === 0 ? '' : undefined}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Access level</label>
          <select value={form.access} onChange={set('access')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {ACCESS_LEVELS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
          <p className="text-[11px] text-gray-500 mt-1">{ACCESS[form.access]?.note}</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Hourly rate</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.rate}
            onChange={set('rate')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <Actions onClose={onClose} onSave={save} icon={UserPlus} label="Give access" />
    </Shell>
  );
}

/* ------------------------------------------------------------------ Shell -- */

/** The one modal frame, so the two dialogs above cannot drift apart. */
function Shell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Actions({ onClose, onSave, icon: Icon = Check, label = 'Save' }) {
  return (
    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
      <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
        Cancel
      </button>
      <button onClick={onSave} className="px-5 py-2 text-sm font-semibold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-2">
        <Icon size={16} />
        {label}
      </button>
    </div>
  );
}