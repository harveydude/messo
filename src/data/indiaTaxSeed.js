/**
 * GST, TDS and lending seed data — India-first.
 *
 * WHY A SEPARATE FILE
 * -------------------
 * `seed.js` holds the books; this holds the statutory registers that hang off
 * them. Keeping them apart means a second screen can be added here without
 * reopening the file every report and the ledger read, and it keeps the
 * date arithmetic below in one place instead of smeared across three screens.
 *
 * EVERY DATE HERE IS ANCHORED TO TODAY, NOT HARD-CODED
 * ----------------------------------------------------
 * The screens compute filing status by comparing a due date against the current
 * date — that is the whole point of the feature, and a fixed due date would
 * make the whole register read "Overdue" forever once the calendar moved past
 * it. So periods, due dates and instalment dates are generated from `TODAY`.
 * The cost is that the sample ages; the benefit is that opening the screen
 * always shows a truthful mix of Filed / Not filed / Overdue rather than a
 * demo that was correct on the day it was recorded.
 *
 * WHAT IS STORED AND WHAT IS COMPUTED
 * -----------------------------------
 * Stored: the *facts* — a GSTIN, an HSN code, a taxable value, a rate, a
 * lender, a principal, the instalments that have been paid.
 * Computed on the screen: every rupee figure derived from them, plus the
 * CGST/SGST/IGST split, the TDS amount, the amortisation schedule and the
 * outstanding balance. Nothing here is a total, so nothing here can go stale.
 */

/**
 * GST rates, India-first.
 *
 * `pct` is the TOTAL GST on a taxable value and is the field `invoiceTotals`
 * reads, so it must stay one number and never half of one. `cgstPct` /
 * `sgstPct` / `igstPct` are the split the returns file: an intra-State supply
 * is CGST + SGST at half the rate each, an inter-State supply is IGST at the
 * full rate. `hsn` is the code that travels with the rate onto the invoice and
 * into the return.
 */
export const GST_TAX_RATES = [
  { id: 1, name: 'GST 18% — pumps, irrigation and installation', pct: 18, cgstPct: 9, sgstPct: 9, igstPct: 18, hsn: '8413 / SAC 995461', note: 'Most services and specified goods' },
  { id: 2, name: 'GST 12% — plastic articles and fittings', pct: 12, cgstPct: 6, sgstPct: 6, igstPct: 12, hsn: '3926 / SAC 995719', note: 'Packaged food, medicines, most goods' },
  { id: 3, name: 'GST 5% — without ITC', pct: 5, cgstPct: 2.5, sgstPct: 2.5, igstPct: 5, hsn: '9403 / SAC 997321', note: 'Restaurant, transport, residential construction' },
  { id: 4, name: 'GST 28% — motor vehicles and parts', pct: 28, cgstPct: 14, sgstPct: 14, igstPct: 28, hsn: '8708 / SAC 996511', note: 'Deemed to be the costliest article' },
  { id: 5, name: 'GST 0% — zero rated (export)', pct: 0, cgstPct: 0, sgstPct: 0, igstPct: 0, hsn: '9997 / SAC 995511', note: 'Exports and SEZ supplies. Refund or LUT; no ITC taken.' },
];

const TODAY = new Date();

/**
 * `2026-10-11` from a local Date.
 *
 * `toISOString()` is deliberately not used: it converts to UTC first, which
 * moves the date by a day for anyone east or west of Greenwich. A due date that
 * silently shifts a day is a due date that can be filed late by accident.
 */
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The 1st of the month `offset` months before this one. `monthStart(0)` = this month. */
const monthStart = (offset) => new Date(TODAY.getFullYear(), TODAY.getMonth() - offset, 1);

/** The last day of the month `offset` months before this one. */
const monthEnd = (offset) => new Date(TODAY.getFullYear(), TODAY.getMonth() - offset + 1, 0);

/** A given day of the month `offset` months before this one. */
const monthDay = (offset, day) => new Date(TODAY.getFullYear(), TODAY.getMonth() - offset, day);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2026" for the month `offset` months ago. */
const monthLabel = (offset) => {
  const d = monthStart(offset);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * The Indian financial year this month falls in.
 *
 * The year changes on 1 April, not 1 January — getting that wrong files every
 * advance-tax instalment into the wrong year.
 */
const AY_START_YEAR = TODAY.getMonth() >= 3 ? TODAY.getFullYear() : TODAY.getFullYear() - 1;

/** Six monthly periods ending with the current month. */
const GST_PERIODS = [5, 4, 3, 2, 1, 0].map((offset) => ({
  offset,
  label: monthLabel(offset),
  start: iso(monthStart(offset)),
  end: iso(monthEnd(offset)),
}));

/* -------------------------------------------------------------- Registration -- */

/**
 * The entity's GST registration. Held here rather than on `company` so this
 * module owns the whole statutory picture in one readable block.
 */
export const GST_REGISTRATION = {
  legalName: 'Sample Company LLP',
  gstin: '27AAPFU0931F1ZV',
  pan: 'AAPFU0931F',
  tan: 'BLRS01234E',
  stateCode: '27',
  state: 'Maharashtra',
  constitution: 'Private Limited Company',
  registrationDate: '2019-07-01',
  authorisedSignatory: 'Craig Carlson',
  filingFrequency: 'Monthly',
  eReturnFiling: true,
};

/* ------------------------------------------------------------------- Parties -- */

const SALES_PARTIES = [
  { name: 'Sundaram Realty Private Limited', gstin: '29AABCS1429B1ZP', stateCode: '29', state: 'Karnataka' },
  { name: 'Bharat Forge Components LLP', gstin: '27AAFCB8821K1Z4', stateCode: '27', state: 'Maharashtra' },
  { name: 'Malabar Irrigation Traders', gstin: '32AAECK4821H1ZQ', stateCode: '32', state: 'Kerala' },
  { name: 'Indus Infra Works', gstin: '06AAQFR9012E1ZF', stateCode: '06', state: 'Haryana' },
  { name: 'Deccan Landscape Architects LLP', gstin: '36AAGCD3456F1Z8', stateCode: '36', state: 'Telangana' },
  { name: 'Gujarat Pumps and Motors', gstin: '24AABCG9012H1ZK', stateCode: '24', state: 'Gujarat' },
];

const SUPPLIERS = [
  { name: 'Karnataka Steel Traders', gstin: '29AAJFK1234K1ZV', stateCode: '29', state: 'Karnataka' },
  { name: 'Bharat Electricals', gstin: '27AAQFB2345L1ZM', stateCode: '27', state: 'Maharashtra' },
  { name: 'Southern Freight Carriers', gstin: '33AACCM3456M1ZN', stateCode: '33', state: 'Tamil Nadu' },
  { name: 'Sahyadri Cements', gstin: '27AARCS4567N1ZP', stateCode: '27', state: 'Maharashtra' },
  { name: 'Narmada Packaging', gstin: '23AAECN6789P1ZQ', stateCode: '23', state: 'Madhya Pradesh' },
];

/* -------------------------------------------------------------- B2B supplies -- */

const SUPPLY_BLUEPRINT = [
  { rateId: 1, taxableValue: 186000, desc: 'Drainage and irrigation installation' },
  { rateId: 1, taxableValue: 64000, desc: 'Pump supply and commissioning' },
  { rateId: 2, taxableValue: 42500, desc: 'HDPE pipe and fittings' },
  { rateId: 3, taxableValue: 86000, desc: 'Landscaping and garden maintenance' },
  { rateId: 4, taxableValue: 215000, desc: 'Tipper vehicle and spares' },
  { rateId: 1, taxableValue: 39500, desc: 'Site supervision and drawings' },
];

/**
 * Outward supplies — the B2B register GSTR-1 is built from.
 *
 * `taxableValue` is the value before tax. CGST/SGST/IGST is not stored: an
 * intra-State supply is CGST + SGST at half the rate and an inter-State supply
 * is IGST at the whole rate, and that rule belongs in one place rather than
 * being re-typed per row where it can drift.
 */
export const GST_SALES_INVOICES = GST_PERIODS.flatMap((period, pi) =>
  [0, 1, 2].map((bi) => {
    const b = SUPPLY_BLUEPRINT[(pi * 2 + bi) % SUPPLY_BLUEPRINT.length];
    const party = SALES_PARTIES[(pi * 2 + bi) % SALES_PARTIES.length];
    const interState = party.stateCode !== GST_REGISTRATION.stateCode;
    return {
      id: pi * 3 + bi + 1,
      invoiceNo: `PI/26-27/${String(pi * 3 + bi + 1).padStart(4, '0')}`,
      date: iso(monthDay(period.offset, 5 + bi * 7)),
      period: period.label,
      partyName: party.name,
      partyGstin: party.gstin,
      partyState: party.state,
      partyStateCode: party.stateCode,
      interState,
      // Place of supply is where the supply is consumed, not where the seller
      // sits. For goods it follows the recipient, which is why this is stored
      // per invoice rather than read off the company.
      placeOfSupply: interState ? party.stateCode : GST_REGISTRATION.stateCode,
      hsn: b.rateId === 1 ? '8413' : b.rateId === 2 ? '3926' : b.rateId === 3 ? '9997' : '8708',
      sac: b.rateId === 1 ? '995461' : null,
      desc: b.desc,
      taxRateId: b.rateId,
      taxableValue: b.taxableValue + pi * 2500 + bi * 750,
      reverseCharge: false,
      docType: 'Tax invoice',
    };
  })
);

/* ------------------------------------------------------------------- ITC book -- */

const ITC_BLUEPRINT = [
  { rateId: 1, taxableValue: 154000, desc: 'PVC and HDPE piping', supplier: 0, blocked: null },
  { rateId: 2, taxableValue: 92000, desc: 'Fittings, valves and gaskets', supplier: 1, blocked: null },
  { rateId: 1, taxableValue: 54000, desc: 'Cement and aggregates', supplier: 3, blocked: null },
  { rateId: 1, taxableValue: 31000, desc: 'Site labour contractor (RCM)', supplier: 4, blocked: null, reverseCharge: true },
  { rateId: 3, taxableValue: 26000, desc: 'Travel and hotel — specified person', supplier: 2, blocked: 'Blocked credit under section 17(5) — services from a specified person' },
];

/**
 * Inward supplies — the input tax credit book.
 *
 * `blocked` is the reason credit may not be taken. Credit that is available but
 * blocked is the single largest cause of an unexpected GST payment, so it is
 * carried on the row rather than being a filter the user has to remember to
 * apply. Row 5 is the section 17(5) case.
 */
export const GST_ITC_INVOICES = GST_PERIODS.flatMap((period, pi) =>
  [0, 1, 2].map((bi) => {
    const b = ITC_BLUEPRINT[(pi + bi) % ITC_BLUEPRINT.length];
    const supplier = SUPPLIERS[b.supplier];
    return {
      id: pi * 3 + bi + 1,
      invoiceNo: `PUR/${26 + (pi % 2)}-${String(27 + (pi % 2))}/${String(pi * 3 + bi + 1).padStart(4, '0')}`,
      supplierName: supplier.name,
      supplierGstin: supplier.gstin,
      supplierState: supplier.state,
      supplierStateCode: supplier.stateCode,
      date: iso(monthDay(period.offset, 8 + bi * 6)),
      period: period.label,
      interState: supplier.stateCode !== GST_REGISTRATION.stateCode,
      placeOfSupply: GST_REGISTRATION.stateCode,
      desc: b.desc,
      taxRateId: b.rateId,
      taxableValue: b.taxableValue + pi * 1200,
      reverseCharge: !!b.reverseCharge,
      itcEligible: !b.blocked,
      blockedReason: b.blocked,
      docType: b.reverseCharge ? 'Tax invoice (reverse charge)' : 'Bill of supply',
    };
  })
);

/* ---------------------------------------------------------------- GST returns -- */

/** Due date of a monthly return filed `day` days into the month after `period`. */
const monthlyDue = (period, day) => iso(monthDay(period.offset - 1, day));

/** Filing date for a return due on `dueDate`, filed a few days early. */
const filedBefore = (dueDate) => {
  const [y, m, d] = dueDate.split('-').map(Number);
  return iso(new Date(y, m - 1, d - 4));
};

/**
 * The return register.
 *
 * `filedOn` is the ONLY filed/not decision stored. Everything else — overdue,
 * days late, "due in N days" — is computed on the screen against the current
 * date, because a status that is written once and never re-read is a status
 * that lies for the rest of the year.
 *
 * Periods two months back and earlier are filed; the last two are deliberately
 * left open so the screen always has something genuinely overdue to show.
 * GSTR-1 is due on the 11th and GSTR-3B on the 20th of the following month;
 * GSTR-9 is the annual return, due 31 December for the year just closed.
 */
const PREVIOUS_FY_END_YEAR = AY_START_YEAR - 1;

export const GST_RETURNS = [
  ...GST_PERIODS.flatMap((period) => {
    const gstr1Due = monthlyDue(period, 11);
    const gstr3bDue = monthlyDue(period, 20);
    const filed = period.offset >= 3;

    return [
      {
        id: `GSTR-1 ${period.label}`,
        returnType: 'GSTR-1',
        title: 'Outward supplies and inward supplies (RC)',
        period: period.label,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate: gstr1Due,
        frequency: 'Monthly',
        filedOn: filed ? filedBefore(gstr1Due) : null,
        arn: filed ? `AA${String(270926 + period.offset).padStart(8, '0')}XYZ` : null,
        ackNo: filed ? `ACK${String(1120260000 + period.offset)}` : null,
      },
      {
        id: `GSTR-3B ${period.label}`,
        returnType: 'GSTR-3B',
        title: 'Summary return and payment of tax',
        period: period.label,
        periodStart: period.start,
        periodEnd: period.end,
        dueDate: gstr3bDue,
        frequency: 'Monthly',
        filedOn: filed ? filedBefore(gstr3bDue) : null,
        arn: filed ? `AA${String(270926 + period.offset)}PQR` : null,
        ackNo: filed ? `ACK${String(1120260000 + period.offset)}` : null,
      },
    ];
  }),
  {
    id: `GSTR-9 AY ${PREVIOUS_FY_END_YEAR}-${String(PREVIOUS_FY_END_YEAR + 1).slice(2)}`,
    returnType: 'GSTR-9',
    title: 'Annual return',
    period: `FY ${PREVIOUS_FY_END_YEAR}-${String(PREVIOUS_FY_END_YEAR + 1).slice(2)}`,
    periodStart: iso(new Date(PREVIOUS_FY_END_YEAR, 3, 1)),
    periodEnd: iso(new Date(PREVIOUS_FY_END_YEAR + 1, 2, 31)),
    dueDate: iso(new Date(PREVIOUS_FY_END_YEAR, 11, 31)),
    frequency: 'Annual',
    filedOn: null,
    arn: null,
    ackNo: null,
  },
];

/* ---------------------------------------------------------------------- TDS -- */

/**
 * Tax deducted at source.
 *
 * `grossAmount` and `ratePct` are stored; the TDS itself is computed on the
 * screen as gross × rate. Storing the deduction as well would let the two drift
 * apart the first time someone edits a rate, and a TDS register whose deducted
 * figure disagrees with its own rate is worse than no register at all.
 *
 * `depositDate` is null until the challan is paid. Nothing carries a "status"
 * string: deposited, pending and overdue are all computed.
 */
export const TDS_ENTRIES = [
  { id: 1, section: '194C', payeeName: 'Ramesh Painting Contractors', payeePan: 'AAAPR4821K', nature: 'Contractor payment — building works', voucherNo: 'BILL-0012', paymentDate: iso(monthDay(4, 22)), grossAmount: 240000, ratePct: 2, depositDate: iso(monthDay(3, 6)), challanNo: 'CHL-241100044512', depositBank: 'HDFC Bank' },
  { id: 2, section: '194C', payeeName: 'Suresh Electrical Works', payeePan: 'BAPS9123F', nature: 'Contractor payment — electrical', voucherNo: 'BILL-0018', paymentDate: iso(monthDay(3, 14)), grossAmount: 86000, ratePct: 1, depositDate: iso(monthDay(2, 6)), challanNo: 'CHL-241100045188', depositBank: 'HDFC Bank' },
  { id: 3, section: '194J', payeeName: 'Mehta & Associates LLP', payeePan: 'AAFFM2345C', nature: 'Professional fees — statutory audit', voucherNo: 'BILL-0021', paymentDate: iso(monthDay(3, 28)), grossAmount: 75000, ratePct: 10, depositDate: iso(monthDay(2, 6)), challanNo: 'CHL-241100045301', depositBank: 'HDFC Bank' },
  { id: 4, section: '194J', payeeName: 'Dr. Anil Kulkarni', payeePan: 'AKPK1234J', nature: 'Professional fees — structural design', voucherNo: 'BILL-0024', paymentDate: iso(monthDay(2, 11)), grossAmount: 120000, ratePct: 10, depositDate: null, challanNo: null, depositBank: null },
  { id: 5, section: '194I', payeeName: 'Shivneri Godown', payeePan: 'AAJFS6789G', nature: 'Rent — warehouse', voucherNo: 'BILL-0026', paymentDate: iso(monthDay(2, 3)), grossAmount: 36000, ratePct: 10, depositDate: null, challanNo: null, depositBank: null },
  { id: 6, section: '194I', payeeName: 'Deccan Equipment Hire', payeePan: 'BCXPD1122H', nature: 'Rent — plant and machinery', voucherNo: 'BILL-0027', paymentDate: iso(monthDay(2, 18)), grossAmount: 48000, ratePct: 2, depositDate: iso(monthDay(1, 6)), challanNo: 'CHL-241100045677', depositBank: 'HDFC Bank' },
  { id: 7, section: '194H', payeeName: 'Sunrise Insurance Broking', payeePan: 'AAECS3344K', nature: 'Commission on insurance premium', voucherNo: 'BILL-0029', paymentDate: iso(monthDay(1, 21)), grossAmount: 96000, ratePct: 5, depositDate: null, challanNo: null, depositBank: null },
  { id: 8, section: '194DD', payeeName: 'Mehta & Associates LLP', payeePan: 'AAFFM2345C', nature: 'Insurance commission received', voucherNo: 'BILL-0030', paymentDate: iso(monthDay(1, 26)), grossAmount: 54000, ratePct: 5, depositDate: null, challanNo: null, depositBank: null },
  { id: 9, section: '194C', payeeName: 'Ramesh Painting Contractors', payeePan: 'AAAPR4821K', nature: 'Contractor payment — site work', voucherNo: 'BILL-0033', paymentDate: iso(monthDay(0, 12)), grossAmount: 128000, ratePct: 2, depositDate: null, challanNo: null, depositBank: null },
  { id: 10, section: '194J', payeeName: 'Mehta & Associates LLP', payeePan: 'AAFFM2345C', nature: 'Professional fees — tax return filing', voucherNo: 'BILL-0034', paymentDate: iso(monthDay(0, 19)), grossAmount: 45000, ratePct: 10, depositDate: null, challanNo: null, depositBank: null },
];

/**
 * TDS returns — Form 26Q, filed quarterly.
 *
 * The amounts are not stored: each quarter's figure is summed from the entries
 * whose payment date falls inside it, so a payment recorded today shows up in
 * the quarter it belongs to rather than in a snapshot that has to be rebuilt.
 */
export const TDS_RETURNS = [
  { id: '26Q Q1', quarter: 'Q1', financialYear: 'Apr – Jun', dueDate: iso(new Date(AY_START_YEAR, 6, 31)), filedOn: iso(new Date(AY_START_YEAR, 6, 28)), form26AQ: '26AAQFR9012E1ZF000001' },
  { id: '26Q Q2', quarter: 'Q2', financialYear: 'Jul – Sep', dueDate: iso(new Date(AY_START_YEAR, 9, 31)), filedOn: null, form26AQ: null },
  { id: '26Q Q3', quarter: 'Q3', financialYear: 'Oct – Dec', dueDate: iso(new Date(AY_START_YEAR + 1, 0, 31)), filedOn: null, form26AQ: null },
  { id: '26Q Q4', quarter: 'Q4', financialYear: 'Jan – Mar', dueDate: iso(new Date(AY_START_YEAR + 1, 3, 30)), filedOn: null, form26AQ: null },
];

/* -------------------------------------------------------------- Advance tax -- */

/** Instalment due dates for the current year: 15 Jun / 15 Sep / 15 Dec / 15 Mar. */
export const ADVANCE_TAX_DUE_DATES = [
  { instalmentNo: 1, label: 'First instalment', dueDate: iso(new Date(AY_START_YEAR, 5, 15)), share: 15 },
  { instalmentNo: 2, label: 'Second instalment', dueDate: iso(new Date(AY_START_YEAR, 8, 15)), share: 45 },
  { instalmentNo: 3, label: 'Third instalment', dueDate: iso(new Date(AY_START_YEAR, 11, 15)), share: 75 },
  { instalmentNo: 4, label: 'Fourth instalment', dueDate: iso(new Date(AY_START_YEAR + 1, 2, 15)), share: 100 },
];

/**
 * Advance tax under the presumptive scheme.
 *
 * `declaredRatePct` is the deemed profit rate, not the tax rate: 6% of turnover
 * under section 44AD for a business, 50% of receipts under section 44ADA for a
 * profession. The tax on top of it and the instalment split are computed on the
 * screen from the ledger's own turnover figure, so a change to the books moves
 * the instalment rather than leaving a stale number on screen.
 *
 * `payments` records only WHICH instalments were paid and when. The amount is
 * looked up from the computed schedule — see LendingView for the same pattern.
 */
export const ADVANCE_TAX = {
  assessmentYear: `AY ${AY_START_YEAR}-${String(AY_START_YEAR + 1).slice(2)}`,
  section: '44AD',
  sectionLabel: 'Presumptive taxation — business income u/s 44AD',
  basis: '6% of annual turnover deemed as business profit',
  declaredRatePct: 6,
  paidThresholdPct: 90,
  slabRatePct: 30,
  payments: ADVANCE_TAX_DUE_DATES.map((i) => {
    const paidOn = iso(monthBefore(i.dueDate, 5));
    return paidOn <= iso(TODAY)
      ? { instalmentNo: i.instalmentNo, paidOn, challanNo: `CHL-ADV-${AY_START_YEAR}-${i.instalmentNo}`, bank: 'HDFC Bank' }
      : null;
  }).filter(Boolean),
};

/** `count` days before an ISO date. */
function monthBefore(isoDate, count) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, m - 1, d - count);
}

/* ------------------------------------------------------------------ Lending -- */

/**
 * Loans.
 *
 * Repayments record WHICH instalment number was paid and when, never the amount
 * — the amount comes off the amortisation schedule the screen computes, so a
 * repayment can never disagree with the instalment it claims to have settled.
 */
export const LOANS = [
  {
    id: 1,
    name: 'Term loan — Siddhivinayak Road project',
    lender: 'HDFC Bank',
    lenderType: 'Bank',
    accountNo: '50200038719421',
    principal: 1500000,
    annualRatePct: 10.5,
    termMonths: 60,
    repaymentType: 'EMI',
    startDate: iso(monthDay(14, 5)),
    purpose: 'Working capital for the irrigation installation contract',
    secured: true,
    collateral: 'Plot SH-14, Bhiwandi MIDC, and the excavator on finance',
    ledgerAccount: 'Term Loan — HDFC Bank (long-term liability)',
    repayments: Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      instalmentNo: i + 1,
      date: iso(monthDay(13 - i, 5)),
      mode: i % 3 === 0 ? 'NEFT' : 'UPI',
      reference: `HDFCCN${31000000 + i * 7919}`,
    })),
  },
  {
    id: 2,
    name: 'Vehicle loan — tipper',
    lender: 'Mahindra Finance Ltd',
    lenderType: 'NBFC',
    accountNo: 'MF/9920/4417',
    principal: 450000,
    annualRatePct: 11.75,
    termMonths: 48,
    repaymentType: 'EMI',
    startDate: iso(monthDay(26, 12)),
    purpose: 'Tipper and landscaping equipment',
    secured: true,
    collateral: 'Hypothecation of the tipper, registration no MH12AB1234',
    ledgerAccount: 'Vehicle Loan — Mahindra Finance (long-term liability)',
    repayments: Array.from({ length: 22 }, (_, i) => ({
      id: 100 + i,
      instalmentNo: i + 1,
      date: iso(monthDay(25 - i, 12)),
      mode: 'Auto-debit',
      reference: `MFL${55000000 + i * 5417}`,
    })),
  },
  {
    id: 3,
    name: 'Supplier credit — nursery stock',
    lender: 'Deccan Nursery',
    lenderType: 'Vendor',
    accountNo: null,
    principal: 180000,
    annualRatePct: 0,
    termMonths: 12,
    repaymentType: 'Interest free',
    startDate: iso(monthDay(9, 20)),
    purpose: 'Six-month credit for a bulk plant order',
    secured: false,
    collateral: null,
    ledgerAccount: 'Trade payable — Deccan Nursery',
    repayments: [
      { id: 200, instalmentNo: 1, date: iso(monthDay(7, 20)), mode: 'Cheque', reference: '004812' },
      { id: 201, instalmentNo: 2, date: iso(monthDay(5, 20)), mode: 'Cheque', reference: '004913' },
      { id: 202, instalmentNo: 3, date: iso(monthDay(3, 20)), mode: 'Cheque', reference: '005024' },
    ],
  },
];

/** The whole extension, spread into `SEED`. */
export const INDIA_TAX_SEED = {
  taxRates: GST_TAX_RATES,
  gstRegistration: GST_REGISTRATION,
  gstReturns: GST_RETURNS,
  gstSalesInvoices: GST_SALES_INVOICES,
  gstItcInvoices: GST_ITC_INVOICES,
  tdsEntries: TDS_ENTRIES,
  tdsReturns: TDS_RETURNS,
  advanceTax: ADVANCE_TAX,
  advanceTaxDueDates: ADVANCE_TAX_DUE_DATES,
  loans: LOANS,
};

export default INDIA_TAX_SEED;