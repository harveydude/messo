import crypto from 'crypto';
import { getDb } from '../db/db.js';

const IN_FLIGHT_MS = 30_000;
let gcCounter = 0;

function canonical(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (typeof v === 'object') {
    return '{' + Object.keys(v).sort()
      .map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

const bodyHash = (req) =>
  crypto.createHash('sha256')
    .update(`${req.method}|${req.originalUrl.split('?')[0]}|${canonical(req.body)}`)
    .digest('hex');

export async function idempotency(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if ((req.headers['content-type'] || '').startsWith('multipart/')) return next();
  const key = req.header('idempotency-key') || req.header('Idempotency-Key');
  if (!key) {
    if (process.env.IDEMPOTENCY_REQUIRED === '1') {
      return res.status(422).json({ error: { code: 'VALIDATION', message: 'Idempotency-Key header required' } });
    }
    return next(); // adoption mode: enforce when frontend sends keys
  }

  // Adaptive companyId: if req.companyId is not set yet, use header or default to comp_1
  const companyId = req.companyId || req.header('x-company-id') || req.user?.company_id || 'comp_1';
  req.companyId = companyId;

  const hash = bodyHash(req);
  const db = await getDb();

  try {
    const { rows } = await db.query(
      `SELECT request_hash, response_status, response_body, locked_at
       FROM idempotency_keys WHERE key=$1 AND company_id=$2`,
      [key, req.companyId]
    );
    const existing = rows[0];

    if (existing) {
      if (existing.request_hash !== hash) {
        return res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Key reused with a different payload',
          },
        });
      }
      if (existing.response_status != null) {
        // replay the stored result
        return res
          .status(existing.response_status)
          .set('Idempotent-Replay', 'true')
          .json(existing.response_body);
      }
      if (existing.locked_at && Date.now() - new Date(existing.locked_at).getTime() < IN_FLIGHT_MS) {
        return res.status(409).json({
          error: {
            code: 'IDEMPOTENCY_IN_FLIGHT',
            message: 'Original request still processing — retry shortly',
          },
        });
      }
      await db.query(
        `UPDATE idempotency_keys SET locked_at=now() WHERE key=$1 AND company_id=$2`,
        [key, req.companyId]
      ); // stale lock from a crash -> take over
    } else {
      try {
        await db.query(
          `INSERT INTO idempotency_keys (key, company_id, user_id, method, path, request_hash, locked_at)
           VALUES ($1, $2, $3, $4, $5, $6, now())`,
          [key, req.companyId, req.user?.id || null, req.method, req.originalUrl.split('?')[0], hash]
        );
      } catch (e) {
        if (e.code === '23505' || String(e.message).includes('duplicate') || String(e.message).includes('unique')) {
          return res.status(409).json({
            error: {
              code: 'IDEMPOTENCY_IN_FLIGHT',
              message: 'Duplicate concurrent request',
            },
          });
        }
        throw e;
      }
    }

    const origJson = res.json.bind(res);
    res.json = (payload) => {
      res.locals.__idem = payload;
      return origJson(payload);
    };

    res.on('finish', async () => {
      try {
        const finishDb = await getDb();
        if (res.statusCode >= 500) {
          // 5xx = not the client's fault -> allow same-key retry
          await finishDb.query(
            `DELETE FROM idempotency_keys WHERE key=$1 AND company_id=$2`,
            [key, req.companyId]
          );
          return;
        }
        await finishDb.query(
          `UPDATE idempotency_keys SET response_status=$1, response_body=$2::jsonb, locked_at=null
           WHERE key=$3 AND company_id=$4`,
          [
            res.statusCode,
            res.locals.__idem !== undefined ? JSON.stringify(res.locals.__idem) : null,
            key,
            req.companyId,
          ]
        );
      } catch (err) {
        // quiet finish error
      }
      if (++gcCounter % 97 === 0) {
        try {
          const gcDb = await getDb();
          await gcDb.query(
            `DELETE FROM idempotency_keys WHERE created_at < now() - interval '24 hours'`
          );
        } catch {}
      }
    });

    next();
  } catch (err) {
    next(err);
  }
}

export default { idempotency };
