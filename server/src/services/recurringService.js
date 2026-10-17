import { getDb } from '../db/db.js';
import executor from './workflowExecutor.js';

export function advance(dateStr, frequency) {
  const str = dateStr instanceof Date ? dateStr.toISOString().slice(0, 10) : String(dateStr).slice(0, 10);
  const d = new Date(str + 'T00:00:00Z');
  if (frequency === 'DAILY') d.setUTCDate(d.getUTCDate() + 1);
  else if (frequency === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === 'MONTHLY') d.setUTCMonth(d.getUTCMonth() + 1);
  else if (frequency === 'QUARTERLY') d.setUTCMonth(d.getUTCMonth() + 3);
  else if (frequency === 'YEARLY') d.setUTCFullYear(d.getUTCFullYear() + 1);
  else return null; // ONCE
  return d.toISOString().slice(0, 10);
}

export async function runSchedule(s, actor) {
  const db = await getDb();
  if (s.state === 'COMPLETED' || s.state === 'EXPIRED') {
    return { scheduleId: s.id, ok: true, docId: null, message: `Schedule is already ${s.state}` };
  }
  try {
    const nextRunStr = s.next_run instanceof Date ? s.next_run.toISOString().slice(0, 10) : String(s.next_run).slice(0, 10);
    // occurrence-level idempotency: a crashed runner can never double-issue a document
    const doc = await executor.execute(s.template.workflow, s.template.payload, {
      companyId: s.company_id,
      actor,
      idempotencyKey: `rec-${s.id}-${nextRunStr}`,
    });
    const next = advance(s.next_run, s.frequency);
    const endDateStr = s.end_date ? (s.end_date instanceof Date ? s.end_date.toISOString().slice(0, 10) : String(s.end_date).slice(0, 10)) : null;
    const done =
      !next ||
      (endDateStr && next > endDateStr) ||
      (s.max_occurrences != null && s.run_count + 1 >= s.max_occurrences);
    await db.query(
      `UPDATE recurring_schedules SET last_run=now(), run_count=run_count+1, next_run=$2,
         state=$3, last_error=null WHERE id=$1`,
      [s.id, next || nextRunStr, done ? 'COMPLETED' : 'ACTIVE']
    );
    return {
      scheduleId: s.id,
      ok: true,
      docId: doc?.id ?? doc?.data?.id ?? doc?.transactionId ?? null,
      nextRun: next,
      completed: done,
    };
  } catch (e) {
    await db.query(
      `UPDATE recurring_schedules SET last_run=now(), last_error=$2 WHERE id=$1`,
      [s.id, String(e.message).slice(0, 500)]
    );
    return { scheduleId: s.id, ok: false, error: e.message };
  }
}

export async function runDue({ companyId, actor, limit = 25, forceScheduleId = null } = {}) {
  const db = await getDb();
  const params = [];
  const cond = [];
  if (forceScheduleId) {
    params.push(forceScheduleId);
    cond.push(`id = $${params.length}`);
  } else {
    cond.push(`state = 'ACTIVE'`, `next_run <= current_date`);
    if (companyId) {
      params.push(companyId);
      cond.push(`company_id = $${params.length}`);
    }
  }
  params.push(limit);
  const { rows } = await db.query(
    `SELECT * FROM recurring_schedules WHERE ${cond.join(' AND ')} ORDER BY next_run LIMIT $${params.length}`,
    params
  );
  const out = [];
  for (const s of rows) {
    out.push(await runSchedule(s, actor));
  }
  return out;
}

export default { runDue, advance, runSchedule };
