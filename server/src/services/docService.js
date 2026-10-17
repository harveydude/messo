import { getDb } from '../db/db.js';

export async function changeStatus({ companyId, docId, to, actor }) {
  const db = await getDb();
  const { rows } = await db.query(
    `SELECT id, doc_type, doc_status, status_history FROM transactions WHERE id=$1 AND company_id=$2`,
    [docId, companyId]
  );
  const row = rows[0];
  if (!row) {
    const e = new Error('Document not found');
    e.status = 404;
    e.code = 'NOT_FOUND';
    throw e;
  }
  if (!row.doc_type) {
    const e = new Error('Row has no doc_type — stamp it first (POST /documents/:id/init)');
    e.status = 422;
    e.code = 'VALIDATION';
    throw e;
  }
  if (row.doc_status === to) return row;
  try {
    const upd = await db.query(
      `UPDATE transactions SET doc_status=$3,
         status_history = COALESCE(status_history,'[]'::jsonb) || jsonb_build_object('from',$4::text,'to',$3::text,'at',now(),'by',$5::text)
       WHERE id=$1 AND company_id=$2 AND doc_status IS NOT DISTINCT FROM $4
       RETURNING id, doc_type, doc_status, status_history`,
      [docId, companyId, to, row.doc_status, actor || null]
    );
    if (!upd.rows[0]) {
      const e = new Error('Status changed concurrently — reload');
      e.status = 409;
      e.code = 'CONFLICT_VERSION';
      throw e;
    }
    return upd.rows[0];
  } catch (e) {
    if (String(e.message).includes('INVALID_DOC_TRANSITION')) {
      const err = new Error(e.message.trim());
      err.status = 422;
      err.code = 'INVALID_DOC_TRANSITION';
      throw err;
    }
    throw e;
  }
}

export async function init({ companyId, docId, docType, actor }) {
  const db = await getDb();
  const { rows } = await db.query(
    `UPDATE transactions SET doc_type=$3, doc_status='DRAFT',
       status_history = $4::jsonb
     WHERE id=$1 AND company_id=$2 AND doc_type IS NULL
     RETURNING id, doc_type, doc_status`,
    [
      docId,
      companyId,
      docType,
      JSON.stringify([{ to: 'DRAFT', at: new Date().toISOString(), by: actor || null }]),
    ]
  );
  if (!rows[0]) {
    const e = new Error('Already stamped or not found');
    e.status = 409;
    e.code = 'CONFLICT_VERSION';
    throw e;
  }
  return rows[0];
}

export default { changeStatus, init };
