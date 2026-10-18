/**
 * Marketing spend.
 * ----------------------------------------------------------------------------
 * Campaigns, what was budgeted, what has been spent, and what is left.
 *
 * WHY ROI IS USUALLY "CANNOT BE CALCULATED"
 * ------------------------------------------
 * The tempting move is to divide campaign spend by total company revenue and
 * print a percentage. That number would be wrong in a way nobody can see. It
 * credits a campaign with every rupee the business ever took in, including the
 * work that came from a customer who had been buying for six years and had
 * never seen the advert. It would go up when the company does well for
 * unrelated reasons, and down when a campaign works.
 *
 * A return on marketing spend is only meaningful when you know which revenue the
 * campaign produced. Nothing in this app's books records that link: an invoice
 * names a customer, not the advert that first reached them. So `attributedRevenue`
 * is nullable on purpose, and this screen prints "cannot be calculated" for every
 * campaign that does not carry one. The one campaign that does carry a figure --
 * because someone recorded it deliberately -- gets a real ROI, and the screen
 * shows its arithmetic so it can be checked.
 *
 * A refusal to print a number is not a missing feature here. It is the feature.
 *
 * BUDGET VERSUS SPEND
 * -------------------
 * Spend to date is a fact the user recorded; the budget is the target they set;
 * the variance is the difference and the utilisation is the share consumed. All
 * three are computed here. None is stored, so correcting a spend figure updates
 * the variance, the channel table and the totals at once -- there is no second
 * copy of the arithmetic to fall out of step.
 *
 * THE CHANNEL TABLE IS A BREAKDOWN, NOT A PIE
 * -------------------------------------------
 * Channels are shown as rows of budget, spend and variance. A donut chart of
 * spend by channel would show the same four numbers with less precision and no
 * variance at all, and the variance is the part someone actually acts on.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  X,
  Trash2,
  Pencil,
  Search,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useStore } from '../store';
import { formatMoney } from '../money';

const CHANNELS = [
  'Google Ads',
  'Social media',
  'Print',
  'Email',
  'Referral',
  'Sponsorship',
  'Events',
  'Other',
];

const STATUSES = ['Planned', 'Active', 'Paused', 'Ended'];

const STATUS_TONE = {
  Planned: 'bg-gray-100 text-gray-700',
  Active: 'bg-green-50 text-green-700',
  Paused: 'bg-amber-50 text-amber-800',
  Ended: 'bg-blue-50 text-blue-700',
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const money = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export default function MarketingView({ onNavigate }) {
  const { state, dispatch } = useStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState(null);

  /**
   * Memoised rather than written inline.
   *
   * `state.marketing?.campaigns || []` evaluates to a NEW empty array on every
   * render whenever there are no campaigns, so a `useMemo` that depends on it
   * would have a dependency that changes identity each time and would recompute
   * on every keystroke anyway. Holding it in a memo keyed on the stored object
   * makes the dependency honest.
   */
  const campaigns = useMemo(() => state.marketing?.campaigns || [], [state.marketing]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns
      .map((c) => {
        const budget = money(c.budget);
        const spend = money(c.spendToDate);
        const attributed = c.attributedRevenue === null || c.attributedRevenue === undefined ? null : money(c.attributedRevenue);
        return {
          ...c,
          budget,
          spend,
          variance: round2(budget - spend),
          utilisation: budget > 0 ? spend / budget : null,
          overBudget: spend > budget,
          attributedRevenue: attributed,
          roi: attributed !== null && spend > 0 ? (attributed - spend) / spend : null,
        };
      })
      .filter((c) => {
        if (statusFilter !== 'All' && c.status !== statusFilter) return false;
        if (channelFilter !== 'All' && c.channel !== channelFilter) return false;
        if (!q) return true;
        return `${c.name} ${c.channel} ${c.status}`.toLowerCase().includes(q);
      })
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  }, [campaigns, search, statusFilter, channelFilter]);

  /** Budget and spend rolled up by channel, computed from the same rows. */
  const byChannel = useMemo(() => {
    const map = new Map();
    for (const c of campaigns) {
      const entry = map.get(c.channel) || { channel: c.channel, budget: 0, spend: 0, campaigns: 0, withAttribution: 0 };
      entry.budget = round2(entry.budget + money(c.budget));
      entry.spend = round2(entry.spend + money(c.spendToDate));
      entry.campaigns += 1;
      if (c.attributedRevenue !== null && c.attributedRevenue !== undefined) entry.withAttribution += 1;
      map.set(c.channel, entry);
    }
    return Array.from(map.values())
      .map((e) => ({ ...e, variance: round2(e.budget - e.spend), utilisation: e.budget > 0 ? e.spend / e.budget : null }))
      .sort((a, b) => b.spend - a.spend);
  }, [campaigns]);

  const totals = useMemo(() => {
    const budget = round2(campaigns.reduce((s, c) => s + money(c.budget), 0));
    const spend = round2(campaigns.reduce((s, c) => s + money(c.spendToDate), 0));
    const attributable = campaigns.reduce((s, c) => s + (c.attributedRevenue === null || c.attributedRevenue === undefined ? 0 : money(c.attributedRevenue)), 0);
    const measured = campaigns.filter((c) => c.attributedRevenue !== null && c.attributedRevenue !== undefined).length;
    return { budget, spend, variance: round2(budget - spend), attributable, measured, utilisation: budget > 0 ? spend / budget : null };
  }, [campaigns]);

  const save = (payload) => {
    dispatch({ type: 'ADD_CAMPAIGN', payload: { id: Date.now(), ...payload } });
    setShowNew(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center shrink-0 mt-3">
            <img src="/app-icons/tag_marketing.png" alt="Marketing" className="w-full h-full object-contain block" />
          </div>
          <div>
            <button
              onClick={() => onNavigate?.('standard_reports')}
              className="flex items-center gap-1 text-xs font-semibold text-[#0077c5] hover:underline mb-1.5"
            >
              <ArrowLeft size={13} />
              Reports
            </button>
            <h1 className="text-xl font-bold text-gray-900">Marketing</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Campaign budgets, what has been spent, and what is left.
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
        >
          <Plus size={14} />
          New campaign
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter campaigns"
              aria-label="Filter campaigns"
              className="pl-8 pr-3 py-1.5 w-64 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ca01c]"
            />
          </div>
          <Picker
            value={channelFilter}
            onChange={setChannelFilter}
            label="Channel"
            options={['All', ...Array.from(new Set(campaigns.map((c) => c.channel)))].sort()}
          />
          <Picker value={statusFilter} onChange={setStatusFilter} label="Status" options={['All', ...STATUSES]} />
        </div>
      </div>

      {/* Totals as a labelled line, not a row of tiles. */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-200">
            <tr>
              <th className="p-3 text-left">All campaigns</th>
              <th className="p-3 text-right">Budget</th>
              <th className="p-3 text-right">Spend to date</th>
              <th className="p-3 text-right">Remaining</th>
              <th className="p-3 text-right">Budget used</th>
              <th className="p-3 text-right">Return on spend</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-3 font-medium text-gray-700">{campaigns.length} campaigns</td>
              <td className="p-3 text-right tabular-nums text-gray-700">{formatMoney(totals.budget)}</td>
              <td className="p-3 text-right tabular-nums text-gray-700">{formatMoney(totals.spend)}</td>
              <td className={`p-3 text-right tabular-nums font-bold border-l border-gray-200 ${totals.variance < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                {formatMoney(totals.variance)}
              </td>
              <td className="p-3 text-right tabular-nums text-gray-700">
                {totals.utilisation === null ? '—' : `${Math.round(totals.utilisation * 100)}%`}
              </td>
              <td className="p-3 text-right tabular-nums text-gray-500">
                {totals.measured === 0 ? 'Cannot be calculated' : 'See below'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xs font-bold text-gray-900">Campaigns</h2>
          <span className="text-[11px] text-gray-500">
            {rows.length} shown · {campaigns.length} total
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-3">Campaign</th>
                <th className="p-3 w-36">Channel</th>
                <th className="p-3 w-44">Runs</th>
                <th className="p-3 text-right w-28">Budget</th>
                <th className="p-3 text-right w-28">Spend</th>
                <th className="p-3 text-right w-28">Remaining</th>
                <th className="p-3 text-right w-24">Used</th>
                <th className="p-3 w-24">Status</th>
                <th className="p-3 text-right w-44">Return on spend</th>
                <th className="p-3 w-20 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((c) => (
                <tr key={c.id} className={`hover:bg-gray-50 ${c.overBudget ? 'bg-amber-50/40' : ''}`}>
                  <td className="p-3">
                    <span className="font-medium text-gray-900">{c.name}</span>
                    {c.overBudget && (
                      <span className="block text-[11px] text-amber-700 mt-0.5">Over budget</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-600">{c.channel}</td>
                  <td className="p-3 text-gray-600 whitespace-nowrap">
                    {c.startDate} → {c.endDate}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(c.budget)}</td>
                  <td className="p-3 text-right tabular-nums font-medium text-gray-900">{formatMoney(c.spend)}</td>
                  <td className={`p-3 text-right tabular-nums font-semibold ${c.variance < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                    {formatMoney(c.variance)}
                  </td>
                  <td className="p-3 text-right tabular-nums text-gray-600">
                    {c.utilisation === null ? '—' : `${Math.round(c.utilisation * 100)}%`}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_TONE[c.status] || STATUS_TONE.Planned}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {c.roi === null ? (
                      <span
                        className="text-[11px] text-gray-500"
                        title="No revenue in the books is attributed to this campaign, so a return on spend cannot be calculated."
                      >
                        Cannot be calculated
                      </span>
                    ) : (
                      <span className="tabular-nums font-semibold text-gray-900">
                        {(c.roi * 100).toFixed(0)}%
                        <span className="block text-[11px] font-normal text-gray-500">
                          on {formatMoney(c.attributedRevenue)}
                        </span>
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(c)}
                      className="text-[#0077c5] hover:underline mr-2"
                      title="Edit this campaign"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'DELETE_CAMPAIGN', payload: c.id })}
                      className="text-gray-400 hover:text-red-700"
                      title="Delete this campaign"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-sm text-gray-500">
                    {campaigns.length === 0
                      ? 'No campaigns yet. Create one to start tracking spend against a budget.'
                      : 'Nothing matches these filters.'}
                  </td>
                </tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                  <td className="p-3" colSpan={3}>Total, shown</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(rows.reduce((s, c) => s + c.budget, 0))}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(rows.reduce((s, c) => s + c.spend, 0))}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(rows.reduce((s, c) => s + c.variance, 0))}</td>
                  <td className="p-3 text-right tabular-nums">—</td>
                  <td className="p-3" colSpan={2}>—</td>
                  <td className="p-3 text-right">—</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Why most rows say what they say. */}
      <div className="px-4 py-3 rounded-xl border border-blue-200 bg-blue-50 text-xs text-blue-900 flex items-start gap-2.5">
        <Info size={15} className="shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          A return on spend needs revenue that is known to have come from the campaign. Your books record
          which customer an invoice was raised for, not which advert first reached them, so there is
          nothing here to attribute — and dividing a campaign’s spend by the whole company’s revenue would
          credit it with sales it had no part in. {totals.measured} of your {campaigns.length} campaigns
          {totals.measured === 1 ? ' carries' : ' carry'} a recorded attributable figure{measuredWord(totals.measured)},
          so only {totals.measured === 1 ? 'that one shows' : 'those show'} a percentage. Leave the field
          blank when you do not know, and the screen will keep saying so.
        </p>
      </div>

      {/* Channel breakdown */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xs font-bold text-gray-900">By channel</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-white text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-3">Channel</th>
                <th className="p-3 text-right w-20">Campaigns</th>
                <th className="p-3 text-right w-32">Budget</th>
                <th className="p-3 text-right w-32">Spend</th>
                <th className="p-3 text-right w-32">Remaining</th>
                <th className="p-3 text-right w-24">Used</th>
                <th className="p-3 w-32">Share of spend</th>
                <th className="p-3 w-28 text-right">Measured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {byChannel.map((c) => {
                const share = totals.spend > 0 ? c.spend / totals.spend : 0;
                return (
                  <tr key={c.channel} className="hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900">{c.channel}</td>
                    <td className="p-3 text-right tabular-nums text-gray-600">{c.campaigns}</td>
                    <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(c.budget)}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{formatMoney(c.spend)}</td>
                    <td className={`p-3 text-right tabular-nums font-semibold ${c.variance < 0 ? 'text-red-700' : 'text-gray-700'}`}>
                      {formatMoney(c.variance)}
                    </td>
                    <td className="p-3 text-right tabular-nums text-gray-600">
                      {c.utilisation === null ? '—' : `${Math.round(c.utilisation * 100)}%`}
                    </td>
                    <td className="p-3">
                      {/* A bar, not a pie: one row per channel, so the reader can
                          compare shares down a column instead of by angle. */}
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden shrink-0">
                          <span className="block h-full bg-[#0077c5]" style={{ width: `${Math.round(share * 100)}%` }} />
                        </span>
                        <span className="tabular-nums text-gray-600">{(share * 100).toFixed(0)}%</span>
                      </span>
                    </td>
                    <td className="p-3 text-right text-gray-500">
                      {c.withAttribution === 0 ? 'None' : `${c.withAttribution} of ${c.campaigns}`}
                    </td>
                  </tr>
                );
              })}
              {byChannel.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-gray-500">No campaigns yet.</td>
                </tr>
              )}
            </tbody>
            {byChannel.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-gray-300 font-bold text-gray-900">
                  <td className="p-3">All channels</td>
                  <td className="p-3 text-right tabular-nums">{campaigns.length}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(totals.budget)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(totals.spend)}</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(totals.variance)}</td>
                  <td className="p-3 text-right tabular-nums">—</td>
                  <td className="p-3 text-right tabular-nums">100%</td>
                  <td className="p-3 text-right">{totals.measured} of {campaigns.length}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {showNew && (
        <CampaignDialog
          onClose={() => setShowNew(false)}
          onSave={save}
        />
      )}

      {editing && (
        <CampaignDialog
          campaign={editing}
          onClose={() => setEditing(null)}
          onSave={(values) => {
            dispatch({ type: 'UPDATE_CAMPAIGN', payload: { id: editing.id, values } });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/** "a recorded attributable figure" reads badly for one, "figures" for many. */
const measuredWord = (n) => (n === 1 ? '' : 's');

/** A select with the chevron drawn over it, matching the other screens. */
function Picker({ value, onChange, options, label }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="pl-3 pr-8 py-1.5 text-xs border border-gray-300 rounded-lg bg-white appearance-none"
      >
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

/* ----------------------------------------------------------- Create / edit -- */

function CampaignDialog({ campaign, onClose, onSave }) {
  const [name, setName] = useState(campaign?.name || '');
  const [channel, setChannel] = useState(campaign?.channel || CHANNELS[0]);
  const [startDate, setStartDate] = useState(campaign?.startDate || '');
  const [endDate, setEndDate] = useState(campaign?.endDate || '');
  const [budget, setBudget] = useState(campaign ? String(campaign.budget) : '');
  const [spend, setSpend] = useState(campaign ? String(campaign.spendToDate) : '0');
  const [status, setStatus] = useState(campaign?.status || 'Planned');
  // Empty means "not known". That is a real state, not a missing one, and it is
  // what makes the screen decline to print a return on spend.
  const [attributed, setAttributed] = useState(
    campaign?.attributedRevenue === null || campaign?.attributedRevenue === undefined ? '' : String(campaign.attributedRevenue)
  );
  const [touched, setTouched] = useState(false);

  const num = (v) => {
    if (v === '' || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  const budgetValue = num(budget);
  const spendValue = num(spend);
  const attributedValue = attributed === '' ? null : num(attributed);

  const nameError = touched && !name.trim();
  const budgetError = touched && budgetValue === null;
  const spendError = touched && spendValue === null;
  const attributedError = touched && attributed !== '' && attributedValue === null;
  const dateError = touched && (!startDate || !endDate);

  const submit = () => {
    setTouched(true);
    if (!name.trim() || budgetValue === null || spendValue === null || !startDate || !endDate) return;
    if (attributed !== '' && attributedValue === null) return;
    onSave({
      name: name.trim(),
      channel,
      startDate,
      endDate,
      budget: budgetValue,
      spendToDate: spendValue,
      status,
      attributedRevenue: attributedValue,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900">{campaign ? 'Edit campaign' : 'New campaign'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto">
          <Field label="Campaign name" error={nameError && 'A name is required'}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Local search — fountain installers"
              className={`w-full px-3 py-2 border rounded-lg text-sm ${nameError ? 'border-red-400' : 'border-gray-300'}`}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Channel">
              <select value={channel} onChange={(e) => setChannel(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                {CHANNELS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white">
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date" error={dateError && 'Both dates are required'}>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${dateError && !startDate ? 'border-red-400' : 'border-gray-300'}`} />
            </Field>
            <Field label="End date" error={dateError && !endDate ? 'Both dates are required' : null}>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={`w-full px-3 py-2 border rounded-lg text-sm ${dateError && !endDate ? 'border-red-400' : 'border-gray-300'}`} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget" error={budgetError && 'Enter a budget of zero or more'}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0.00"
                className={`w-full px-3 py-2 border rounded-lg text-sm ${budgetError ? 'border-red-400' : 'border-gray-300'}`}
              />
            </Field>
            <Field label="Spend to date" error={spendError && 'Enter zero or more'}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={spend}
                onChange={(e) => setSpend(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${spendError ? 'border-red-400' : 'border-gray-300'}`}
              />
            </Field>
          </div>

          <Field
            label="Attributed revenue (optional)"
            error={attributedError && 'Enter a figure of zero or more, or leave it blank'}
            hint="Only fill this in if you know which revenue this campaign produced. Leave it blank and the screen will say a return on spend cannot be calculated — which is the honest answer when nobody has tracked it."
          >
            <input
              type="number"
              min="0"
              step="0.01"
              value={attributed}
              onChange={(e) => setAttributed(e.target.value)}
              placeholder="not known"
              className={`w-full px-3 py-2 border rounded-lg text-sm ${attributedError ? 'border-red-400' : 'border-gray-300'}`}
            />
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-gray-100 bg-gray-50/60">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold border border-gray-300 rounded-full hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={submit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-full"
          >
            <Check size={14} />
            {campaign ? 'Save changes' : 'Create campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-700 mb-1">{label}</span>
      {children}
      {error ? (
        <span className="block text-[11px] text-red-600 mt-1">{error}</span>
      ) : hint ? (
        <span className="block text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</span>
      ) : null}
    </label>
  );
}
