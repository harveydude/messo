import { getDb, initDb } from './db.js';

(async () => {
  await initDb();
  const db = await getDb();
  const { rows } = await db.query(`SELECT id FROM companies ORDER BY created_at LIMIT 1`);
  const co = rows[0];
  const cid = co?.id || 'comp_1';

  const agency = async (name, kind) => {
    const res = await db.query(
      `INSERT INTO tax_agencies (company_id, name, kind) VALUES ($1,$2,$3)
       ON CONFLICT (company_id, name) DO UPDATE SET kind=excluded.kind RETURNING id`,
      [cid, name, kind]
    );
    return res.rows[0].id;
  };

  const gstn = await agency('GSTN', 'GST');
  const tds = await agency('CBDT (TDS)', 'TDS');

  const rate = async (name, bp, split, kind, ag) => {
    return db.query(
      `INSERT INTO tax_rates (company_id, agency_id, kind, name, rate_bp, split) VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (company_id, name) DO NOTHING`,
      [cid, ag, kind, name, bp, split ? JSON.stringify(split) : null]
    );
  };

  for (const [n, bp] of [
    ['GST 0%', 0],
    ['GST 5%', 500],
    ['GST 12%', 1200],
    ['GST 18%', 1800],
    ['GST 28%', 2800],
  ]) {
    await rate(n, bp, { CGST: bp / 2, SGST: bp / 2, IGST: bp }, 'GST', gstn);
  }

  for (const [n, bp] of [
    ['TDS 194C (HUF/individual) 1%', 100],
    ['TDS 194C (others) 2%', 200],
    ['TDS 194J (professional) 10%', 1000],
    ['TDS 194I (rent, plant) 2%', 200],
    ['TDS 194I (rent, land & building) 10%', 1000],
  ]) {
    await rate(n, bp, { TDS: bp }, 'TDS', tds);
  }

  console.log('✓ taxonomy seeded: GST slabs (CGST/SGST/IGST splits) + TDS sections 194C/194J/194I');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
