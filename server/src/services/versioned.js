import { getDb } from '../db/db.js';

const colCache = new Map();
async function hasColumn(table, col) {
  const k = `${table}.${col}`;
  if (!colCache.has(k)) {
    const db = await getDb();
    const r = await db.query(
      `SELECT 1 FROM information_schema.columns WHERE table_name=$1 AND column_name=$2`,
      [table, col]
    );
    colCache.set(k, r.rows.length > 0);
  }
  return colCache.get(k);
}

const q = (c) => `"${String(c).replace(/"/g, '')}"`;

/** Full optimistic update. Throws {code:'NOT_FOUND'|'CONFLICT_VERSION', status}. */
export async function updateVersioned(table, { id, companyId, expectedVersion, set, returning = '*' }) {
  if (expectedVersion == null) {
    const e = new Error('expectedVersion required');
    e.status = 422;
    throw e;
  }
  const cols = Object.keys(set || {});
  if (!cols.length) {
    const e = new Error('empty set');
    e.status = 422;
    throw e;
  }
  const params = [];
  const sets = [];
  for (const c of cols) {
    params.push(set[c]);
    sets.push(`${q(c)} = $${params.length}`);
  }
  params.push(expectedVersion);
  const vP = params.length;
  params.push(id);
  const iP = params.length;
  let where = `${q('id')} = $${iP} AND version = $${vP}`;
  if (companyId && (await hasColumn(table, 'company_id'))) {
    params.push(companyId);
    where += ` AND company_id = $${params.length}`;
  }
  const touch = (await hasColumn(table, 'updated_at')) ? ', updated_at = now()' : '';
  const db = await getDb();
  const { rows } = await db.query(
    `UPDATE ${q(table)} SET ${sets.join(', ')}, version = version + 1${touch}
     WHERE ${where} RETURNING ${returning}, version as __new_version`,
    params
  );
  if (rows[0]) return rows[0];

  const p2 = [id];
  let w2 = `${q('id')} = $1`;
  if (companyId && (await hasColumn(table, 'company_id'))) {
    p2.push(companyId);
    w2 += ` AND company_id = $2`;
  }
  const { rows: cur } = await db.query(`SELECT version FROM ${q(table)} WHERE ${w2}`, p2);
  if (!cur.length) {
    const e = new Error('Not found');
    e.code = 'NOT_FOUND';
    e.status = 404;
    throw e;
  }
  const e = new Error(`Record changed since you loaded it (you: v${expectedVersion}, server: v${cur[0].version})`);
  e.code = 'CONFLICT_VERSION';
  e.status = 409;
  e.current = cur[0].version;
  throw e;
}

/** One-liner for existing transactions (payment/posting paths that update status/balance). */
export async function bumpVersion(client, table, id, companyId) {
  const db = client || (await getDb());
  const touch = (await hasColumn(table, 'updated_at')) ? ', updated_at = now()' : '';
  if (companyId && (await hasColumn(table, 'company_id'))) {
    await db.query(`UPDATE ${q(table)} SET version = version + 1${touch} WHERE id=$1 AND company_id=$2`, [id, companyId]);
  } else {
    await db.query(`UPDATE ${q(table)} SET version = version + 1${touch} WHERE id=$1`, [id]);
  }
}

export const conflict = (res, e) =>
  res.status(409).json({ error: { code: 'CONFLICT_VERSION', message: e.message, currentVersion: e.current } });

export default { updateVersioned, bumpVersion, conflict };
