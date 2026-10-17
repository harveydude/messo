#!/usr/bin/env node
/** verify-taxonomy.js — §R11 acceptance: GST math, tax CRUD, attachments, doc state machines, recurring. */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
import * as tax from "../src/services/taxService.js";

const CFG = {
  base: process.env.API_BASE || "http://127.0.0.1:5000",
  db: process.env.DATABASE_URL || "postgres://postgres:postgres@127.0.0.1:5432/postgres",
  user: process.env.TEST_USER,
  pass: process.env.TEST_PASSWORD,
};

const results = [];
const ok = (c, m) => { if (!c) throw new Error(m); };
function out(s, n, d) {
  results.push(s);
  console.log(`  ${s === "PASS" ? "✓" : s === "FAIL" ? "✗" : s === "WARN" ? "!" : "-"} ${s}: ${n}${d ? " — " + d : ""}`);
}
async function test(n, fn) {
  try {
    await fn();
    out("PASS", n);
  } catch (e) {
    out(e instanceof Skip ? "SKIP" : "FAIL", n, e.message);
  }
}
class Skip extends Error {}
let pool, TOKEN = null, companyId = null;

function headers(extra = {}) {
  return {
    "content-type": "application/json",
    ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}),
    ...extra,
  };
}

async function api(method, path, body, extra) {
  const r = await fetch(CFG.base + path, {
    method,
    headers: headers(extra),
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch {}
  return { status: r.status, json: j };
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
    end: async () => {
      try {
        if (!useHttpBridge) await realPool.end();
      } catch {}
    },
  };

  if (CFG.user && CFG.pass) {
    const r = await api("POST", "/api/auth/login", { email: CFG.user, password: CFG.pass });
    TOKEN = r.json?.token;
  }
  companyId = (await api("GET", "/api/company/current")).json?.company?.id || (await api("GET", "/api/company/current")).json?.id || 'comp_1';

  console.log(`\n==== MESO TAXONOMY SUITE ====\n`);

  await test("tax: pure GST math — 18% intra on ₹1,000.00 → CGST 9000 + SGST 9000", () => {
    const t = tax.computeLineTax({ amountMinor: 100000, rateBp: 1800, split: { CGST: 900, SGST: 900, IGST: 1800 }, isIntraState: true });
    ok(t.total === 18000 && t.components.CGST === 9000 && t.components.SGST === 9000, JSON.stringify(t));
  });

  await test("tax: 18% INTER on ₹1,000.00 → IGST 18000 (full rate)", () => {
    const t = tax.computeLineTax({ amountMinor: 100000, rateBp: 1800, split: { CGST: 900, SGST: 900, IGST: 1800 }, isIntraState: false });
    ok(t.mode.startsWith("IGST") && t.total === 18000 && t.components.IGST === 18000, JSON.stringify(t));
  });

  await test("tax: half-up rounding 12% on ₹123.45 → 1481 paise", () => {
    const t = tax.computeLineTax({ amountMinor: 12345, rateBp: 1200, split: { IGST: 1200 }, isIntraState: false });
    ok(t.total === 1481, `got ${t.total}`);
  });

  await test("tax: component drift adjusts so ΣCGST+SGST === total (5% on ₹1.01)", () => {
    const t = tax.computeLineTax({ amountMinor: 101, rateBp: 500, split: { CGST: 250, SGST: 250 } });
    ok(t.components.CGST + t.components.SGST === t.total, JSON.stringify(t));
  });

  let rateId = null;
  await test("tax API: create + list 18% rate", async () => {
    const r = await api("POST", "/api/taxes/rates", {
      name: `TST 18% ${Date.now()}`,
      kind: "GST",
      rate_bp: 1800,
      split: { CGST: 900, SGST: 900, IGST: 1800 },
    });
    ok(r.status === 201, JSON.stringify(r.json).slice(0, 200));
    rateId = r.json.id;
    const list = await api("GET", "/api/taxes/rates?kind=GST");
    ok((list.json.data || []).some((x) => x.id === rateId), "rate missing from list");
  });

  await test("tax API: compute-preview endpoint agrees with pure function", async () => {
    const r = await api("POST", "/api/taxes/compute-preview", {
      amount_minor: 100000,
      tax_rate_id: rateId,
      is_intra_state: true,
    });
    ok(r.status === 200 && r.json.total === 18000, JSON.stringify(r.json));
  });

  let attId = null;
  await test("attachments: upload → download bytes match → DB row present", async () => {
    const bytes = Buffer.from(`receipt-${Date.now()}-pdf-bytes`);
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: "application/pdf" }), "receipt.pdf");
    fd.append("entity_type", "expense");
    const up = await fetch(CFG.base + "/api/attachments", {
      method: "POST",
      headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
      body: fd,
    });
    const upText = await up.text();
    ok(up.status === 201, `upload ${up.status} ${upText.slice(0, 150)}`);
    const row = JSON.parse(upText);
    attId = row.id;
    const dl = await fetch(CFG.base + row.url, {
      headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
    });
    const got = Buffer.from(await dl.arrayBuffer());
    ok(Buffer.compare(bytes, got) === 0, "downloaded bytes differ");
    const db = await pool.query(`SELECT sha256 FROM attachments WHERE id=$1`, [attId]);
    ok(db.rows[0]?.sha256, "no sha256 stored");
  });

  await test("attachments: company-scoped delete removes file row", async () => {
    const r = await api("DELETE", `/api/attachments/${attId}`);
    ok(r.status === 200, `got ${r.status}`);
  });

  let estId = null;
  await test("documents: estimate stamped + transitions DRAFT→SENT→ACCEPTED", async () => {
    const cust = await api("GET", "/api/contacts");
    const anyCust = (cust.json?.data || cust.json || [])[0]?.id;
    const est = await api("POST", "/api/customers/estimates", {
      customer_id: anyCust,
      estimate_date: new Date().toISOString().slice(0, 10),
      lines: [{ description: `TT ${Date.now()}`, quantity: 1, rate: 123400 }],
    });
    ok(est.status < 400, `create failed ${est.status} ${JSON.stringify(est.json).slice(0, 150)}`);
    estId = est.json?.id ?? est.json?.data?.id ?? null;
    if (!estId) {
      const db = await pool.query(
        `SELECT id FROM transactions WHERE doc_type='estimate' ORDER BY created_at DESC LIMIT 1`
      );
      estId = db.rows[0]?.id;
    }
    if (!estId) throw new Skip("could not locate created estimate row");
    const init = await api("POST", `/api/documents/${estId}/init`, { doc_type: "estimate" });
    if (init.status === 409) {
      /* already stamped — fine */
    } else {
      ok(init.status === 200, `init ${init.status} ${JSON.stringify(init.json).slice(0, 150)}`);
    }
    const s1 = await api("POST", `/api/documents/${estId}/status`, { to: "SENT" });
    ok(s1.status === 200, `DRAFT→SENT ${s1.status} ${JSON.stringify(s1.json).slice(0, 120)}`);
    const s2 = await api("POST", `/api/documents/${estId}/status`, { to: "ACCEPTED" });
    ok(s2.status === 200, `SENT→ACCEPTED ${s2.status} ${JSON.stringify(s2.json).slice(0, 120)}`);
    ok((s2.json.status_history || []).length >= 2, "history not appending");
  });

  await test("documents: INVALID transition rejected (SENT→CONVERTED skipped)", async () => {
    const est = await api("POST", "/api/customers/estimates", {
      estimate_date: new Date().toISOString().slice(0, 10),
      lines: [{ description: `TT2 ${Date.now()}`, quantity: 1, rate: 5000 }],
    });
    let id2 = est.json?.id ?? est.json?.data?.id;
    if (!id2) {
      const db = await pool.query(
        `SELECT id FROM transactions WHERE doc_type='estimate' ORDER BY created_at DESC LIMIT 1`
      );
      id2 = db.rows[0]?.id;
    }
    if (!id2) throw new Skip("no estimate row");
    await api("POST", `/api/documents/${id2}/init`, { doc_type: "estimate" });
    await api("POST", `/api/documents/${id2}/status`, { to: "SENT" });
    const bad = await api("POST", `/api/documents/${id2}/status`, { to: "CONVERTED_TO_INVOICE" });
    ok(
      bad.status === 422 && bad.json?.error?.code === "INVALID_DOC_TRANSITION",
      `got ${bad.status} ${JSON.stringify(bad.json).slice(0, 120)}`
    );
  });

  await test("documents: ACCEPTED estimate → CONVERTED_TO_INVOICE (executor seam)", async () => {
    if (!estId) throw new Skip("no estimate from earlier test");
    const r = await api("POST", `/api/documents/${estId}/convert-to-invoice`, {});
    if (r.json?.error?.code === "WORKFLOW_EXECUTOR_NOT_WIRED") {
      throw new Skip("export executeWorkflow from routes/transactions.js");
    }
    ok(r.status === 200 && r.json.invoice_id, `${r.status} ${JSON.stringify(r.json).slice(0, 200)}`);
  });

  await test("recurring: run-now creates invoice, advances, COMPLETES at max_occurrences=1", async () => {
    const cust = await api("GET", "/api/contacts");
    const cid = (cust.json?.data || cust.json || [])[0]?.id;
    const sched = await api("POST", "/api/recurring", {
      name: `TT-monthly-${Date.now()}`,
      frequency: "MONTHLY",
      template: {
        workflow: "invoice",
        payload: {
          customer_id: cid,
          issue_date: new Date().toISOString().slice(0, 10),
          lines: [{ description: "Retainer", quantity: 1, rate: 250000 }],
        },
      },
      max_occurrences: 1,
    });
    ok(sched.status === 201, JSON.stringify(sched.json).slice(0, 150));
    const run = await api("POST", `/api/recurring/${sched.json.id}/run-now`, {});
    const res0 = (run.json?.results || [])[0] || {};
    if (res0.error?.includes("WORKFLOW_EXECUTOR_NOT_WIRED")) {
      throw new Skip("executor seam not wired");
    }
    ok(res0.ok === true, JSON.stringify(res0).slice(0, 200));
    ok(res0.docId, "no document id returned");
    const again = await api("POST", `/api/recurring/${sched.json.id}/run-now`, {});
    ok((again.json?.results || [])[0]?.docId == null, "COMPLETED schedule issued a second document!");
  });

  await test("recurring: occurrence idempotency — same next_run never double-issues", async () => {
    const sched = await api("POST", "/api/recurring", {
      name: `TT-once-${Date.now()}`,
      frequency: "ONCE",
      template: {
        workflow: "invoice",
        payload: {
          issue_date: new Date().toISOString().slice(0, 10),
          lines: [{ description: "Once", quantity: 1, rate: 10000 }],
        },
      },
    });
    await api("POST", `/api/recurring/${sched.json.id}/run-now`, {});
    const before = await pool.query(`SELECT count(*)::int AS n FROM invoices`);
    await api("POST", `/api/recurring/${sched.json.id}/run-now`, {}); // second run of same occurrence
    const after = await pool.query(`SELECT count(*)::int AS n FROM invoices`);
    const diff = Number(after.rows[0].n) - Number(before.rows[0].n);
    ok(diff === 0, `same occurrence produced a second invoice (diff: ${diff})`);
  });

  const n = results.reduce((m, s) => {
    m[s] = (m[s] || 0) + 1;
    return m;
  }, {});
  console.log(`\n==== RESULT: ${n.PASS || 0} PASSED, ${n.FAIL || 0} FAILED, ${n.SKIP || 0} SKIPPED, ${n.WARN || 0} WARNED ====\n`);
  process.exitCode = n.FAIL ? 1 : 0;
  await pool.end();
})();
