import crypto from 'crypto';
import { getDb } from '../db/db.js';

export const GENESIS_HASH = 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Computes SHA-256 hash for MCA Rule 3(1) tamper-evident chaining.
 */
export function computeAuditHash({ previousHash, companyId, entityType, action, timestamp, afterJson }) {
  const payload = [
    previousHash || GENESIS_HASH,
    companyId,
    entityType,
    action,
    new Date(timestamp).toISOString(),
    typeof afterJson === 'string' ? afterJson : JSON.stringify(afterJson || {})
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Records an immutable, chained audit log entry compliant with MCA Rule 3(1).
 */
export async function recordAuditLog({
  companyId = 'comp_1',
  userId = 'system',
  userRole = 'OWNER',
  entityType,
  entityId,
  action,
  beforeJson = null,
  afterJson = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Meso-Client/2.0',
  timestamp = new Date()
}) {
  const db = await getDb();

  // 1. Fetch latest previous hash for this company
  const prevResult = await db.query(
    `SELECT current_hash FROM audit_logs 
     WHERE company_id = $1 AND current_hash IS NOT NULL AND current_hash != ''
     ORDER BY created_at DESC, id DESC LIMIT 1`,
    [companyId]
  );

  const previousHash = prevResult.rows?.[0]?.current_hash || GENESIS_HASH;
  const currentHash = computeAuditHash({
    previousHash,
    companyId,
    entityType,
    action,
    timestamp,
    afterJson
  });

  const logId = crypto.randomUUID();

  const insertSql = `
    INSERT INTO audit_logs (
      id, company_id, user_id, user_role, entity_type, entity_id, action,
      before_json, after_json, ip_address, user_agent,
      previous_hash, current_hash, created_at, event_summary
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING id, current_hash, previous_hash, created_at
  `;

  const summary = `${action} on ${entityType} ${entityId || ''} by ${userRole}`.trim();

  const res = await db.query(insertSql, [
    logId,
    companyId,
    userId,
    userRole,
    entityType,
    String(entityId || ''),
    action,
    beforeJson ? JSON.stringify(beforeJson) : null,
    afterJson ? JSON.stringify(afterJson) : null,
    ipAddress,
    userAgent,
    previousHash,
    currentHash,
    timestamp,
    summary
  ]);

  return res.rows[0];
}

/**
 * Validates the entire SHA-256 cryptographic chain for a company to prove compliance with MCA Rule 3(1).
 */
export async function verifyAuditChain(companyId = 'comp_1') {
  const db = await getDb();

  const logsResult = await db.query(
    `SELECT id, company_id, entity_type, action, after_json, 
            previous_hash, current_hash, created_at
     FROM audit_logs
     WHERE company_id = $1 AND current_hash IS NOT NULL AND current_hash != ''
     ORDER BY created_at ASC, id ASC`,
    [companyId]
  );

  const logs = logsResult.rows || [];
  let expectedPrevHash = GENESIS_HASH;

  for (let i = 0; i < logs.length; i++) {
    const row = logs[i];

    if (row.previous_hash !== expectedPrevHash) {
      return {
        valid: false,
        brokenIndex: i,
        brokenLogId: row.id,
        reason: `Previous hash mismatch at record ${row.id}. Expected ${expectedPrevHash}, found ${row.previous_hash}`
      };
    }

    const recomputedCurrent = computeAuditHash({
      previousHash: row.previous_hash,
      companyId: row.company_id,
      entityType: row.entity_type,
      action: row.action,
      timestamp: row.created_at,
      afterJson: row.after_json
    });

    if (recomputedCurrent !== row.current_hash) {
      return {
        valid: false,
        brokenIndex: i,
        brokenLogId: row.id,
        reason: `Current hash mismatch at record ${row.id}. Content was altered!`
      };
    }

    expectedPrevHash = row.current_hash;
  }

  return {
    valid: true,
    totalRecordsVerified: logs.length,
    latestHash: expectedPrevHash
  };
}
