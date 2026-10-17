import { getDb, initDb } from './db.js';

(async () => {
  await initDb();
  const db = await getDb();
  const { rows } = await db.query(`SELECT id FROM companies ORDER BY created_at LIMIT 1`);
  const co = rows[0];
  const cid = co?.id || 'comp_1';

  // 1. Purge phased-out/obsolete slabs (GST 12% and 28% were abolished under GST 2.0 acts)
  await db.query(
    `DELETE FROM tax_rates WHERE name IN ('GST 12%', 'GST 28%') OR rate_bp IN (1200, 2800) OR name LIKE 'TST 18%'`
  );

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
      `INSERT INTO tax_rates (company_id, agency_id, kind, name, rate_bp, split, active) VALUES ($1,$2,$3,$4,$5,$6, true)
       ON CONFLICT (company_id, name) DO UPDATE SET rate_bp=excluded.rate_bp, split=excluded.split, active=true`,
      [cid, ag, kind, name, bp, split ? JSON.stringify(split) : null]
    );
  };

  // 2. Active GST Slabs under current GST Acts (GST 2.0 Rationalized Structure)
  // Phased out: 12% & 28%. Active: 0%, 0.25%, 3%, 5%, 18%, 40% (Demerit/Luxury)
  const gstSlabs = [
    ['GST 0% (Nil / Exempt)', 0, { CGST: 0, SGST: 0, IGST: 0 }],
    ['GST 0.25% (Diamonds & Precious Stones)', 25, { CGST: 12.5, SGST: 12.5, IGST: 25 }],
    ['GST 3% (Gold & Precious Metals)', 300, { CGST: 150, SGST: 150, IGST: 300 }],
    ['GST 5% (Essentials & Mass Consumption)', 500, { CGST: 250, SGST: 250, IGST: 500 }],
    ['GST 18% (Standard Rate)', 1800, { CGST: 900, SGST: 900, IGST: 1800 }],
    ['GST 40% (Demerit & Luxury Goods)', 4000, { CGST: 2000, SGST: 2000, IGST: 4000 }],
  ];

  for (const [n, bp, split] of gstSlabs) {
    await rate(n, bp, split, 'GST', gstn);
  }

  // 3. Indian Income Tax TDS Sections
  const tdsSlabs = [
    ['TDS 194C (HUF/individual) 1%', 100, { TDS: 100 }],
    ['TDS 194C (others) 2%', 200, { TDS: 200 }],
    ['TDS 194J (technical / royalty) 2%', 200, { TDS: 200 }],
    ['TDS 194J (professional) 10%', 1000, { TDS: 1000 }],
    ['TDS 194I (rent, plant & machinery) 2%', 200, { TDS: 200 }],
    ['TDS 194I (rent, land & building) 10%', 1000, { TDS: 1000 }],
    ['TDS 194Q (purchase of goods) 0.1%', 10, { TDS: 10 }],
    ['TDS 194R (benefits & perquisites) 10%', 1000, { TDS: 1000 }],
  ];

  for (const [n, bp, split] of tdsSlabs) {
    await rate(n, bp, split, 'TDS', tds);
  }

  console.log('✓ Taxonomy re-seeded with current GST 2.0 acts:');
  console.log('  - Active GST Slabs: 0% (Nil), 0.25% (Diamonds), 3% (Gold), 5% (Essentials), 18% (Standard), 40% (Demerit/Luxury)');
  console.log('  - Obsolete Slabs Purged: 12% and 28% removed completely.');
  console.log('  - Active TDS Sections: 194C, 194J, 194I, 194Q, 194R populated.');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
