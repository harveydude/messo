import { getDb } from '../db/db.js';
import { runDue } from '../services/recurringService.js';

let started = false;

export function startRecurringRunner() {
  if (started || process.env.RECURRING_ENABLED === '0') return;
  started = true;
  setInterval(async () => {
    try {
      const db = await getDb();
      const { rows } = await db.query(`SELECT DISTINCT company_id FROM recurring_schedules WHERE state='ACTIVE'`);
      for (const r of rows) {
        const out = await runDue({ companyId: r.company_id, actor: 'system:recurring' });
        out.filter((o) => !o.ok).forEach((o) => console.error(`[recurring] schedule ${o.scheduleId}: ${o.error}`));
      }
    } catch (e) {
      console.error('[recurring] tick failed:', e.message);
    }
  }, 15 * 60 * 1000);
  console.log('✓ recurring runner active (every 15 min)');
}

export default { startRecurringRunner };
