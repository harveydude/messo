import React, { useMemo, useState } from 'react';
import { X, Check, ChevronDown, Car, Plus, Search, Printer, Share2, Settings } from 'lucide-react';
import { useStore, useLedger } from '../store';
import { formatMoney } from '../money';

/**
 * Mileage.
 * ============================================================================
 * The stub hardcoded "$0", "$0.70 per mile" and "3 vehicles" as literal text,
 * and had a table with no rows and a "no data to display" placeholder in the
 * middle of it. Every one of those figures was a constant: recording a trip
 * would not have moved them, because there was nowhere to record one.
 *
 * What replaced it derives all of them:
 *
 *   distance   endOdo - startOdo     -- the two readings the user typed. Never
 *                                      stored, so a mistyped odometer is fixed
 *                                      by correcting the reading.
 *   rate       the vehicle's own     -- a trip inherits it rather than keeping a
 *                                      private copy that would drift from the
 *                                      vehicle the moment the rate changed
 *   amount     distance x rate
 *   deduction  the sum over trips
 *
 * Indian context. Reimbursement here is rupees per kilometre, which is the
 * Indian convention and not a renamed per-mile rate: the unit is different, so
 * the number is different. Using miles would silently misstate every claim.
 *
 * The monthly summary at the foot is the same sum grouped by month, so the
 * year-end figure can be checked against the rows above it rather than trusted.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Distance in km. Negative readings are a typo, so they are clamped to zero. */
function distanceOf(trip) {
  const start = Number(trip.startOdo);
  const end = Number(trip.endOdo);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  return Math.max(0, end - start);
}

function prettyDate(iso) {
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** `2025-10` -> `October 2025`. */
function monthLabel(key) {
  const [y, m] = String(key).split('-');
  const full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const idx = Number(m) - 1;
  if (!y || Number.isNaN(idx) || !full[idx]) return key;
  return `${full[idx]} ${y}`;
}

export default function MileageView({ onNavigate }) {
  const { state, dispatch } = useStore();
  const ledger = useLedger();

  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [showTrip, setShowTrip] = useState(false);
  const [showVehicles, setShowVehicles] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  // Memoised on the collection, not on a `?? []` default. A fresh empty array
  // is a new reference every render, so the map below would be rebuilt on every
  // render -- the memo doing nothing while appearing to work.
  const vehicles = useMemo(() => state.vehicles ?? [], [state.vehicles]);
  const hasVehicles = vehicles.length > 0;

  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const customerById = useMemo(
    () => new Map((state.customers ?? []).map((c) => [c.id, c.displayName])),
    [state.customers]
  );

  const rows = useMemo(() => {
    return (state.mileage ?? [])
      .map((t) => {
        const vehicle = vehicleById.get(t.vehicleId);
        const km = distanceOf(t);
        const rate = Number(vehicle?.ratePerKm) || 0;
        return {
          ...t,
          km,
          rate,
          amount: round2(km * rate),
          vehicleName: vehicle?.name ?? 'Unknown vehicle',
          vehiclePlate: vehicle?.plate ?? '',
          customer: t.customerId == null ? null : customerById.get(t.customerId) ?? 'Unknown customer',
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [state.mileage, vehicleById, customerById]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (vehicleFilter !== 'all' && String(r.vehicleId) !== vehicleFilter) return false;
      if (!q) return true;
      return [r.purpose, r.vehicleName, r.customer].filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, vehicleFilter]);

  const totals = useMemo(() => ({
    km: round2(filtered.reduce((s, r) => s + r.km, 0)),
    amount: round2(filtered.reduce((s, r) => s + r.amount, 0)),
    trips: filtered.length,
  }), [filtered]);

  /** The same sum, grouped by month -- the figure an accountant checks. */
  const byMonth = useMemo(() => {
    const map = new Map();
    for (const r of filtered) {
      const key = r.date.slice(0, 7);
      const cur = map.get(key) ?? { key, km: 0, amount: 0, trips: 0 };
      cur.km += r.km;
      cur.amount = round2(cur.amount + r.amount);
      cur.trips += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => (a.key < b.key ? 1 : -1));
  }, [filtered]);

  const primary = vehicles.find((v) => v.primary) ?? vehicles[0] ?? null;
  const selected = rows.find((r) => r.id === selectedId) || null;

  // The mileage expense account as the ledger actually has it. Trips recorded
  // here are a claim, not a posting: unless something has been coded to the
  // account, the books will not show this money, and saying so is the honest
  // thing to do next to a deduction total.
  const mileageAccountId = 34;
  const mileageAccount = ledger.accountOf(mileageAccountId);
  const postedToAccount = round2(ledger.balanceOf(mileageAccountId));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl font-bold text-gray-900">Mileage</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVehicles(true)}
            className="px-4 py-1.5 text-xs font-bold text-[#0077c5] border border-gray-300 rounded-full hover:bg-gray-50"
          >
            Manage vehicles
          </button>
          <div className="inline-flex rounded-full shadow-xs">
            <button
              type="button"
              onClick={() => setShowTrip(true)}
              disabled={!hasVehicles}
              title={hasVehicles ? undefined : 'Add a vehicle before recording a trip'}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] rounded-l-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add trip
            </button>
            <button
              type="button"
              onClick={() => setShowVehicles(true)}
              className="px-2 py-1.5 text-xs font-bold text-white bg-[#2ca01c] border-l border-green-700 rounded-r-full hover:bg-green-700"
              aria-label="Add trip menu"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Vehicle</label>
          <select
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            disabled={!hasVehicles}
            className="text-xs border border-gray-300 rounded px-3 py-1.5 bg-white font-medium disabled:opacity-50"
          >
            <option value="all">All vehicles</option>
            {vehicles.map((v) => (
              <option key={v.id} value={String(v.id)}>{v.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Search</label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Purpose, vehicle or customer"
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

      {/* Deduction summary -- a sentence and a rate, not a wall of stat tiles. */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-500">Potential deduction</div>
          <div className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums">{formatMoney(totals.amount)}</div>
          <div className="text-[11px] text-gray-500 mt-1">
            {totals.trips} {totals.trips === 1 ? 'trip' : 'trips'} · {totals.km.toLocaleString('en-IN')} km
            {filtered.length !== rows.length && ` (filtered from ${rows.length})`}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-gray-100 text-gray-700">
              <Car size={18} />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900">{primary ? primary.name : 'No vehicles yet'}</div>
              <div className="text-[11px] text-gray-500">{primary ? 'Primary vehicle' : 'Add one to record trips'}</div>
            </div>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-900">{vehicles.length} vehicles</div>
            <button
              type="button"
              onClick={() => setShowVehicles(true)}
              className="text-xs text-[#0077c5] hover:underline font-medium"
            >
              Manage vehicles
            </button>
          </div>

          <div>
            <div className="text-xs font-bold text-gray-900">
              {primary ? formatMoney(primary.ratePerKm) : '—'}{' '}
              <span className="font-normal text-gray-500">per km</span>
            </div>
            <div className="text-[11px] text-gray-500">
              Rate is set per vehicle, and every trip inherits it.
            </div>
          </div>
        </div>

        {/* Honest note: a recorded trip is a claim until it is posted. */}
        {mileageAccount && totals.amount > 0 && (
          <p className="text-[11px] text-gray-500 border-t border-gray-200 pt-3">
            {formatMoney(postedToAccount)} has been posted to{' '}
            <button
              type="button"
              onClick={() => onNavigate?.('chart_of_accounts')}
              className="text-[#0077c5] hover:underline font-medium"
            >
              {mileageAccount.name}
            </button>{' '}
            so far. The remaining {formatMoney(round2(totals.amount - Math.min(totals.amount, postedToAccount)))} is a
            claim that is not in the books until it is coded to an expense.
          </p>
        )}
      </div>

      {/* Trips table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-gray-200 font-semibold text-xs text-gray-700">Trips</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-800">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Purpose</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Distance</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className="hover:bg-gray-50 transition cursor-pointer"
                >
                  <td className="p-3 whitespace-nowrap">{prettyDate(r.date)}</td>
                  <td className="p-3 text-gray-700">{r.purpose}</td>
                  <td className="p-3">
                    {r.vehicleName}
                    {r.vehiclePlate && <span className="text-gray-400 text-[10px] ml-1">{r.vehiclePlate}</span>}
                  </td>
                  <td className="p-3 text-gray-600">{r.customer ?? '—'}</td>
                  <td className="p-3 text-right tabular-nums">{r.km.toLocaleString('en-IN')} km</td>
                  <td className="p-3 text-right tabular-nums text-gray-600">{formatMoney(r.rate)}</td>
                  <td className="p-3 text-right font-medium tabular-nums">{formatMoney(r.amount)}</td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    {rows.length === 0 ? (
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-14 h-14 rounded-full border-4 border-teal-500/70 flex items-center justify-center text-teal-600 bg-teal-50">
                          <Car size={26} />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900">No trips here yet</h3>
                        <p className="text-xs text-gray-500 max-w-sm">
                          {hasVehicles
                            ? 'Record a trip with its start and end odometer readings. The distance and the deduction are worked out from those two numbers.'
                            : 'There are no vehicles yet, so there is no rate to claim against. Add a vehicle first.'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No trips match these filters.</p>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly summary -- the same sum, grouped, so it can be checked. */}
      {byMonth.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-gray-200 font-semibold text-xs text-gray-700">Monthly summary</div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-800">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Month</th>
                  <th className="p-3 text-right">Trips</th>
                  <th className="p-3 text-right">Distance</th>
                  <th className="p-3 text-right">Deduction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {byMonth.map((m) => (
                  <tr key={m.key}>
                    <td className="p-3 font-medium text-gray-900">{monthLabel(m.key)}</td>
                    <td className="p-3 text-right tabular-nums">{m.trips}</td>
                    <td className="p-3 text-right tabular-nums">{m.km.toLocaleString('en-IN')} km</td>
                    <td className="p-3 text-right font-medium tabular-nums">{formatMoney(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                <tr>
                  <td className="p-3">Total</td>
                  <td className="p-3 text-right tabular-nums">{totals.trips}</td>
                  <td className="p-3 text-right tabular-nums">{totals.km.toLocaleString('en-IN')} km</td>
                  <td className="p-3 text-right tabular-nums">{formatMoney(totals.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <TripDrawer
          trip={selected}
          onClose={() => setSelectedId(null)}
          onDelete={() => {
            dispatch({ type: 'DELETE_MILEAGE_TRIP', payload: selected.id });
            setSelectedId(null);
          }}
        />
      )}

      {showTrip && hasVehicles && <AddTripModal onClose={() => setShowTrip(false)} onSaved={() => setShowTrip(false)} />}

      {showVehicles && (
        <VehicleManager
          editing={editingVehicle}
          onEdit={setEditingVehicle}
          onClose={() => { setShowVehicles(false); setEditingVehicle(null); }}
        />
      )}
    </div>
  );
}

function TripDrawer({ trip, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{trip.purpose}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{prettyDate(trip.date)}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <dl className="space-y-3 text-sm">
            {[
              ['Vehicle', trip.vehiclePlate ? `${trip.vehicleName} · ${trip.vehiclePlate}` : trip.vehicleName],
              ['Customer', trip.customer ?? '—'],
              ['Start odometer', `${Number(trip.startOdo).toLocaleString('en-IN')} km`],
              ['End odometer', `${Number(trip.endOdo).toLocaleString('en-IN')} km`],
              ['Rate per km', formatMoney(trip.rate)],
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-3 gap-2">
                <dt className="text-gray-500">{k}</dt>
                <dd className="col-span-2 text-gray-900">{v}</dd>
              </div>
            ))}
          </dl>

          <div className="border-t border-gray-200 pt-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Distance</span>
              <span className="tabular-nums">{trip.km.toLocaleString('en-IN')} km</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Rate</span>
              <span className="tabular-nums">{formatMoney(trip.rate)} per km</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deduction</span>
              <span className="text-lg font-bold text-gray-900 tabular-nums">{formatMoney(trip.amount)}</span>
            </div>
          </div>

          <p className="text-[11px] text-gray-500">
            Distance is end odometer minus start odometer. Neither is stored as a
            distance, so correcting a reading corrects this figure.
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onDelete} className="px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 rounded-lg">
            Delete
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

const BLANK_TRIP = {
  date: new Date().toISOString().slice(0, 10),
  vehicleId: '',
  purpose: '',
  customerId: '',
  startOdo: '',
  endOdo: '',
  billable: true,
};

function AddTripModal({ onClose, onSaved }) {
  const { state, dispatch } = useStore();
  const vehicles = state.vehicles ?? [];
  const [form, setForm] = useState({ ...BLANK_TRIP, vehicleId: vehicles[0]?.id ?? '' });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const vehicle = vehicles.find((v) => String(v.id) === String(form.vehicleId));
  const start = Number(form.startOdo);
  const end = Number(form.endOdo);
  const km = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
  const preview = round2(km * (Number(vehicle?.ratePerKm) || 0));

  const save = () => {
    if (!form.purpose.trim()) return setError('Say what the trip was for.');
    if (!form.vehicleId) return setError('Choose a vehicle.');
    if (form.startOdo === '' || form.endOdo === '') return setError('Enter both odometer readings.');
    // End before start is a mistyped digit, not a trip. Silently recording a
    // zero-distance trip would hide the mistake until the claim was filed.
    if (end <= start) return setError('The end odometer must be greater than the start odometer.');

    dispatch({
      type: 'ADD_MILEAGE_TRIP',
      payload: {
        id: Date.now(),
        date: form.date,
        vehicleId: Number(form.vehicleId),
        purpose: form.purpose.trim(),
        customerId: form.customerId ? Number(form.customerId) : null,
        startOdo: start,
        endOdo: end,
        billable: form.billable,
      },
    });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Add trip</h2>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Vehicle</label>
              <select value={form.vehicleId} onChange={set('vehicleId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Purpose / route</label>
            <input
              type="text"
              value={form.purpose}
              onChange={set('purpose')}
              placeholder="e.g. Site visit — Cool Cars, Half Moon Bay"
              className={`w-full px-3 py-2 border rounded-lg text-sm ${error && !form.purpose.trim() ? 'border-red-500' : 'border-gray-300'}`}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Customer (optional)</label>
            <select value={form.customerId} onChange={set('customerId')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">No customer</option>
              {(state.customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start odometer (km)</label>
              <input
                type="number" min="0" step="1"
                value={form.startOdo}
                onChange={set('startOdo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">End odometer (km)</label>
              <input
                type="number" min="0" step="1"
                value={form.endOdo}
                onChange={set('endOdo')}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${error && form.endOdo !== '' && end <= start ? 'border-red-500' : 'border-gray-300'}`}
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

          {/* The two readings and the vehicle's rate, resolved into one figure. */}
          <div className="border-t border-gray-200 pt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Distance</span>
              <span className="tabular-nums">{km.toLocaleString('en-IN')} km</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Rate</span>
              <span className="tabular-nums">{vehicle ? formatMoney(vehicle.ratePerKm) : '—'} per km</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deduction</span>
              <span className="text-base font-bold text-gray-900 tabular-nums">{formatMoney(preview)}</span>
            </div>
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

const BLANK_VEHICLE = { name: '', plate: '', ratePerKm: '', primary: false };

function VehicleManager({ editing, onEdit, onClose }) {
  const { state, dispatch } = useStore();
  const vehicles = state.vehicles ?? [];
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK_VEHICLE);
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = () => {
    if (!form.name.trim()) return setError('Give the vehicle a name.');
    if (!(Number(form.ratePerKm) > 0)) return setError('Enter a rate per kilometre greater than zero.');

    dispatch({
      type: 'ADD_VEHICLE',
      payload: {
        id: Date.now(),
        name: form.name.trim(),
        plate: form.plate.trim(),
        ratePerKm: Number(form.ratePerKm),
        primary: false,
      },
    });
    setForm(BLANK_VEHICLE);
    setError('');
    setAdding(false);
  };

  const saveEdit = () => {
    const rate = Number(editing.ratePerKm);
    if (!editing.name.trim()) return setError('Give the vehicle a name.');
    if (!(rate > 0)) return setError('Enter a rate per kilometre greater than zero.');

    // One primary vehicle at a time. Changing the rate here moves every trip
    // for this vehicle, which is the point: there is no second copy of it.
    const others = vehicles.map((v) => (v.primary ? { ...v, primary: false } : v));
    dispatch({
      type: 'UPDATE_VEHICLE',
      payload: { ...editing, name: editing.name.trim(), plate: editing.plate?.trim() ?? '', ratePerKm: rate, primary: true },
    });
    for (const v of others) {
      if (!v.primary) continue;
      dispatch({ type: 'UPDATE_VEHICLE', payload: v });
    }
    setError('');
    onEdit(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Vehicles</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Each vehicle carries its own per-kilometre rate. Trips use it; they do not keep their own.
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {vehicles.length === 0 && !adding && (
            <p className="text-sm text-gray-500 py-6 text-center">
              No vehicles yet. Add one and trips can be recorded against it.
            </p>
          )}

          {vehicles.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 text-gray-700">
                  <Car size={16} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {v.name}
                    {v.primary && <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">Primary</span>}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {v.plate ? `${v.plate} · ` : ''}{formatMoney(v.ratePerKm)} per km
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { onEdit({ ...v }); setAdding(false); }}
                  className="px-2 py-1 text-[11px] font-semibold text-[#0077c5] hover:underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'DELETE_VEHICLE', payload: v.id })}
                  className="px-2 py-1 text-[11px] font-semibold text-red-700 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {editing && (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3 bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">Edit vehicle</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => onEdit({ ...editing, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Number plate</label>
                <input
                  type="text"
                  value={editing.plate ?? ''}
                  onChange={(e) => onEdit({ ...editing, plate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rate per km</label>
                <input
                  type="number" min="0" step="0.5"
                  value={editing.ratePerKm}
                  onChange={(e) => onEdit({ ...editing, ratePerKm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { onEdit(null); setError(''); }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg"
                >
                  Save vehicle
                </button>
              </div>
            </div>
          )}

          {adding && (
            <div className="border border-gray-300 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Add vehicle</h3>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Tata Nexon"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Number plate</label>
                <input
                  type="text"
                  value={form.plate}
                  onChange={set('plate')}
                  placeholder="MH 12 AB 1234"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Rate per km</label>
                <input
                  type="number" min="0" step="0.5"
                  value={form.ratePerKm}
                  onChange={set('ratePerKm')}
                  placeholder="18"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setAdding(false); setError(''); }}
                  className="px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#2ca01c] hover:bg-green-700 rounded-lg flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  Add vehicle
                </button>
              </div>
            </div>
          )}

          {error && !adding && !editing && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={() => { setAdding(true); onEdit(null); }}
            className="px-4 py-2 text-sm font-semibold text-[#0077c5] hover:bg-blue-50 rounded-lg"
          >
            Add vehicle
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}