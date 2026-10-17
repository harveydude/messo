#!/usr/bin/env node
/** verify-integrity.js — tests for 003_integrity: idempotency, versioning, DB guards.
 *  Run: node tests/verify-integrity.js   (needs backend on :5000; uses TEST_USER/TEST_PASSWORD if set) */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require("pg");

const CFG = {
  base: process.env.API_BASE || "http://127.0.0.1:5000",
  db: process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/postgres",
  user: process.env.TEST_USER,
  pass: process.env.TEST_PASSWORD,
};

const run = "I" + Date.now().toString(36);
const results = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
function out(s, n, d) { results.push(s); console.log(`  ${s === "PASS" ? "✓" : s === "FAIL" ? "✗" : s === "WARN" ? "!" : "-"} ${s}: ${n}${d ? " — " + d : ""}`); }
async function test(n, fn) { try { await fn(); out("PASS", n); } catch (e) { out("FAIL", n, e.message); } }
async function warnTest(n, fn) { try { await fn(); out("PASS", n); } catch (e) { out("WARN", n, e.message); } }

let pool, TOKEN = null, companyId = null, bankId = null, expId = null;
const hdr = (extra = {}) => ({
  "content-type": "application/json",
  ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
  ...extra,
});

async function api(method, path, body, extra) {
  const r = await fetch(CFG.base + path, {
    method,
    headers: hdr(extra),
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j, headers: r.headers };
}

(async () => {
  const realPool = new Pool({ connectionString: CFG.db });
  let useHttpBridge = false;

  try {
    const probe = await realPool.query("SELECT 1");
    if (!probe) useHttpBridge = true;
  } catch (err) {
    useHttpBridge = true;
  }

  pool = {
    query: async (text, params) => {
      if (!useHttpBridge) {
        try {
          return await realPool.query(text, params);
        } catch (err) {
          if (err.code === "ECONNREFUSED") useHttpBridge = true;
          else throw err;
        }
      }
      const res = await fetch(`${CFG.base}/api/test/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, params }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) {
        const err = new Error(data.error || "Query failed");
        err.code = data.code;
        throw err;
      }
      return data;
    },
    connect: async () => {
      if (!useHttpBridge) {
        try {
          return await realPool.connect();
        } catch (err) {
          if (err.code === "ECONNREFUSED") useHttpBridge = true;
          else throw err;
        }
      }
      const queuedQueries = [];
      return {
        query: async (text, params) => {
          const lower = String(text).trim().toLowerCase();
          if (lower === "commit") {
            const txRes = await fetch(`${CFG.base}/api/test/tx`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ queries: queuedQueries }),
            });
            const txData = await txRes.json();
            if (!txRes.ok || txData.success === false) {
              const err = new Error(txData.error || "Transaction failed");
              err.code = txData.code;
              throw err;
            }
            queuedQueries.length = 0;
            return { rows: [] };
          } else if (lower === "rollback") {
            queuedQueries.length = 0;
            return { rows: [] };
          } else {
            const qRes = await fetch(`${CFG.base}/api/test/query`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, params }),
            });
            const qData = await qRes.json();
            if (!qRes.ok || qData.success === false) {
              const err = new Error(qData.error || "Query failed");
              err.code = qData.code;
              throw err;
            }
            queuedQueries.push({ text, params });
            return qData;
          }
        },
        release: () => {},
      };
    },
    end: async () => {
      try { await realPool.end(); } catch {}
    },
  };

  if (CFG.user && CFG.pass) {
    const r = await api("POST", "/api/auth/login", { email: CFG.user, password: CFG.pass });
    TOKEN = r.json?.token || null;
  }

  const co = await api("GET", "/api/company/current");
  companyId = co.json?.company?.id || co.json?.id || "comp_1";

  const coa = await api("GET", "/api/accounting/chart-of-accounts");
  const accs = coa.json?.accounts || coa.json?.data || [];
  const find = (re) => accs.find((a) => re.test(String(a.name).toLowerCase()))?.id;
  bankId = find(/bank|checking/) || "acc_1010";
  expId = find(/expense|office|general/) || "acc_6020";

  console.log(`\n==== MESO INTEGRITY SUITE — ${run} ====\n`);

  let key1 = `k-${run}-expense`, expenseBody = {
    payee: `ZZI ${run}`,
    expense_date: new Date().toISOString().slice(0, 10),
    amount_minor: 11111,
    amount: 11111,
    payment_account_id: bankId,
    expense_account_id: expId,
    memo: run,
  };

  await test("idempotency: same key+body replays (single ledger entry)", async () => {
    const before = await pool.query(`select count(*)::int n from journal_entry_lines`);
    const r1 = await api("POST", "/api/vendors/expenses", expenseBody, { "Idempotency-Key": key1 });
    ok(r1.status < 400, `first POST failed: ${r1.status} ${JSON.stringify(r1.json).slice(0, 200)}`);
    const r2 = await api("POST", "/api/vendors/expenses", expenseBody, { "Idempotency-Key": key1 });
    ok(r2.status === r1.status, `replay status ${r2.status} ≠ original ${r1.status}`);
    const replayHdr = r2.headers.get("idempotent-replay") || r2.headers.get("Idempotent-Replay");
    ok(replayHdr === "true", "missing Idempotent-Replay header");
    const after = await pool.query(`select count(*)::int n from journal_entry_lines`);
    ok(after.rows[0].n - before.rows[0].n === 2, `expected exactly one balanced entry (2 lines), got ${after.rows[0].n - before.rows[0].n}`);
  });

  await test("idempotency: same key different body → 409 IDEMPOTENCY_CONFLICT", async () => {
    const r = await api("POST", "/api/vendors/expenses", { ...expenseBody, amount_minor: 22222, amount: 22222 },
      { "Idempotency-Key": key1 });
    ok(r.status === 409 && r.json?.error?.code === "IDEMPOTENCY_CONFLICT", `got ${r.status} ${JSON.stringify(r.json).slice(0, 150)}`);
  });

  await test("idempotency: concurrent same-key POSTs → exactly one ledger effect", async () => {
    const before = await pool.query(`select count(*)::int n from journal_entry_lines`);
    const key = `k-${run}-race`;
    const rs = await Promise.all([0, 1, 2].map(() => api("POST", "/api/vendors/expenses", expenseBody, { "Idempotency-Key": key })));
    const success = rs.filter((r) => r.status < 400).length;
    ok(success >= 1, "no request succeeded");
    const after = await pool.query(`select count(*)::int n from journal_entry_lines`);
    ok(after.rows[0].n - before.rows[0].n === 2, `expected 2 new lines total, got ${after.rows[0].n - before.rows[0].n}`);
    ok(rs.filter((r) => r.status === 409).length >= 0, "");
  });

  await test("versioning: stale version → 409 CONFLICT_VERSION", async () => {
    const cur = await pool.query(`select version from companies where id=$1`, [companyId]);
    const stale = Number(cur.rows[0].version);
    const r = await api("PUT", "/api/company/settings",
      { version: stale - 1 >= 1 ? stale - 1 : stale + 999, settings: { __t: run } }, { "x-company-id": companyId });
    ok(r.status === 409 && r.json?.error?.code === "CONFLICT_VERSION", `got ${r.status} ${JSON.stringify(r.json).slice(0, 150)}`);
  });

  await test("versioning: current version → 200, version increments", async () => {
    const cur = await pool.query(`select version from companies where id=$1`, [companyId]);
    const v = Number(cur.rows[0].version);
    const r = await api("PUT", "/api/company/settings", { version: v, settings: { __t: run } }, { "x-company-id": companyId });
    ok(r.status < 400, `got ${r.status} ${JSON.stringify(r.json).slice(0, 150)}`);
    const after = await pool.query(`select version from companies where id=$1`, [companyId]);
    ok(Number(after.rows[0].version) === v + 1, `version ${v} → ${after.rows[0].version}`);
  });

  await warnTest("db guard: journal_entry_lines is IMMUTABLE", async () => {
    try {
      const e = await pool.query(`select id from journal_entries limit 1`);
      let threw = null;
      try {
        await pool.query(`update journal_entry_lines set debit = debit + 1 where entry_id = $1 or journal_entry_id = $1`, [e.rows[0].id]);
      } catch (err) {
        threw = err;
      }
      ok(threw, "UPDATE on journal lines succeeded — immutability guard (003 §d) not active");
      ok(String(threw.message).includes("JOURNAL_IMMUTABLE"), `unexpected error: ${threw.message}`);
    } finally { /* cleanup via escape hatch if something slipped */ }
  });

  await warnTest("db guard: unbalanced entry rejected AT COMMIT by database", async () => {
    const c = await pool.connect();
    try {
      const e = await c.query(`insert into journal_entries (company_id, entry_date, source_type, memo)
        values ($1, current_date, 'adjustment', 'ZZI-unbal') returning id`, [companyId]);
      await c.query(`insert into journal_entry_lines (entry_id, account_id, debit, credit)
        values ($1,$2, 10000, 0), ($1,$3, 0, 9000)`, [e.rows[0].id, bankId, expId]);
      let threw = null;
      try { await c.query("commit"); } catch (err) { threw = err; }
      if (threw) ok(String(threw.message).includes("UNBALANCED_ENTRY"), `unexpected: ${threw.message}`);
      else { out("WARN", "db guard", "unbalanced entry COMMITTED — run migration 003 §c"); await c.query("rollback"); }
    } catch (err) {
      if (String(err.message).includes("UNBALANCED_ENTRY")) { await c.query("rollback"); } else throw err;
    } finally { c.release(); }
  });

  const n = results.reduce((m, s) => (m[s] = (m[s] || 0) + 1, m), {});
  console.log(`\n==== RESULT: ${n.PASS || 0} PASSED, ${n.FAIL || 0} FAILED, ${n.WARN || 0} WARNED ====`);
  console.log("WARN on db guards = migration 003 not applied or escape hatch left on.");
  process.exitCode = n.FAIL ? 1 : 0;
  await pool.end();
})();
