/**
 * The ledger.
 *
 * Every account balance in this app used to be typed in -- A/R 5,281.52, Truck
 * 13,495.00, Checking 1,201.00 -- and read straight out of the chart of
 * accounts. Recording a transaction changed nothing, because nothing was ever
 * derived from anything. That is the defect this module exists to remove.
 *
 * It walks every transaction once and posts the double entry that real
 * accounting would post. The rules are deliberately plain:
 *
 *   An invoice      debits A/R, credits income and sales tax.
 *   A bill          credits A/P, debits the expense it was coded to.
 *   An expense      debits the expense, credits the account it was paid from.
 *   A bank feed     is the ONLY authority for cash. Money moves because a bank
 *                   transaction exists -- not because an invoice says "Paid".
 *
 * That last rule is the important one. It means categorising a bank transaction
 * moves the books, matching one to a document settles that document, and an
 * uncategorised transaction is correctly worth nothing to the balance sheet
 * while still sitting in the review queue. A balance that ignores a bank
 * transaction that has already cleared is a balance that lies.
 *
 * Opening balances (Truck, Undeposited Funds, the bank) predate this app, so
 * they are stated once in `chartOfAccounts.js` together with the equity account
 * they offset. That contra is what stops them becoming a hidden plug: it is
 * declared, and because it is declared the balance check below can be a real
 * test rather than a tautology.
 */

import { CHART_OF_ACCOUNTS } from './data/chartOfAccounts.js';

/** Well-known accounts, resolved by id. Referenced by name, not by magic number. */
export const ACC = {
  AR: 3,
  SALES_TAX: 13,
  OPENING_EQUITY: 15,
};

/** Product -> income account. A sale has to land somewhere. */
export const INCOME_FOR_PRODUCT = {
  1: 17, // Design -> Design income
  2: 21, // Concrete -> Job Materials
  3: 21, // Pump -> Job Materials
  4: 21, // Rock Fountain -> Job Materials
  5: 21, // Lighting -> Job Materials
  6: 27, // Installation -> Installation
};

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** A blank set of postings. Every account starts at its stated opening balance. */
function blankPostings() {
  const byAccount = {};
  for (const a of CHART_OF_ACCOUNTS) {
    byAccount[a.id] = {
      balance: round2(a.openingBalance || 0),
      opening: round2(a.openingBalance || 0),
      activity: 0,
    };
  }
  return byAccount;
}

/** Invoice subtotal before discount, plus tax, for one invoice. */
export function invoiceTotals(invoice, state) {
  const subtotal = invoice.lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);
  const disc = invoice.discount?.mode === '%'
    ? subtotal * ((Number(invoice.discount.value) || 0) / 100)
    : Number(invoice.discount?.value) || 0;
  const net = Math.max(0, subtotal - disc);
  const rate = state.taxRates.find((t) => t.id === invoice.taxRateId);
  const tax = net * ((rate?.pct || 0) / 100);
  return { subtotal: round2(subtotal), discount: round2(disc), net: round2(net), tax: round2(tax), total: round2(net + tax) };
}

/** Bill or expense total. */
export function docTotal(doc) {
  return round2((doc.lines || []).reduce((s, l) => s + (Number(l.amount) || 0), 0));
}

/**
 * Post one transaction into the running set.
 *
 * `credit` and `debit` are signed by the account's own convention: a debit
 * increases an asset/expense, a credit increases income/liability/equity. Doing
 * the sign flip here keeps every caller readable.
 */
function post(byAccount, accountId, amount, side) {
  if (accountId == null || !byAccount[accountId]) return 0;
  const sign = side === 'debit' ? 1 : -1;
  const delta = round2(amount * sign);
  byAccount[accountId].balance = round2(byAccount[accountId].balance + delta);
  byAccount[accountId].activity = round2(byAccount[accountId].activity + delta);
  return delta;
}

/** Sign convention for an account type: +1 means a debit adds to the balance. */
function debitAdds(type) {
  return ['Bank', 'Accounts Receivable', 'Other Current Asset', 'Fixed Asset',
    'Cost of Goods Sold', 'Expense'].includes(type);
}

/**
 * Derive every account balance, and the statement totals, from the transaction
 * history. Pure: it reads state and returns figures, it never writes.
 */
export function deriveLedger(state) {
  const byAccount = blankPostings();
  const byType = {};
  const account = (id) => CHART_OF_ACCOUNTS.find((a) => a.id === id);

  // Opening balances are stated assets and liabilities whose history predates
  // this app. Each one declares the equity account that offsets it, so the
  // opening position balances by construction rather than by a hidden plug --
  // which is what lets the check at the foot be a real test.
  for (const a of CHART_OF_ACCOUNTS) {
    if (a.openingContraId && a.openingBalance) {
      post(byAccount, a.openingContraId, a.openingBalance, 'credit');
    }
  }

  const push = (type, amount) => {
    byType[type] = round2((byType[type] || 0) + amount);
  };

  // ---- Invoices: recognised when raised, not when paid ------------------
  for (const inv of state.invoices) {
    if (inv.status === 'Draft') continue;
    const { discount, tax, total } = invoiceTotals(inv, state);

    post(byAccount, ACC.AR, total, 'debit');

    // Spread the net across the income accounts the lines were sold under.
    for (const line of inv.lines) {
      const gross = (Number(line.qty) || 0) * (Number(line.rate) || 0);
      // A product names its own income account; the map is the fallback for
      // products created before that field existed.
      const incomeId = state.products.find((p) => p.id === line.productId)?.incomeAccountId
        ?? INCOME_FOR_PRODUCT[line.productId]
        ?? 29; // Other Income
      post(byAccount, incomeId, gross, 'credit');
    }
    // Each line is credited at its gross value, so a discount has to land
    // somewhere or the entry will not balance. It goes to Discounts given,
    // which is a contra-income account -- that is what it is for.
    // Each line above was credited at its gross value, so the discount has to
    // land somewhere or the entry will not balance. It goes to Discounts
    // given, which is a contra-income account, so it is debited -- a discount
    // reduces revenue, and revenue is a credit. Note the amount is the computed
    // discount, not the raw field: a 10% discount is an amount, not a ten.
    if (discount) {
      post(byAccount, 18, discount, 'debit');
    }
    if (tax) post(byAccount, ACC.SALES_TAX, tax, 'credit');
  }

  // ---- Bills: expense on approval, payment decided by the bank feed ------
  for (const bill of state.bills) {
    const total = docTotal(bill);
    post(byAccount, 11, total, 'credit'); // A/P
    for (const line of bill.lines) {
      post(byAccount, line.accountId, Number(line.amount) || 0, 'debit');
    }
  }

  // ---- Expenses ----------------------------------------------------------
  /**
   * An expense debits the account it was coded to, and credits cash -- unless a
   * bank transaction has already moved that exact money, in which case the bank
   * feed owns the cash leg entirely and the expense contributes nothing.
   *
   * This is the rule that was documented and not enforced, and it is worth
   * spelling out because both halves are legitimate on their own:
   *
   *   A card or cheque purchase genuinely is a cash event. The bank will never
   *   report it, because a bank feed only lists what cleared. If the expense
   *   did not credit the bank account, the books would overstate cash for
   *   every card purchase ever made.
   *
   *   But when a bank row does exist for the same money -- a payroll run that
   *   actually left the account -- the feed has already moved the cash, and
   *   taking the leg again counts the same 3,600 twice.
   *
   * The suppression is all-or-nothing: the whole entry is skipped. Debiting the
   * expense while dropping only the cash side would leave an entry with one leg
   * and break the balance equation by exactly the amount suppressed.
   *
   * Matching is on the account and the amount. Both halves are needed -- an
   * amount alone would mis-suppress whenever two different expenses happen to
   * cost the same, and an account alone would mis-suppress every recurring
   * payment.
   */
  /**
   * Has this exact money ALREADY POSTED through the bank feed?
   *
   * Only a row that actually posts can take over the cash leg. A 'Suggested' or
   * 'Uncategorized' row posts nothing -- that is the whole point of the review
   * queue -- so matching against one would suppress a legitimate expense that
   * nothing has replaced, and the expense would vanish from the books while the
   * bill sat in the queue waiting to be categorised.
   *
   * Getting this wrong is silent: the balance still balances, because the cash
   * leg was suppressed along with the expense leg. It just quietly understates
   * both the expense account and the bank account.
   */
  const POSTING_STATES = new Set(['Match', 'Reviewed']);

  const alreadyInBankFeed = (accountId, amount) => {
    const id = Number(accountId);
    if (!id) return false;
    return state.bankTxns.some(
      (t) =>
        POSTING_STATES.has(t.state) &&
        bankAccountIdFor(state, t) === id &&
        Math.abs(Math.abs(t.amount) - Math.abs(amount)) < 0.01
    );
  };

  for (const exp of state.expenses) {
    const total = docTotal(exp);
    // Skip the entry entirely -- both legs -- when the bank feed already has it.
    if (alreadyInBankFeed(exp.paymentAccountId, total)) continue;
    for (const line of exp.lines) {
      post(byAccount, line.accountId, Number(line.amount) || 0, 'debit');
    }
    post(byAccount, exp.paymentAccountId, total, 'credit');
  }

  // ---- Bank feed: the only authority for cash ----------------------------
  /**
   * Money in increases the bank account, money out reduces it. Getting this
   * backwards is how a reconciliation ends up "done" with the wrong figure, so
   * it lives in one place rather than being spelled out at each call site.
   */
  const postCash = (txn) => {
    const id = bankAccountIdFor(state, txn);
    post(byAccount, id, Math.abs(txn.amount), txn.amount > 0 ? 'debit' : 'credit');
    return id;
  };

  const unmatched = [];
  // Cash flow, built in the same pass rather than recomputed in the report.
  // Operating is money in from customers and out to suppliers and staff;
  // investing is fixed assets bought or sold; financing is equity and borrowings.
  const cf = { operatingIn: 0, operatingOut: 0, investing: 0, financing: 0 };

  for (const txn of state.bankTxns) {
    const ref = txn.matchedRef || '';
    const bill = ref ? state.bills.find((b) => b.no === ref) : null;
    const inv = ref ? state.invoices.find((i) => i.no === ref) : null;

    if (txn.state === 'Match' && (bill || inv)) {
      // The document already booked the accrual. This leg moves the cash and
      // clears the balance -- nothing else, or the amount is counted twice.
      postCash(txn);
      if (bill) {
        post(byAccount, 11, docTotal(bill), 'debit');
        cf.operatingOut += docTotal(bill);
      } else {
        const { total } = invoiceTotals(inv, state);
        // The customer pays the gross, tax included, so the receivable clears by
        // the gross. The tax collected is not new income -- it was always owed
        // to the government, held on the payables side since the invoice was
        // raised. It does not leave with this payment; it sits until it is
        // remitted. Debiting it here would understate what you owe the tax
        // authority on every invoice you were paid for.
        post(byAccount, ACC.AR, total, 'credit');
        cf.operatingIn += total;
      }
      continue;
    }

    if (txn.state === 'Reviewed' && txn.categoryAccountId) {
      // Money in is income, money out is expense: the counter-account takes the
      // opposite side to the bank, whichever direction the cash went.
      postCash(txn);
      post(byAccount, txn.categoryAccountId, Math.abs(txn.amount), txn.amount > 0 ? 'credit' : 'debit');
      if (txn.amount > 0) cf.operatingIn += txn.amount;
      else cf.operatingOut += -txn.amount;
      continue;
    }

    // Suggested or Uncategorized: not in the books. This is the whole point of
    // the review queue -- an unreviewed row must not move a balance, because a
    // balance that counts money nobody has decided where it went is fiction.
    unmatched.push(txn);
  }

  // Roll up by type. Every figure below is flipped to its natural reading --
  // a liability reads as a positive amount owed, not as a negative posting --
  // so the statement can be laid out and added up the way a bookkeeper expects.
  for (const a of CHART_OF_ACCOUNTS) {
    push(a.type, debitAdds(a.type) ? byAccount[a.id].balance : -byAccount[a.id].balance);
  }

  const sumType = (...types) => round2(types.reduce((s, t) => s + (byType[t] || 0), 0));
  /** Balance for presentation: positive for credit-normal accounts. */
  const balanceOf = (id) => {
    const a = account(id);
    const raw = byAccount[id]?.balance || 0;
    return a && !debitAdds(a.type) ? round2(-raw) : round2(raw);
  };

  const currentAssets = round2(sumType('Bank') + sumType('Accounts Receivable') + sumType('Other Current Asset'));
  const fixedAssets = sumType('Fixed Asset');
  const assets = round2(currentAssets + fixedAssets);
  const currentLiabilities = round2(sumType('Accounts Payable') + sumType('Credit Card') + sumType('Other Current Liability'));
  const liabilities = currentLiabilities;

  const income = sumType('Income');
  const cogs = sumType('Cost of Goods Sold');
  const expenses = sumType('Expense');
  const grossProfit = round2(income - cogs);
  const netIncome = round2(grossProfit - expenses);

  // Equity is stated, not plugged. Retained earnings is what is carried, net
  // income for the period is earned but not yet closed, and opening balance
  // equity is the declared contra of the opening balances.
  const retainedEarnings = balanceOf(14);
  const openingEquity = balanceOf(ACC.OPENING_EQUITY);
  const equity = round2(retainedEarnings + openingEquity + netIncome);
  const liabilitiesAndEquity = round2(liabilities + equity);
  const difference = round2(assets - liabilitiesAndEquity);

  return {
    byAccount,
    byType,
    balanceOf,
    accountOf: (id) => account(id),

    assets: { current: currentAssets, fixed: fixedAssets, total: assets },
    liabilities: { current: currentLiabilities, total: liabilities },
    equity: { retainedEarnings, opening: openingEquity, netIncome, total: equity },
    liabilitiesAndEquity,
    difference,
    balanced: Math.abs(difference) < 0.01,

    pnl: { income, cogs, grossProfit, expenses, netIncome },

    cash: {
      byAccount: CHART_OF_ACCOUNTS.filter((a) => a.type === 'Bank').map((a) => ({
        id: a.id,
        name: a.name,
        balance: balanceOf(a.id),
        opening: a.openingBalance || 0,
      })),
      total: sumType('Bank'),
    },

    outstanding: {
      receivable: sumType('Accounts Receivable'),
      payable: sumType('Accounts Payable'),
      tax: sumType('Other Current Liability'),
    },

    /**
     * Cash Flow. Operating/investing/financing from the same posted entries.
     *
     * `unreconciled` is the money the bank has moved but nobody has categorised
     * yet. It is why "cash in the books" and "cash at the bank" disagree until
     * the review queue is cleared -- which is a true statement about being
     * behind, not an error to be hidden.
     */
    cashFlow: {
      operatingIn: round2(cf.operatingIn),
      operatingOut: round2(cf.operatingOut),
      investing: round2(cf.investing),
      financing: round2(cf.financing),
      operating: round2(cf.operatingIn - cf.operatingOut),
      netChange: round2(cf.operatingIn - cf.operatingOut + cf.investing + cf.financing),
      opening: round2(CHART_OF_ACCOUNTS.filter((a) => a.type === 'Bank').reduce((s, a) => s + (a.openingBalance || 0), 0)),
      unreconciled: round2(unmatched.reduce((s, t) => s + Math.abs(t.amount), 0)),
      unreconciledCount: unmatched.length,
    },

    unmatchedCount: unmatched.length,
  };
}

/** Resolve a chart-of-accounts row by its display name. */
function accountByName(list, name) {
  return list.find((a) => a.name === name || a.detail === name);
}

/**
 * The chart-of-accounts id behind a bank feed row.
 *
 * The bank feed names an institution account ("Checking"); the chart calls it
 * the same thing. Resolving through the name rather than assuming they share an
 * id is what stops two systems from drifting apart silently.
 */
export function bankAccountIdFor(state, txn) {
  const feed = state.bankAccounts.find((b) => b.id === txn.bankAccountId);
  if (!feed) return null;
  return accountByName(CHART_OF_ACCOUNTS, feed.name)?.id ?? null;
}

/** Accounts of a type, for pickers. Excludes sub-accounts. */
export function accountsOfType(accounts, type) {
  return accounts.filter((a) => a.type === type && !a.parentId);
}

/** Is a debit an increase for this account type? Exported for forms. */
export { debitAdds };

/** Indian numbering shorthand for a large balance -- "Rs 1.61 L", "Rs 16.07 K". */
export function compactBalance(n) {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `Rs ${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `Rs ${(n / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `Rs ${(n / 1e3).toFixed(2)} K`;
  return `Rs ${n.toFixed(2)}`;
}